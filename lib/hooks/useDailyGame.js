'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/utils/storage';
import { ref, set, get } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Hook de gestion d'un jeu daily
 * Progression liée à l'UID (pas à l'appareil) — localStorage + Firebase
 * Migration automatique depuis les anciennes clés sans UID
 *
 * @param {string} gameId - ex: 'motmystere' | 'semantique'
 * @param {{ forceDate?: string }} options - forceDate overrides local date (use Firebase server time)
 * @returns {object} API du jeu daily
 */
export function useDailyGame(gameId, { forceDate } = {}) {
  const todayDate = forceDate || new Date().toISOString().split('T')[0];

  const [uid, setUid] = useState(() => auth.currentUser?.uid || null);
  const [user, setUser] = useState(() => auth.currentUser || null);
  const [displayName, setDisplayName] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [streak, setStreak] = useState({ count: 0, lastPlayedDate: null });
  const [stats, setStats] = useState({ played: 0, won: 0, distribution: [0, 0, 0, 0, 0, 0] });
  const [loaded, setLoaded] = useState(false);

  // Clés UID-aware
  const storageKey = uid ? `daily_${gameId}_${todayDate}_${uid}` : null;
  const streakKey  = uid ? `daily_streak_${gameId}_${uid}` : null;
  const statsKey   = uid ? `daily_stats_${gameId}_${uid}` : null;

  // Clés legacy (sans UID) pour migration
  const legacyStorageKey = `daily_${gameId}_${todayDate}`;
  const legacyStreakKey  = `daily_streak_${gameId}`;
  const legacyStatsKey   = `daily_stats_${gameId}`;

  // Écouter l'auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setUid(u?.uid || null);

      if (u) {
        const cached = typeof window !== 'undefined' ? localStorage.getItem('lq_cached_pseudo') : null;
        if (cached) {
          setDisplayName(cached);
        } else {
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

  // Charger les données quand l'UID est connu
  useEffect(() => {
    if (!uid || !storageKey) return;

    setLoaded(false);

    async function loadData() {
      // 1. Firebase (source de vérité cross-device)
      let firebaseData   = null;
      let firebaseStreak = null;
      let firebaseStats  = null;

      try {
        const [gameSnap, streakSnap, statsSnap] = await Promise.all([
          get(ref(db, `users/${uid}/daily/${gameId}/${todayDate}`)),
          get(ref(db, `users/${uid}/game_data/${gameId}/streak`)),
          get(ref(db, `users/${uid}/game_data/${gameId}/stats`)),
        ]);
        firebaseData   = gameSnap.val();
        firebaseStreak = streakSnap.val();
        firebaseStats  = statsSnap.val();
      } catch { /* non-bloquant */ }

      // 2. localStorage UID-aware
      let localData   = storage.get(storageKey);
      let localStreak = storage.get(streakKey);
      let localStats  = storage.get(statsKey);

      // 3. Migration depuis les anciennes clés sans UID
      if (!localData) {
        const legacy = storage.get(legacyStorageKey);
        if (legacy) {
          storage.set(storageKey, legacy);
          storage.remove(legacyStorageKey);
          localData = legacy;
        }
      }
      if (!localStreak) {
        const legacy = storage.get(legacyStreakKey);
        if (legacy) {
          storage.set(streakKey, legacy);
          storage.remove(legacyStreakKey);
          localStreak = legacy;
        }
      }
      if (!localStats) {
        const legacy = storage.get(legacyStatsKey);
        if (legacy) {
          storage.set(statsKey, legacy);
          storage.remove(legacyStatsKey);
          localStats = legacy;
        }
      }

      // 4. Résolution : Firebase gagne si plus avancé ou si local absent
      let resolvedData = localData || null;
      if (firebaseData) {
        const fbAttempts    = firebaseData.attempts || 0;
        const localAttempts = localData?.attempts   || 0;
        if (!localData || fbAttempts >= localAttempts || firebaseData.completedAt) {
          resolvedData = firebaseData;
        }
      }

      const resolvedStreak = firebaseStreak || localStreak || { count: 0, lastPlayedDate: null };
      const resolvedStats  = firebaseStats  || localStats  || { played: 0, won: 0, distribution: [0, 0, 0, 0, 0, 0] };

      // Sync résolution → localStorage
      if (resolvedData)   storage.set(storageKey, resolvedData);
      if (resolvedStreak) storage.set(streakKey,  resolvedStreak);
      if (resolvedStats)  storage.set(statsKey,   resolvedStats);

      setTodayData(resolvedData);
      setStreak(resolvedStreak);
      setStats(resolvedStats);

      // Nettoyage entrées daily > 2 jours
      if (typeof window !== 'undefined') {
        const fullPrefix = `lq_daily_${gameId}_`;
        const cutoff = new Date(todayDate + 'T12:00:00');
        cutoff.setDate(cutoff.getDate() - 2);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        Object.keys(localStorage)
          .filter(k => k.startsWith(fullPrefix))
          .forEach(k => {
            const afterPrefix = k.slice(fullPrefix.length);
            const dateStr = afterPrefix.slice(0, 10); // YYYY-MM-DD (fonctionne avec et sans UID suffix)
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr < cutoffStr) {
              localStorage.removeItem(k);
            }
          });
      }

      setLoaded(true);
    }

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, storageKey]);

  /** État du jeu du jour */
  const todayState = !loaded
    ? 'loading'
    : !todayData
    ? 'unplayed'
    : todayData.completedAt
    ? 'completed'
    : 'inprogress';

  /** Initialise la partie du jour */
  const startGame = useCallback((targetWord = null) => {
    if (!storageKey) return;
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

    if (uid) {
      set(ref(db, `users/${uid}/daily/${gameId}/${todayDate}`), initial).catch(() => {});
    }
  }, [storageKey, uid, gameId, todayDate]);

  /** Reset la partie du jour (mot changé en cours de journée) */
  const resetToday = useCallback(() => {
    if (!storageKey) return;
    storage.remove(storageKey);
    setTodayData(null);

    if (uid) {
      set(ref(db, `users/${uid}/daily/${gameId}/${todayDate}`), null).catch(() => {});
    }
  }, [storageKey, uid, gameId, todayDate]);

  /** Sauvegarde la progression en cours */
  const saveProgress = useCallback((guesses, attempts) => {
    if (!storageKey) return;
    const current = storage.get(storageKey) || {};
    const updated = {
      ...current,
      guesses,
      attempts,
      state: 'inprogress',
    };
    storage.set(storageKey, updated);
    setTodayData(updated);

    if (uid) {
      set(ref(db, `users/${uid}/daily/${gameId}/${todayDate}`), updated).catch(() => {});
    }
  }, [storageKey, uid, gameId, todayDate]);

  /** Marque la partie comme terminée + mise à jour streak/stats + Firebase */
  const completeGame = useCallback(async ({ solved, attempts, timeMs, score }) => {
    if (!storageKey) return;
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

    if (uid) {
      set(ref(db, `users/${uid}/daily/${gameId}/${todayDate}`), completed).catch(() => {});
    }

    // Mise à jour streak
    const savedStreak = storage.get(streakKey) || { count: 0, lastPlayedDate: null };
    const yesterday = new Date(`${todayDate}T12:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newCount = 1;
    if (savedStreak.lastPlayedDate === todayDate) {
      newCount = savedStreak.count;
    } else if (savedStreak.lastPlayedDate === yesterdayStr) {
      newCount = savedStreak.count + 1;
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

    // Sauvegarde streak + stats sur Firebase
    if (user) {
      try {
        await Promise.all([
          set(ref(db, `users/${user.uid}/game_data/${gameId}/streak`), newStreak),
          set(ref(db, `users/${user.uid}/game_data/${gameId}/stats`), newStats),
        ]);
      } catch { /* non-bloquant */ }
    }

    // Écriture leaderboard Firebase
    if (user) {
      try {
        const DAILY_GAMES = (await import('@/lib/config/dailyGames')).DAILY_GAMES;
        const gameConfig = DAILY_GAMES.find((g) => g.id === gameId);
        if (gameConfig) {
          const leaderRef = ref(db, `${gameConfig.firebaseNode}/${todayDate}/leaderboard/${user.uid}`);
          await set(leaderRef, {
            name: displayName || 'Joueur',
            score: score || 0,
            attempts,
            solved,
            timeMs,
            completedAt: now,
          });
        }
      } catch (e) {
        console.warn('[useDailyGame] Firebase write error:', e);
      }
    }
  }, [storageKey, streakKey, statsKey, todayDate, user, uid, displayName, gameId]);

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
