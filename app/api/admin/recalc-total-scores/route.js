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
    console.error('[recalc-total] Init error:', e);
    return null;
  }
}

function computeScore(difference, timeMs) {
  const precision = Math.max(0, 10000 - Math.round(difference * 100));
  const timeBonus = 99 * Math.exp(-timeMs / 120000);
  return precision + timeBonus;
}

export async function GET(request) {
  const key = request.headers.get('x-api-key');

  if (!key || key !== process.env.SEMANTIC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin not available' }, { status: 500 });
  }

  const database = admin.database();
  const totalSnap = await database.ref('daily/total').once('value');

  if (!totalSnap.exists()) {
    return NextResponse.json({ ok: true, message: 'Aucune donnée total trouvée', updated: 0 });
  }

  const allDates = totalSnap.val();
  let updated = 0;
  const updates = {};

  for (const [date, dateData] of Object.entries(allDates)) {
    if (!dateData.leaderboard) continue;

    for (const [uid, entry] of Object.entries(dateData.leaderboard)) {
      const difference = entry.solved ? 0 : (entry.difference ?? 0);
      const timeMs = entry.timeMs || 0;
      const oldScore = entry.score || 0;
      const newScore = computeScore(difference, timeMs);

      if (newScore !== oldScore) {
        updates[`daily/total/${date}/leaderboard/${uid}/score`] = newScore;
        updated++;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await database.ref().update(updates);
  }

  return NextResponse.json({
    ok: true,
    message: `${updated} score(s) recalculé(s) avec la nouvelle formule`,
    updated,
  });
}
