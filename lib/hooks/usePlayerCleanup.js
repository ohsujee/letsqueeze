'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, onDisconnect, update, remove, set, serverTimestamp, get, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { storage } from '@/lib/utils/storage';

/**
 * Hook pour gérer le nettoyage des joueurs selon la phase de jeu
 *
 * - Lobby: Supprime le joueur complètement à la déconnexion
 *         + Auto-rejoin si player manquant après hard refresh OU retour de background
 * - En jeu: Préserve le score, marque comme déconnecté, permet le rejoin
 *
 * IMPORTANT: Ce hook gère les données player. Pour la présence temps réel,
 * utiliser usePresence en parallèle.
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms' ou 'rooms_blindtest')
 * @param {string} options.playerUid - UID du joueur
 * @param {string} options.phase - Phase actuelle ('lobby' | 'playing' | 'ended')
 * @param {string} options.playerName - Nom du joueur (requis pour auto-rejoin en lobby)
 * @param {boolean} options.isHost - Si le joueur est l'hôte (skip auto-rejoin)
 * @param {function} options.getPlayerData - Fonction qui retourne les données du joueur pour rejoin
 * @param {function} options.onPlayerRemoved - Callback quand le joueur est détecté comme supprimé
 * @param {function} options.onRejoinSuccess - Callback quand le rejoin réussit
 * @param {function} options.onRejoinFailed - Callback si le rejoin échoue
 */
export function usePlayerCleanup({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  phase,
  playerName = 'Joueur',
  isHost = false,
  getPlayerData,
  onPlayerRemoved,
  onRejoinSuccess,
  onRejoinFailed
}) {
  const disconnectRef = useRef(null);
  const cleanupSetupRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);

  // Get normalized room code
  const getCode = useCallback(() => {
    return roomCode ? String(roomCode).toUpperCase() : null;
  }, [roomCode]);

  // Setup disconnect handler based on phase
  const setupDisconnectHandler = useCallback(async () => {
    if (!roomCode || !playerUid) return;

    const code = getCode();
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

    if (phase === 'lobby' || phase === 'playing') {
      // LOBBY & PLAYING: Mark as disconnected but preserve data (score, teamId, etc.)
      // This allows players to rejoin and keeps their team assignment intact
      disconnectRef.current = onDisconnect(playerRef);
      await disconnectRef.current.update({
        status: 'disconnected',
        disconnectedAt: serverTimestamp(),
      });
    }
    // ENDED: No cleanup needed, game is over

    cleanupSetupRef.current = true;
  }, [roomCode, roomPrefix, playerUid, phase, getCode]);

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

    const code = getCode();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;

    try {
      await update(ref(db, playerPath), {
        status: 'active',
        disconnectedAt: null,
        leftAt: null,
      });

      // Re-setup disconnect handler
      await setupDisconnectHandler();

      setIsPlayerMissing(false);
    } catch (error) {
      console.error('[PlayerCleanup] markActive failed:', error);
    }
  }, [roomCode, roomPrefix, playerUid, getCode, setupDisconnectHandler]);

  // Listen for Firebase connection state changes
  // When connection re-establishes, mark player as active
  useEffect(() => {
    if (!roomCode || !playerUid || phase === 'ended') return;

    const connectedRef = ref(db, '.info/connected');
    let wasDisconnected = false;

    const unsubscribe = onValue(connectedRef, async (snapshot) => {
      const connected = snapshot.val();

      if (connected === false) {
        wasDisconnected = true;
      } else if (connected === true && wasDisconnected) {
        // Connection re-established after being disconnected
        // Wait a moment for Firebase to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-mark as active and re-setup disconnect handler
        await markActive();
        wasDisconnected = false;
      }
    });

    return () => unsubscribe();
  }, [roomCode, playerUid, phase, markActive]);

  // Attempt to rejoin the room
  const attemptRejoin = useCallback(async () => {
    if (!roomCode || !playerUid || !playerName) return false;
    if (isHost) return false;
    if (isRejoining) return false;

    const code = getCode();

    setIsRejoining(true);

    try {
      // First check if room meta exists and is not closed
      const metaSnap = await get(ref(db, `${roomPrefix}/${code}/meta`));
      const meta = metaSnap.val();

      if (!meta || meta.closed) {
        // Room doesn't exist or is closed
        setIsRejoining(false);
        if (onRejoinFailed) {
          onRejoinFailed(new Error('Room is closed'));
        }
        return false;
      }

      // Check if player already exists
      const playerSnap = await get(ref(db, `${roomPrefix}/${code}/players/${playerUid}`));

      if (playerSnap.exists()) {
        // Player already exists - just mark active
        await markActive();
        setIsPlayerMissing(false);
        setIsRejoining(false);
        if (onRejoinSuccess) {
          onRejoinSuccess();
        }
        return true;
      }

      // Player is missing - attempt to rejoin
      const playerData = getPlayerData
        ? getPlayerData(playerUid, playerName)
        : {
            uid: playerUid,
            name: playerName,
            score: 0,
            status: 'active',
            joinedAt: Date.now()
          };

      await set(ref(db, `${roomPrefix}/${code}/players/${playerUid}`), playerData);

      // Re-setup disconnect handler after rejoin
      await setupDisconnectHandler();

      setIsPlayerMissing(false);
      setIsRejoining(false);

      if (onRejoinSuccess) {
        onRejoinSuccess();
      }

      return true;

    } catch (err) {
      console.error('[PlayerCleanup] Rejoin failed:', err);
      setIsRejoining(false);

      if (onRejoinFailed) {
        onRejoinFailed(err);
      }
      return false;
    }
  }, [roomCode, roomPrefix, playerUid, playerName, isHost, isRejoining, getCode, getPlayerData, markActive, setupDisconnectHandler, onRejoinSuccess, onRejoinFailed]);

  // Listen to player existence in Firebase (detect removal)
  useEffect(() => {
    if (!roomCode || !playerUid || phase === 'ended') return;

    const code = getCode();
    const playerRef = ref(db, `${roomPrefix}/${code}/players/${playerUid}`);

    const unsubscribe = onValue(playerRef, async (snapshot) => {
      const exists = snapshot.exists();

      if (!exists && !isPlayerMissing) {
        // Player was removed - check if it was a kick (exclusion by host) or a disconnect
        const kickedRef = ref(db, `${roomPrefix}/${code}/kickedPlayers/${playerUid}`);

        try {
          const kickedSnap = await get(kickedRef);

          if (kickedSnap.exists()) {
            // Player was KICKED by host → redirect to home, no rejoin option
            console.log('[PlayerCleanup] Player was kicked by host, redirecting to home');
            setIsPlayerMissing(true);

            // Store flag for home page to show notification
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('lq_wasKicked', 'true');
              window.location.href = '/home';
            }
            return;
          }
        } catch (err) {
          console.error('[PlayerCleanup] Error checking kick status:', err);
        }

        // Player was DISCONNECTED (not kicked) → show alert with rejoin option
        setIsPlayerMissing(true);

        if (onPlayerRemoved) {
          onPlayerRemoved();
        }
      } else if (exists && isPlayerMissing) {
        // Player was re-added (successful rejoin)
        setIsPlayerMissing(false);
      }
    });

    return () => unsubscribe();
  }, [roomCode, roomPrefix, playerUid, phase, getCode, isPlayerMissing, onPlayerRemoved]);

  // Handle page visibility changes
  // When user comes back from background, attempt rejoin if missing
  useEffect(() => {
    if (!roomCode || !playerUid) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // User came back - check if we need to rejoin
        // Small delay to let Firebase reconnect first
        await new Promise(resolve => setTimeout(resolve, 600));

        if (document.visibilityState !== 'visible') return; // User left again

        const code = getCode();

        try {
          // Check if player still exists
          const playerSnap = await get(ref(db, `${roomPrefix}/${code}/players/${playerUid}`));

          if (!playerSnap.exists()) {
            // Player is missing - try to rejoin (lobby phase)
            if (phase === 'lobby') {
              await attemptRejoin();
            } else {
              // In playing phase, just trigger the callback
              setIsPlayerMissing(true);
              if (onPlayerRemoved) {
                onPlayerRemoved();
              }
            }
          } else {
            // Player exists - mark active
            await markActive();
          }
        } catch (error) {
          console.error('[PlayerCleanup] Visibility change check failed:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomCode, roomPrefix, playerUid, phase, getCode, attemptRejoin, markActive, onPlayerRemoved]);

  // Auto-rejoin on mount if player is missing (for hard refresh)
  useEffect(() => {
    // Only auto-rejoin in lobby phase
    if (phase !== 'lobby') return;
    if (!roomCode || !playerUid || !playerName) return;
    if (isHost) return;

    // Small delay to ensure Firebase is ready and give time for normal join flow
    const timer = setTimeout(async () => {
      const code = getCode();

      try {
        // Check if room is valid
        const metaSnap = await get(ref(db, `${roomPrefix}/${code}/meta`));
        const meta = metaSnap.val();

        if (!meta || meta.closed) return;

        // Check if player exists
        const playerSnap = await get(ref(db, `${roomPrefix}/${code}/players/${playerUid}`));

        if (!playerSnap.exists()) {
          // Player is missing - attempt rejoin
          await attemptRejoin();
        } else {
          // Player exists - just mark active
          await markActive();
        }
      } catch (err) {
        console.error('[PlayerCleanup] Initial check failed:', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [phase, roomCode, roomPrefix, playerUid, playerName, isHost, getCode, attemptRejoin, markActive]);

  // Graceful leave function (for ExitButton)
  const leaveRoom = useCallback(async () => {
    if (!roomCode || !playerUid) return;

    const code = getCode();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;
    const presencePath = `${roomPrefix}/${code}/presence/${playerUid}`;

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
      // Also remove presence
      await remove(ref(db, presencePath)).catch(() => {});
    } else if (phase === 'playing') {
      // Mark as left (not just disconnected)
      await update(ref(db, playerPath), {
        status: 'left',
        leftAt: serverTimestamp(),
      });
      // Mark presence as offline
      await update(ref(db, presencePath), {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    }
  }, [roomCode, roomPrefix, playerUid, phase, getCode]);

  return {
    leaveRoom,
    markActive,
    attemptRejoin,
    isPlayerMissing,
    isRejoining
  };
}

// Game type info for RejoinBanner
const GAME_TYPES = {
  rooms: { name: 'Quiz Buzzer', image: '/images/quiz-buzzer.png', progressKey: 'currentIndex', progressLabel: 'Question' },
  rooms_blindtest: { name: 'Blind Test', image: '/images/blind-test.png', progressKey: 'currentIndex', progressLabel: 'Piste' },
  rooms_alibi: { name: 'Alibi', image: '/images/alibi.png', progressKey: 'currentQuestion', progressLabel: 'Question', totalFixed: 10 },
  rooms_laregle: { name: 'La Règle', image: '/images/laregle.png', progressKey: 'roundNumber', progressLabel: 'Manche' }
};

/**
 * Hook pour vérifier si un joueur a une partie en cours
 * Utilisé sur la page d'accueil pour proposer de rejoindre
 *
 * @param {string} playerUid - UID du joueur
 * @returns {Object} { activeGame, canRejoin, rejoinUrl, gameInfo, progress }
 */
export function useActiveGameCheck(playerUid) {
  const [activeGame, setActiveGame] = useState(null);
  const unsubscribeRef = useRef(null);

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
    const { roomCode, roomPrefix } = lastGame;

    // Cleanup function to clear real-time listener
    const cleanup = () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };

    const checkActiveGame = async () => {
      try {
        const gameType = GAME_TYPES[roomPrefix] || GAME_TYPES.rooms;

        // Check if room still exists and is not closed
        const metaSnap = await get(ref(db, `${roomPrefix}/${roomCode}/meta`));
        const meta = metaSnap.val();

        if (cancelled) return;

        // Room doesn't exist or is closed → no banner
        if (!meta || meta.closed) {
          setActiveGame(null);
          storage.remove('last_game');
          return;
        }

        // Check if host is still active (required for game to be valid)
        const hostUid = meta.hostUid;
        if (hostUid) {
          // Check host presence first
          const hostPresenceSnap = await get(ref(db, `${roomPrefix}/${roomCode}/presence/${hostUid}`));
          const hostPresence = hostPresenceSnap.val();

          // If host has presence data and is offline, game is not valid
          if (hostPresence && hostPresence.online === false) {
            setActiveGame(null);
            storage.remove('last_game');
            return;
          }

          // Also check if host is in players with active status (for games where host plays)
          const hostPlayerSnap = await get(ref(db, `${roomPrefix}/${roomCode}/players/${hostUid}`));
          const hostPlayer = hostPlayerSnap.val();

          // If host player exists but is disconnected/left, game is not valid
          if (hostPlayer && (hostPlayer.status === 'disconnected' || hostPlayer.status === 'left')) {
            setActiveGame(null);
            storage.remove('last_game');
            return;
          }
        }

        if (cancelled) return;

        // Get current state for progress info
        const stateSnap = await get(ref(db, `${roomPrefix}/${roomCode}/state`));
        const state = stateSnap.val();

        if (cancelled) return;

        // Room exists, host is active → check player status
        if (state) {
          // Check if player exists in this game (one-time read)
          const playerSnap = await get(ref(db, `${roomPrefix}/${roomCode}/players/${playerUid}`));
          const playerData = playerSnap.val();

          if (cancelled) return;

          if (playerData && (playerData.status === 'disconnected' || playerData.status === 'left')) {
            // Build rejoin URL based on game type and phase
            let rejoinUrl;
            const isLobby = state.phase === 'lobby';

            if (roomPrefix === 'rooms_blindtest') {
              rejoinUrl = isLobby ? `/blindtest/room/${roomCode}` : `/blindtest/game/${roomCode}/play`;
            } else if (roomPrefix === 'rooms_alibi') {
              rejoinUrl = isLobby ? `/alibi/room/${roomCode}` : `/alibi/game/${roomCode}/play`;
            } else if (roomPrefix === 'rooms_laregle') {
              rejoinUrl = isLobby ? `/laregle/room/${roomCode}` : `/laregle/game/${roomCode}/play`;
            } else {
              rejoinUrl = isLobby ? `/room/${roomCode}` : `/game/${roomCode}/play`;
            }

            // Get progress info
            let currentProgress = null;
            let totalProgress = null;

            if (gameType.progressKey && state[gameType.progressKey] !== undefined) {
              currentProgress = state[gameType.progressKey] + 1; // 0-indexed to 1-indexed

              if (gameType.totalFixed) {
                totalProgress = gameType.totalFixed;
              }
            }

            // Try to get total from tracks/questions if available
            if (!totalProgress) {
              try {
                if (roomPrefix === 'rooms_blindtest') {
                  // BlindTest: total in tracks array
                  const tracksSnap = await get(ref(db, `${roomPrefix}/${roomCode}/tracks`));
                  const tracks = tracksSnap.val();
                  if (tracks && Array.isArray(tracks)) {
                    totalProgress = tracks.length;
                  }
                } else if (roomPrefix === 'rooms') {
                  // Quiz: total in quiz.items array
                  const quizSnap = await get(ref(db, `${roomPrefix}/${roomCode}/quiz`));
                  const quiz = quizSnap.val();
                  if (quiz?.items && Array.isArray(quiz.items)) {
                    totalProgress = quiz.items.length;
                  }
                }
              } catch (e) {
                // Ignore
              }
            }

            setActiveGame({
              roomCode,
              roomPrefix,
              playerName: playerData.name,
              score: playerData.score || 0,
              canRejoin: true,
              rejoinUrl,
              // Game info
              gameName: gameType.name,
              gameImage: gameType.image,
              currentProgress,
              totalProgress,
              progressLabel: gameType.progressLabel,
              phase: state.phase
            });

            // Set up real-time listener for room closure
            // This will hide the banner immediately when the room is closed
            cleanup(); // Clear any existing listener
            unsubscribeRef.current = onValue(ref(db, `${roomPrefix}/${roomCode}/meta/closed`), (snap) => {
              const closed = snap.val();
              if (closed === true) {
                console.log('[ActiveGameCheck] Room closed - hiding banner');
                setActiveGame(null);
                storage.remove('last_game');
                cleanup();
              }
            });

          } else {
            setActiveGame(null);
          }
        } else {
          // No state found (room might be corrupted)
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
      cleanup();
    };
  }, [playerUid]);

  return activeGame;
}
