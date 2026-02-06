import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that should NOT redirect to download page (accessible from browser)
const ALLOWED_PATHS = [
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
];

// Check if path starts with any allowed prefix
function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.some(allowed => pathname.startsWith(allowed));
}

// Check if request is from Capacitor native app
function isNativeApp(userAgent: string): boolean {
  // Capacitor adds these to the user agent
  return userAgent.includes('Capacitor') || userAgent.includes('capacitor');
}

// Check if it's a bot/crawler (we want them to index the pages)
function isBot(userAgent: string): boolean {
  const botPatterns = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'applebot',
  ];
  const ua = userAgent.toLowerCase();
  return botPatterns.some(bot => ua.includes(bot));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';

  // Allow bots to crawl
  if (isBot(userAgent)) {
    return NextResponse.next();
  }

  // Allow native app requests
  if (isNativeApp(userAgent)) {
    return NextResponse.next();
  }

  // Allow specific paths
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Allow root path (splash/home might be useful to see)
  if (pathname === '/' || pathname === '/home' || pathname === '/splash') {
    return NextResponse.next();
  }

  // Redirect browser users to download page
  const url = request.nextUrl.clone();
  url.pathname = '/download';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
