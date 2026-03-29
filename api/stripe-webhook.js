module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sk = process.env.STRIPE_SECRET_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !sk || !supaUrl || !supaServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Stripeイベントを検証
  let event;
  try {
    // Raw bodyを取得して署名検証
    const rawBody = await getRawBody(req);
    const stripe = require('stripe')(sk);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Supabase REST API ヘルパー
  async function upsertSubscription(userId, data) {
    await fetch(`${supaUrl}/rest/v1/user_subscriptions`, {
      method: 'POST',
      headers: {
        'apikey': supaServiceKey,
        'Authorization': `Bearer ${supaServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, ...data, updated_at: new Date().toISOString() }),
    });
  }

  async function getUserIdByEmail(email) {
    const r = await fetch(`${supaUrl}/rest/v1/rpc/get_user_id_by_email`, {
      method: 'POST',
      headers: {
        'apikey': supaServiceKey,
        'Authorization': `Bearer ${supaServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    return d;
  }

  const obj = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const userId = obj.client_reference_id;
    const customerId = obj.customer;
    if (userId && obj.mode === 'subscription') {
      await upsertSubscription(userId, {
        stripe_customer_id: customerId,
        stripe_subscription_id: obj.subscription,
        status: 'active',
      });
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const r = await fetch(`${supaUrl}/rest/v1/user_subscriptions?stripe_subscription_id=eq.${obj.id}`, {
      headers: { 'apikey': supaServiceKey, 'Authorization': `Bearer ${supaServiceKey}` },
    });
    const rows = await r.json();
    if (rows.length > 0) {
      await upsertSubscription(rows[0].user_id, {
        status: obj.status === 'active' ? 'active' : 'inactive',
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const r = await fetch(`${supaUrl}/rest/v1/user_subscriptions?stripe_subscription_id=eq.${obj.id}`, {
      headers: { 'apikey': supaServiceKey, 'Authorization': `Bearer ${supaServiceKey}` },
    });
    const rows = await r.json();
    if (rows.length > 0) {
      await upsertSubscription(rows[0].user_id, { status: 'inactive' });
    }
  }

  return res.status(200).json({ received: true });
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
