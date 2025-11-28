'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

/**
 * Hook consolidé pour écouter les données d'une room de jeu
 * Évite les listeners multiples en consolidant state, meta et players
 *
 * @param {string} roomCode - Code de la room
 * @param {Object} options - Options
 * @param {string} options.roomType - 'rooms' ou 'rooms_alibi' (défaut: 'rooms')
 * @returns {Object} { state, meta, players, loading, error }
 */
export function useGameRoom(roomCode, { roomType = 'rooms' } = {}) {
  const [data, setData] = useState({
    state: null,
    meta: null,
    players: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!roomCode) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const code = String(roomCode).toUpperCase();
    const basePath = `${roomType}/${code}`;
    const unsubs = [];

    // Listener pour state
    unsubs.push(
      onValue(
        ref(db, `${basePath}/state`),
        snap => {
          setData(prev => ({
            ...prev,
            state: snap.val(),
            loading: false
          }));
        },
        error => {
          console.error('[useGameRoom] state error:', error);
          setData(prev => ({ ...prev, error: error.message, loading: false }));
        }
      )
    );

    // Listener pour meta
    unsubs.push(
      onValue(
        ref(db, `${basePath}/meta`),
        snap => {
          setData(prev => ({ ...prev, meta: snap.val() }));
        },
        error => {
          console.error('[useGameRoom] meta error:', error);
        }
      )
    );

    // Listener pour players
    unsubs.push(
      onValue(
        ref(db, `${basePath}/players`),
        snap => {
          const playersObj = snap.val() || {};
          const playersArray = Object.entries(playersObj).map(([uid, data]) => ({
            uid,
            ...data
          }));
          setData(prev => ({ ...prev, players: playersArray }));
        },
        error => {
          console.error('[useGameRoom] players error:', error);
        }
      )
    );

    // Cleanup
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [roomCode, roomType]);

  // Calculer des valeurs dérivées
  const derived = useMemo(() => {
    const { players, meta } = data;
    return {
      playerCount: players.length,
      teams: meta?.teams || {},
      teamCount: Object.keys(meta?.teams || {}).length,
      isTeamMode: meta?.mode === 'equipes'
    };
  }, [data]);

  return {
    ...data,
    ...derived
  };
}

export default useGameRoom;
