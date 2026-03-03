import crypto from 'crypto';
import admin from 'firebase-admin';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

// Mots de fallback (exclura le mot du jour)
const FALLBACK_WORDS = [
  'chien', 'magie', 'brave', 'solde', 'fleur',
  'monde', 'arbre', 'poule', 'table', 'noire',
  'porte', 'route', 'froid', 'pluie', 'nuage',
];

function getFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.apps[0];
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!b64 || !dbUrl) return null;
  try {
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: dbUrl });
    return admin.apps[0];
  } catch { return null; }
}

function getKey() {
  const secret = process.env.ALT_WORD_SECRET || process.env.SEMANTIC_API_KEY || 'gigglz_alt_fallback_key_2026';
  return crypto.scryptSync(secret, 'gigglz_alt_salt', 32);
}

function encryptWord(word) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(word, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64url');
}

function decryptToken(token) {
  const key = getKey();
  const buf = Buffer.from(token, 'base64url');
  const iv = buf.subarray(0, 16);
  const encrypted = buf.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
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
    if (g[i] === t[i]) { result[i] = 'correct'; targetUsed[i] = true; }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const found = t.findIndex((c, j) => !targetUsed[j] && c === g[i]);
    if (found !== -1) { result[i] = 'present'; targetUsed[found] = true; }
  }
  return result;
}

/**
 * GET /api/daily/wordle/alternative?date=YYYY-MM-DD
 * Returns { token } — encrypted alternative word
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Missing or invalid date' }, { status: 400 });
  }

  // Récupérer le mot du jour pour l'exclure
  let todayWord = null;
  try {
    const app = getFirebaseAdmin();
    if (app) {
      const snap = await admin.database().ref(`daily/wordle/${date}/word`).get();
      if (snap.exists()) todayWord = snap.val().toLowerCase();
    }
  } catch { /* non-bloquant */ }

  const candidates = FALLBACK_WORDS.filter((w) => w !== todayWord);
  const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
  const altWord = candidates[dayIndex % candidates.length];

  const token = encryptWord(altWord);
  return Response.json({ token });
}

/**
 * POST /api/daily/wordle/alternative
 * Body: { guess, token, attemptNumber }
 * Returns { feedback, isWin, isLoss }
 */
export async function POST(request) {
  try {
    const { guess, token, attemptNumber } = await request.json();

    if (!guess || !token || typeof guess !== 'string' || guess.length !== WORD_LENGTH) {
      return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    let word;
    try {
      word = decryptToken(token);
    } catch {
      return Response.json({ error: 'Token invalide' }, { status: 400 });
    }

    const feedback = computeFeedback(guess, word);
    const isWin = normalize(guess) === normalize(word);
    const isLoss = !isWin && typeof attemptNumber === 'number' && attemptNumber >= MAX_ATTEMPTS;

    return Response.json({
      feedback,
      isWin,
      isLoss,
      revealedWord: isLoss ? word : null,
    });
  } catch (err) {
    console.error('[wordle/alternative]', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
