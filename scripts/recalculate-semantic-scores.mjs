/**
 * Recalcule les scores Sémantique passés avec la nouvelle formule :
 *   score = round(5000 / (1 + 0.05 * (attempts - 1)))
 *
 * Usage: node scripts/recalculate-semantic-scores.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = resolve(__dirname, '../.env.local');
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
}

const SERVICE_ACCOUNT_BASE64 = env['FIREBASE_SERVICE_ACCOUNT_BASE64'];
const DATABASE_URL = env['NEXT_PUBLIC_FIREBASE_DATABASE_URL'];

if (!SERVICE_ACCOUNT_BASE64 || !DATABASE_URL) {
  console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 or NEXT_PUBLIC_FIREBASE_DATABASE_URL');
  process.exit(1);
}

const { default: admin } = await import('firebase-admin');

if (!admin.apps.length) {
  const sa = JSON.parse(Buffer.from(SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: DATABASE_URL });
}

const db = admin.database();

function newScore(attempts) {
  return Math.max(100, Math.round(5000 / (1 + 0.05 * (attempts - 1))));
}

console.log('Fetching daily/semantic...');
const snap = await db.ref('daily/semantic').once('value');
const data = snap.val();

if (!data) {
  console.log('No data found.');
  process.exit(0);
}

const updates = {};
let count = 0;

for (const [date, dateData] of Object.entries(data)) {
  if (!dateData?.leaderboard) continue;
  for (const [uid, entry] of Object.entries(dateData.leaderboard)) {
    if (!entry?.solved || !entry?.attempts) continue;
    const oldScore = entry.score || 0;
    const calculated = newScore(entry.attempts);
    if (calculated === oldScore) continue;
    updates[`daily/semantic/${date}/leaderboard/${uid}/score`] = calculated;
    console.log(`  ${date} | ${entry.name || uid} | attempts=${entry.attempts} | ${oldScore} → ${calculated}`);
    count++;
  }
}

if (count === 0) {
  console.log('Nothing to update.');
  process.exit(0);
}

console.log(`\nUpdating ${count} entries...`);
await db.ref('/').update(updates);
console.log('Done ✓');
process.exit(0);
