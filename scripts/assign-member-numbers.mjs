/**
 * Script one-shot — Assigne les numéros de membre aux abonnés existants
 *
 * Usage :
 *   node scripts/assign-member-numbers.mjs UID1 UID2 UID3 UID4
 *
 * Les UIDs doivent être passés dans l'ordre chronologique d'abonnement
 * (le premier UID reçoit N°00001, le second N°00002, etc.)
 *
 * Prérequis :
 *   - FIREBASE_SERVICE_ACCOUNT_BASE64 dans .env.local
 *   - NEXT_PUBLIC_FIREBASE_DATABASE_URL dans .env.local
 *
 * Exemple :
 *   node scripts/assign-member-numbers.mjs abc123 def456 ghi789 jkl012
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charger .env.local manuellement
function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  try {
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
  } catch {
    console.error('⚠️  Impossible de lire .env.local — vérifie que le fichier existe');
    process.exit(1);
  }
}

loadEnv();

const uids = process.argv.slice(2);

if (uids.length === 0) {
  console.error('❌  Aucun UID fourni. Usage : node scripts/assign-member-numbers.mjs UID1 UID2 ...');
  process.exit(1);
}

// Init Firebase Admin
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

const db = admin.database();

async function run() {
  console.log(`\n🎫  Assignation des numéros de membre pour ${uids.length} utilisateur(s)...\n`);

  // Lire le compteur actuel
  const counterRef = db.ref('meta/memberCounter');
  const counterSnap = await counterRef.get();
  const currentCounter = counterSnap.val() || 0;

  if (currentCounter > 0) {
    console.log(`⚠️  Le compteur est déjà à ${currentCounter}. Les UIDs fournis recevront les numéros suivants.`);
    console.log('   Si tu relances ce script, les UIDs qui ont déjà un numéro seront ignorés.\n');
  }

  let assigned = 0;
  let skipped = 0;

  for (const uid of uids) {
    const memberRef = db.ref(`users/${uid}/memberNumber`);
    const snap = await memberRef.get();

    if (snap.exists()) {
      console.log(`⏭️  ${uid} → déjà N°${String(snap.val()).padStart(5, '0')} (ignoré)`);
      skipped++;
      continue;
    }

    // Incrémenter le compteur atomiquement
    const result = await counterRef.transaction((current) => (current || 0) + 1);

    if (result.committed) {
      const memberNumber = result.snapshot.val();
      await memberRef.set(memberNumber);
      console.log(`✅  ${uid} → N°${String(memberNumber).padStart(5, '0')}`);
      assigned++;
    }
  }

  const finalCounter = (await counterRef.get()).val();
  console.log(`\n📊  Résultat : ${assigned} assigné(s), ${skipped} ignoré(s)`);
  console.log(`🔢  Compteur final : ${finalCounter}`);
  console.log('\nLes prochains abonnés recevront automatiquement la suite via le webhook.\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Erreur :', err);
  process.exit(1);
});
