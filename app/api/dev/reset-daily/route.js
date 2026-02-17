import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!projectId || !databaseURL) return null;

  try {
    if (clientEmail && privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      });
    }
    return admin.initializeApp({ projectId, databaseURL });
  } catch (e) {
    console.error('[reset-daily] Init error:', e);
    return null;
  }
}

// Mots 5 lettres pour Mot Mystère — jamais retournés au client
const WORDLE_WORD_POOL = [
  'nuage', 'calme', 'bulle', 'pluie', 'vague',
  'perle', 'boire', 'ombre', 'fuite', 'coude',
  'geste', 'ferme', 'douce', 'comte', 'bague',
  'pomme', 'carte', 'livre', 'roule', 'fonte',
];

// Mots pour Sémantique — longueur variée, thèmes riches en voisins sémantiques
const SEMANTIC_WORD_POOL = [
  'musique', 'soleil', 'montagne', 'voyage', 'cuisine',
  'jardin', 'animal', 'enfant', 'nature', 'lumiere',
  'famille', 'reve', 'ocean', 'foret', 'silence',
  'amour', 'danse', 'sport', 'ecole', 'maison',
];

function pickRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
  }

  const body = await request.json();
  const {
    date,
    game = 'both', // 'wordle' | 'semantic' | 'both'
  } = body;

  const today = date || new Date().toISOString().split('T')[0];
  const database = admin.database();
  const results = {};

  // ── Réinitialiser Mot Mystère ─────────────────────────────────────────────
  if (game === 'wordle' || game === 'both') {
    const wordleWord = pickRandom(WORDLE_WORD_POOL);
    await database.ref(`daily/wordle/${today}/leaderboard`).remove();
    await database.ref(`daily/wordle/${today}/word`).set(wordleWord);
    results.wordle = { ok: true };
  }

  // ── Réinitialiser Sémantique ───────────────────────────────────────────────
  if (game === 'semantic' || game === 'both') {
    const semanticWord = pickRandom(SEMANTIC_WORD_POOL);
    await database.ref(`daily/semantic/${today}/leaderboard`).remove();
    await database.ref(`daily/semantic/${today}/word`).set(semanticWord);
    results.semantic = { ok: true };
  }

  return NextResponse.json({ ok: true, date: today, ...results });
}
