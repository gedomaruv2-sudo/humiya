const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;

  if (!type || (type !== 'single' && type !== 'subscription')) {
    return res.status(400).json({ error: 'type must be "single" or "subscription"' });
  }

  const isSubscription = type === 'subscription';
  const origin = req.headers.origin || 'https://photosense.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: isSubscription ? 'PhotoSense スタンダードプラン' : 'PhotoSense 1枚診断',
              description: isSubscription ? '毎月10枚まで診断できる月額プラン' : '1枚分の写真診断',
            },
            unit_amount: isSubscription ? 480 : 150,
            ...(isSubscription ? { recurring: { interval: 'month' } } : {}),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${origin}?payment=success&type=${type}`,
      cancel_url: `${origin}?payment=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
