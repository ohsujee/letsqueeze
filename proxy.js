/**
 * Next.js Proxy - Rate Limiting & Security
 *
 * - Rate limiting sur les routes API
 * - Browser redirect handled client-side (see BrowserRedirect component)
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

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
