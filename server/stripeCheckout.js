import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

const productQuery = `*[_type == "product" && slug.current in $slugs]{
  _id,
  "slug": slug.current,
  "name": coalesce(title, club->name),
  "club": club->name,
  description,
  price
}`;

function slugifyValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readEnvFile(filename) {
  const filepath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filepath)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filepath));
}

function getEnv() {
  const fileEnv = {
    ...readEnvFile('.env'),
    ...readEnvFile('.env.local'),
  };

  return {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || fileEnv.STRIPE_SECRET_KEY || '',
    sanityProjectId:
      process.env.VITE_SANITY_PROJECT_ID ||
      fileEnv.VITE_SANITY_PROJECT_ID ||
      process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
      fileEnv.NEXT_PUBLIC_SANITY_PROJECT_ID ||
      'drw5izd2',
    sanityDataset:
      process.env.VITE_SANITY_DATASET ||
      fileEnv.VITE_SANITY_DATASET ||
      process.env.NEXT_PUBLIC_SANITY_DATASET ||
      fileEnv.NEXT_PUBLIC_SANITY_DATASET ||
      'production',
    sanityApiVersion: process.env.VITE_SANITY_API_VERSION || fileEnv.VITE_SANITY_API_VERSION || '2026-04-14',
    sanityToken:
      process.env.VITE_SANITY_TOKEN ||
      fileEnv.VITE_SANITY_TOKEN ||
      process.env.SANITY_WRITE_TOKEN ||
      fileEnv.SANITY_WRITE_TOKEN ||
      '',
  };
}

function createSanityClient() {
  const env = getEnv();

  return createClient({
    projectId: env.sanityProjectId,
    dataset: env.sanityDataset,
    apiVersion: env.sanityApiVersion,
    token: env.sanityToken || undefined,
    useCdn: false,
  });
}

function createStripeClient() {
  const env = getEnv();

  return new Stripe(env.stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
  });
}

function normalizeQuantity(value) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return 0;
  }

  return quantity;
}

export async function createCheckoutSession({ cartItems = [], customer = {}, origin }) {
  const env = getEnv();

  if (!env.stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY.');
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Kosarica je prazna.');
  }

  const items = cartItems
    .map((item) => ({
      slug: String(item.slug || '').trim(),
      quantity: normalizeQuantity(item.quantity),
      name: String(item.name || '').trim(),
      club: String(item.club || '').trim(),
      description: String(item.description || '').trim(),
      price: Number(item.price),
    }))
    .filter((item) => item.slug && item.quantity > 0);

  if (items.length === 0) {
    throw new Error('Kosarica nima veljavnih izdelkov.');
  }

  let products = [];

  try {
    const sanityClient = createSanityClient();
    const slugs = [...new Set(items.map((item) => item.slug))];
    products = await sanityClient.fetch(productQuery, { slugs });
  } catch {
    products = [];
  }

  const productsBySlug = new Map(products.map((product) => [slugifyValue(product.slug), product]));

  const lineItems = items.map((item) => {
    const normalizedSlug = slugifyValue(item.slug);
    const normalizedName = slugifyValue(item.name);
    const normalizedClub = slugifyValue(item.club);
    const product =
      productsBySlug.get(normalizedSlug) ||
      products.find((entry) => {
        return (
          normalizedSlug === slugifyValue(entry.name) ||
          normalizedSlug === slugifyValue(entry.club) ||
          (normalizedName && normalizedName === slugifyValue(entry.name)) ||
          (normalizedClub && normalizedClub === slugifyValue(entry.club))
        );
      });

    const unitPrice = product?.price;
    const fallbackPrice = Number.isFinite(item.price) ? item.price : NaN;

    if (typeof unitPrice !== 'number' && !Number.isFinite(fallbackPrice)) {
      throw new Error(`Izdelek ${item.slug} ni bil najden v bazi in nima lokalne cene.`);
    }

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: Math.round((typeof unitPrice === 'number' ? unitPrice : fallbackPrice) * 100),
        product_data: {
          name: product?.name || product?.club || item.name || item.club || 'Dresoteka izdelek',
          description: product?.description || product?.club || item.description || item.club || undefined,
        },
      },
    };
  });

  const stripe = createStripeClient();
  return stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'auto',
    line_items: lineItems,
    success_url: `${origin}/checkout?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?checkout=cancel`,
    metadata: {
      firstName: String(customer.firstName || ''),
      lastName: String(customer.lastName || ''),
      address: String(customer.address || ''),
      postalCode: String(customer.postalCode || ''),
      city: String(customer.city || ''),
    },
  });
}
