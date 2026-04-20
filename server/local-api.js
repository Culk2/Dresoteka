import express from 'express';
import { createCheckoutSession } from './stripeCheckout.js';
import { confirmOrder, getAllOrders, getOrdersByIds, updateOrderStatus } from './ordersStore.js';

const app = express();
const port = Number(process.env.LOCAL_API_PORT || 3001);

app.use(express.json());

app.get('/api/create-checkout-session', (_req, res) => {
  res.status(405).json({ error: 'Method not allowed.' });
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const session = await createCheckoutSession({
      cartItems: req.body?.cartItems,
      customer: req.body?.customer,
      origin: req.headers.origin || 'http://localhost:5173',
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Stripe checkout error.',
    });
  }
});

app.post('/api/confirm-order', async (req, res) => {
  try {
    const sessionId = String(req.body?.sessionId || '').trim();

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId.' });
    }

    const result = await confirmOrder(sessionId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Order confirmation error.',
    });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const rawIds = String(req.query.ids || '');
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
});

app.get('/api/admin/orders', async (_req, res) => {
  try {
    const orders = await getAllOrders();
    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin orders fetch error.',
    });
  }
});

app.patch('/api/admin/orders/:orderId/status', async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.orderId, req.body?.status);
    return res.status(200).json({ order });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Admin order status update error.',
    });
  }
});

const server = app.listen(port, () => {
  console.log(`Local API listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Local API server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in local API:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in local API:', error);
  process.exit(1);
});

// Keep the Node process alive reliably when started through concurrently on Windows.
process.stdin.resume();
