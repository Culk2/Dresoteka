import fs from 'fs';
import path from 'path';
import {
  formatOrderNumber,
  getCheckoutSessionWithItems,
  getOrderDocumentId,
  upsertOrderInSanity,
} from './stripeCheckout.js';
import { sendOrderConfirmationEmail } from './emailService.js';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const dataFile = path.join(dataDir, 'orders.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]', 'utf8');
  }
}

function readOrders() {
  ensureStore();

  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(orders, null, 2), 'utf8');
}

function toLocalOrder({ session, lineItems }) {
  return {
    _id: getOrderDocumentId(session.id),
    orderNumber: formatOrderNumber(session.id),
    clerkUserId: String(session.metadata?.clerkUserId || ''),
    status: 'v-pripravi',
    paymentStatus: session.payment_status || 'unpaid',
    totalAmount: typeof session.amount_total === 'number' ? session.amount_total / 100 : 0,
    currency: String(session.currency || 'eur').toUpperCase(),
    createdAt: session.created ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
    customer: {
      firstName: String(session.metadata?.firstName || ''),
      lastName: String(session.metadata?.lastName || ''),
      email: String(session.customer_details?.email || ''),
      address: String(session.metadata?.address || ''),
      postalCode: String(session.metadata?.postalCode || ''),
      city: String(session.metadata?.city || ''),
    },
    items: lineItems.map((item, index) => ({
      _key: `${item.id || 'item'}-${index}`,
      name: item.description || 'Izdelek',
      quantity: item.quantity || 1,
      unitPrice:
        typeof item.amount_total === 'number' && item.quantity
          ? item.amount_total / item.quantity / 100
          : typeof item.amount_subtotal === 'number' && item.quantity
            ? item.amount_subtotal / item.quantity / 100
            : 0,
      currency: (item.currency || session.currency || 'eur').toUpperCase(),
    })),
  };
}

export async function confirmOrder(sessionId) {
  const { session, lineItems } = await getCheckoutSessionWithItems(sessionId);

  if (session.payment_status !== 'paid') {
    throw new Error('Placilo za to sejo se ni potrjeno.');
  }

  try {
    const sanityOrder = await upsertOrderInSanity({ session, lineItems });

    try {
      await sendOrderConfirmationEmail({ order: sanityOrder, sessionId: session.id });
    } catch (error) {
      console.error('Order confirmation email failed:', error);
    }

    return {
      order: sanityOrder,
      source: 'sanity',
    };
  } catch {
    const current = readOrders();
    const nextOrder = toLocalOrder({ session, lineItems });
    const existing = current.find((order) => order._id === nextOrder._id);
    const merged = existing ? { ...existing, ...nextOrder } : nextOrder;
    const remaining = current.filter((order) => order._id !== nextOrder._id);
    writeOrders([merged, ...remaining]);

    try {
      await sendOrderConfirmationEmail({ order: merged, sessionId: session.id });
    } catch (error) {
      console.error('Order confirmation email failed:', error);
    }

    return {
      order: merged,
      source: 'local',
    };
  }
}

export async function getOrdersByIds(ids) {
  const requestedIds = ids.filter(Boolean);

  if (requestedIds.length === 0) {
    return [];
  }

  try {
    const { createSanityClient } = await import('./stripeCheckout.js');
    const client = createSanityClient();

    return client.fetch(
      `*[_type == "order" && _id in $ids] | order(createdAt desc){
        _id,
        orderNumber,
        status,
        paymentStatus,
        clerkUserId,
        totalAmount,
        currency,
        createdAt,
        customer,
        items
      }`,
      { ids: requestedIds },
    );
  } catch {
    const localOrders = readOrders();
    return localOrders.filter((order) => requestedIds.includes(order._id));
  }
}

export async function getAllOrders() {
  try {
    const { createSanityClient } = await import('./stripeCheckout.js');
    const client = createSanityClient();

    return client.fetch(
      `*[_type == "order"] | order(createdAt desc){
        _id,
        orderNumber,
        status,
        paymentStatus,
        clerkUserId,
        totalAmount,
        currency,
        createdAt,
        customer,
        items
      }`,
    );
  } catch {
    const localOrders = readOrders();
    return [...localOrders].sort(
      (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
    );
  }
}

export async function updateOrderStatus(orderId, status) {
  const normalizedId = String(orderId || '').trim();
  const normalizedStatus = String(status || '').trim();

  if (!normalizedId) {
    throw new Error('Missing orderId.');
  }

  if (!['v-pripravi', 'odposlano', 'prevzeto'].includes(normalizedStatus)) {
    throw new Error('Unsupported order status.');
  }

  try {
    const { createSanityClient } = await import('./stripeCheckout.js');
    const client = createSanityClient();

    await client.patch(normalizedId).set({ status: normalizedStatus }).commit();

    return client.fetch(
      `*[_type == "order" && _id == $id][0]{
        _id,
        orderNumber,
        status,
        paymentStatus,
        clerkUserId,
        totalAmount,
        currency,
        createdAt,
        customer,
        items
      }`,
      { id: normalizedId },
    );
  } catch {
    const current = readOrders();
    const existing = current.find((order) => order._id === normalizedId);

    if (!existing) {
      throw new Error('Order not found.');
    }

    const updatedOrder = { ...existing, status: normalizedStatus };
    const remaining = current.filter((order) => order._id !== normalizedId);
    writeOrders([updatedOrder, ...remaining]);
    return updatedOrder;
  }
}

export async function getOrdersByClerkUserId(clerkUserId) {
  const normalizedClerkUserId = String(clerkUserId || '').trim();

  if (!normalizedClerkUserId) {
    return [];
  }

  try {
    const { createSanityClient } = await import('./stripeCheckout.js');
    const client = createSanityClient();

    return client.fetch(
      `*[_type == "order" && clerkUserId == $clerkUserId] | order(createdAt desc){
        _id,
        orderNumber,
        status,
        paymentStatus,
        clerkUserId,
        totalAmount,
        currency,
        createdAt,
        customer,
        items
      }`,
      { clerkUserId: normalizedClerkUserId },
    );
  } catch {
    const localOrders = readOrders();
    return localOrders
      .filter((order) => String(order.clerkUserId || '') === normalizedClerkUserId)
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  }
}
