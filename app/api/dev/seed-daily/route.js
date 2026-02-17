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
    console.error('[seed-daily] Init error:', e);
    return null;
  }
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
    uid,
    name = 'Moi',
    score = 2000,
    attempts = 3,
    timeMs = 90000,
    date,          // YYYY-MM-DD, defaults to today
    gameNode = 'daily/wordle',
  } = body;

  if (!uid) {
    return NextResponse.json({ error: 'uid is required' }, { status: 400 });
  }

  const today = date || new Date().toISOString().split('T')[0];
  const db = admin.database();
  const path = `${gameNode}/${today}/leaderboard/${uid}`;

  await db.ref(path).set({
    name,
    score,
    attempts,
    solved: true,
    timeMs,
    completedAt: Date.now(),
  });

  return NextResponse.json({ ok: true, path, date: today });
}
