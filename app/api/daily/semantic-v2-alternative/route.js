import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let _semanticWordsCache = null;
function getSemanticWords() {
  if (_semanticWordsCache) return _semanticWordsCache;
  try {
    const text = fs.readFileSync(path.join(process.cwd(), 'public/data/semantic_words.txt'), 'utf8');
    _semanticWordsCache = text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
    return _semanticWordsCache;
  } catch {
    return [];
  }
}

function getSemanticWordForDate(words, dateStr) {
  const hash = crypto.createHash('sha256').update(dateStr).digest();
  const n = hash.readUInt32BE(0);
  return words[n % words.length];
}

function getKey() {
  const secret = process.env.ALT_WORD_SECRET || (process.env.SEMANTIC_V2_API_KEY || process.env.SEMANTIC_API_KEY) || 'gigglz_alt_fallback_key_2026';
  return crypto.scryptSync(secret, 'gigglz_alt_salt', 32);
}

function encryptWord(word) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(word, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64url');
}

/**
 * GET /api/daily/semantic-alternative?date=YYYY-MM-DD&uid=xxx
 * Returns { token } — encrypted alternative word, unique per user via HMAC
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const uid = searchParams.get('uid') || null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Missing or invalid date' }, { status: 400 });
  }

  const words = getSemanticWords();
  if (!words.length) {
    return Response.json({ error: 'Word list unavailable' }, { status: 503 });
  }

  // Exclure les mots des 60 prochains jours
  const excludedWords = new Set();
  const today = new Date(date + 'T12:00:00');
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    excludedWords.add(getSemanticWordForDate(words, d.toISOString().split('T')[0]));
  }

  const pool = words.filter(w => !excludedWords.has(w));
  const candidates = pool.length > 0 ? pool : words;

  // Sélection déterministe par HMAC(uid+date) — unique par utilisateur
  let index;
  if (uid) {
    const hmac = crypto.createHmac('sha256', getKey());
    hmac.update(`sem:${uid}:${date}`);
    const digest = hmac.digest();
    index = digest.readUInt32BE(0) % candidates.length;
  } else {
    const hash = crypto.createHash('sha256').update(`sem:anon:${date}`).digest();
    index = hash.readUInt32BE(0) % candidates.length;
  }

  const altWord = candidates[index];
  const token = encryptWord(altWord);
  return Response.json({ token });
}
