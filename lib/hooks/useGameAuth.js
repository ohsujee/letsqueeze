/**
 * useGameAuth - Authentication pour pages de jeu
 *
 * Gère l'authentification pour les pages de jeu (play, host, end, room).
 * - S'assure qu'un utilisateur existe (crée un anonyme si besoin)
 * - Stocke les infos de la dernière partie pour le rejoin
 *
 * Usage:
 *   const myUid = useGameAuth(code, 'rooms');
 *   const myUid = useGameAuth(code, 'rooms_blindtest');
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, auth, signInAnonymously } from '@/lib/firebase';
import { storage } from '@/lib/utils/storage';
import { STORAGE_KEYS } from '@/lib/config/constants';

/**
 * @param {string} roomCode - Code de la room
 * @param {string} roomPrefix - Préfixe Firebase (rooms, rooms_blindtest, etc.)
 * @param {Object} options
 * @param {boolean} options.storeLastGame - Stocker les infos pour rejoin (default: true)
 * @returns {string|null} L'UID de l'utilisateur ou null si pas encore chargé
 */
export function useGameAuth(roomCode, roomPrefix, options = {}) {
  const { storeLastGame = true } = options;
  const [myUid, setMyUid] = useState(null);

  useEffect(() => {
    if (!roomCode) return;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);

        // Store last game info for rejoin feature
        if (storeLastGame) {
          storage.set(STORAGE_KEYS.lastGame || 'last_game', {
            roomCode,
            roomPrefix,
            joinedAt: Date.now()
          });
        }
      } else {
        // No user - create anonymous account
        signInAnonymously(auth).catch((error) => {
          console.error('[useGameAuth] Anonymous sign-in failed:', error);
        });
      }
    });

    return () => unsub();
  }, [roomCode, roomPrefix, storeLastGame]);

  return myUid;
}

/**
 * Version étendue avec plus d'infos
 * @returns {Object} { myUid, user, isGuest, loading }
 */
export function useGameAuthExtended(roomCode, roomPrefix, options = {}) {
  const { storeLastGame = true } = options;
  const [state, setState] = useState({
    myUid: null,
    user: null,
    isGuest: false,
    loading: true,
  });

  useEffect(() => {
    if (!roomCode) return;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setState({
          myUid: user.uid,
          user,
          isGuest: user.isAnonymous,
          loading: false,
        });

        if (storeLastGame) {
          storage.set(STORAGE_KEYS.lastGame || 'last_game', {
            roomCode,
            roomPrefix,
            joinedAt: Date.now()
          });
        }
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error('[useGameAuth] Anonymous sign-in failed:', error);
          setState(prev => ({ ...prev, loading: false }));
        });
      }
    });

    return () => unsub();
  }, [roomCode, roomPrefix, storeLastGame]);

  return state;
}

export default useGameAuth;
