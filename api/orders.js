import { getOrdersByIds } from '../server/ordersStore.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const rawIds = String(req.query?.ids || '');
    const ids = rawIds
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const orders = await getOrdersByIds(ids);
    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Orders fetch error.',
    });
  }
}
