/**
 * Next.js Proxy - Rate Limiting, Security & Browser Redirect
 *
 * - Rate limiting sur les routes API
 * - Redirection navigateurs vers /download (sauf app native)
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitResponse } from './lib/rate-limit';

/**
 * Routes et leurs configurations de rate limit
 */
const ROUTE_CONFIGS = [
  // API - standard
  { pattern: /^\/api\//, action: 'api' },
];

/**
 * Routes accessibles depuis le navigateur (pas de redirect vers /download)
 */
const BROWSER_ALLOWED_PATHS = [
  '/download',
  '/legal',
  '/privacy',
  '/terms',
  '/support',
  '/.well-known',
  '/api',
  '/icons',
  '/images',
  '/data',
  '/config',
  '/_next',
  '/favicon.ico',
  '/',
  '/home',
  '/splash',
];

/**
 * Check if request is from Capacitor native app
 */
function isNativeApp(userAgent) {
  return userAgent.includes('Capacitor') || userAgent.includes('capacitor');
}

/**
 * Check if it's a bot/crawler
 */
function isBot(userAgent) {
  const botPatterns = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot',
  ];
  const ua = userAgent.toLowerCase();
  return botPatterns.some(bot => ua.includes(bot));
}

/**
 * Check if path is allowed for browser access
 */
function isBrowserAllowedPath(pathname) {
  return BROWSER_ALLOWED_PATHS.some(allowed =>
    pathname === allowed || pathname.startsWith(allowed + '/')
  );
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';

  // === BROWSER REDIRECT LOGIC ===
  // Skip for bots (SEO)
  if (!isBot(userAgent)) {
    // Skip for native app
    if (!isNativeApp(userAgent)) {
      // Skip for allowed paths
      if (!isBrowserAllowedPath(pathname)) {
        // Redirect browser users to download page
        const url = request.nextUrl.clone();
        url.pathname = '/download';
        return NextResponse.redirect(url);
      }
    }
  }

  // === RATE LIMITING LOGIC ===
  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get client identifier
  const clientIP = getClientIP(request);

  // Find matching route config
  const routeConfig = ROUTE_CONFIGS.find(config => config.pattern.test(pathname));
  const action = routeConfig?.action || 'api';

  // Check rate limit (async for Upstash)
  const result = await checkRateLimit(clientIP, action);

  if (!result.success) {
    console.log(`[Rate Limit] Blocked ${clientIP} on ${pathname} (${action})`);
    return rateLimitResponse(result.resetIn);
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)));

  return response;
}

/**
 * Configuration du proxy
 */
export const config = {
  matcher: [
    // All routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
