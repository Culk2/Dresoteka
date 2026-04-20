import { getOrdersByClerkUserId } from '../server/ordersStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const clerkUserId = String(req.query?.clerkUserId || '').trim();

    if (!clerkUserId) {
      return res.status(400).json({ error: 'Missing clerkUserId.' });
    }

    const orders = await getOrdersByClerkUserId(clerkUserId);
    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'My orders fetch error.',
    });
  }
}
