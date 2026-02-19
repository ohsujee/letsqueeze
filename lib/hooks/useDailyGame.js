'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/utils/storage';
import { ref, set, get } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook de gestion d'un jeu daily
 * Gère le state localStorage + streak + stats + Firebase leaderboard
 *
 * @param {string} gameId - ex: 'motmystere' | 'semantique'
 * @param {{ forceDate?: string }} options - forceDate overrides local date (use Firebase server time)
 * @returns {object} API du jeu daily
 */
export function useDailyGame(gameId, { forceDate } = {}) {
  const todayDate = forceDate || new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const storageKey = `daily_${gameId}_${todayDate}`;
  const streakKey = `daily_streak_${gameId}`;
  const statsKey = `daily_stats_${gameId}`;

  const [todayData, setTodayData] = useState(null);
  const [streak, setStreak] = useState({ count: 0, lastPlayedDate: null });
  const [stats, setStats] = useState({ played: 0, won: 0, distribution: [0, 0, 0, 0, 0, 0] });
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Charger l'état depuis localStorage
  useEffect(() => {
    // Nettoyage des entrées daily de plus de 2 jours
    if (typeof window !== 'undefined') {
      const fullPrefix = `lq_daily_${gameId}_`;
      const cutoff = new Date(todayDate + 'T12:00:00');
      cutoff.setDate(cutoff.getDate() - 2);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      Object.keys(localStorage)
        .filter(k => k.startsWith(fullPrefix))
        .forEach(k => {
          const dateStr = k.slice(fullPrefix.length);
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr < cutoffStr) {
            localStorage.removeItem(k);
          }
        });
    }

    const saved = storage.get(storageKey);
    const savedStreak = storage.get(streakKey);
    const savedStats = storage.get(statsKey);

    setTodayData(saved || null);

    if (savedStreak) {
      setStreak(savedStreak);
    }

    if (savedStats) {
      setStats(savedStats);
    }

    setLoaded(true);
  }, [storageKey, streakKey, statsKey]);

  // Écouter l'auth + résoudre le pseudo
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Priorité 1 : cache localStorage (tenu à jour par useUserProfile)
        const cached = typeof window !== 'undefined'
          ? localStorage.getItem('lq_cached_pseudo')
          : null;
        if (cached) {
          setDisplayName(cached);
        } else {
          // Priorité 2 : fetch Firebase profile
          try {
            const snap = await get(ref(db, `users/${u.uid}/profile/pseudo`));
            setDisplayName(snap.val() || null);
          } catch {
            setDisplayName(null);
          }
        }
      } else {
        setDisplayName(null);
      }
    });
    return () => unsub();
  }, []);

  /** État du jeu du jour */
  const todayState = !loaded
    ? 'loading'
    : !todayData
    ? 'unplayed'
    : todayData.completedAt
    ? 'completed'
    : 'inprogress';

  /** Initialise la partie du jour (targetWord optionnel pour invalidation future) */
  const startGame = useCallback((targetWord = null) => {
    const now = Date.now();
    const initial = {
      state: 'inprogress',
      attempts: 0,
      guesses: [],
      startedAt: now,
      completedAt: null,
      score: null,
      targetWord: targetWord || null,
    };
    storage.set(storageKey, initial);
    setTodayData(initial);
  }, [storageKey]);

  /** Reset la partie du jour (mot changé en cours de journée) */
  const resetToday = useCallback(() => {
    storage.remove(storageKey);
    setTodayData(null);
  }, [storageKey]);

  /** Sauvegarde la progression en cours */
  const saveProgress = useCallback((guesses, attempts) => {
    const current = storage.get(storageKey) || {};
    const updated = {
      ...current,
      guesses,
      attempts,
      state: 'inprogress',
    };
    storage.set(storageKey, updated);
    setTodayData(updated);
  }, [storageKey]);

  /** Marque la partie comme terminée + mise à jour streak/stats + Firebase */
  const completeGame = useCallback(async ({ solved, attempts, timeMs, score }) => {
    const now = Date.now();
    const current = storage.get(storageKey) || {};
    const completed = {
      ...current,
      state: 'completed',
      completedAt: now,
      solved,
      attempts,
      timeMs,
      score: score || 0,
    };
    storage.set(storageKey, completed);
    setTodayData(completed);

    // Mise à jour streak
    const savedStreak = storage.get(streakKey) || { count: 0, lastPlayedDate: null };
    const yesterday = new Date(`${todayDate}T12:00:00`); // Anchor to todayDate (server time)
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newCount = 1;
    if (savedStreak.lastPlayedDate === todayDate) {
      newCount = savedStreak.count; // déjà joué aujourd'hui, pas de changement
    } else if (savedStreak.lastPlayedDate === yesterdayStr) {
      newCount = savedStreak.count + 1; // suite logique
    }

    const newStreak = { count: newCount, lastPlayedDate: todayDate };
    storage.set(streakKey, newStreak);
    setStreak(newStreak);

    // Mise à jour stats
    const savedStats = storage.get(statsKey) || { played: 0, won: 0, distribution: [0, 0, 0, 0, 0, 0] };
    const newDist = [...savedStats.distribution];
    if (solved && attempts >= 1 && attempts <= 6) {
      newDist[attempts - 1] = (newDist[attempts - 1] || 0) + 1;
    }
    const newStats = {
      played: savedStats.played + 1,
      won: savedStats.won + (solved ? 1 : 0),
      distribution: newDist,
    };
    storage.set(statsKey, newStats);
    setStats(newStats);

    // Écriture Firebase leaderboard (si connecté, anonyme inclus)
    if (user && solved) {
      try {
        const DAILY_GAMES = (await import('@/lib/config/dailyGames')).DAILY_GAMES;
        const gameConfig = DAILY_GAMES.find((g) => g.id === gameId);
        if (gameConfig) {
          const leaderRef = ref(db, `${gameConfig.firebaseNode}/${todayDate}/leaderboard/${user.uid}`);
          await set(leaderRef, {
            name: displayName || 'Joueur',
            score: score || 0,
            attempts,
            solved: true,
            timeMs,
            completedAt: now,
          });
        }
      } catch (e) {
        console.warn('[useDailyGame] Firebase write error:', e);
      }
    }
  }, [storageKey, streakKey, statsKey, todayDate, user, displayName, gameId]);

  return {
    todayState,
    streak,
    stats,
    progress: todayData ? {
      attempts: todayData.attempts,
      guesses: todayData.guesses,
      score: todayData.score,
      timeMs: todayData.timeMs,
      solved: todayData.solved,
      targetWord: todayData.targetWord || null,
    } : null,
    todayDate,
    startGame,
    saveProgress,
    completeGame,
    resetToday,
    loaded,
  };
}

export default useDailyGame;
