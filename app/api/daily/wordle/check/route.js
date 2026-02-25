import admin from 'firebase-admin';

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

  if (!serviceAccountBase64 || !databaseURL) return null;

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
    );
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL });
    return admin.apps[0];
  } catch {
    return null;
  }
}

function normalize(str) {
  return str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function computeFeedback(guess, target) {
  const g = normalize(guess).split('');
  const t = normalize(target).split('');
  const result = Array(WORD_LENGTH).fill('absent');
  const targetUsed = Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === t[i]) {
      result[i] = 'correct';
      targetUsed[i] = true;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const found = t.findIndex((c, j) => !targetUsed[j] && c === g[i]);
    if (found !== -1) {
      result[i] = 'present';
      targetUsed[found] = true;
    }
  }
  return result;
}

export async function POST(request) {
  try {
    const { guess, date, attemptNumber } = await request.json();

    if (!guess || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    if (typeof guess !== 'string' || guess.length !== WORD_LENGTH) {
      return Response.json({ error: 'Mot invalide' }, { status: 400 });
    }

    const app = getFirebaseAdmin();
    if (!app) return Response.json({ error: 'Erreur serveur' }, { status: 503 });

    const db = admin.database();
    const snap = await db.ref(`daily/wordle/${date}/word`).get();

    let word;
    if (snap.exists()) {
      word = snap.val().toLowerCase();
    } else {
      // Fallback déterministe par date (même logique que l'ancienne page)
      const words = ['chien', 'magie', 'brave', 'solde', 'fleur', 'monde', 'arbre', 'poule', 'table', 'noire'];
      const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
      word = words[dayIndex % words.length];
    }

    const feedback = computeFeedback(guess, word);
    const isWin = normalize(guess) === normalize(word);
    const isLoss = !isWin && typeof attemptNumber === 'number' && attemptNumber >= MAX_ATTEMPTS;

    return Response.json({
      feedback,
      isWin,
      revealedWord: isLoss ? word : null,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
