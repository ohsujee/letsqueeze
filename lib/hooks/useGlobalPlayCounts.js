/**
 * useGlobalPlayCounts Hook
 *
 * Gère les compteurs globaux de parties jouées par jeu.
 * Stocké dans Firebase: /stats/globalPlayCounts/{gameId}
 */

import { useState, useEffect } from 'react';
import { ref, onValue, increment, update } from 'firebase/database';
import { db } from '@/lib/firebase';

const STATS_PATH = 'stats/globalPlayCounts';

/**
 * Hook pour récupérer les compteurs globaux de parties
 * @returns {Object} { playCounts, loading, error }
 */
export function useGlobalPlayCounts() {
  const [playCounts, setPlayCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const statsRef = ref(db, STATS_PATH);

    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setPlayCounts(data);
        setLoading(false);
      },
      (err) => {
        console.error('[GlobalPlayCounts] Error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { playCounts, loading, error };
}

/**
 * Incrémente le compteur global pour un jeu
 * @param {string} gameType - ID du jeu
 */
export async function incrementGlobalPlayCount(gameType) {
  if (!gameType) return;

  try {
    const updates = {};
    updates[`${STATS_PATH}/${gameType}`] = increment(1);
    await update(ref(db), updates);
  } catch (error) {
    console.error('[GlobalPlayCounts] Failed to increment:', error);
  }
}

export default useGlobalPlayCounts;
