import express from 'express';
import { createCheckoutSession } from './stripeCheckout.js';

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
