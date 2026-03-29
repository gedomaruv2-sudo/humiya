module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;

  if (!type || (type !== 'single' && type !== 'subscription')) {
    return res.status(400).json({ error: 'type must be "single" or "subscription"' });
  }

  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return res.status(500).json({ error: 'Stripe key not configured' });
  }

  const isSubscription = type === 'subscription';
  const origin = req.headers.origin || 'https://photosense.vercel.app';

  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('mode', isSubscription ? 'subscription' : 'payment');
  params.append('success_url', `${origin}?payment=success&type=${type}`);
  params.append('cancel_url', `${origin}?payment=cancel`);
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'jpy');
  params.append('line_items[0][price_data][unit_amount]', isSubscription ? '480' : '150');
  params.append('line_items[0][price_data][product_data][name]',
    isSubscription ? 'PhotoSense スタンダードプラン' : 'PhotoSense 1枚診断');
  params.append('line_items[0][price_data][product_data][description]',
    isSubscription ? '毎月10枚まで診断できる月額プラン' : '1枚分の写真診断');
  if (isSubscription) {
    params.append('line_items[0][price_data][recurring][interval]', 'month');
  }

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sk}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
