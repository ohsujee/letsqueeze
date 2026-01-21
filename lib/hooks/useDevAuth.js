/**
 * useDevAuth - Dev-only authentication bypass
 *
 * Detects ?devAuth=UID in URL and automatically signs in as that user.
 * Only works in development (localhost).
 *
 * Usage:
 *   // In a component/page that loads early (e.g., layout or onboarding)
 *   const { isDevAuth, loading, error } = useDevAuth();
 *
 *   // Or with auto-redirect after auth
 *   useDevAuth({ redirectTo: '/home' });
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, signInWithCustomToken } from '@/lib/firebase';

/**
 * Check if we're in development environment
 */
function isDevelopment() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Hook to handle dev authentication bypass
 * @param {Object} options
 * @param {string} options.redirectTo - URL to redirect after successful auth
 * @returns {Object} { isDevAuth, loading, error, devUid }
 */
export function useDevAuth(options = {}) {
  const { redirectTo } = options;
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isDevAuth, setIsDevAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devUid, setDevUid] = useState(null);

  useEffect(() => {
    // Only run in development
    if (!isDevelopment()) return;

    const devAuthUid = searchParams.get('devAuth');
    if (!devAuthUid) return;

    // Don't re-authenticate if already signed in as this user
    if (auth.currentUser?.uid === devAuthUid) {
      setIsDevAuth(true);
      setDevUid(devAuthUid);
      return;
    }

    const performDevAuth = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[DevAuth] Authenticating as:', devAuthUid);

        // Call the dev auth API to get a custom token
        const response = await fetch(`/api/dev/auth?uid=${encodeURIComponent(devAuthUid)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get auth token');
        }

        // Sign in with the custom token
        await signInWithCustomToken(auth, data.token);

        console.log('[DevAuth] Successfully authenticated as:', devAuthUid);
        setIsDevAuth(true);
        setDevUid(devAuthUid);

        // Redirect if specified (remove devAuth param from URL)
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          // Remove devAuth param from URL without redirect
          const url = new URL(window.location.href);
          url.searchParams.delete('devAuth');
          window.history.replaceState({}, '', url.toString());
        }
      } catch (err) {
        console.error('[DevAuth] Authentication failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    performDevAuth();
  }, [searchParams, redirectTo, router]);

  return {
    isDevAuth,
    loading,
    error,
    devUid,
  };
}

/**
 * Helper function to generate dev auth URL
 * @param {string} uid - The UID to authenticate as
 * @param {string} path - The path to navigate to (default: '/home')
 * @returns {string} The full URL with devAuth parameter
 */
export function getDevAuthUrl(uid, path = '/home') {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${path}?devAuth=${encodeURIComponent(uid)}`;
}

export default useDevAuth;
