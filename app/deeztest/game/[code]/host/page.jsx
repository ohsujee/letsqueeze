"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp, set
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import { initializePlayer, playSnippet, pause, resume, isPlayerReady, disconnect, preloadPreview } from "@/lib/deezer/player";
import { SkipForward, X, Check, RotateCcw, Music, Zap, Clock, Timer, Disc, Bell, RefreshCw } from "lucide-react";
import { SNIPPET_LEVELS, LOCKOUT_MS, WRONG_PENALTY, getPointsForLevel } from "@/lib/constants/blindtest";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { getPlaylistTracks, formatTracksForGame } from "@/lib/deezer/api";

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';
const DEEZER_LIGHT = '#C574FF';

function useSound(url) {
  const aRef = useRef(null);
  useEffect(() => {
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if (aRef.current) {
      aRef.current.preload = "auto";
      aRef.current.volume = 0.6;
    }
  }, [url]);
  return useCallback(() => {
    if (aRef.current) {
      aRef.current.currentTime = 0;
      aRef.current.play().catch(() => {});
    }
  }, []);
}

export default function DeezTestHostGame() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [playlist, setPlaylist] = useState(null);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_deeztest' });

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

  // Server time sync
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const off = onValue(ref(db, ".info/serverTimeOffset"), s => setOffset(Number(s.val()) || 0));
    const id = setInterval(() => setLocalNow(Date.now()), 200);
    return () => { clearInterval(id); off(); };
  }, []);
  const serverNow = localNow + offset;

  // Player error state
  const [playerError, setPlayerError] = useState(null);

  // Track refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasTriedRefresh = useRef(false);

  // Function to refresh all track URLs from Deezer
  const refreshTrackUrls = useCallback(async () => {
    if (!playlist?.id || isRefreshing) return false;

    setIsRefreshing(true);
    setPlayerError("Rafraîchissement des URLs...");
    console.log("[DeezTest Host] Refreshing track URLs...");

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
      await set(ref(db, `rooms_deeztest/${code}/meta/playlist/tracks`), refreshedTracks);

      console.log("[DeezTest Host] Track URLs refreshed!");
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
      console.log("[DeezTest Host] Initializing Deezer player...");
      try {
        await initializePlayer({
          onReady: () => {
            console.log("[DeezTest Host] Player ready!");
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
    const u1 = onValue(ref(db, `rooms_deeztest/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms_deeztest/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms_deeztest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Redirect when phase changes
  useEffect(() => {
    if (state?.phase === "ended") router.replace(`/deeztest/game/${code}/end`);
    if (state?.phase === "lobby") router.replace(`/deeztest/room/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const myUid = auth.currentUser?.uid;

  // Room guard - détecte fermeture room (host is always host here)
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    isHost: true
  });

  // Inactivity detection for host
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

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
  const playCorrect = useSound("/sounds/quiz-good answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevLock = useRef(null);

  // Fenêtre de tolérance pour la résolution des buzzes (en ms)
  const BUZZ_WINDOW_MS = 150;
  const buzzWindowTimeout = useRef(null);
  const isResolvingBuzz = useRef(false);

  // *** NOUVEAU SYSTÈME: HOST ÉCOUTE LES PENDING BUZZES ET RÉSOUT APRÈS 150ms ***
  useEffect(() => {
    if (!isHost) return;

    // Si déjà un lockUid, pas besoin de résoudre
    if (state?.lockUid) return;

    const pendingBuzzes = state?.pendingBuzzes;
    if (!pendingBuzzes || Object.keys(pendingBuzzes).length === 0) return;

    // Si déjà en train de résoudre, ne pas redémarrer le timer
    if (isResolvingBuzz.current) return;

    // Démarrer la fenêtre de tolérance
    isResolvingBuzz.current = true;
    console.log('🔔 [DeezTest Buzz Window] Premier buzz détecté, démarrage fenêtre de', BUZZ_WINDOW_MS, 'ms');

    buzzWindowTimeout.current = setTimeout(async () => {
      try {
        // Relire les pendingBuzzes pour avoir tous ceux arrivés pendant la fenêtre
        const snapshot = await import('firebase/database').then(m =>
          m.get(m.ref(db, `rooms_deeztest/${code}/state/pendingBuzzes`))
        );
        const allBuzzes = snapshot.val();

        if (!allBuzzes || Object.keys(allBuzzes).length === 0) {
          isResolvingBuzz.current = false;
          return;
        }

        // Trouver le buzz avec le plus petit adjustedTime (le vrai premier)
        const buzzArray = Object.values(allBuzzes);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        console.log('🏆 [DeezTest Buzz Window] Résolution - Gagnant:', winner.name, 'avec adjustedTime:', winner.adjustedTime);
        console.log('📊 [DeezTest Buzz Window] Tous les buzzes:', buzzArray.map(b => ({ name: b.name, adjustedTime: b.adjustedTime })));

        // Pause la musique
        pauseMusic();

        // Mettre à jour Firebase avec le gagnant
        await update(ref(db, `rooms_deeztest/${code}/state`), {
          lockUid: winner.uid,
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });
        // Supprimer les buzzes en attente séparément
        await import('firebase/database').then(m =>
          m.remove(m.ref(db, `rooms_deeztest/${code}/state/pendingBuzzes`))
        ).catch(() => {});

        playBuzz();

      } catch (error) {
        console.error('Erreur résolution buzz:', error);
      } finally {
        isResolvingBuzz.current = false;
      }
    }, BUZZ_WINDOW_MS);

    return () => {
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
      }
    };
  }, [isHost, state?.pendingBuzzes, state?.lockUid, code, playBuzz]);

  // Cleanup du timeout à la fermeture
  useEffect(() => {
    return () => {
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
      }
    };
  }, []);

  // Host reacts to new lock (backup pour tracking)
  useEffect(() => {
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      prevLock.current = cur;
    }
    prevLock.current = cur;
  }, [isHost, state?.lockUid, code, players]);

  // Preload track silently when changing to a new question
  useEffect(() => {
    if (!isHost || !playerReady || !currentTrack?.previewUrl) return;

    const timer = setTimeout(async () => {
      await preloadPreview(currentTrack.previewUrl);
    }, 300);

    return () => clearTimeout(timer);
  }, [isHost, playerReady, currentTrack?.previewUrl]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    if (!isHost || !currentTrack || !playerReady) return;

    // Stop previous snippet if playing
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const previewUrl = currentTrack.previewUrl;

    // Debug: Log the URL we're trying to play
    console.log("[DeezTest Host] Playing track:", {
      title: currentTrack.title,
      previewUrl: previewUrl,
      urlLength: previewUrl?.length,
      hasMP3: previewUrl?.includes('.mp3'),
      level: level,
      duration: config.duration
    });

    if (!previewUrl) {
      console.error("[DeezTest Host] No preview URL for track:", currentTrack);
      setPlayerError("Cette piste n'a pas d'extrait disponible");
      return;
    }

    try {
      const snippet = await playSnippet(previewUrl, config.duration);
      snippetStopRef.current = snippet;
      setIsPlaying(true);
      setCurrentSnippet(level);
      setPlayerError(null);
      hasTriedRefresh.current = false; // Reset for next track

      // Track highest level played for scoring
      setHighestLevelPlayed(prev => Math.max(prev ?? -1, level));

      // Cancel any pending unlock timeout
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }

      // Unlock next level after 90% of duration
      const isLastLevel = level === SNIPPET_LEVELS.length - 1;
      if (!isLastLevel && config.duration && level >= unlockedLevel) {
        const unlockDelay = Math.floor(config.duration * 0.9);
        unlockTimeoutRef.current = setTimeout(() => {
          setUnlockedLevel(prev => Math.max(prev, level + 1));
        }, unlockDelay);
      }

      // Update state
      const currentHighest = state?.highestSnippetLevel ?? -1;
      const newHighest = Math.max(currentHighest, level);

      await update(ref(db, `rooms_deeztest/${code}/state`), {
        snippetLevel: level,
        highestSnippetLevel: newHighest,
        revealed: true,
        lastRevealAt: serverTimestamp()
      });
    } catch (error) {
      console.error("[DeezTest Host] Error playing snippet:", error);

      // If we haven't tried refreshing yet, do it now and retry
      if (!hasTriedRefresh.current) {
        hasTriedRefresh.current = true;
        console.log("[DeezTest Host] Attempting to refresh URLs and retry...");
        const refreshed = await refreshTrackUrls();
        if (refreshed) {
          // Wait a bit for Firebase to update, then playLevel will be called again by user
          setPlayerError("URLs expirées - Rafraîchies! Réessayez.");
        }
      } else {
        setPlayerError(error.message || "Erreur de lecture");
      }
    }
  };

  const pauseMusic = async () => {
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
  };

  // Full stop - resets everything for new question
  const stopMusic = async () => {
    if (unlockTimeoutRef.current) {
      clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
    setCurrentSnippet(null);
  };

  const resumeMusic = async () => {
    await resume();
    setIsPlaying(true);
  };

  // Exit and end game
  async function exitAndEndGame() {
    if (code) {
      await stopMusic();
      await update(ref(db, `rooms_deeztest/${code}/state`), { phase: "ended" });
      await update(ref(db, `rooms_deeztest/${code}/meta`), { closed: true });
    }
    router.push('/home');
  }

  // Reset buzzers
  async function resetBuzzers() {
    if (!isHost) return;
    // Reset le flag de résolution
    isResolvingBuzz.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    await update(ref(db, `rooms_deeztest/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null
    });
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_deeztest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    if (currentSnippet !== null && currentTrack) {
      await playLevel(currentSnippet);
    }
  }

  // Validate correct answer
  async function validate() {
    if (!isHost || !currentTrack || !state?.lockUid) return;

    playCorrect();

    const uid = state.lockUid;
    const pts = pointsEnJeu;

    await runTransaction(ref(db, `rooms_deeztest/${code}/players/${uid}/score`), (cur) => (cur || 0) + pts);
    await runTransaction(ref(db, `rooms_deeztest/${code}/players/${uid}/correctAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_deeztest/${code}/meta/teams/${teamId}/score`), (cur) => (cur || 0) + pts);
      }
    }

    await nextTrack();
  }

  // Wrong answer
  async function wrong() {
    if (!isHost || !state?.lockUid) return;

    playWrong();

    const uid = state.lockUid;
    const until = serverNow + LOCKOUT_MS;
    const levelToReplay = currentSnippet;

    await runTransaction(ref(db, `rooms_deeztest/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
    await runTransaction(ref(db, `rooms_deeztest/${code}/players/${uid}/wrongAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_deeztest/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
      }
    }

    const updates = {};
    updates[`rooms_deeztest/${code}/players/${uid}/blockedUntil`] = until;
    updates[`rooms_deeztest/${code}/state/lockUid`] = null;
    updates[`rooms_deeztest/${code}/state/buzzBanner`] = "";
    updates[`rooms_deeztest/${code}/state/buzz`] = null;
    updates[`rooms_deeztest/${code}/state/pausedAt`] = null;
    updates[`rooms_deeztest/${code}/state/lockedAt`] = null;

    // Reset le flag de résolution
    isResolvingBuzz.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_deeztest/${code}/state/pendingBuzzes`))
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
      await update(ref(db, `rooms_deeztest/${code}/state`), { phase: "ended" });
      router.replace(`/deeztest/game/${code}/end`);
      return;
    }

    // Reset all players penalties
    const updates = {};
    players.forEach(p => {
      updates[`rooms_deeztest/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms_deeztest/${code}/state/currentIndex`] = next;
    updates[`rooms_deeztest/${code}/state/revealed`] = false;
    updates[`rooms_deeztest/${code}/state/snippetLevel`] = 0;
    updates[`rooms_deeztest/${code}/state/highestSnippetLevel`] = -1;
    updates[`rooms_deeztest/${code}/state/lockUid`] = null;
    updates[`rooms_deeztest/${code}/state/pausedAt`] = null;
    updates[`rooms_deeztest/${code}/state/lockedAt`] = null;
    updates[`rooms_deeztest/${code}/state/buzzBanner`] = "";
    updates[`rooms_deeztest/${code}/state/buzz`] = null;

    // Reset le flag de résolution
    isResolvingBuzz.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_deeztest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    setCurrentSnippet(null);
    setUnlockedLevel(0);
    setHighestLevelPlayed(null);
  }

  async function skip() {
    if (!isHost || total === 0) return;
    await nextTrack();
  }

  async function end() {
    if (isHost) {
      await stopMusic();
      await update(ref(db, `rooms_deeztest/${code}/state`), { phase: "ended" });
      router.replace(`/deeztest/game/${code}/end`);
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "—";

  return (
    <div className="deeztest-host-page game-page">
      {/* Header */}
      <header className="game-header deeztest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress deeztest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            <PlayerManager
              players={players}
              roomCode={code}
              roomPrefix="rooms_deeztest"
              hostUid={meta?.hostUid}
              variant="deeztest"
              phase="playing"
            />
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? La partie sera abandonnée pour tous les joueurs."
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

      {/* Main Content */}
      <main className="game-content deeztest">
        {/* Track Card */}
        {currentTrack ? (
          <motion.div
            className="track-card"
            key={qIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
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
                {isPlaying && (
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

            {/* Snippet Level Buttons */}
            <div className="snippet-section">
              <span className="snippet-section-label">Durée de l'extrait</span>
              <div className="snippet-grid">
                {SNIPPET_LEVELS.map((level, idx) => {
                  const isLocked = idx > unlockedLevel;
                  const isCurrent = currentSnippet === idx;
                  const isNext = idx === unlockedLevel && !isCurrent && idx > 0;
                  const wasPassed = currentSnippet !== null && idx < currentSnippet;

                  // Styles dynamiques pour chaque état (comme blindtest)
                  const getCardStyle = () => {
                    if (isLocked) {
                      return {
                        background: 'transparent',
                        borderStyle: 'solid',
                        borderWidth: '2px',
                        borderColor: 'rgba(80, 80, 90, 0.2)',
                        borderRadius: '20px',
                        boxShadow: 'none',
                        pointerEvents: 'none',
                        cursor: 'not-allowed'
                      };
                    }
                    if (isCurrent) {
                      return {
                        background: `linear-gradient(180deg, rgba(162, 56, 255, 0.35) 0%, rgba(162, 56, 255, 0.15) 100%)`,
                        borderStyle: 'solid',
                        borderWidth: '3px',
                        borderColor: DEEZER_LIGHT,
                        borderRadius: '20px',
                        boxShadow: `0 0 0 4px rgba(162, 56, 255, 0.15), 0 0 25px rgba(162, 56, 255, 0.4)`
                      };
                    }
                    if (isNext) {
                      return {
                        background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.08) 100%)',
                        borderStyle: 'solid',
                        borderWidth: '2px',
                        borderColor: 'rgba(251, 191, 36, 0.6)',
                        borderRadius: '20px',
                        boxShadow: '0 0 15px rgba(251, 191, 36, 0.25)',
                        animation: 'next-pulse 2s ease-in-out infinite'
                      };
                    }
                    if (wasPassed) {
                      return {
                        background: `linear-gradient(180deg, rgba(162, 56, 255, 0.08) 0%, rgba(162, 56, 255, 0.02) 100%)`,
                        borderStyle: 'solid',
                        borderWidth: '2px',
                        borderColor: 'rgba(162, 56, 255, 0.2)',
                        borderRadius: '20px',
                        boxShadow: 'none',
                        opacity: 0.7
                      };
                    }
                    // État par défaut (prêt mais pas encore joué)
                    return {
                      borderStyle: 'solid',
                      borderWidth: '2px',
                      borderColor: 'rgba(162, 56, 255, 0.3)',
                      borderRadius: '20px'
                    };
                  };

                  const getIconStyle = () => {
                    if (isLocked) return { background: 'rgba(60, 60, 70, 0.4)', color: 'rgba(100, 100, 110, 0.5)' };
                    if (isCurrent) return { background: 'rgba(162, 56, 255, 0.3)', boxShadow: '0 0 15px rgba(162, 56, 255, 0.5)' };
                    if (isNext) return { background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
                    return {};
                  };

                  const getDurationStyle = () => {
                    if (isLocked) return { color: 'rgba(100, 100, 110, 0.5)', textShadow: 'none' };
                    if (isCurrent) return { textShadow: '0 0 15px rgba(162, 56, 255, 0.8)' };
                    if (isNext) return { color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' };
                    return {};
                  };

                  const getPillStyle = () => {
                    if (isLocked) return { background: 'rgba(40, 40, 50, 0.5)' };
                    return {};
                  };

                  const getPillTextStyle = () => {
                    if (isLocked) return { color: 'rgba(100, 100, 110, 0.5)' };
                    return {};
                  };

                  return (
                    <React.Fragment key={idx}>
                      <motion.button
                        className={`snippet-card ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''}`}
                        style={getCardStyle()}
                        onClick={() => playLevel(idx)}
                        whileHover={!isLocked ? { scale: 1.03 } : {}}
                        whileTap={!isLocked ? { scale: 0.97 } : {}}
                        disabled={!playerReady || isLocked}
                        animate={isCurrent ? {
                          scale: 1.08,
                          transition: { duration: 0.2 }
                        } : {
                          scale: 1,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <div className="snippet-card-inner">
                          <div className="snippet-icon" style={getIconStyle()}>
                            {idx === 0 && <Zap size={20} />}
                            {idx === 1 && <Clock size={20} />}
                            {idx === 2 && <Timer size={20} />}
                            {idx === 3 && <Disc size={20} />}
                          </div>
                          <span className="snippet-duration" style={getDurationStyle()}>
                            {level.label}
                          </span>
                          <div className="snippet-points-pill" style={getPillStyle()}>
                            <span style={getPillTextStyle()}>+{level.start}</span>
                          </div>
                        </div>
                      </motion.button>
                      {/* Connector line to next button */}
                      {idx < SNIPPET_LEVELS.length - 1 && (
                        <div className={`snippet-connector ${idx < unlockedLevel ? 'filled' : ''}`}>
                          <div className="connector-line">
                            <div className="connector-fill" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
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
        ) : (
          <div className="track-card track-empty">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div>Chargement...</div>
          </div>
        )}

        {/* Leaderboard */}
        <Leaderboard players={players} />
      </main>

      {/* Footer Actions */}
      <footer className="game-footer deeztest">
        <div className="host-actions">
          <button className="action-btn action-reset deeztest" onClick={resetBuzzers}>
            <RotateCcw size={20} />
            <span>Reset</span>
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

        /* Header */
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

        /* Content */
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

        /* Track Card */
        .track-card {
          width: 100%;
          max-width: 500px;
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

        /* Track Header */
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

        /* Snippet Section */
        .snippet-section {
          margin-bottom: 8px;
          width: 100%;
          overflow: visible;
          padding: 0 4px;
        }

        .snippet-section-label {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          text-align: center;
        }

        .snippet-grid {
          display: flex;
          align-items: center;
          justify-content: stretch;
          gap: 0;
          width: 100%;
          overflow: visible;
        }

        .snippet-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          flex-shrink: 0;
        }

        .connector-line {
          width: 100%;
          height: 3px;
          background: rgba(100, 100, 100, 0.3);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .connector-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_LIGHT});
          border-radius: 2px;
          transition: width 0.4s ease-out;
        }

        .snippet-connector.filled .connector-fill {
          width: 100%;
        }

        :global(.snippet-card) {
          position: relative;
          flex: 1 1 0;
          min-width: 0;
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.12) 0%, rgba(162, 56, 255, 0.04) 100%);
          border: 2px solid rgba(162, 56, 255, 0.3);
          border-radius: 20px;
          padding: 0;
          cursor: pointer;
          overflow: visible;
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
          box-shadow: 0 2px 8px rgba(162, 56, 255, 0.1);
        }

        :global(.snippet-card:hover:not(:disabled):not(.locked)) {
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.2) 0%, rgba(162, 56, 255, 0.08) 100%);
          border-color: rgba(162, 56, 255, 0.5);
          box-shadow: 0 4px 12px rgba(162, 56, 255, 0.2);
        }

        :global(.snippet-card:disabled) {
          cursor: not-allowed;
        }

        :global(.snippet-card.current) {
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.35) 0%, rgba(162, 56, 255, 0.15) 100%);
          border-color: ${DEEZER_LIGHT};
          border-width: 3px;
          box-shadow: 0 0 0 4px rgba(162, 56, 255, 0.15), 0 0 25px rgba(162, 56, 255, 0.4);
          transform: scale(1.08);
        }

        :global(.snippet-card.next) {
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.08) 100%);
          border-color: rgba(251, 191, 36, 0.6);
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
          animation: next-pulse 2s ease-in-out infinite;
        }

        @keyframes next-pulse {
          0%, 100% {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
            border-color: rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 25px rgba(251, 191, 36, 0.35);
            border-color: rgba(251, 191, 36, 0.8);
          }
        }

        :global(.snippet-card.passed) {
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.08) 0%, rgba(162, 56, 255, 0.02) 100%);
          border-color: rgba(162, 56, 255, 0.25);
          opacity: 0.7;
        }

        :global(.snippet-card.locked) {
          background: transparent;
          border-color: rgba(60, 60, 70, 0.3);
          box-shadow: none;
          pointer-events: none;
        }

        :global(.snippet-card.locked .snippet-icon) {
          background: rgba(60, 60, 70, 0.4);
          color: rgba(100, 100, 110, 0.6);
        }

        :global(.snippet-card.locked .snippet-duration) {
          color: rgba(100, 100, 110, 0.6);
          text-shadow: none;
        }

        :global(.snippet-card.locked .snippet-points-pill) {
          background: rgba(40, 40, 50, 0.5);
        }

        :global(.snippet-card.locked .snippet-points-pill span),
        :global(.snippet-card.locked .snippet-points-pill small) {
          color: rgba(100, 100, 110, 0.6);
        }

        :global(.snippet-card.current .snippet-icon) {
          background: rgba(162, 56, 255, 0.3);
          box-shadow: 0 0 15px rgba(162, 56, 255, 0.5);
        }

        :global(.snippet-card.current .snippet-duration) {
          text-shadow: 0 0 15px rgba(162, 56, 255, 0.8);
        }

        :global(.snippet-card.next .snippet-icon) {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        :global(.snippet-card.next .snippet-duration) {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        :global(.snippet-card-inner) {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 10px;
        }

        :global(.snippet-icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          background: rgba(162, 56, 255, 0.15);
          border-radius: 12px;
          color: ${DEEZER_LIGHT};
        }

        :global(.snippet-duration) {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: ${DEEZER_LIGHT};
          text-shadow: 0 0 8px rgba(162, 56, 255, 0.4);
        }

        :global(.snippet-points-pill) {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
        }

        :global(.snippet-points-pill span) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        :global(.snippet-points-pill small) {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        /* Player Status */
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

        /* Footer */
        .game-footer.deeztest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 16px;
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

        .action-reset.deeztest {
          background: rgba(162, 56, 255, 0.1);
          border-color: rgba(162, 56, 255, 0.25);
          color: ${DEEZER_LIGHT};
        }

        .action-reset.deeztest:hover {
          background: rgba(162, 56, 255, 0.18);
          border-color: rgba(162, 56, 255, 0.4);
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

        /* Buzz Modal */
        .buzz-overlay {
          position: fixed;
          inset: 0;
          background: #000000;
          opacity: 0.95;
          z-index: 9998;
        }

        .buzz-modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        .buzz-card.deeztest {
          width: 100%;
          max-width: 400px;
          background-color: #1a1625 !important;
          border: 2px solid ${DEEZER_LIGHT};
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 0 0 4px rgba(162, 56, 255, 0.2), 0 8px 32px rgba(0, 0, 0, 0.9);
        }

        .buzz-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .buzz-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(162, 56, 255, 0.2), rgba(162, 56, 255, 0.1));
          border: 1px solid rgba(162, 56, 255, 0.3);
          border-radius: 12px;
          color: ${DEEZER_LIGHT};
          animation: buzz-ring 0.5s ease-out;
        }

        @keyframes buzz-ring {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-5deg); }
        }

        .buzz-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .buzz-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: #ffffff;
          text-shadow: 0 0 10px rgba(162, 56, 255, 0.3);
        }

        .buzz-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-points.deeztest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: ${DEEZER_LIGHT};
          background: rgba(162, 56, 255, 0.12);
          border: 1px solid rgba(162, 56, 255, 0.25);
          border-radius: 10px;
          padding: 8px 12px;
          text-shadow: 0 0 8px rgba(162, 56, 255, 0.4);
        }

        .buzz-answer.deeztest {
          background: rgba(162, 56, 255, 0.08);
          border: 1px solid rgba(162, 56, 255, 0.2);
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }

        .track-reveal {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .track-album-art {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          object-fit: cover;
        }

        .track-info {
          flex: 1;
          min-width: 0;
        }

        .track-title {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-artist {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .buzz-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          width: 100%;
        }

        .buzz-btn {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn-wrong {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-2px);
        }

        .buzz-btn-correct {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: rgba(34, 197, 94, 0.22);
          border-color: rgba(34, 197, 94, 0.5);
          transform: translateY(-2px);
        }

        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          background: transparent;
          border: none;
          padding: 10px;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.7);
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
      `}</style>
    </div>
  );
}
