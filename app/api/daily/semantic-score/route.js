import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// ─── Firebase Admin ────────────────────────────────────────────────────────────
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
    console.error('[semantic-score] Firebase init error:', e);
    return null;
  }
}

// ─── Cache embeddings en mémoire (survit entre requêtes dans le même worker) ──
// clé = date, valeur = Float32Array embedding du mot cible
const TARGET_EMBEDDING_CACHE = new Map();

// ─── HuggingFace Inference API ─────────────────────────────────────────────────
const HF_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const HF_BASE  = 'https://api-inference.huggingface.co/models';

async function getEmbedding(text) {
  const headers = { 'Content-Type': 'application/json' };
  const token = process.env.HUGGING_FACE_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${HF_BASE}/${HF_MODEL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  // HF renvoie [[float...]] pour sentence-transformers (batch de 1)
  // ou [float...] selon les versions → on normalise
  const vec = Array.isArray(data[0]) ? data[0] : data;
  return vec;
}

// ─── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── Normalisation score ──────────────────────────────────────────────────────
// Les sentence-transformers retournent cosine ≈ 0.2–0.9 pour des mots en français.
// On remapped sur [0, 1] avec :
//   score < 0.2 → "glacial"  → renvoyer 0 ou négatif
//   score = 1.0 → "trouvé"   (exact match détecté avant)
//
// Le seuil 0.15 (baseline) calibré pour paraphrase-multilingual-MiniLM-L12-v2.
const BASELINE = 0.15; // similarité cosine d'un mot complètement hors-sujet

function normalizeScore(cosine) {
  // Ramener à [-0.2, 0.99] en retirant la baseline
  const shifted = cosine - BASELINE;
  const range   = 1 - BASELINE;          // valeur max attendue après shift
  const scaled  = shifted / range;        // [-x, 0.99]
  return Math.max(-0.2, Math.min(0.99, scaled));
}

// ─── Route principale ──────────────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, guess } = body;

  if (!date || !guess) {
    return NextResponse.json({ error: 'date et guess requis' }, { status: 400 });
  }

  // 1. Lire le mot cible depuis Firebase (jamais envoyé au client en clair)
  const app = getFirebaseAdmin();
  if (!app) {
    return NextResponse.json({ error: 'Firebase Admin indisponible' }, { status: 500 });
  }

  const database = admin.database();
  const wordSnap = await database.ref(`daily/semantic/${date}/word`).get();

  if (!wordSnap.exists()) {
    return NextResponse.json({ error: 'Pas de mot pour cette date' }, { status: 404 });
  }

  const targetWord = wordSnap.val().toLowerCase().trim();
  const normalizedGuess = guess.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedTarget = targetWord
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2. Match exact → victoire
  if (normalizedGuess === normalizedTarget || guess.toLowerCase().trim() === targetWord) {
    return NextResponse.json({
      score: 1,
      rank: 0,
      solved: true,
      targetWord,
    });
  }

  // 3. Obtenir l'embedding du mot cible (mis en cache par date)
  if (!TARGET_EMBEDDING_CACHE.has(date)) {
    try {
      const emb = await getEmbedding(targetWord);
      TARGET_EMBEDDING_CACHE.set(date, emb);
      // Nettoyer les dates passées (garder seulement les 3 dernières)
      if (TARGET_EMBEDDING_CACHE.size > 3) {
        const oldest = TARGET_EMBEDDING_CACHE.keys().next().value;
        TARGET_EMBEDDING_CACHE.delete(oldest);
      }
    } catch (e) {
      console.error('[semantic-score] Embedding target error:', e.message);
      return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 503 });
    }
  }

  const targetEmb = TARGET_EMBEDDING_CACHE.get(date);

  // 4. Obtenir l'embedding du mot deviné
  let guessEmb;
  try {
    guessEmb = await getEmbedding(normalizedGuess);
  } catch (e) {
    console.error('[semantic-score] Embedding guess error:', e.message);
    return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 503 });
  }

  // 5. Calculer et normaliser la similarité
  const cosine = cosineSimilarity(targetEmb, guessEmb);
  const score  = normalizeScore(cosine);

  return NextResponse.json({
    score,
    rank: 9999, // sans pré-calcul du dictionnaire complet, rang inconnu
    solved: false,
  });
}
