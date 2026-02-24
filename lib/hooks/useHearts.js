/**
 * useHearts Hook
 * Gère le système de 5 cœurs quotidiens pour les joueurs Free.
 * Les Pro sont exemptés (canPlay toujours true).
 *
 * Stockage: Firebase (users/{uid}/hearts) + localStorage en cache local
 * Fallback: localStorage si pas d'UID (anonyme)
 * Reset: automatique à minuit (nouveau jour)
 * Recharge: via rewarded ad (max MAX_RECHARGES_PER_DAY/jour)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { showRewardedAd } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';
import { db, ref, get, set } from '@/lib/firebase';

const MAX_HEARTS = 5;
const STORAGE_KEY = 'hearts_data';
const MAX_RECHARGES_PER_DAY = 2;

function getTodayKey() {
  return new Date().toDateString();
}

function getDefaultData() {
  return { remaining: MAX_HEARTS, rechargesUsed: 0, date: getTodayKey() };
}

function isToday(data) {
  return data?.date === getTodayKey();
}

function saveLocal(data) {
  if (typeof window === 'undefined') return;
  try {
    storage.set(STORAGE_KEY, { ...data, date: getTodayKey() });
  } catch {}
}

function getLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const data = storage.get(STORAGE_KEY);
    if (!data || !isToday(data)) return null;
    return data;
  } catch { return null; }
}

/**
 * @param {{ isPro?: boolean, uid?: string|null }} options
 */
export function useHearts({ isPro = false, uid = null } = {}) {
  const [heartsData, setHeartsData] = useState(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const uidRef = useRef(uid);
  useEffect(() => { uidRef.current = uid; }, [uid]);

  // Écrit dans localStorage + Firebase (fire and forget)
  const saveData = useCallback((data) => {
    saveLocal(data);
    const currentUid = uidRef.current;
    if (currentUid) {
      set(ref(db, `users/${currentUid}/hearts`), data).catch(() => {});
    }
  }, []);

  // Chargement : localStorage immédiat, puis sync Firebase
  useEffect(() => {
    const local = getLocal();
    setHeartsData(local || getDefaultData());

    if (!uid) return;

    const heartsRef = ref(db, `users/${uid}/hearts`);
    get(heartsRef).then((snap) => {
      if (!snap.exists()) {
        // Premier accès → écrire l'état actuel dans Firebase
        const data = local || getDefaultData();
        set(heartsRef, data).catch(() => {});
        return;
      }

      const fbData = snap.val();
      if (isToday(fbData)) {
        // Firebase fait autorité (sync cross-appareils)
        setHeartsData(fbData);
        saveLocal(fbData);
      } else {
        // Nouveau jour → reset
        const fresh = getDefaultData();
        setHeartsData(fresh);
        saveLocal(fresh);
        set(heartsRef, fresh).catch(() => {});
      }
    }).catch(() => {
      // Firebase indispo → rester sur localStorage
    });
  }, [uid]);

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
      const current = prev || getDefaultData();
      const newData = {
        ...current,
        remaining: Math.max(0, current.remaining - 1),
        date: getTodayKey(),
      };
      saveData(newData);
      return newData;
    });
  }, [isPro, saveData]);

  /**
   * Recharge les cœurs via une rewarded ad.
   * Les rewarded ads ne pouvant pas être skippées, tout échec est technique
   * → on recharge quand même.
   * @returns {Promise<{recharged: boolean, adPlayed: boolean}>}
   */
  const rechargeHearts = useCallback(async () => {
    if (isPro || isRecharging) return { recharged: false, adPlayed: false };
    if (rechargesUsed >= MAX_RECHARGES_PER_DAY) return { recharged: false, adPlayed: false };

    setIsRecharging(true);
    try {
      const result = await showRewardedAd();
      const adActuallyPlayed = result.success && !result.simulated;

      setHeartsData(prev => {
        const current = prev || getDefaultData();
        const newData = {
          ...current,
          remaining: MAX_HEARTS,
          rechargesUsed: current.rechargesUsed + 1,
          date: getTodayKey(),
        };
        saveData(newData);
        return newData;
      });

      // Skip la prochaine interstitielle seulement si la pub a vraiment été regardée
      if (adActuallyPlayed && typeof window !== 'undefined') {
        sessionStorage.setItem('rewardedAdWatched', 'true');
      }

      setIsRecharging(false);
      return { recharged: true, adPlayed: adActuallyPlayed };
    } catch (error) {
      console.error('[useHearts] Recharge error:', error);
      setIsRecharging(false);
      return { recharged: false, adPlayed: false };
    }
  }, [isPro, isRecharging, rechargesUsed, saveData]);

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
