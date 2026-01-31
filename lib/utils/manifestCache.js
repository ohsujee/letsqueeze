/**
 * Manifest Cache - Singleton cache for quiz and alibi manifests
 * Prevents refetching on every page load
 */

const cache = {
  quizzes: null,
  alibis: null,
  questionCounts: {}, // Cache des counts par database id
  lastFetch: {
    quizzes: 0,
    alibis: 0
  }
};

// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Fetch question count from a database file
 */
async function fetchQuestionCount(databaseId) {
  // Return cached count if available
  if (cache.questionCounts[databaseId] !== undefined) {
    return cache.questionCounts[databaseId];
  }

  try {
    const res = await fetch(`/data/${databaseId}.json`);
    if (!res.ok) {
      cache.questionCounts[databaseId] = 0;
      return 0;
    }
    const data = await res.json();
    const count = data.items?.length || 0;
    cache.questionCounts[databaseId] = count;
    return count;
  } catch (err) {
    console.error(`Failed to fetch question count for ${databaseId}:`, err);
    cache.questionCounts[databaseId] = 0;
    return 0;
  }
}

/**
 * Get quiz manifest with caching (returns categories with nested themes)
 * Uses questionCount from manifest directly (no extra fetches)
 */
export async function getQuizManifest() {
  const now = Date.now();

  if (cache.quizzes && (now - cache.lastFetch.quizzes) < CACHE_DURATION) {
    return cache.quizzes;
  }

  try {
    const res = await fetch('/data/manifest.json');
    const data = await res.json();
    const categories = data.categories || [];

    cache.quizzes = categories;
    cache.lastFetch.quizzes = now;
    return cache.quizzes;
  } catch (err) {
    console.error('Failed to fetch quiz manifest:', err);
    return cache.quizzes || [];
  }
}

/**
 * Get alibi manifest with caching
 */
export async function getAlibiManifest() {
  const now = Date.now();

  if (cache.alibis && (now - cache.lastFetch.alibis) < CACHE_DURATION) {
    return cache.alibis;
  }

  try {
    const res = await fetch('/data/alibis/manifest.json');
    const data = await res.json();
    cache.alibis = data.alibis || [];
    cache.lastFetch.alibis = now;
    return cache.alibis;
  } catch (err) {
    console.error('Failed to fetch alibi manifest:', err);
    return cache.alibis || [];
  }
}

/**
 * Prefetch all manifests (call on app start)
 */
export function prefetchManifests() {
  getQuizManifest();
  getAlibiManifest();
}
