'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

/**
 * Paths accessible from browser (no redirect to /download)
 */
const BROWSER_ALLOWED_PATHS = [
  '/download',
  '/legal',
  '/privacy',
  '/terms',
  '/support',
  '/',
  '/home',
  '/splash',
];

function isBrowserAllowedPath(pathname) {
  return BROWSER_ALLOWED_PATHS.some(allowed =>
    pathname === allowed || pathname.startsWith(allowed + '/')
  );
}

/**
 * Client-side browser redirect.
 * Redirects non-native users to /download for non-allowed paths.
 * Uses Capacitor.isNativePlatform() for reliable native detection.
 */
export default function BrowserRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Native app → never redirect
    if (Capacitor.isNativePlatform()) return;

    // Dev mode → never redirect
    if (process.env.NODE_ENV === 'development') return;

    // Localhost → never redirect
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return;
      }
    }

    // Browser on allowed path → OK
    if (isBrowserAllowedPath(pathname)) return;

    // Browser on non-allowed path → redirect to download
    router.replace('/download');
  }, [pathname, router]);

  return null;
}
