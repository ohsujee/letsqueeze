'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { isPro } from '@/lib/subscription';
import { showInterstitialAd, initAdMob } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';

/**
 * Hook for end pages that handles:
 * - Interstitial ad display (for non-Pro users)
 * - returnedFromGame flag for guest prompts
 * - Current user UID from auth
 *
 * @returns {{ myUid: string|null, userIsPro: boolean }}
 */
export function useEndPageAd() {
  const [myUid, setMyUid] = useState(null);
  const adShownRef = useRef(false);

  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get current user UID + mark returnedFromGame
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, []);

  // Show interstitial ad for non-Pro users
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
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
