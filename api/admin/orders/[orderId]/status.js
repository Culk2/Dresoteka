import { updateOrderStatus } from '../../../../server/ordersStore.js';

function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return req.body;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const orderId = String(req.query?.orderId || '').trim();
    const { status = '' } = parseBody(req);
    const order = await updateOrderStatus(orderId, status);
    return res.status(200).json({ order });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin order status update error.',
    });
  }
}
