'use client';

/**
 * useAppReview Hook
 * Manages in-app review logic and native API calls
 *
 * Conditions to show review prompt:
 * - Native platform (iOS/Android)
 * - Installed 7+ days ago
 * - Played 5+ games total
 * - Not asked in last 90 days
 */

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { storage } from '@/lib/utils/storage';

const STORAGE_KEYS = {
  INSTALL_DATE: 'installDate',
  TOTAL_GAMES: 'totalGamesCompleted',
  LAST_REVIEW_ASK: 'lastReviewAskDate',
  REVIEW_DECLINED: 'reviewDeclined',
};

const THRESHOLDS = {
  MIN_DAYS_SINCE_INSTALL: 7,
  MIN_GAMES_COMPLETED: 5,
  MIN_DAYS_BETWEEN_ASKS: 90,
};

/**
 * Calculate days between two dates
 */
function daysSince(dateString) {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Initialize install date if not set
 */
function ensureInstallDate() {
  if (typeof window === 'undefined') return;
  const existing = storage.get(STORAGE_KEYS.INSTALL_DATE);
  if (!existing) {
    storage.set(STORAGE_KEYS.INSTALL_DATE, new Date().toISOString());
  }
}

/**
 * Check if all conditions are met to show review prompt
 */
function canAskForReview() {
  if (typeof window === 'undefined') return false;

  // Only on native platforms
  if (!Capacitor.isNativePlatform()) return false;

  ensureInstallDate();

  const installDate = storage.get(STORAGE_KEYS.INSTALL_DATE);
  const totalGames = parseInt(storage.get(STORAGE_KEYS.TOTAL_GAMES) || '0', 10);
  const lastReviewAsk = storage.get(STORAGE_KEYS.LAST_REVIEW_ASK);

  const daysSinceInstall = daysSince(installDate);
  const daysSinceLastAsk = daysSince(lastReviewAsk);

  return (
    daysSinceInstall >= THRESHOLDS.MIN_DAYS_SINCE_INSTALL &&
    totalGames >= THRESHOLDS.MIN_GAMES_COMPLETED &&
    daysSinceLastAsk >= THRESHOLDS.MIN_DAYS_BETWEEN_ASKS
  );
}

/**
 * Mark that we asked for review (regardless of response)
 */
function markReviewAsked() {
  if (typeof window === 'undefined') return;
  storage.set(STORAGE_KEYS.LAST_REVIEW_ASK, new Date().toISOString());
}

/**
 * Trigger native in-app review
 */
async function triggerNativeReview() {
  try {
    // Dynamic import to avoid issues on web
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    return true;
  } catch (error) {
    console.warn('Native review request failed:', error);
    return false;
  }
}

/**
 * Hook for in-app review functionality
 */
export function useAppReview() {
  const shouldShowPrompt = useCallback(() => {
    return canAskForReview();
  }, []);

  const onDecline = useCallback(() => {
    markReviewAsked();
  }, []);

  const onConfirm = useCallback(async () => {
    markReviewAsked();
    await triggerNativeReview();
  }, []);

  return {
    shouldShowPrompt,
    onDecline,
    onConfirm,
  };
}

/**
 * Initialize install date on app start
 * Call this once in your app's entry point
 */
export function initAppReviewTracking() {
  ensureInstallDate();
}

/**
 * Increment games completed counter
 * Call this from END pages via useGameCompletion
 */
export function incrementGamesCompleted() {
  if (typeof window === 'undefined') return 0;
  const current = parseInt(storage.get(STORAGE_KEYS.TOTAL_GAMES) || '0', 10);
  const newCount = current + 1;
  storage.set(STORAGE_KEYS.TOTAL_GAMES, String(newCount));
  return newCount;
}
