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
    console.error('[reset-leaderboards] Init error:', e);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key || key !== process.env.SEMANTIC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
  }

  const database = admin.database();

  // Lire toutes les dates sous daily/wordle et daily/semantic
  const [wordleSnap, semanticSnap] = await Promise.all([
    database.ref('daily/wordle').once('value'),
    database.ref('daily/semantic').once('value'),
  ]);

  const tasks = [];

  if (wordleSnap.exists()) {
    Object.keys(wordleSnap.val()).forEach((date) => {
      tasks.push(database.ref(`daily/wordle/${date}/leaderboard`).remove());
    });
  }

  if (semanticSnap.exists()) {
    Object.keys(semanticSnap.val()).forEach((date) => {
      tasks.push(database.ref(`daily/semantic/${date}/leaderboard`).remove());
    });
  }

  await Promise.all(tasks);

  return NextResponse.json({
    ok: true,
    message: `${tasks.length} nœud(s) leaderboard supprimé(s)`,
  });
}
