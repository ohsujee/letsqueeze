/**
 * Script one-shot — Assigne memberSince aux abonnés existants
 * Usage : node scripts/assign-member-since.mjs
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

const db = admin.database();

const entries = [
  { uid: 'wkoRfPsKt3acVh42rO0mEfSprzc2', date: '2026-02-23' },
  { uid: '4igI1swgmoccuYFvkclipWvduvJ3', date: '2026-02-23' },
  { uid: 'df67WkZ7sWaLq7hiE5da64aiFv23', date: '2026-02-23' },
  { uid: 'oRNT1yGebYUIl3h0P7sR5oHDLb92', date: '2026-02-24' },
];

async function run() {
  console.log('\n📅  Assignation de memberSince pour', entries.length, 'utilisateurs...\n');

  for (const { uid, date } of entries) {
    const ts = new Date(date).getTime();
    const ref = db.ref(`users/${uid}/memberSince`);
    const snap = await ref.get();
    if (snap.exists()) {
      console.log(`⏭️  ${uid} → déjà défini (${snap.val()})`);
    } else {
      await ref.set(ts);
      console.log(`✅  ${uid} → ${date} (${ts})`);
    }
  }

  console.log('\nDone.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Erreur :', err);
  process.exit(1);
});
