/**
 * Next.js Middleware - Rate Limiting & Security
 *
 * Applique le rate limiting sur les routes API et protège contre le spam.
 */

import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitResponse } from './lib/rate-limit';

/**
 * Routes et leurs configurations de rate limit
 */
const ROUTE_CONFIGS = [
  // Spotify token - modéré
  { pattern: /^\/api\/spotify\/token/, action: 'spotifyToken' },

  // Autres API - standard
  { pattern: /^\/api\//, action: 'api' },
];

/**
 * Routes à exclure du rate limiting
 */
const EXCLUDED_ROUTES = [
  '/_next',
  '/favicon.ico',
  '/icon.svg',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip excluded routes
  if (EXCLUDED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip non-API routes for rate limiting (static pages, etc.)
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
 * Configuration du middleware
 * Matcher pour les routes où le middleware s'applique
 */
export const config = {
  matcher: [
    // API routes
    '/api/:path*',
  ],
};
