module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sk = process.env.STRIPE_SECRET_KEY;
  const supaUrl = process.env.SUPABASE_URL;
  const supaServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sk || !supaUrl || !supaServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Supabaseからsubscription IDを取得
  const r = await fetch(`${supaUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=stripe_subscription_id`, {
    headers: { 'apikey': supaServiceKey, 'Authorization': `Bearer ${supaServiceKey}` },
  });
  const rows = await r.json();

  if (!rows.length || !rows[0].stripe_subscription_id) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const subscriptionId = rows[0].stripe_subscription_id;

  // Stripeでサブスクをキャンセル
  const cancelRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${sk}` },
  });
  const cancelData = await cancelRes.json();

  if (cancelData.error) {
    return res.status(500).json({ error: cancelData.error.message });
  }

  // SupabaseのステータスをInactiveに更新
  await fetch(`${supaUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': supaServiceKey,
      'Authorization': `Bearer ${supaServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'inactive', updated_at: new Date().toISOString() }),
  });

  return res.status(200).json({ success: true });
};
