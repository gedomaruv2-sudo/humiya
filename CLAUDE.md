# PhotoSense 開発メモ

## アプリ概要
写真をアップするだけでAIが編集アドバイスをしてくれるWebアプリ。

**本番URL**: https://photosense.vercel.app

---

## 技術構成

| 項目 | 内容 |
|------|------|
| フロントエンド | `index.html` 1ファイル（HTML/CSS/JS一体型） |
| AIモデル | Claude API (`claude-sonnet-4-20250514`) |
| 認証 | Supabase（マジックリンク + Google OAuth） |
| DB | Supabase PostgreSQL |
| ストレージ | Supabase Storage（`diagnosis-images`バケット） |
| 決済 | Stripe Checkout |
| デプロイ | Vercel（`humiya`プロジェクト） |
| GitHubリポジトリ | `gedomaruv2-sudo/humiya` |

---

## 料金プラン

- **無料**: 月3回（ログインなし1回）
- **1回券**: ¥150（1回分追加）
- **サブスク**: ¥480/月（無制限 + 履歴全閲覧）

---

## Supabaseテーブル

- `user_usage` — ユーザーごとの使用回数
- `diagnosis_history` — 診断履歴（最新20件表示）
- `user_subscriptions` — サブスク状態（status: active/inactive）

---

## APIファイル（`/api/`）

| ファイル | 役割 |
|----------|------|
| `analyze.js` | 写真分析（Claude API呼び出し） |
| `create-checkout.js` | Stripe決済セッション作成 |
| `stripe-webhook.js` | Stripe webhook処理（サブスク同期・単発課金） |
| `cancel-subscription.js` | サブスク解約処理 |

---

## デプロイ手順

コードを変更したら毎回以下を実行：

```bash
cd /Users/fufu/Downloads/photosense
git add -A
git commit -m "変更内容"
git push
vercel --prod
# 表示されたURLをコピーして↓
vercel alias set <デプロイURL> photosense.vercel.app
```

> **注意**: Vercelの無料プランは100デプロイ/日の上限あり。上限に達したら数時間待つ。

---

## 環境変数（Vercel `humiya`プロジェクトに設定済み）

- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 主要な実装メモ

- **おまかせモード**: Claude APIが最適スタイルを自動選択
- **アフター画像生成**: Canvas APIでピクセル処理
- **iOS保存**: Web Share APIで「画像を保存」
- **解約フロー**: カスタムモーダル（登録メール入力で確認）
- **お問い合わせ**: humiyaandsora@gmail.com（Gmailリンクで開く）
- **履歴**: サブスク加入者のみ全閲覧、未加入は2件まで

---

## よくあるトラブル

| 症状 | 原因・対処 |
|------|-----------|
| 変更が反映されない | ブラウザキャッシュ → シークレットモードで確認 |
| デプロイ上限エラー | 100回/日の制限 → 数時間待つ |
| APIエラー | 環境変数の確認 → `vercel env ls` |
| `photosense.vercel.app`が古い | `vercel alias set`でエイリアス更新が必要 |
