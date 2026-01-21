/**
 * useAuthProtect - Protection des pages authentifiées
 *
 * Gère la vérification d'authentification et les redirections.
 * Remplace le pattern répété dans les pages profile/auth.
 *
 * Usage:
 *   // Basic - redirect to /login if not authenticated
 *   const { user, loading } = useAuthProtect();
 *
 *   // Allow guests (anonymous users)
 *   const { user, loading } = useAuthProtect({ allowGuests: true });
 *
 *   // Custom redirects
 *   const { user, loading } = useAuthProtect({
 *     redirectTo: '/onboarding',
 *     guestRedirect: '/login'
 *   });
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth } from '@/lib/firebase';

/**
 * @param {Object} options
 * @param {boolean} options.allowGuests - Allow anonymous users (default: false)
 * @param {string} options.redirectTo - Redirect if not authenticated (default: '/login')
 * @param {string} options.guestRedirect - Redirect guests if not allowed (default: '/profile')
 * @param {boolean} options.required - If false, don't redirect, just return state (default: true)
 * @returns {Object} { user, loading, isGuest, isAuthenticated }
 */
export function useAuthProtect(options = {}) {
  const {
    allowGuests = false,
    redirectTo = '/login',
    guestRedirect = '/profile',
    required = true,
  } = options;

  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // No user - redirect to login if required
        if (required) {
          router.push(redirectTo);
        } else {
          setLoading(false);
        }
      } else if (currentUser.isAnonymous && !allowGuests) {
        // Guest user but guests not allowed - redirect
        if (required) {
          router.push(guestRedirect);
        } else {
          setUser(currentUser);
          setLoading(false);
        }
      } else {
        // Authenticated user (or guest if allowed)
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, allowGuests, redirectTo, guestRedirect, required]);

  return {
    user,
    loading,
    isGuest: user?.isAnonymous ?? false,
    isAuthenticated: !!user && !user.isAnonymous,
  };
}

export default useAuthProtect;
