import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

const FALLBACK_WORDS = [
  'chien', 'magie', 'brave', 'solde', 'fleur', 'monde', 'arbre', 'poule',
  'table', 'noire', 'porte', 'route', 'froid', 'pluie', 'nuage', 'champ',
  'verre', 'balle', 'coeur', 'lampe', 'rouge', 'blanc', 'pierre', 'livre',
  'bruit', 'sable', 'grace', 'prise', 'ferme', 'foret',
];

let _targetsCache = null;
function getTargetWords() {
  if (_targetsCache) return _targetsCache;
  try {
    const text = fs.readFileSync(path.join(process.cwd(), 'public/data/wordle_targets.txt'), 'utf8');
    _targetsCache = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length === WORD_LENGTH);
    return _targetsCache;
  } catch {
    return FALLBACK_WORDS;
  }
}

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
 * GET /api/daily/wordle/alternative?date=YYYY-MM-DD&uid=xxx
 * Returns { token } — encrypted alternative word, unique per user via HMAC
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const uid = searchParams.get('uid') || null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Missing or invalid date' }, { status: 400 });
  }

  // Récupérer les mots des 30 prochains jours depuis Firebase pour les exclure
  const excludedWords = new Set();
  try {
    const app = getFirebaseAdmin();
    if (app) {
      const today = new Date(date + 'T12:00:00');
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d.toISOString().split('T')[0];
      });
      const snaps = await Promise.all(
        dates.map(d => admin.database().ref(`daily/wordle/${d}/word`).get())
      );
      snaps.forEach(snap => { if (snap.exists()) excludedWords.add(snap.val().toLowerCase()); });
    }
  } catch { /* non-bloquant */ }

  const allWords = getTargetWords();
  const candidates = allWords.filter(w => !excludedWords.has(w));
  const pool = candidates.length > 0 ? candidates : allWords;

  // Sélection déterministe par HMAC(uid+date) — unique par utilisateur
  let index;
  if (uid) {
    const hmac = crypto.createHmac('sha256', getKey());
    hmac.update(`${uid}:${date}`);
    const digest = hmac.digest();
    index = digest.readUInt32BE(0) % pool.length;
  } else {
    const dayIndex = Math.floor(new Date(date).getTime() / 86400000);
    index = dayIndex % pool.length;
  }

  const altWord = pool[index];
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
