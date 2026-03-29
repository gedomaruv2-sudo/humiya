module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType, style } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const styleGuide = style ? `\n【目標とする雰囲気】「${style}」という仕上がりを目指して編集値を提案してください。` : '';

  const prompt = `あなたはプロの写真編集アドバイザーです。
この写真を詳しく分析して、iPhoneの標準写真アプリの編集機能を使って仕上げるための具体的な数値をJSON形式で返してください。${styleGuide}

必ず以下のJSON形式のみで回答してください（前後の説明は不要）：

{
  "scene": "写真の内容・状況の説明（2〜3文）",
  "params": [
    {"name": "露出", "en": "Exposure", "value": 0, "reason": "理由を一言で"},
    {"name": "ブリリアンス", "en": "Brilliance", "value": 0, "reason": "理由を一言で"},
    {"name": "ハイライト", "en": "Highlights", "value": 0, "reason": "理由を一言で"},
    {"name": "シャドウ", "en": "Shadows", "value": 0, "reason": "理由を一言で"},
    {"name": "コントラスト", "en": "Contrast", "value": 0, "reason": "理由を一言で"},
    {"name": "明るさ", "en": "Brightness", "value": 0, "reason": "理由を一言で"},
    {"name": "ブラックポイント", "en": "Black Point", "value": 0, "reason": "理由を一言で"},
    {"name": "彩度", "en": "Saturation", "value": 0, "reason": "理由を一言で"},
    {"name": "自然な彩度", "en": "Vibrance", "value": 0, "reason": "理由を一言で"},
    {"name": "暖かみ", "en": "Warmth", "value": 0, "reason": "理由を一言で"},
    {"name": "色調", "en": "Tint", "value": 0, "reason": "理由を一言で"},
    {"name": "シャープネス", "en": "Sharpness", "value": 0, "reason": "理由を一言で"},
    {"name": "ノイズ除去", "en": "Noise Reduction", "value": 0, "reason": "理由を一言で"},
    {"name": "ビネット", "en": "Vignette", "value": 0, "reason": "理由を一言で"}
  ],
  "tips": [
    "この写真の編集で最も重要なポイントと、その理由・知識を解説（1〜2文）",
    "2つ目のアドバイス",
    "3つ目のアドバイス"
  ]
}

valueの範囲:
- 露出: -100〜+100
- ブリリアンス: -100〜+100
- ハイライト: -100〜+100
- シャドウ: -100〜+100
- コントラスト: -100〜+100
- 明るさ: -100〜+100
- ブラックポイント: -100〜+100
- 彩度: -100〜+100
- 自然な彩度: -100〜+100
- 暖かみ: -100〜+100（マイナス=青み、プラス=暖色）
- 色調: -100〜+100（マイナス=緑みがかる、プラス=ピンクみがかる）
- シャープネス: 0〜100
- ノイズ除去: 0〜100
- ビネット: -100〜0（マイナスのみ）

必ずJSONのみで返答してください。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const rawText = data.content.map(b => b.text || '').join('');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'レスポンスの解析に失敗しました' });
    }

    const sanitized = jsonMatch[0].replace(/:\s*\+(\d)/g, ': $1');
    const parsed = JSON.parse(sanitized);
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
