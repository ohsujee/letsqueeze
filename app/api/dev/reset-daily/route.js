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

// Mots 5 lettres — jamais retournés au client
const WORD_POOL = [
  'nuage', 'calme', 'bulle', 'pluie', 'vague',
  'perle', 'boire', 'ombre', 'fuite', 'coude',
  'geste', 'ferme', 'douce', 'comte', 'bague',
  'pomme', 'carte', 'livre', 'roule', 'fonte',
];

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
    gameNode = 'daily/wordle',
  } = body;

  const today = date || new Date().toISOString().split('T')[0];
  const database = admin.database();

  // Choisir un mot aléatoire (serveur uniquement — jamais renvoyé)
  const word = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];

  // Effacer le leaderboard
  await database.ref(`${gameNode}/${today}/leaderboard`).remove();

  // Poser le nouveau mot
  await database.ref(`${gameNode}/${today}/word`).set(word);

  return NextResponse.json({ ok: true, date: today, gameNode });
}
