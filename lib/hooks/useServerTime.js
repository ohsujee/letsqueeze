'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Hook pour synchroniser le temps avec le serveur Firebase
 * Utilisé pour le calcul des scores basé sur le temps (buzzer, etc.)
 *
 * @param {number} tickInterval - Intervalle de mise à jour en ms (default: 300ms)
 * @returns {{ serverNow: number, offset: number }}
 */
export function useServerTime(tickInterval = 300) {
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  // Tick local pour mise à jour fluide
  useEffect(() => {
    const id = setInterval(() => setLocalNow(Date.now()), tickInterval);
    return () => clearInterval(id);
  }, [tickInterval]);

  // Offset serveur Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      setOffset(Number(snap.val()) || 0);
    });
    return () => unsub();
  }, []);

  const serverNow = useMemo(() => localNow + offset, [localNow, offset]);

  return { serverNow, offset };
}
