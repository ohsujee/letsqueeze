'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, onDisconnect, update, remove, serverTimestamp, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Hook pour gérer le nettoyage des joueurs selon la phase de jeu
 *
 * - Lobby: Supprime le joueur complètement à la déconnexion
 * - En jeu: Préserve le score, marque comme déconnecté, permet le rejoin
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms' ou 'rooms_blindtest')
 * @param {string} options.playerUid - UID du joueur
 * @param {string} options.phase - Phase actuelle ('lobby' | 'playing' | 'ended')
 */
export function usePlayerCleanup({ roomCode, roomPrefix = 'rooms', playerUid, phase }) {
  const disconnectRef = useRef(null);
  const cleanupSetupRef = useRef(false);

  // Setup disconnect handler based on phase
  const setupDisconnectHandler = useCallback(async () => {
    if (!roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;
    const playerRef = ref(db, playerPath);

    // Cancel previous onDisconnect if any
    if (disconnectRef.current) {
      try {
        await disconnectRef.current.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
    }

    if (phase === 'lobby') {
      // LOBBY: Remove player completely on disconnect
      console.log('[PlayerCleanup] Setting up LOBBY cleanup for', playerUid);
      disconnectRef.current = onDisconnect(playerRef);
      await disconnectRef.current.remove();

    } else if (phase === 'playing') {
      // PLAYING: Mark as disconnected but preserve score
      console.log('[PlayerCleanup] Setting up GAME cleanup for', playerUid);
      disconnectRef.current = onDisconnect(playerRef);
      await disconnectRef.current.update({
        status: 'disconnected',
        disconnectedAt: serverTimestamp(),
      });
    }
    // ENDED: No cleanup needed, game is over

    cleanupSetupRef.current = true;
  }, [roomCode, roomPrefix, playerUid, phase]);

  // Setup on mount and when phase changes
  useEffect(() => {
    setupDisconnectHandler();

    return () => {
      // Cancel onDisconnect when component unmounts normally (intentional leave)
      if (disconnectRef.current) {
        disconnectRef.current.cancel().catch(() => {});
      }
    };
  }, [setupDisconnectHandler]);

  // Mark player as active (for reconnection)
  const markActive = useCallback(async () => {
    if (!roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;

    await update(ref(db, playerPath), {
      status: 'active',
      disconnectedAt: null,
      leftAt: null,
    });

    // Re-setup disconnect handler
    await setupDisconnectHandler();
  }, [roomCode, roomPrefix, playerUid, setupDisconnectHandler]);

  // Mark as active on mount (in case player was marked disconnected)
  useEffect(() => {
    if (!roomCode || !playerUid) return;

    // Small delay to ensure Firebase is ready
    const timer = setTimeout(() => {
      markActive();
    }, 500);

    return () => clearTimeout(timer);
  }, [roomCode, playerUid, markActive]);

  // Handle page visibility changes (tab hidden = potential close)
  useEffect(() => {
    if (!roomCode || !playerUid) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden - this might be a tab close
        // The onDisconnect will handle actual cleanup
        console.log('[PlayerCleanup] Page hidden, onDisconnect ready');
      } else if (document.visibilityState === 'visible') {
        // Page is visible again - user came back
        console.log('[PlayerCleanup] Page visible, user returned');
        // Mark as active and re-setup disconnect handler
        markActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomCode, playerUid, markActive]);

  // Graceful leave function (for ExitButton)
  const leaveRoom = useCallback(async () => {
    if (!roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;

    // Cancel the onDisconnect since we're leaving intentionally
    if (disconnectRef.current) {
      try {
        await disconnectRef.current.cancel();
      } catch (e) {
        // Ignore
      }
    }

    if (phase === 'lobby') {
      // Remove player from lobby
      console.log('[PlayerCleanup] Player leaving lobby, removing...');
      await remove(ref(db, playerPath));
    } else if (phase === 'playing') {
      // Mark as left (not just disconnected)
      console.log('[PlayerCleanup] Player leaving game, marking as left...');
      await update(ref(db, playerPath), {
        status: 'left',
        leftAt: serverTimestamp(),
      });
    }
  }, [roomCode, roomPrefix, playerUid, phase]);

  return { leaveRoom, markActive };
}

/**
 * Hook pour vérifier si un joueur a une partie en cours
 * Utilisé sur la page d'accueil pour proposer de rejoindre
 *
 * @param {string} playerUid - UID du joueur
 * @returns {Object} { activeGame, canRejoin, rejoinUrl }
 */
export function useActiveGameCheck(playerUid) {
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    if (!playerUid) {
      setActiveGame(null);
      return;
    }

    // Check localStorage for last game
    const lastGame = localStorage.getItem('lq_last_game');
    if (!lastGame) {
      setActiveGame(null);
      return;
    }

    try {
      const { roomCode, roomPrefix, joinedAt } = JSON.parse(lastGame);

      // Check if game is still active
      const stateRef = ref(db, `${roomPrefix}/${roomCode}/state`);
      const unsubState = onValue(stateRef, (snap) => {
        const state = snap.val();
        if (state && state.phase === 'playing') {
          // Check if player exists in this game
          const playerRef = ref(db, `${roomPrefix}/${roomCode}/players/${playerUid}`);
          onValue(playerRef, (playerSnap) => {
            const playerData = playerSnap.val();
            if (playerData && (playerData.status === 'disconnected' || playerData.status === 'left')) {
              // Build rejoin URL based on game type
              let rejoinUrl;
              if (roomPrefix === 'rooms_blindtest') {
                rejoinUrl = `/blindtest/game/${roomCode}/play`;
              } else if (roomPrefix === 'rooms_deeztest') {
                rejoinUrl = `/deeztest/game/${roomCode}/play`;
              } else {
                rejoinUrl = `/game/${roomCode}/play`;
              }
              setActiveGame({
                roomCode,
                roomPrefix,
                playerName: playerData.name,
                score: playerData.score || 0,
                canRejoin: true,
                rejoinUrl
              });
            } else {
              setActiveGame(null);
            }
          }, { onlyOnce: true });
        } else {
          // Game not in playing phase
          setActiveGame(null);
          localStorage.removeItem('lq_last_game');
        }
      }, { onlyOnce: true });

      return () => unsubState();
    } catch (e) {
      setActiveGame(null);
      localStorage.removeItem('lq_last_game');
    }
  }, [playerUid]);

  return activeGame;
}

