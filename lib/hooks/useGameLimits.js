/**
 * useGameLimits Hook
 * Gère les limites de parties gratuites et les pubs récompensées
 */

import { useState, useEffect, useCallback } from 'react';
import { showRewardedAd, initAdMob, isAdsAvailable } from '@/lib/admob';
import { storage } from '@/lib/utils/storage';
import { incrementLifetimeGamesCount } from '@/lib/utils/lifetimeGames';

// Nombre de parties gratuites avant de devoir regarder une pub
const FREE_GAMES_BEFORE_AD = 3;

// Clé storage pour stocker les parties jouées (utilise préfixe 'lq_' via storage utility)
const STORAGE_KEY = 'games_played';


/**
 * Récupère les données de parties jouées depuis storage
 * Gère aussi la migration depuis l'ancien préfixe 'gigglz_'
 */
function getStoredGamesData() {
  if (typeof window === 'undefined') return null;

  try {
    // Essayer d'abord avec le nouveau storage (préfixe lq_)
    let data = storage.get(STORAGE_KEY);

    // Migration: si pas de données, vérifier l'ancien format
    if (!data) {
      const oldStored = localStorage.getItem('gigglz_games_played');
      if (oldStored) {
        data = JSON.parse(oldStored);
        // Migrer vers le nouveau format
        storage.set(STORAGE_KEY, data);
        // Supprimer l'ancien
        localStorage.removeItem('gigglz_games_played');
      }
    }

    if (!data) return null;

    // Vérifier si c'est un nouveau jour
    const today = new Date().toDateString();
    if (data.date !== today) {
      // Nouveau jour = reset des compteurs
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde les données de parties jouées
 */
function saveGamesData(data) {
  if (typeof window === 'undefined') return;

  try {
    storage.set(STORAGE_KEY, {
      ...data,
      date: new Date().toDateString()
    });
  } catch (e) {
    console.error('[useGameLimits] Save error:', e);
  }
}

/**
 * Hook pour gérer les limites de parties et les pubs
 * @param {string} gameType - 'quiz' ou 'alibi'
 * @param {boolean} isPro - Si l'utilisateur est Pro
 */
export function useGameLimits(gameType, isPro = false) {
  const [gamesData, setGamesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // Charger les données au montage
  useEffect(() => {
    const stored = getStoredGamesData();
    const initialData = stored || {
      quiz: { played: 0, rewarded: 0 },
      alibi: { played: 0, rewarded: 0 }
    };

    setGamesData(initialData);
    setIsLoading(false);
  }, [gameType]);

  // Limites pour ce type de jeu
  // Parties gratuites avant pub + parties illimitées via pub rewarded
  const limits = {
    freeGames: FREE_GAMES_BEFORE_AD,
    rewardedGames: Infinity // Illimité via pub
  };

  // Statistiques actuelles
  const currentStats = gamesData?.[gameType] || { played: 0, rewarded: 0 };
  const gamesPlayed = currentStats.played;
  const rewardedUsed = currentStats.rewarded;

  // Calculs
  const freeGamesRemaining = Math.max(0, limits.freeGames - gamesPlayed);
  // Rewarded games sont maintenant illimités
  const rewardedGamesRemaining = Infinity;
  const totalGamesRemaining = freeGamesRemaining > 0 ? freeGamesRemaining : Infinity;

  // États
  const canPlayFree = isPro || freeGamesRemaining > 0;
  const canWatchAdForGame = !isPro && freeGamesRemaining === 0; // Toujours possible si plus de parties gratuites
  const isBlocked = false; // Plus jamais bloqué - on peut toujours regarder une pub
  const adsAvailable = isAdsAvailable();

  /**
   * Enregistre une partie jouée
   */
  const recordGamePlayed = useCallback((wasRewarded = false) => {
    // Incrémenter le compteur lifetime (toujours, même pour Pro)
    incrementLifetimeGamesCount();

    if (isPro) return; // Pro = pas de limite quotidienne

    setGamesData(prev => {
      const newData = {
        ...prev,
        [gameType]: {
          played: (prev?.[gameType]?.played || 0) + 1,
          rewarded: wasRewarded
            ? (prev?.[gameType]?.rewarded || 0) + 1
            : (prev?.[gameType]?.rewarded || 0)
        }
      };
      saveGamesData(newData);
      return newData;
    });
  }, [gameType, isPro]);

  /**
   * Regarde une pub pour débloquer une partie
   * @returns {Promise<boolean>} - true si réussi
   */
  const watchAdForExtraGame = useCallback(async () => {
    if (isPro) {
      return false; // Pro n'a pas besoin de regarder des pubs
    }

    setIsWatchingAd(true);

    try {
      const result = await showRewardedAd();

      if (result.success) {
        // Marquer qu'on a utilisé une pub rewarded
        setGamesData(prev => {
          const newData = {
            ...prev,
            [gameType]: {
              ...prev?.[gameType],
              rewarded: (prev?.[gameType]?.rewarded || 0) + 1
            }
          };
          saveGamesData(newData);
          return newData;
        });

        // IMPORTANT: Set flag to skip interstitial ad after rewarded ad
        // This prevents showing 2 ads in a row (rewarded + interstitial)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rewardedAdWatched', 'true');
        }

        setIsWatchingAd(false);
        return true;
      } else {
        setIsWatchingAd(false);
        return false;
      }
    } catch (error) {
      console.error('[useGameLimits] Watch ad error:', error);
      setIsWatchingAd(false);
      return false;
    }
  }, [gameType, isPro]);

  /**
   * Vérifie si on peut jouer (gratuit ou après pub)
   */
  const checkCanPlay = useCallback(() => {
    if (isPro) return { canPlay: true, needsAd: false };
    if (freeGamesRemaining > 0) return { canPlay: true, needsAd: false };
    if (rewardedGamesRemaining > 0) return { canPlay: true, needsAd: true };
    return { canPlay: false, needsAd: false };
  }, [isPro, freeGamesRemaining, rewardedGamesRemaining]);

  return {
    // État de chargement
    isLoading,
    isWatchingAd,

    // Compteurs
    gamesPlayed,
    freeGamesRemaining,
    rewardedGamesRemaining,
    totalGamesRemaining,

    // États booléens
    canPlayFree,
    canWatchAdForGame,
    isBlocked,
    isPro,
    adsAvailable,

    // Limites
    limits,

    // Actions
    recordGamePlayed,
    watchAdForExtraGame,
    checkCanPlay
  };
}

export default useGameLimits;
