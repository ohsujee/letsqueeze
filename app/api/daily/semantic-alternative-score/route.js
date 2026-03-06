import crypto from 'crypto';

function getKey() {
  const secret = process.env.ALT_WORD_SECRET || process.env.SEMANTIC_API_KEY || 'gigglz_alt_fallback_key_2026';
  return crypto.scryptSync(secret, 'gigglz_alt_salt', 32);
}

function decryptToken(token) {
  const key = getKey();
  const buf = Buffer.from(token, 'base64url');
  const iv = buf.subarray(0, 16);
  const encrypted = buf.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * POST /api/daily/semantic-alternative-score
 * Body: { date, word, token }
 * Returns { rank, similarity, solved } — scored against the decrypted alternative word
 */
export async function POST(request) {
  try {
    const { date, word, token } = await request.json();

    if (!date || !word || !token) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    let altWord;
    try {
      altWord = decryptToken(token);
    } catch {
      return Response.json({ error: 'Token invalide' }, { status: 400 });
    }

    const apiUrl = process.env.SEMANTIC_API_URL;
    const apiKey = process.env.SEMANTIC_API_KEY;

    if (!apiUrl || !apiKey) {
      return Response.json({ error: 'API non configurée' }, { status: 503 });
    }

    const res = await fetch(`${apiUrl}/score-direct/${encodeURIComponent(altWord)}/${encodeURIComponent(word)}`, {
      headers: { 'x-api-key': apiKey },
    });

    if (res.status === 404) {
      return Response.json({ error: 'Mot non reconnu' }, { status: 404 });
    }
    if (res.status === 422) {
      return Response.json({ error: 'inflected' }, { status: 422 });
    }
    if (!res.ok) {
      return Response.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error('[semantic-alternative-score]', err);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
