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
    console.error('[semantic-score] Init error:', e);
    return null;
  }
}

function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const word = searchParams.get('word');

  if (!date || !word) {
    return Response.json({ error: 'Missing params' }, { status: 400 });
  }

  // If external API is configured (VPS), use it
  const apiUrl = process.env.SEMANTIC_API_URL;
  const apiKey = process.env.SEMANTIC_API_KEY;

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(`${apiUrl}/score/${date}/${encodeURIComponent(word)}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (res.status === 404) {
        return Response.json({ error: 'Mot non reconnu' }, { status: 404 });
      }
      if (!res.ok) {
        return Response.json({ error: 'Erreur serveur' }, { status: 500 });
      }

      const data = await res.json();
      return Response.json(data);
    } catch {
      return Response.json({ error: 'API indisponible' }, { status: 503 });
    }
  }

  // Fallback: Firebase lookup (scores pre-computed by GitHub Actions)
  try {
    const app = getFirebaseAdmin();
    if (!app) {
      return Response.json({ error: 'Firebase non configuré' }, { status: 503 });
    }

    const wordLower = word.toLowerCase();
    const wordStripped = stripAccents(wordLower);

    const scoresRef = admin.database().ref(`daily/semantic/${date}/scores`);

    // Try exact word, then accent-stripped variant
    let snap = await scoresRef.child(wordLower).get();
    if (!snap.exists() && wordStripped !== wordLower) {
      snap = await scoresRef.child(wordStripped).get();
    }

    if (!snap.exists()) {
      // Not in top 1000 → glacial
      return Response.json({ word, rank: 0, solved: false });
    }

    const rank = snap.val();
    return Response.json({ word, rank, solved: rank >= 1000 });
  } catch (e) {
    console.error('[semantic-score] Firebase error:', e);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
