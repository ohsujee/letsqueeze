'use client';

import { useState, useEffect } from 'react';
import { isPro, getUserTier, canAccessPack, canPlayGame, getRemainingGames } from '../subscription';
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

/**
 * Hook to check pack access
 *
 * @param {Object} user - Firebase user object
 * @param {string} gameType - 'quiz' or 'alibi'
 * @returns {Function} - Function to check if pack is accessible
 */
export const usePackAccess = (user, gameType) => {
  return (packIndex) => {
    return canAccessPack(user, gameType, packIndex);
  };
};

/**
 * Hook to check game limits
 *
 * @param {Object} user - Firebase user object
 * @param {string} gameType - 'quiz' or 'alibi'
 * @param {number} gamesPlayedToday - Number of games played today
 * @returns {Object} - Game limit information
 */
export const useGameLimits = (user, gameType, gamesPlayedToday = 0) => {
  const [limits, setLimits] = useState({
    canPlay: true,
    remaining: null,
    isUnlimited: false
  });

  useEffect(() => {
    const userCanPlay = canPlayGame(user, gameType, gamesPlayedToday);
    const remaining = getRemainingGames(user, gameType, gamesPlayedToday);

    setLimits({
      canPlay: userCanPlay,
      remaining,
      isUnlimited: remaining === null
    });
  }, [user, gameType, gamesPlayedToday]);

  return limits;
};

export default {
  useSubscription,
  usePackAccess,
  useGameLimits
};
