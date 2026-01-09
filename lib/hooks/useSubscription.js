'use client';

import { useState, useEffect } from 'react';
import { isPro, getUserTier } from '../subscription';
import { getAdminStatus } from '../admin';

/**
 * Hook to get user's subscription status
 *
 * @param {Object} user - Firebase user object
 * @returns {Object} - Subscription status and utilities
 */
export const useSubscription = (user) => {
  const [status, setStatus] = useState({
    isLoading: true,
    isPro: false,
    isAdmin: false,
    tier: null,
    adminStatus: null
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        isLoading: false,
        isPro: false,
        isAdmin: false,
        tier: null,
        adminStatus: null
      });
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
  }, [user]);

  return status;
};
