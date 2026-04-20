import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const dataFile = path.join(dataDir, 'email-deliveries.json');

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}', 'utf8');
  }
}

function readStore() {
  ensureStore();

  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), 'utf8');
}

export function hasEmailDelivery(sessionId) {
  const store = readStore();
  return Boolean(store[String(sessionId || '').trim()]);
}

export function markEmailDelivered(sessionId) {
  const normalizedId = String(sessionId || '').trim();

  if (!normalizedId) {
    return;
  }

  const store = readStore();
  store[normalizedId] = {
    deliveredAt: new Date().toISOString(),
  };
  writeStore(store);
}
