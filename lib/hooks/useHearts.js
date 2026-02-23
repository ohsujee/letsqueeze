/**
 * useHearts Hook
 * Gère le système de 5 cœurs quotidiens pour les joueurs Free.
 * Les Pro sont exemptés (canPlay toujours true).
 *
 * Stockage: localStorage via storage utility (clé: 'hearts_data')
 * Reset: automatique à minuit (nouveau jour)
 * Recharge: via rewarded ad (max MAX_RECHARGES_PER_DAY/jour)
 */

import { useState, useEffect, useCallback } from 'react';
import { showRewardedAd } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';

const MAX_HEARTS = 5;
const STORAGE_KEY = 'hearts_data';
const MAX_RECHARGES_PER_DAY = 2;

function getStoredHeartsData() {
  if (typeof window === 'undefined') return null;
  try {
    const data = storage.get(STORAGE_KEY);
    if (!data) return null;
    const today = new Date().toDateString();
    if (data.date !== today) {
      // Nouveau jour → reset
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveHeartsData(data) {
  if (typeof window === 'undefined') return;
  try {
    storage.set(STORAGE_KEY, {
      ...data,
      date: new Date().toDateString(),
    });
  } catch (e) {
    console.error('[useHearts] Save error:', e);
  }
}

/**
 * @param {{ isPro?: boolean }} options
 */
export function useHearts({ isPro = false } = {}) {
  const [heartsData, setHeartsData] = useState(null);
  const [isRecharging, setIsRecharging] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    const stored = getStoredHeartsData();
    const initial = stored || { remaining: MAX_HEARTS, rechargesUsed: 0 };
    setHeartsData(initial);
  }, []);

  // Pro → toujours MAX_HEARTS (pas de comptage)
  const heartsRemaining = isPro ? MAX_HEARTS : (heartsData?.remaining ?? MAX_HEARTS);
  const rechargesUsed = heartsData?.rechargesUsed ?? 0;

  const canPlay = isPro || heartsRemaining > 0;
  const canRecharge = !isPro && heartsRemaining < MAX_HEARTS && rechargesUsed < MAX_RECHARGES_PER_DAY;

  /**
   * Déduit 1 cœur. À appeler quand le joueur lance/rejoint une partie.
   */
  const consumeHeart = useCallback(() => {
    if (isPro) return;
    setHeartsData(prev => {
      const current = prev || { remaining: MAX_HEARTS, rechargesUsed: 0 };
      const newData = {
        ...current,
        remaining: Math.max(0, current.remaining - 1),
      };
      saveHeartsData(newData);
      return newData;
    });
  }, [isPro]);

  /**
   * Recharge les cœurs via une rewarded ad.
   * @returns {Promise<boolean>} true si succès
   */
  const rechargeHearts = useCallback(async () => {
    if (isPro || isRecharging) return false;
    if (rechargesUsed >= MAX_RECHARGES_PER_DAY) return false;

    setIsRecharging(true);
    try {
      const result = await showRewardedAd();

      if (result.success) {
        setHeartsData(prev => {
          const current = prev || { remaining: 0, rechargesUsed: 0 };
          const newData = {
            ...current,
            remaining: MAX_HEARTS,
            rechargesUsed: current.rechargesUsed + 1,
          };
          saveHeartsData(newData);
          return newData;
        });

        // Skip la prochaine interstitielle (rewarded vient d'être vue)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rewardedAdWatched', 'true');
        }

        setIsRecharging(false);
        return true;
      }

      setIsRecharging(false);
      return false;
    } catch (error) {
      console.error('[useHearts] Recharge error:', error);
      setIsRecharging(false);
      return false;
    }
  }, [isPro, isRecharging, rechargesUsed]);

  return {
    heartsRemaining,
    maxHearts: MAX_HEARTS,
    canPlay,
    canRecharge,
    consumeHeart,
    rechargeHearts,
    isRecharging,
  };
}

export default useHearts;
