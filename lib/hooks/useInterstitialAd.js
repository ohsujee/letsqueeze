/**
 * useInterstitialAd Hook
 *
 * Gère l'affichage des interstitial ads de manière unifiée.
 * Utilisé par toutes les pages de jeu (room pages, join, mime).
 *
 * Conditions pour NE PAS montrer la pub :
 * - Pubs non encore débloquées (< 3 parties lifetime)
 * - Utilisateur Pro
 * - Retour d'une partie (returnedFromGame)
 * - Pub déjà montrée pendant le join (adShownDuringJoin)
 * - Rewarded ad vient d'être regardée (rewardedAdWatched)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { isPro } from '@/lib/subscription';
import { showInterstitialAd, initAdMob } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';
import { hasUnlockedAds } from '@/lib/utils/lifetimeGames';

/**
 * Hook pour afficher une interstitial ad à l'entrée d'une page
 * @param {Object} [options]
 * @param {string} [options.context] - Nom du contexte pour les logs (ex: 'Room', 'DeezTest', 'Mime')
 * @param {boolean} [options.enabled] - Si false, désactive complètement le hook (défaut: true)
 * @returns {Object} - { adShown: boolean }
 */
export function useInterstitialAd(options = {}) {
  const { context = 'Game', enabled = true } = options;
  const adShownRef = useRef(false);
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  useEffect(() => {
    // Hook désactivé
    if (!enabled) return;

    // Skip si déjà montré ou encore en chargement
    if (adShownRef.current || profileLoading) return;

    // Check 1: Pubs pas encore débloquées (< 3 parties jouées lifetime)
    if (!hasUnlockedAds()) {
      adShownRef.current = true;
      return;
    }

    // Check 2: Retour d'une partie (ne pas montrer de pub)
    const returnedFromGame = storage.get('returnedFromGame');
    if (returnedFromGame) {
      adShownRef.current = true;
      return;
    }

    // Check 3: Rewarded ad vient d'être regardée (pas de double pub)
    const rewardedAdWatched = typeof window !== 'undefined' && sessionStorage.getItem('rewardedAdWatched');
    if (rewardedAdWatched) {
      sessionStorage.removeItem('rewardedAdWatched');
      adShownRef.current = true;
      return;
    }

    // Montrer la pub si non-Pro
    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log(`[${context}] Interstitial ad error:`, err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading, context, enabled]);

  return {
    adShown: adShownRef.current,
    userIsPro,
    profileLoading
  };
}

/**
 * Hook pour afficher une pub interstitielle à la fin d'un jeu daily,
 * puis naviguer automatiquement vers le classement.
 *
 * Usage :
 *   const { triggerPostGameAd } = usePostGameAd();
 *   useEffect(() => {
 *     if (!showResult) return;
 *     triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 2000 });
 *   }, [showResult]);
 *
 * @returns {{ triggerPostGameAd: (callback: Function, options?: { delay?: number }) => void }}
 */
export function usePostGameAd() {
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsProRef = useRef(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (currentUser && subscription) {
      userIsProRef.current = isPro({ ...currentUser, subscription });
    }
  }, [currentUser, subscription]);

  const triggerPostGameAd = useCallback((onAfterAd, { delay = 2000 } = {}) => {
    if (triggeredRef.current) {
      // Pub déjà montrée, on appelle quand même le callback (ex: switch de tab)
      onAfterAd?.();
      return;
    }
    triggeredRef.current = true;

    setTimeout(async () => {
      const isPending = profileLoading || currentUser === undefined;
      const shouldShowAd = !isPending && currentUser !== null && !userIsProRef.current && hasUnlockedAds();

      if (shouldShowAd) {
        const rewardedAdWatched = typeof window !== 'undefined' && sessionStorage.getItem('rewardedAdWatched');
        if (rewardedAdWatched) {
          sessionStorage.removeItem('rewardedAdWatched');
        } else {
          try {
            await initAdMob();
            await showInterstitialAd();
          } catch (err) {
            console.log('[PostGameAd] Interstitial error:', err);
          }
        }
      }

      onAfterAd?.();
    }, delay);
  }, [currentUser, profileLoading]);

  return { triggerPostGameAd, triggered: triggeredRef };
}

export default useInterstitialAd;
