'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { isPro } from '@/lib/subscription';
import { showInterstitialAd, initAdMob } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';
import { hasUnlockedAds } from '@/lib/utils/lifetimeGames';
import { incrementGuestGamesCompleted } from '@/components/ui/GuestAccountPromptModal';

/**
 * Hook for end pages that handles:
 * - Interstitial ad display (for non-Pro users)
 * - returnedFromGame flag for ad skipping
 * - Guest games counter for account prompt
 * - Current user UID from auth
 *
 * @returns {{ myUid: string|null, userIsPro: boolean, currentUser, profileLoading }}
 */
export function useEndPageAd() {
  const [myUid, setMyUid] = useState(null);
  const adShownRef = useRef(false);
  const gamesIncrementedRef = useRef(false);

  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get current user UID + mark returnedFromGame + increment guest games
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);

      // Increment guest games counter (only once per page load, only for anonymous users)
      if (user?.isAnonymous && !gamesIncrementedRef.current) {
        gamesIncrementedRef.current = true;
        incrementGuestGamesCompleted();
      }
    });
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, []);

  // Show interstitial ad for non-Pro users (only after ads are unlocked)
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro && hasUnlockedAds()) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(() => {
          // Silently fail - ad errors are not critical
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  return { myUid, userIsPro, currentUser, profileLoading };
}
