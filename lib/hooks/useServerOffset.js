'use client';

import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';

/**
 * useServerOffset - Hook pour obtenir l'offset entre le temps local et le serveur Firebase
 *
 * Utilisé pour synchroniser les timestamps entre clients (buzzer, timing, etc.)
 *
 * @returns {number} L'offset en millisecondes (serverTime = Date.now() + offset)
 */
export default function useServerOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const db = getDatabase(getApp());
    const offsetRef = ref(db, '.info/serverTimeOffset');

    const unsubscribe = onValue(offsetRef, (snapshot) => {
      const serverOffset = snapshot.val() || 0;
      setOffset(serverOffset);
    });

    return () => unsubscribe();
  }, []);

  return offset;
}
