/**
 * Script one-shot — Trouve l'UID Firebase d'un utilisateur par email
 * et assigne memberSince si pas encore défini.
 * Usage : node scripts/find-uid-by-email.mjs
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

const FOUNDER_EMAIL = 'yogarajah.sujeevan@gmail.com';
const FOUNDER_SINCE = '2025-09-01';

async function run() {
  const userRecord = await admin.auth().getUserByEmail(FOUNDER_EMAIL);
  console.log(`\n📧  Email  : ${FOUNDER_EMAIL}`);
  console.log(`🔑  UID    : ${userRecord.uid}`);

  const memberSinceRef = db.ref(`users/${userRecord.uid}/memberSince`);
  const snap = await memberSinceRef.get();

  if (snap.exists()) {
    console.log(`⏭️  memberSince déjà défini : ${snap.val()}`);
  } else {
    const ts = new Date(FOUNDER_SINCE).getTime();
    await memberSinceRef.set(ts);
    console.log(`✅  memberSince assigné : ${FOUNDER_SINCE} (${ts})`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Erreur :', err);
  process.exit(1);
});
