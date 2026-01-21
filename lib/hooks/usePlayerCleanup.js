'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, onDisconnect, update, remove, set, serverTimestamp, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/utils/storage';

/**
 * Hook pour gérer le nettoyage des joueurs selon la phase de jeu
 *
 * - Lobby: Supprime le joueur complètement à la déconnexion
 *         + Auto-rejoin si player manquant après hard refresh
 * - En jeu: Préserve le score, marque comme déconnecté, permet le rejoin
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms' ou 'rooms_blindtest')
 * @param {string} options.playerUid - UID du joueur
 * @param {string} options.phase - Phase actuelle ('lobby' | 'playing' | 'ended')
 * @param {string} options.playerName - Nom du joueur (requis pour auto-rejoin en lobby)
 * @param {boolean} options.isHost - Si le joueur est l'hôte (skip auto-rejoin)
 * @param {function} options.getPlayerData - Fonction qui retourne les données du joueur pour rejoin
 * @param {function} options.onRejoinFailed - Callback si le rejoin échoue (ex: redirect)
 */
export function usePlayerCleanup({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  phase,
  playerName = 'Joueur',
  isHost = false,
  getPlayerData,
  onRejoinFailed
}) {
  const disconnectRef = useRef(null);
  const cleanupSetupRef = useRef(false);
  const rejoinAttemptedRef = useRef(false);

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
      disconnectRef.current = onDisconnect(playerRef);
      await disconnectRef.current.remove();

    } else if (phase === 'playing') {
      // PLAYING: Mark as disconnected but preserve score
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
      if (document.visibilityState === 'visible') {
        // Page is visible again - user came back
        // Mark as active and re-setup disconnect handler
        markActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomCode, playerUid, markActive]);

  // Auto-rejoin in lobby if player was removed during hard refresh
  // When user does Ctrl+Shift+R, the page reloads before onDisconnect can be cancelled,
  // causing the player to be removed. This effect re-adds them.
  useEffect(() => {
    // Only auto-rejoin in lobby phase
    if (phase !== 'lobby') return;

    // Skip if already attempted rejoin this session
    if (rejoinAttemptedRef.current) return;

    // Skip if missing required data
    if (!roomCode || !playerUid || !playerName) return;

    // Skip if user is host (hosts have separate join logic)
    if (isHost) return;

    const code = String(roomCode).toUpperCase();

    // Check if player exists and if room is valid
    const checkAndRejoin = async () => {
      try {
        // First check if room meta exists and is not closed
        const metaSnap = await get(ref(db, `${roomPrefix}/${code}/meta`));
        const meta = metaSnap.val();
        if (!meta || meta.closed) {
          // Room doesn't exist or is closed, don't attempt rejoin
          return;
        }

        // Check if player exists
        const playerSnap = await get(ref(db, `${roomPrefix}/${code}/players/${playerUid}`));
        if (playerSnap.exists()) {
          // Player already exists, no need to rejoin
          return;
        }

        // Player is missing - attempt to rejoin
        rejoinAttemptedRef.current = true;

        // Get player data from custom function or use default
        const playerData = getPlayerData
          ? getPlayerData(playerUid, playerName)
          : {
              uid: playerUid,
              name: playerName,
              score: 0,
              joinedAt: Date.now()
            };

        await set(ref(db, `${roomPrefix}/${code}/players/${playerUid}`), playerData);

        // Re-setup disconnect handler after rejoin
        await setupDisconnectHandler();

      } catch (err) {
        console.error('[PlayerCleanup] Auto-rejoin failed:', err);
        // If rejoin fails (e.g., permission denied because kicked), call callback
        if (onRejoinFailed) {
          onRejoinFailed(err);
        }
      }
    };

    // Small delay to ensure Firebase is ready and give time for normal join flow
    const timer = setTimeout(checkAndRejoin, 800);
    return () => clearTimeout(timer);

  }, [phase, roomCode, roomPrefix, playerUid, playerName, isHost, getPlayerData, onRejoinFailed, setupDisconnectHandler]);

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
      await remove(ref(db, playerPath));
    } else if (phase === 'playing') {
      // Mark as left (not just disconnected)
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
    const lastGame = storage.get('last_game');
    if (!lastGame) {
      setActiveGame(null);
      return;
    }

    let cancelled = false;

    const checkActiveGame = async () => {
      try {
        const { roomCode, roomPrefix } = lastGame;

        // Check if game is still active (one-time read)
        const stateSnap = await get(ref(db, `${roomPrefix}/${roomCode}/state`));
        const state = stateSnap.val();

        if (cancelled) return;

        if (state && state.phase === 'playing') {
          // Check if player exists in this game (one-time read)
          const playerSnap = await get(ref(db, `${roomPrefix}/${roomCode}/players/${playerUid}`));
          const playerData = playerSnap.val();

          if (cancelled) return;

          if (playerData && (playerData.status === 'disconnected' || playerData.status === 'left')) {
            // Build rejoin URL based on game type
            let rejoinUrl;
            if (roomPrefix === 'rooms_blindtest') {
              rejoinUrl = `/blindtest/game/${roomCode}/play`;
            } else if (roomPrefix === 'rooms_deeztest') {
              rejoinUrl = `/deeztest/game/${roomCode}/play`;
            } else if (roomPrefix === 'rooms_alibi') {
              rejoinUrl = `/alibi/game/${roomCode}/play`;
            } else if (roomPrefix === 'rooms_trouveregle') {
              rejoinUrl = `/trouveregle/game/${roomCode}/play`;
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
        } else {
          // Game not in playing phase
          setActiveGame(null);
          storage.remove('last_game');
        }
      } catch (e) {
        if (!cancelled) {
          setActiveGame(null);
          storage.remove('last_game');
        }
      }
    };

    checkActiveGame();

    return () => {
      cancelled = true;
    };
  }, [playerUid]);

  return activeGame;
}

