"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp, set
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { GameEndTransition } from "@/components/transitions";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import HostDisconnectAlert from "@/components/game/HostDisconnectAlert";
import { initializePlayer, playSnippet, pause, resume, isPlayerReady, disconnect, preloadPreview, seek, getPlayerState } from "@/lib/deezer/player";
import { SkipForward, X, Check, Music, Play, Pause, Bell, RefreshCw, Shuffle } from "lucide-react";
import BlindTestRevealScreen from "@/components/game/BlindTestRevealScreen";
import { SNIPPET_LEVELS, LOCKOUT_MS, WRONG_PENALTY, getPointsForLevel, AUDIO_SYNC_BUFFER_MS } from "@/lib/constants/blindtest";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { getPlaylistTracks, formatTracksForGame, getRandomUnplayedTrack } from "@/lib/deezer/api";
import { usePlaylistHistory } from "@/lib/hooks/usePlaylistHistory";

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';
const DEEZER_LIGHT = '#C574FF';

/**
 * BlindTestHostView - Vue partagée pour host et asker (Party Mode)
 *
 * @param {string} code - Code de la room
 * @param {boolean} isActualHost - true si c'est le vrai host (page /host), false si c'est un asker en Party Mode
 * @param {function} onAdvanceAsker - Callback pour avancer à l'asker suivant (Party Mode uniquement)
 */
export default function BlindTestHostView({ code, isActualHost = true, onAdvanceAsker }) {
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Deezer player state
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSnippet, setCurrentSnippet] = useState(null);
  const snippetStopRef = useRef(null);

  // Track highest unlocked level (0 = first level always unlocked)
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const unlockTimeoutRef = useRef(null);

  // Track highest level that was actually played (for scoring)
  const [highestLevelPlayed, setHighestLevelPlayed] = useState(null);

  // Server time sync (300ms tick for score updates)
  const { serverNow, offset: serverOffset } = useServerTime(300);

  // Player error state
  const [playerError, setPlayerError] = useState(null);

  // Track refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasTriedRefresh = useRef(false);

  // Audio loading state (for spinner on album cover)
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Progress bar state for timeline segments
  const [playProgress, setPlayProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  // Change song animation state
  const [isChangingSong, setIsChangingSong] = useState(false);

  // Reveal screen state (shown after correct answer)
  const [showRevealScreen, setShowRevealScreen] = useState(false);
  const [revealWinner, setRevealWinner] = useState(null); // { name, points, level }
  const [revealTrack, setRevealTrack] = useState(null); // Track info to show
  const [revealProgress, setRevealProgress] = useState(0);
  const [isRevealPlaying, setIsRevealPlaying] = useState(false);
  const [isRevealDragging, setIsRevealDragging] = useState(false);
  const revealProgressBarRef = useRef(null);
  const revealAnimationRef = useRef(null);
  const revealProgressRef = useRef(0); // Track progress during drag
  const wasPlayingBeforeDragRef = useRef(false); // Track if was playing before drag

  // Playlist history (to avoid replaying same tracks)
  const { markTracksAsPlayed, getPlayedTracks } = usePlaylistHistory();

  const myUid = auth.currentUser?.uid;
  // Pour les permissions Firebase, on est "host" si on est le vrai host OU si on est l'asker actuel
  const canControl = isActualHost || (meta?.gameMasterMode === 'party' && state?.currentAskerUid === myUid);

  // Pause music - défini tôt car utilisé dans le système de buzz
  const pauseMusic = useCallback(async () => {
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
  }, []);

  // Function to refresh all track URLs from Deezer
  const refreshTrackUrls = useCallback(async () => {
    if (!playlist?.id || isRefreshing) return false;

    setIsRefreshing(true);
    setPlayerError("Rafraîchissement des URLs...");

    try {
      const freshTracks = await getPlaylistTracks(playlist.id, 100);
      const formattedTracks = formatTracksForGame(freshTracks);

      // Match tracks by ID to preserve order
      const refreshedTracks = playlist.tracks.map(oldTrack => {
        const fresh = formattedTracks.find(t => t.id === oldTrack.id);
        if (fresh) {
          return { ...oldTrack, previewUrl: fresh.previewUrl };
        }
        // If track not found, try to find a replacement
        const replacement = formattedTracks.find(t =>
          !playlist.tracks.some(pt => pt.id === t.id)
        );
        return replacement ? { ...replacement } : oldTrack;
      });

      // Update Firebase with fresh URLs using set() for the tracks array
      await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), refreshedTracks);

      setPlayerError(null);
      setIsRefreshing(false);
      return true;
    } catch (error) {
      console.error("[DeezTest Host] Failed to refresh URLs:", error);
      setPlayerError("Impossible de rafraîchir les URLs");
      setIsRefreshing(false);
      return false;
    }
  }, [playlist?.id, playlist?.tracks, code, isRefreshing]);

  // Initialize Deezer Player
  useEffect(() => {
    const init = async () => {
      try {
        await initializePlayer({
          onReady: () => {
            setPlayerReady(true);
            setPlayerError(null);
          },
          onStateChange: (playerState) => {
            setIsPlaying(!playerState?.paused);
          },
          onError: (error) => {
            console.error("[DeezTest Host] Player error:", error);
            setPlayerError(error.message || "Erreur audio");
          },
          onEnded: () => {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.error("[DeezTest Host] Failed to init player:", error);
        setPlayerError(error.message || "Échec d'initialisation");
      }
    };
    init();

    return () => disconnect();
  }, []);

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Redirect when phase changes
  useEffect(() => {
    if (state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
  }, [state?.phase, router, code]);

  // Room guard - détecte fermeture room
  // Note: isHost doit être basé sur isActualHost (pour le comportement de fermeture)
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: isActualHost
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Passer hostUid (meta.hostUid) - le hook détermine automatiquement si on est l'hôte
  const {
    isHostMarkedDisconnected: isHostDisconnected,
    isFirebaseConnected,
    forceReconnect
  } = useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    hostUid: meta?.hostUid
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Empêcher l'écran de se verrouiller
  useWakeLock({ enabled: true });

  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];
  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";
  const snippetLevel = state?.snippetLevel || 0;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  // Calculate points based on HIGHEST level played (not current snippet)
  const { pointsEnJeu } = useMemo(() => {
    if (highestLevelPlayed === null) return { pointsEnJeu: SNIPPET_LEVELS[0].start };
    const levelConfig = SNIPPET_LEVELS[highestLevelPlayed];
    return { pointsEnJeu: levelConfig?.start || 0 };
  }, [highestLevelPlayed]);

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevLock = useRef(null);

  // *** SYSTÈME DE BUZZ ROBUSTE ***
  const BUZZ_WINDOW_MS = 150;
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({});
  const isResolving = useRef(false);

  // *** SYSTÈME DE BUZZ ROBUSTE: LISTENER DÉDIÉ + CACHE LOCAL ***
  useEffect(() => {
    if (!canControl || !code) return;

    const pendingBuzzesRef = ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`);

    const resolveBuzzes = async () => {
      isResolving.current = true;
      buzzWindowTimeout.current = null;

      try {
        const buzzesToResolve = { ...buzzCache.current };
        const buzzCount = Object.keys(buzzesToResolve).length;

        if (buzzCount === 0) return;

        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms_blindtest/${code}/state/lockUid`));
        if (lockSnap.val()) return;

        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms_blindtest/${code}/state/lockUid`), (currentLock) => {
          if (currentLock) return currentLock;
          return winner.uid;
        });

        if (lockResult.snapshot.val() !== winner.uid) return;

        pauseMusic();

        await update(ref(db, `rooms_blindtest/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

        playBuzz();

      } catch (error) {
        console.error('[Buzz] Error:', error);
      } finally {
        isResolving.current = false;
        buzzCache.current = {};
      }
    };

    const unsubscribe = onValue(pendingBuzzesRef, (snapshot) => {
      const pendingBuzzes = snapshot.val() || {};
      const buzzCount = Object.keys(pendingBuzzes).length;

      buzzCache.current = pendingBuzzes;

      if (buzzCount === 0) return;
      if (buzzWindowTimeout.current) return;
      if (isResolving.current) return;

      buzzWindowTimeout.current = setTimeout(resolveBuzzes, BUZZ_WINDOW_MS);
    });

    return () => {
      unsubscribe();
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
        buzzWindowTimeout.current = null;
      }
      buzzCache.current = {};
      isResolving.current = false;
    };
  }, [canControl, code, playBuzz, pauseMusic]);

  // Preload track silently when changing to a new question
  useEffect(() => {
    if (!canControl || !playerReady || !currentTrack?.previewUrl) return;

    const timer = setTimeout(async () => {
      try {
        await preloadPreview(currentTrack.previewUrl);
      } catch (e) {
        // Ignore preload errors - playLevel will handle refresh if needed
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [canControl, playerReady, currentTrack?.previewUrl]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    if (!canControl || !currentTrack || !playerReady) return;

    setIsAudioLoading(true);

    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const previewUrl = currentTrack.previewUrl;

    if (!previewUrl) {
      setPlayerError("Cette piste n'a pas d'extrait disponible");
      setIsAudioLoading(false);
      return;
    }

    // ========== AUDIO SYNC ==========
    const audioMode = meta?.audioMode || 'single';

    if (audioMode === 'all') {
      // Mode synchronisé: tout le monde démarre au même moment (server time)
      const startAt = Date.now() + serverOffset + AUDIO_SYNC_BUFFER_MS;

      // Écrire dans Firebase pour que les players reçoivent l'event
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        snippetLevel: level,
        highestSnippetLevel: Math.max(state?.highestSnippetLevel ?? -1, level),
        audioSync: {
          startAt,
          previewUrl: previewUrl,
          duration: config.duration || 25000,
          level: level
        },
        lastRevealAt: serverTimestamp()
      });

      // L'asker attend aussi startAt (même timing que les players)
      const delay = Math.max(0, startAt - (Date.now() + serverOffset));
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    // ========== FIN AUDIO SYNC ==========

    try {
      const snippet = await playSnippet(previewUrl, config.duration);
      snippetStopRef.current = snippet;
      setIsPlaying(true);
      setCurrentSnippet(level);
      setPlayerError(null);
      setIsAudioLoading(false);
      hasTriedRefresh.current = false;

      // Start progress animation
      setPlayProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      const duration = config.duration || 25000;
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setPlayProgress(progress);
        if (progress >= 100) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, 50);

      setHighestLevelPlayed(prev => Math.max(prev ?? -1, level));

      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }

      const isLastLevel = level === SNIPPET_LEVELS.length - 1;
      if (!isLastLevel && config.duration && level >= unlockedLevel) {
        const unlockDelay = Math.floor(config.duration * 0.9);
        unlockTimeoutRef.current = setTimeout(() => {
          setUnlockedLevel(prev => Math.max(prev, level + 1));
        }, unlockDelay);
      }

      // Mode 'single' uniquement: update Firebase state
      if (audioMode === 'single') {
        const currentHighest = state?.highestSnippetLevel ?? -1;
        const newHighest = Math.max(currentHighest, level);

        await update(ref(db, `rooms_blindtest/${code}/state`), {
          snippetLevel: level,
          highestSnippetLevel: newHighest,
          // NE PAS mettre revealed: true ici - ça cache l'UI du joueur !
          // revealed ne doit être true que quand on montre la réponse finale
          lastRevealAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("[DeezTest Host] Error playing snippet:", error);
      setIsAudioLoading(false);

      if (!hasTriedRefresh.current) {
        hasTriedRefresh.current = true;
        const refreshed = await refreshTrackUrls();
        if (refreshed) {
          setPlayerError("URLs expirées - Rafraîchies! Réessayez.");
        }
      } else {
        setPlayerError(error.message || "Erreur de lecture");
      }
    }
  };

  // Full stop - resets everything for new question
  const stopMusic = async () => {
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
    setCurrentSnippet(null);
    setPlayProgress(0);
  };

  // Exit and end game
  async function exitAndEndGame() {
    if (code) {
      await stopMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      if (isActualHost) {
        await update(ref(db, `rooms_blindtest/${code}/meta`), { closed: true });
      }
    }
    router.push('/home');
  }

  // Reset buzzers
  async function resetBuzzers() {
    if (!canControl) return;
    isResolving.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    await update(ref(db, `rooms_blindtest/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null
    });
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    if (currentSnippet !== null && currentTrack) {
      await playLevel(currentSnippet);
    }
  }

  // Validate correct answer
  async function validate() {
    if (!canControl || !currentTrack || !state?.lockUid) return;

    playCorrect();

    // Marquer la track comme jouée dans l'historique
    if (playlist?.id && currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }

    const uid = state.lockUid;
    const pts = pointsEnJeu;
    const winner = players.find(p => p.uid === uid);
    const levelLabel = currentSnippet !== null ? SNIPPET_LEVELS[currentSnippet]?.label : '?';

    // Update scores
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => (cur || 0) + pts);
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/correctAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => (cur || 0) + pts);
      }
    }

    const winnerInfo = {
      name: winner?.name || 'Joueur',
      points: pts,
      level: levelLabel
    };

    // Clear buzz state, show reveal to all players, sync winner + playback
    await update(ref(db, `rooms_blindtest/${code}/state`), {
      revealed: true,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null,
      // lockUid kept so players see winner name
      revealWinner: winnerInfo,
      revealPlayback: {
        startedAt: Date.now(),
        startProgress: 0,
        paused: false
      }
    });

    // Show reveal screen locally
    setRevealWinner(winnerInfo);
    setRevealTrack(currentTrack);
    setRevealProgress(0);
    revealProgressRef.current = 0;
    setShowRevealScreen(true);

    // Start playing full preview
    startRevealPlayback();
  }

  // Reveal screen playback functions
  // Preview plays from 5s to 30s (25 seconds of content)
  const REVEAL_START_OFFSET = 5; // seconds
  const REVEAL_DURATION = 25; // seconds (30 - 5)
  const REVEAL_DURATION_MS = REVEAL_DURATION * 1000;

  const startRevealPlayback = async () => {
    if (!currentTrack?.previewUrl) return;

    try {
      // Stop any current playback
      if (snippetStopRef.current) {
        await snippetStopRef.current.stop();
        snippetStopRef.current = null;
      }

      // Play full 30s preview (null duration = full length)
      const snippet = await playSnippet(currentTrack.previewUrl, null);
      snippetStopRef.current = snippet;
      setIsRevealPlaying(true);
      setRevealProgress(0);
      revealProgressRef.current = 0;

      // Time-based animation for smooth progress (like the demo)
      let startTime = null;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const newProgress = Math.min(100, (elapsed / REVEAL_DURATION_MS) * 100);

        setRevealProgress(newProgress);
        revealProgressRef.current = newProgress;

        if (newProgress >= 100) {
          setIsRevealPlaying(false);
          // Sync ended state to Firebase
          update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
            paused: true,
            startProgress: 100
          }).catch(() => {});
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    } catch (error) {
      console.error('[Reveal] Error starting playback:', error);
    }
  };

  const toggleRevealPlayback = async () => {
    if (isRevealPlaying) {
      // Pause
      if (revealAnimationRef.current) {
        cancelAnimationFrame(revealAnimationRef.current);
        revealAnimationRef.current = null;
      }
      await pause();
      setIsRevealPlaying(false);

      // Sync pause state to Firebase
      update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
        paused: true,
        startProgress: revealProgressRef.current
      }).catch(() => {});
    } else {
      // Resume from current progress
      await resume();
      setIsRevealPlaying(true);

      const startProgress = revealProgressRef.current;

      // Sync resume state to Firebase
      update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
        paused: false,
        startedAt: Date.now(),
        startProgress
      }).catch(() => {});

      // Time-based animation resuming from current progress (use ref for accurate value)
      let startTime = null;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progressIncrement = (elapsed / REVEAL_DURATION_MS) * 100;
        const newProgress = Math.min(100, startProgress + progressIncrement);

        setRevealProgress(newProgress);
        revealProgressRef.current = newProgress;

        if (newProgress >= 100) {
          setIsRevealPlaying(false);
          // Sync ended state
          update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
            paused: true,
            startProgress: 100
          }).catch(() => {});
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    }
  };

  const seekReveal = (clientX) => {
    if (!revealProgressBarRef.current) return;
    const rect = revealProgressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));

    // Update both state and ref
    setRevealProgress(newProgress);
    revealProgressRef.current = newProgress;

    // Seek in audio - map 0-100% to 5-30 seconds
    const targetSec = REVEAL_START_OFFSET + (newProgress / 100) * REVEAL_DURATION;
    seek(targetSec * 1000);

    // Sync seek to Firebase
    update(ref(db, `rooms_blindtest/${code}/state/revealPlayback`), {
      startedAt: Date.now(),
      startProgress: newProgress,
      paused: !isRevealPlaying
    }).catch(() => {});
  };

  const handleRevealDragStart = (e) => {
    // Remember if we were playing
    wasPlayingBeforeDragRef.current = isRevealPlaying;
    setIsRevealDragging(true);

    // Stop animation during drag
    if (revealAnimationRef.current) {
      cancelAnimationFrame(revealAnimationRef.current);
      revealAnimationRef.current = null;
    }

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    seekReveal(clientX);
  };

  const handleRevealDragMove = useCallback((e) => {
    if (!isRevealDragging) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    seekReveal(clientX);
  }, [isRevealDragging]);

  const handleRevealDragEnd = useCallback(() => {
    setIsRevealDragging(false);

    // Restart animation from current position if was playing before drag
    if (wasPlayingBeforeDragRef.current) {
      let startTime = null;
      const startProgress = revealProgressRef.current;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progressIncrement = (elapsed / REVEAL_DURATION_MS) * 100;
        const updatedProgress = Math.min(100, startProgress + progressIncrement);

        setRevealProgress(updatedProgress);
        revealProgressRef.current = updatedProgress;

        if (updatedProgress >= 100) {
          setIsRevealPlaying(false);
          return;
        }

        revealAnimationRef.current = requestAnimationFrame(animate);
      };

      revealAnimationRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Global mouse/touch listeners for reveal drag
  useEffect(() => {
    if (isRevealDragging) {
      window.addEventListener('mousemove', handleRevealDragMove);
      window.addEventListener('mouseup', handleRevealDragEnd);
      window.addEventListener('touchmove', handleRevealDragMove);
      window.addEventListener('touchend', handleRevealDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleRevealDragMove);
      window.removeEventListener('mouseup', handleRevealDragEnd);
      window.removeEventListener('touchmove', handleRevealDragMove);
      window.removeEventListener('touchend', handleRevealDragEnd);
    };
  }, [isRevealDragging, handleRevealDragMove, handleRevealDragEnd]);

  const closeRevealAndNext = async () => {
    // Stop animation
    if (revealAnimationRef.current) {
      cancelAnimationFrame(revealAnimationRef.current);
      revealAnimationRef.current = null;
    }

    // Stop audio
    await stopMusic();

    // Reset reveal state
    setShowRevealScreen(false);
    setRevealWinner(null);
    setRevealTrack(null);
    setRevealProgress(0);
    revealProgressRef.current = 0;
    setIsRevealPlaying(false);

    // Clean up Firebase reveal data (nextTrack also sets revealed: false)
    update(ref(db, `rooms_blindtest/${code}/state`), {
      revealPlayback: null,
      revealWinner: null
    }).catch(() => {});

    // Go to next track
    await nextTrack();
  };

  // Wrong answer
  async function wrong() {
    if (!canControl || !state?.lockUid) return;

    playWrong();

    const uid = state.lockUid;
    const until = serverNow + LOCKOUT_MS;
    const levelToReplay = currentSnippet;

    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/wrongAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
      }
    }

    const updates = {};

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p => p.teamId === teamId).forEach(p => {
          updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      } else {
        updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
      }
    } else {
      updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
    }
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;

    isResolving.current = false;

    await update(ref(db), updates);
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});

    if (levelToReplay !== null && currentTrack) {
      await playLevel(levelToReplay);
    }
  }

  // Skip to next track
  async function nextTrack() {
    await stopMusic();

    const next = qIndex + 1;
    if (next >= total) {
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      return;
    }

    const updates = {};
    players.forEach(p => {
      updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms_blindtest/${code}/state/currentIndex`] = next;
    updates[`rooms_blindtest/${code}/state/revealed`] = false;
    updates[`rooms_blindtest/${code}/state/snippetLevel`] = 0;
    updates[`rooms_blindtest/${code}/state/highestSnippetLevel`] = -1;
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/revealPlayback`] = null;
    updates[`rooms_blindtest/${code}/state/revealWinner`] = null;
    updates[`rooms_blindtest/${code}/state/audioSync`] = null;

    isResolving.current = false;

    await update(ref(db), updates);
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    setCurrentSnippet(null);
    setUnlockedLevel(0);
    setHighestLevelPlayed(null);

    // Party Mode: advance to next asker
    if (onAdvanceAsker) {
      await onAdvanceAsker();
    }
  }

  async function skip() {
    if (!canControl || total === 0) return;
    // Marquer la track comme jouée même si skippée
    if (playlist?.id && currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }
    await nextTrack();
  }

  // Change to a different random track from the playlist (fetches from API)
  async function changeSong() {
    if (!canControl || total === 0 || isChangingSong || !playlist?.id) return;

    setIsChangingSong(true);
    await stopMusic();

    // Marquer l'ancienne track comme jouée pour qu'elle ne revienne jamais
    if (currentTrack?.id) {
      markTracksAsPlayed(playlist.id, [currentTrack.id]);
    }

    try {
      // Get IDs to exclude: currently loaded tracks + already played tracks
      const loadedTrackIds = playlist.tracks.map(t => t.id);
      const playedTrackIds = getPlayedTracks(playlist.id);
      const excludeIds = [...new Set([...loadedTrackIds, ...playedTrackIds])];

      // Fetch a new unplayed track from the API
      const newTrack = await getRandomUnplayedTrack(playlist.id, excludeIds);

      if (!newTrack) {
        // No new track available, fall back to using a remaining track
        const remainingIndices = [];
        for (let i = qIndex + 1; i < total; i++) {
          remainingIndices.push(i);
        }

        if (remainingIndices.length === 0) {
          setIsChangingSong(false);
          return;
        }

        // Pick a random remaining track to replace the current one
        const randomIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
        const newTracks = [...playlist.tracks];

        // Replace current track with the selected remaining track
        newTracks[qIndex] = newTracks[randomIdx];
        // Remove the track at randomIdx (now a duplicate) - this reduces total by 1
        newTracks.splice(randomIdx, 1);

        await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), newTracks);
      } else {
        // Replace current track with the new one from API
        const newTracks = [...playlist.tracks];
        newTracks[qIndex] = {
          id: newTrack.id,
          title: newTrack.title,
          artist: newTrack.artist,
          previewUrl: newTrack.previewUrl,
          albumArt: newTrack.albumArt,
        };

        await set(ref(db, `rooms_blindtest/${code}/meta/playlist/tracks`), newTracks);
      }

      // Reset l'état local pour la nouvelle track
      setCurrentSnippet(null);
      setUnlockedLevel(0);
      setHighestLevelPlayed(null);
      setPlayerError(null);

      // Reset les buzzers au cas où
      await update(ref(db, `rooms_blindtest/${code}/state`), {
        lockUid: null,
        buzzBanner: "",
        buzz: null,
        pausedAt: null,
        lockedAt: null,
        snippetLevel: 0,
        highestSnippetLevel: -1,
        revealed: false,
        revealPlayback: null,
        revealWinner: null,
        audioSync: null
      });
    } catch (error) {
      console.error('[DeezTest] Error changing song:', error);
    }

    // Réactiver le bouton après un court délai
    setTimeout(() => setIsChangingSong(false), 100);
  }

  async function end() {
    if (canControl) {
      await stopMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "—";

  return (
    <div className="deeztest-host-page game-page">
      {/* Game End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="deeztest"
            onComplete={() => router.replace(`/blindtest/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Connection Status Banners */}
      <GameStatusBanners
        isHost={isActualHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      {/* Host Disconnect Alert - shown when host is marked as disconnected */}
      {isActualHost && (
        <HostDisconnectAlert
          isDisconnected={isHostDisconnected}
          isFirebaseConnected={isFirebaseConnected}
          onReconnect={forceReconnect}
        />
      )}

      {/* Header */}
      <header className="game-header deeztest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress deeztest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            {isActualHost && (
              <PlayerManager
                players={players}
                roomCode={code}
                roomPrefix="rooms_blindtest"
                hostUid={meta?.hostUid}
                variant="deeztest"
                phase="playing"
              />
            )}
            <ExitButton
              variant="header"
              confirmMessage={isActualHost
                ? "Voulez-vous vraiment quitter ? La partie sera abandonnée pour tous les joueurs."
                : "Voulez-vous vraiment quitter ?"
              }
              onExit={exitAndEndGame}
            />
          </div>
        </div>
      </header>

      {/* Buzz Modal */}
      <AnimatePresence>
        {state?.lockUid && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                zIndex: 9998
              }}
            />
            <div className="buzz-modal-container" style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              padding: 20
            }}>
              <motion.div
                className="buzz-card deeztest"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                  width: '100%',
                  maxWidth: 400,
                  backgroundColor: '#1a1625',
                  border: `2px solid ${DEEZER_PURPLE}`,
                  borderRadius: 20,
                  padding: 24,
                  boxShadow: `0 0 0 4px rgba(162, 56, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.9)`
                }}
              >
                <div className="buzz-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20
                }}>
                  <div className="buzz-icon" style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 0 20px rgba(162, 56, 255, 0.5)`
                  }}>
                    <Bell size={28} />
                  </div>
                  <div className="buzz-info" style={{ flex: 1 }}>
                    <span className="buzz-name" style={{
                      display: 'block',
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1.3rem',
                      color: 'white'
                    }}>{lockedName}</span>
                    <span className="buzz-label" style={{
                      fontSize: '0.85rem',
                      color: 'rgba(255,255,255,0.6)'
                    }}>a buzzé</span>
                  </div>
                  <span className="buzz-points" style={{
                    fontFamily: "var(--font-title, 'Bungee'), cursive",
                    fontSize: '1.4rem',
                    color: DEEZER_LIGHT,
                    textShadow: `0 0 15px rgba(162, 56, 255, 0.6)`
                  }}>{pointsEnJeu} pts</span>
                </div>

                {currentTrack && (
                  <div className="buzz-answer" style={{
                    background: 'rgba(162, 56, 255, 0.1)',
                    border: '1px solid rgba(162, 56, 255, 0.2)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20
                  }}>
                    <div className="track-reveal" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      {currentTrack.albumArt && (
                        <img
                          src={currentTrack.albumArt}
                          alt="Album"
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      <div className="track-info">
                        <span style={{
                          display: 'block',
                          fontWeight: 600,
                          fontSize: '1rem',
                          color: 'white',
                          marginBottom: 4
                        }}>{currentTrack.title}</span>
                        <span style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255,255,255,0.6)'
                        }}>{currentTrack.artist}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="buzz-actions" style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 12
                }}>
                  <button
                    className="buzz-btn buzz-btn-wrong"
                    onClick={wrong}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '14px 20px',
                      border: 'none',
                      borderRadius: 12,
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <X size={22} />
                    Faux
                  </button>
                  <button
                    className="buzz-btn buzz-btn-correct"
                    onClick={validate}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '14px 20px',
                      border: 'none',
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK})`,
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: `0 4px 15px rgba(162, 56, 255, 0.4)`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <Check size={22} />
                    Correct
                  </button>
                </div>

                <button
                  className="buzz-cancel"
                  onClick={resetBuzzers}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Reveal Screen - Shown after correct answer */}
      <BlindTestRevealScreen
        show={showRevealScreen}
        track={revealTrack}
        winner={revealWinner}
        isPlaying={isRevealPlaying}
        progress={revealProgress}
        isController={true}
        onTogglePlayback={toggleRevealPlayback}
        onNext={closeRevealAndNext}
        onDragStart={handleRevealDragStart}
        progressBarRef={revealProgressBarRef}
      />

      {/* Main Content */}
      <main className="game-content deeztest">
        {/* Track Card */}
        <AnimatePresence mode="wait">
          {currentTrack && (
            <motion.div
              className="track-card"
              key={`track-${currentTrack.id}`}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Track Header with Album Art */}
              <div className="track-header">
                <div className="track-cover-wrapper">
                  {currentTrack.albumArt ? (
                    <img src={currentTrack.albumArt} alt="Album" className="track-cover" />
                  ) : (
                    <div className="track-cover-placeholder">
                      <Music size={32} />
                    </div>
                  )}
                  {isAudioLoading && (
                    <div className="track-loading-overlay">
                      <div className="track-loading-spinner"></div>
                    </div>
                  )}
                  {isPlaying && !isAudioLoading && (
                  <div className="track-playing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
              <div className="track-meta">
                <span className="track-title-host">{currentTrack.title}</span>
                <span className="track-artist-host">{currentTrack.artist}</span>
                <div className="track-points-badge">
                  <span className="points-value">{pointsEnJeu}</span>
                  <span className="points-label">pts</span>
                </div>
              </div>
            </div>

            {/* Player Status */}
            {!playerReady && (
              <div className="player-status warning">
                <div className="status-spinner"></div>
                <span>{playerError || 'Initialisation du lecteur audio...'}</span>
              </div>
            )}
            {playerReady && playerError && (
              <div className="player-status error">
                <span>{playerError}</span>
                {!isRefreshing && (
                  <button
                    className="refresh-btn"
                    onClick={refreshTrackUrls}
                    title="Rafraîchir les URLs"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                {isRefreshing && <div className="status-spinner small"></div>}
              </div>
            )}
          </motion.div>
          )}
        </AnimatePresence>
        {!currentTrack && (
          <div className="track-card track-empty">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Chargement...</div>
          </div>
        )}

        {/* Snippet Level Timeline - Outside track-card for full width */}
        {currentTrack && (
          <div className="snippet-timeline">
            <div className="timeline-bar">
              {SNIPPET_LEVELS.map((level, idx) => {
                const isLocked = idx > unlockedLevel;
                const isCurrent = currentSnippet === idx;

                return (
                  <motion.button
                    key={idx}
                    className={`timeline-segment ${isCurrent ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => playLevel(idx)}
                    disabled={!playerReady || isLocked}
                    whileHover={!isLocked ? { y: -2 } : {}}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                  >
                    <div
                      className="segment-fill"
                      style={{
                        width: isCurrent ? `${playProgress}%` : (currentSnippet !== null && idx < currentSnippet ? '100%' : '0%')
                      }}
                    />
                    <span className="segment-duration">{level.label}</span>
                    <Play size={14} fill="currentColor" className="segment-play-icon" />
                  </motion.button>
                );
              })}
            </div>
            <div className="timeline-points">
              {SNIPPET_LEVELS.map((level, idx) => {
                const isCurrent = currentSnippet === idx;
                return (
                  <div key={idx} className={`points-label ${isCurrent ? 'active' : ''}`}>
                    <span className="points-value">+{level.start}</span>
                    <span className="points-text">points</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Footer Actions */}
      <footer className="game-footer deeztest">
        <div className="host-actions">
          <button
            className="action-btn action-change deeztest"
            onClick={changeSong}
            disabled={isChangingSong}
            title="Changer de chanson"
          >
            <Shuffle size={20} />
            <span>Changer</span>
          </button>
          <button className="action-btn action-skip deeztest" onClick={skip}>
            <SkipForward size={20} />
            <span>Passer</span>
          </button>
          <button className="action-btn action-end deeztest" onClick={end}>
            <X size={20} />
            <span>Fin</span>
          </button>
        </div>
      </footer>

      <style jsx global>{`
        html, body {
          overflow-x: hidden !important;
          max-width: 100% !important;
        }
        .deeztest-host-page,
        .deeztest-host-page *,
        .deeztest-host-page *::before,
        .deeztest-host-page *::after {
          box-sizing: border-box !important;
          max-width: 100%;
        }
        .deeztest-host-page .carousel-track {
          max-width: none;
        }
      `}</style>
      <style jsx>{`
        .deeztest-host-page {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .deeztest-host-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(162, 56, 255, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(255, 0, 146, 0.1) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        .game-header.deeztest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(162, 56, 255, 0.2);
          padding: 12px 16px;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 16px;
          min-width: 0;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .game-header-progress.deeztest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: ${DEEZER_LIGHT};
          text-shadow: 0 0 10px rgba(162, 56, 255, 0.5);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .game-content.deeztest {
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 10px;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          width: 100%;
          -webkit-overflow-scrolling: touch;
        }

        .track-card {
          width: 100%;
          max-width: 600px;
          min-width: 0;
          background: rgba(20, 20, 30, 0.7);
          border: 1px solid rgba(162, 56, 255, 0.15);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(20px);
          flex-shrink: 0;
          overflow: hidden;
        }

        .track-empty {
          text-align: center;
          color: var(--text-muted);
          padding: 40px 20px;
        }

        .track-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(162, 56, 255, 0.1);
          min-width: 0;
          width: 100%;
          overflow: hidden;
        }

        .track-cover-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .track-cover {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .track-cover-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          background: rgba(162, 56, 255, 0.1);
          border: 1px solid rgba(162, 56, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${DEEZER_LIGHT};
        }

        .track-loading-overlay {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
        }

        .track-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(162, 56, 255, 0.3);
          border-top-color: ${DEEZER_LIGHT};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }


        .track-playing-indicator {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 16px;
          padding: 4px 8px;
          background: ${DEEZER_PURPLE};
          border-radius: 8px;
        }

        .track-playing-indicator span {
          width: 3px;
          background: white;
          border-radius: 2px;
          animation: equalizer 0.8s ease-in-out infinite;
        }

        .track-playing-indicator span:nth-child(1) { height: 8px; animation-delay: 0s; }
        .track-playing-indicator span:nth-child(2) { height: 12px; animation-delay: 0.2s; }
        .track-playing-indicator span:nth-child(3) { height: 6px; animation-delay: 0.4s; }

        @keyframes equalizer {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.5); }
        }

        .track-meta {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .track-title-host {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-artist-host {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-points-badge {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(162, 56, 255, 0.2), rgba(162, 56, 255, 0.1));
          border: 1px solid rgba(162, 56, 255, 0.3);
          border-radius: 20px;
        }

        .track-points-badge .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: ${DEEZER_LIGHT};
          text-shadow: 0 0 10px rgba(162, 56, 255, 0.5);
        }

        .track-points-badge .points-label {
          font-size: 0.7rem;
          color: rgba(197, 116, 255, 0.7);
          font-weight: 600;
        }

        /* Timeline Snippet Selector - Full width outside track-card */
        .snippet-timeline {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 4px;
        }

        .timeline-bar {
          display: flex;
          gap: 8px;
        }

        :global(.timeline-segment) {
          flex: 1;
          position: relative;
          height: 56px;
          background: rgba(162, 56, 255, 0.1);
          border: 2px solid rgba(162, 56, 255, 0.3);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: white;
          transition: all 0.2s;
        }

        :global(.timeline-segment:hover:not(:disabled)) {
          border-color: rgba(162, 56, 255, 0.6);
          background: rgba(162, 56, 255, 0.15);
        }

        :global(.timeline-segment.active) {
          border-width: 3px;
          border-color: ${DEEZER_PURPLE};
          background: rgba(162, 56, 255, 0.25);
          box-shadow:
            0 0 20px rgba(162, 56, 255, 0.5),
            inset 0 0 20px rgba(162, 56, 255, 0.1);
        }

        :global(.timeline-segment.locked) {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: rgba(120, 120, 130, 0.3);
          background: rgba(60, 60, 70, 0.2);
        }

        :global(.timeline-segment:disabled) {
          cursor: not-allowed;
        }

        :global(.segment-fill) {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          transition: width 0.1s linear;
          opacity: 0.85;
          border-radius: 10px;
        }

        :global(.segment-duration) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: white;
          position: relative;
          z-index: 1;
        }

        :global(.segment-play-icon) {
          opacity: 0.7;
          color: ${DEEZER_LIGHT};
          position: relative;
          z-index: 1;
          flex-shrink: 0;
        }

        :global(.timeline-segment.active .segment-play-icon) {
          opacity: 1;
        }

        :global(.timeline-segment.locked .segment-play-icon) {
          opacity: 0.5;
        }

        .timeline-points {
          display: flex;
          gap: 8px;
        }

        .points-label {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: all 0.2s;
        }

        .points-value {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: rgba(34, 197, 94, 0.7);
        }

        .points-text {
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .points-label.active .points-value {
          color: #22c55e;
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
          transform: scale(1.1);
        }

        .points-label.active .points-text {
          color: rgba(255, 255, 255, 0.6);
        }

        .player-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .player-status.warning {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .player-status.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: rgba(162, 56, 255, 0.2);
          border: 1px solid rgba(162, 56, 255, 0.4);
          border-radius: 8px;
          color: ${DEEZER_LIGHT};
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: rgba(162, 56, 255, 0.3);
          transform: rotate(90deg);
        }

        .status-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .status-spinner.small {
          width: 14px;
          height: 14px;
          border-width: 2px;
          border-color: rgba(162, 56, 255, 0.3);
          border-top-color: ${DEEZER_LIGHT};
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .game-footer.deeztest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 16px;
          /* Safe area gérée par AppShell */
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(162, 56, 255, 0.2);
          width: 100%;
        }

        .host-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          width: 100%;
        }

        .action-btn {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .action-btn:hover {
          transform: translateY(-2px);
        }


        .action-change.deeztest {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.25);
          color: #60a5fa;
        }

        .action-change.deeztest:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.18);
          border-color: rgba(59, 130, 246, 0.4);
        }

        .action-change.deeztest:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .action-skip.deeztest {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.25);
          color: #fbbf24;
        }

        .action-skip.deeztest:hover {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.4);
        }

        .action-end.deeztest {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.25);
          color: #f87171;
        }

        .action-end.deeztest:hover {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: ${DEEZER_LIGHT};
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .loading-dots span:nth-child(1) { animation-delay: 0s; }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        /* Reveal screen styles are in BlindTestRevealScreen component */
      `}</style>
    </div>
  );
}
