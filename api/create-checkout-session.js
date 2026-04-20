import { createCheckoutSession } from '../server/stripeCheckout.js';

function getOrigin(req) {
  const originHeader = req.headers.origin;

  if (originHeader) {
    return originHeader;
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;

  return `${protocol}://${host}`;
}

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { cartItems = [], customer = {}, clerkUserId = '' } = parseBody(req);
    const session = await createCheckoutSession({
      cartItems,
      customer,
      clerkUserId,
      origin: getOrigin(req),
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Stripe checkout error.',
    });
  }
}
