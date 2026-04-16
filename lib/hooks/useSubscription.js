'use client';

import { useState, useEffect } from 'react';
import { isPro, getUserTier } from '../subscription';
import { getAdminStatus } from '../admin';

const PRO_CACHE_KEY = 'lq_isPro';

/** Read cached Pro status from sessionStorage (survives navigation, not refresh). */
function getCachedPro() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(PRO_CACHE_KEY) === '1';
}

/** Persist Pro status so subsequent page loads don't flash non-Pro UI. */
function setCachedPro(value) {
  if (typeof window === 'undefined') return;
  if (value) sessionStorage.setItem(PRO_CACHE_KEY, '1');
  else sessionStorage.removeItem(PRO_CACHE_KEY);
}

/**
 * Hook to get user's subscription status
 *
 * @param {Object} user - Firebase user object (merged with subscription data)
 * @returns {Object} - Subscription status and utilities
 */
export const useSubscription = (user) => {
  const [status, setStatus] = useState(() => ({
    isLoading: true,
    // Use cached Pro status as initial value to prevent flash of non-Pro UI
    // while waiting for onAuthStateChanged → user object to arrive.
    isPro: getCachedPro(),
    isAdmin: false,
    tier: null,
    adminStatus: null
  }));

  useEffect(() => {
    if (!user) {
      // Don't clear cached Pro status here — user is null both during
      // pre-auth loading AND after actual logout. Clearing here would
      // defeat the purpose of the cache (preventing non-Pro UI flash).
      // The cache is only cleared when we positively know the user is not Pro.
      setStatus(prev => ({
        ...prev,
        isLoading: false,
      }));
      return;
    }

    const userIsPro = isPro(user);
    const tierInfo = getUserTier(user);
    const adminMsg = getAdminStatus(user);

    setStatus({
      isLoading: false,
      isPro: userIsPro,
      isAdmin: tierInfo.isAdmin,
      tier: tierInfo,
      adminStatus: adminMsg
    });
    setCachedPro(userIsPro);
  }, [user]);

  return status;
};
