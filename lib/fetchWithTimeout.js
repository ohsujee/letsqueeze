/**
 * Fetch avec timeout
 *
 * Wrapper autour de fetch qui ajoute un timeout configurable
 */

/**
 * Fetch avec timeout
 * @param {string} url - URL à fetch
 * @param {Object} options - Options fetch standard
 * @param {number} timeout - Timeout en ms (défaut: 10000)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

export default fetchWithTimeout;
