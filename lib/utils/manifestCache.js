/**
 * Manifest Cache - Singleton cache for quiz and alibi manifests
 * Prevents refetching on every page load
 */

const cache = {
  quizzes: null,
  alibis: null,
  lastFetch: {
    quizzes: 0,
    alibis: 0
  }
};

// Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get quiz manifest with caching
 */
export async function getQuizManifest() {
  const now = Date.now();

  if (cache.quizzes && (now - cache.lastFetch.quizzes) < CACHE_DURATION) {
    return cache.quizzes;
  }

  try {
    const res = await fetch('/data/manifest.json');
    const data = await res.json();
    cache.quizzes = data.quizzes || [];
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
