/**
 * Rate Limiter - Upstash Redis avec fallback in-memory
 *
 * Utilise Upstash Redis pour un rate limiting distribué (serverless-friendly).
 * Fallback vers in-memory si Upstash n'est pas configuré.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Rate limit configurations par type d'action
 */
const RATE_LIMIT_CONFIGS = {
  // API routes - standard
  api: { requests: 100, window: '1m' },

  // Création de room
  createRoom: { requests: 10, window: '1h' },

  // Join room (protection brute force)
  joinRoom: { requests: 20, window: '1m' },

  // Buzz (anti-spam)
  buzz: { requests: 5, window: '1s' },

  // Auth endpoints
  auth: { requests: 10, window: '15m' },
};

// ============================================
// UPSTASH RATE LIMITER
// ============================================

let redis = null;
let rateLimiters = {};
let useUpstash = false;

// Initialize Upstash if configured
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Create rate limiters for each action
    for (const [action, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
      rateLimiters[action] = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        analytics: true,
        prefix: `ratelimit:${action}`,
      });
    }

    useUpstash = true;
    console.log('[Rate Limit] Using Upstash Redis');
  } catch (error) {
    console.error('[Rate Limit] Failed to initialize Upstash:', error);
    useUpstash = false;
  }
} else {
  console.log('[Rate Limit] Upstash not configured, using in-memory fallback');
}

// ============================================
// IN-MEMORY FALLBACK
// ============================================

const inMemoryStore = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupInMemory() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}

function parseWindow(window) {
  const match = window.match(/^(\d+)(s|m|h)$/);
  if (!match) return 60000; // default 1 minute

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return 60000;
  }
}

function checkInMemoryRateLimit(identifier, action) {
  cleanupInMemory();

  const config = RATE_LIMIT_CONFIGS[action] || RATE_LIMIT_CONFIGS.api;
  const windowMs = parseWindow(config.window);
  const key = `${action}:${identifier}`;
  const now = Date.now();

  let record = inMemoryStore.get(key);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    inMemoryStore.set(key, record);

    return {
      success: true,
      remaining: config.requests - 1,
      resetIn: windowMs,
    };
  }

  record.count++;

  if (record.count > config.requests) {
    return {
      success: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  return {
    success: true,
    remaining: config.requests - record.count,
    resetIn: record.resetTime - now,
  };
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Vérifie si une requête est rate limited
 * @param {string} identifier - IP ou user ID
 * @param {string} action - Type d'action (clé de RATE_LIMIT_CONFIGS)
 * @returns {Promise<{ success: boolean, remaining: number, resetIn: number }>}
 */
export async function checkRateLimit(identifier, action = 'api') {
  // Use Upstash if available
  if (useUpstash && rateLimiters[action]) {
    try {
      const result = await rateLimiters[action].limit(identifier);

      return {
        success: result.success,
        remaining: result.remaining,
        resetIn: result.reset ? result.reset - Date.now() : 60000,
      };
    } catch (error) {
      console.error('[Rate Limit] Upstash error, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }

  // Fallback to in-memory
  return checkInMemoryRateLimit(identifier, action);
}

/**
 * Extrait l'IP d'une requête Next.js
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
  // Vercel/Cloudflare headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  return 'unknown';
}

/**
 * Helper pour créer une réponse 429
 * @param {number} resetIn - Temps avant reset en ms
 * @returns {Response}
 */
export function rateLimitResponse(resetIn) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetIn / 1000)),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Export des configs pour référence
 */
export const RATE_LIMITS = RATE_LIMIT_CONFIGS;
