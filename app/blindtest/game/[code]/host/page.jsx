"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import { initializePlayer, playSnippet, pause, resume, isPlayerReady, disconnect, preloadTrack } from "@/lib/spotify/player";
import { Play, Pause, SkipForward, X, Check, RotateCcw, Music, Zap, Clock, Timer, Disc, Bell } from "lucide-react";
import { SNIPPET_LEVELS, LOCKOUT_MS, WRONG_PENALTY, getPointsForLevel } from "@/lib/constants/blindtest";
import { usePlayers } from "@/lib/hooks/usePlayers";

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

export default function BlindTestHostGame() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [playlist, setPlaylist] = useState(null);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Spotify player state
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

  // Initialize Spotify Player
  useEffect(() => {
    const init = async () => {
      console.log("[BlindTest Host] Initializing Spotify player...");
      try {
        await initializePlayer({
          onReady: (deviceId) => {
            console.log("[BlindTest Host] Player ready! Device ID:", deviceId);
            setPlayerReady(true);
            setPlayerError(null);
          },
          onStateChange: (playerState) => {
            console.log("[BlindTest Host] Player state changed:", playerState?.paused ? "paused" : "playing");
            setIsPlaying(!playerState?.paused);
          },
          onError: (error) => {
            console.error("[BlindTest Host] Spotify player error:", error);
            setPlayerError(error.message || "Erreur Spotify");
          }
        });
      } catch (error) {
        console.error("[BlindTest Host] Failed to init player:", error);
        setPlayerError(error.message || "Échec d'initialisation");
      }
    };
    init();

    // Don't disconnect on unmount - keep connection alive for the session
    // User must explicitly disconnect via profile or leaving the app entirely
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
    if (state?.phase === "ended") router.replace(`/blindtest/game/${code}/end`);
    if (state?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];
  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";
  const snippetLevel = state?.snippetLevel || 0;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  // Calculate points based on HIGHEST level played (not current snippet)
  const { pointsEnJeu } = useMemo(() => {
    // If nothing has been played yet, return 0 (shouldn't happen during buzz)
    if (highestLevelPlayed === null) return { pointsEnJeu: SNIPPET_LEVELS[0].start };
    // Score is based on the highest level the host has reached
    const levelConfig = SNIPPET_LEVELS[highestLevelPlayed];
    return { pointsEnJeu: levelConfig?.start || 0 };
  }, [highestLevelPlayed]);

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevLock = useRef(null);

  // Host reacts to new lock
  useEffect(() => {
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      const name = players.find(p => p.uid === cur)?.name || "Un joueur";

      // Pause music and update state
      pauseMusic();

      update(ref(db, `rooms_blindtest/${code}/state`), {
        pausedAt: serverTimestamp(),
        lockedAt: serverTimestamp(),
        buzzBanner: `🔔 ${name} a buzzé !`
      }).catch(() => {});

      playBuzz();
    }
    prevLock.current = cur;
  }, [isHost, state?.lockUid, code, players, playBuzz]);

  // Preload track silently when changing to a new question
  useEffect(() => {
    if (!isHost || !playerReady || !currentTrack?.spotifyUri) return;

    // Small delay to avoid preloading during rapid transitions
    const timer = setTimeout(async () => {
      console.log("[BlindTest Host] Preloading track silently:", currentTrack.spotifyUri);

      const preloadResult = await preloadTrack(currentTrack.spotifyUri);

      if (!preloadResult.success && preloadResult.error && preloadResult.error !== 'Session cancelled' && preloadResult.error !== 'Aborted') {
        console.warn("[BlindTest Host] Preload warning:", preloadResult.error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isHost, playerReady, currentTrack?.spotifyUri]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    console.log("[BlindTest Host] playLevel called:", {
      level,
      isHost,
      hasTrack: !!currentTrack,
      playerReady,
      trackUri: currentTrack?.spotifyUri
    });

    if (!isHost) {
      console.warn("[BlindTest Host] Not host, cannot play");
      return;
    }
    if (!currentTrack) {
      console.warn("[BlindTest Host] No current track");
      return;
    }
    if (!playerReady) {
      console.warn("[BlindTest Host] Player not ready");
      setPlayerError("Le lecteur Spotify n'est pas prêt");
      return;
    }

    // Stop previous snippet if playing
    if (snippetStopRef.current) {
      console.log("[BlindTest Host] Stopping previous snippet");
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const trackUri = currentTrack.spotifyUri;

    console.log("[BlindTest Host] Playing:", {
      trackUri,
      duration: config.duration,
      label: config.label
    });

    try {
      const snippet = await playSnippet(trackUri, config.duration);
      console.log("[BlindTest Host] Snippet started successfully");
      snippetStopRef.current = snippet;
      setIsPlaying(true);
      setCurrentSnippet(level);

      // Track highest level played for scoring
      setHighestLevelPlayed(prev => Math.max(prev ?? -1, level));

      // Cancel any pending unlock timeout
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }

      // Unlock next level after 90% of duration (except for Full which has no duration)
      const isLastLevel = level === SNIPPET_LEVELS.length - 1;
      if (!isLastLevel && config.duration && level >= unlockedLevel) {
        const unlockDelay = Math.floor(config.duration * 0.9);
        unlockTimeoutRef.current = setTimeout(() => {
          setUnlockedLevel(prev => Math.max(prev, level + 1));
          console.log("[BlindTest Host] Unlocked level", level + 1, "after 90% playback");
        }, unlockDelay);
      }

      // Update state - also track highest level for scoring
      const currentHighest = state?.highestSnippetLevel ?? -1;
      const newHighest = Math.max(currentHighest, level);

      await update(ref(db, `rooms_blindtest/${code}/state`), {
        snippetLevel: level,
        highestSnippetLevel: newHighest,
        revealed: true,
        lastRevealAt: serverTimestamp()
      });
    } catch (error) {
      console.error("[BlindTest Host] Error playing snippet:", error);
      setPlayerError(error.message || "Erreur de lecture");
    }
  };

  const pauseMusic = async () => {
    console.log("[BlindTest Host] pauseMusic called");
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
  };

  // Full stop - resets everything for new question
  const stopMusic = async () => {
    console.log("[BlindTest Host] stopMusic called - full reset");
    // Cancel pending unlock timeout
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
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
    }
    router.push('/home');
  }

  // Reset buzzers
  async function resetBuzzers() {
    if (!isHost) return;
    await update(ref(db, `rooms_blindtest/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null
    });
    // Replay snippet at current level (with duration limit)
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

    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => (cur || 0) + pts);

    // Track correct answer count for stats
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/correctAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => (cur || 0) + pts);
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

    // Subtract penalty
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));

    // Track wrong answer count for stats
    await runTransaction(ref(db, `rooms_blindtest/${code}/players/${uid}/wrongAnswers`), (cur) => (cur || 0) + 1);

    if (meta?.mode === "équipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms_blindtest/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - WRONG_PENALTY));
      }
    }

    const updates = {};
    updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;

    await update(ref(db), updates);

    // Replay snippet at current level (with duration limit)
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
      router.replace(`/blindtest/game/${code}/end`);
      return;
    }

    // Reset all players penalties
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

    await update(ref(db), updates);
    setCurrentSnippet(null);
    setUnlockedLevel(0); // Reset progression for new question
    setHighestLevelPlayed(null); // Reset highest level for scoring
  }

  async function skip() {
    if (!isHost || total === 0) return;
    await nextTrack();
  }

  async function end() {
    if (isHost) {
      await stopMusic();
      await update(ref(db, `rooms_blindtest/${code}/state`), { phase: "ended" });
      router.replace(`/blindtest/game/${code}/end`);
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "—";

  return (
    <div className="blindtest-host-page">
      {/* Header */}
      <header className="game-header blindtest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress blindtest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            <PlayerManager
              players={players}
              roomCode={code}
              roomPrefix="rooms_blindtest"
              hostUid={meta?.hostUid}
              variant="blindtest"
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
              className="buzz-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: '#000000',
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
                className="buzz-card blindtest"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                  width: '100%',
                  maxWidth: 400,
                  backgroundColor: '#1a1625',
                  border: '2px solid #34d399',
                  borderRadius: 20,
                  padding: 24,
                  boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2), 0 8px 32px rgba(0, 0, 0, 0.9)'
                }}
              >
                <div className="buzz-header">
                  <div className="buzz-icon">
                    <Bell size={28} />
                  </div>
                  <div className="buzz-info">
                    <span className="buzz-name">{lockedName}</span>
                    <span className="buzz-label">a buzzé</span>
                  </div>
                  <span className="buzz-points blindtest">{pointsEnJeu} pts</span>
                </div>

                {currentTrack && (
                  <div className="buzz-answer blindtest">
                    <div className="track-reveal">
                      {currentTrack.albumArt && (
                        <img src={currentTrack.albumArt} alt="Album" className="track-album-art" />
                      )}
                      <div className="track-info">
                        <span className="track-title">{currentTrack.title}</span>
                        <span className="track-artist">{currentTrack.artist}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="buzz-actions">
                  <button className="buzz-btn buzz-btn-wrong" onClick={wrong}>
                    <X size={22} />
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={validate}>
                    <Check size={22} />
                    Correct
                  </button>
                </div>

                <button className="buzz-cancel" onClick={resetBuzzers}>
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="game-content blindtest">
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

            {/* Main Play Button */}
            <div className="main-play-section">
              <motion.button
                className={`main-play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={() => {
                  if (isPlaying) {
                    pauseMusic();
                  } else if (currentSnippet === null) {
                    // Pas encore joué → premier palier
                    playLevel(0);
                  } else if (currentSnippet === SNIPPET_LEVELS.length - 1) {
                    // Dernier palier (Full) → resume sans limite
                    resumeMusic();
                  } else {
                    // Rejouer le même palier avec sa durée
                    playLevel(currentSnippet);
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!playerReady}
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: 4 }} />}
              </motion.button>
              <span className="play-hint">
                {!playerReady ? 'Connexion...' : isPlaying ? 'En lecture' : 'Lancer la musique'}
              </span>
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

                  // Styles pour chaque état
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
                        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0.15) 100%)',
                        borderStyle: 'solid',
                        borderWidth: '3px',
                        borderColor: '#34d399',
                        borderRadius: '20px',
                        boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.15), 0 0 25px rgba(16, 185, 129, 0.4)'
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
                        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                        borderStyle: 'solid',
                        borderWidth: '2px',
                        borderColor: 'rgba(16, 185, 129, 0.2)',
                        borderRadius: '20px',
                        boxShadow: 'none',
                        opacity: 0.7
                      };
                    }
                    // État par défaut (prêt mais pas encore joué)
                    return {
                      borderStyle: 'solid',
                      borderWidth: '2px',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px'
                    };
                  };

                  const getIconStyle = () => {
                    if (isLocked) return { background: 'rgba(60, 60, 70, 0.4)', color: 'rgba(100, 100, 110, 0.5)' };
                    if (isCurrent) return { background: 'rgba(16, 185, 129, 0.3)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)' };
                    if (isNext) return { background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
                    return {};
                  };

                  const getDurationStyle = () => {
                    if (isLocked) return { color: 'rgba(100, 100, 110, 0.5)', textShadow: 'none' };
                    if (isCurrent) return { textShadow: '0 0 15px rgba(16, 185, 129, 0.8)' };
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
                            <span style={getPillTextStyle()}>{level.start}</span>
                            <small style={getPillTextStyle()}>pts</small>
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
                <span>{playerError || 'Initialisation du lecteur Spotify...'}</span>
              </div>
            )}
            {playerReady && !isPlaying && currentSnippet === null && (
              <div className="player-status ready">
                <Check size={16} />
                <span>Prêt à jouer</span>
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
      <footer className="game-footer blindtest">
        <div className="host-actions">
          <button className="action-btn action-reset blindtest" onClick={resetBuzzers}>
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
          <button className="action-btn action-skip blindtest" onClick={skip}>
            <SkipForward size={20} />
            <span>Passer</span>
          </button>
          <button className="action-btn action-end blindtest" onClick={end}>
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
        .blindtest-host-page,
        .blindtest-host-page *,
        .blindtest-host-page *::before,
        .blindtest-host-page *::after {
          box-sizing: border-box !important;
          max-width: 100%;
        }
      `}</style>
      <style jsx>{`
        .blindtest-host-page {
          min-height: 100dvh;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow-x: hidden;
          overflow-y: hidden;
          position: fixed;
          inset: 0;
        }

        .blindtest-host-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(52, 211, 153, 0.1) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* Header */
        .game-header.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          padding: 12px 16px;
          padding-top: 12px;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 100%;
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

        .game-header-progress.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: #34d399;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
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
        .game-content.blindtest {
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 16px;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }

        /* Track Card - Style Guide Compliant */
        .track-card {
          width: 100%;
          max-width: 500px;
          min-width: 0;
          background: rgba(20, 20, 30, 0.7);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
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
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.1);
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
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #34d399;
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
          background: rgba(16, 185, 129, 0.9);
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
          max-width: 100%;
        }

        .track-artist-host {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .track-points-badge {
          display: inline-flex;
          align-items: baseline;
          gap: 4px;
          padding: 6px 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
        }

        .track-points-badge .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: #34d399;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        .track-points-badge .points-label {
          font-size: 0.7rem;
          color: rgba(52, 211, 153, 0.7);
          font-weight: 600;
        }

        /* Main Play Section */
        .main-play-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          width: 100%;
          min-width: 0;
        }

        .main-play-btn {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
        }

        .main-play-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
        }

        .main-play-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        .main-play-btn.playing {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5), 0 0 30px rgba(16, 185, 129, 0.3);
        }

        .play-hint {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Snippet Section */
        .snippet-section {
          margin-bottom: 16px;
          width: 100%;
          min-width: 0;
          overflow: visible;
          padding: 8px 4px;
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
          min-width: 0;
          overflow: visible;
        }

        /* Connector between buttons */
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
          background: linear-gradient(90deg, #10b981, #34d399);
          border-radius: 2px;
          transition: width 0.4s ease-out;
        }

        .snippet-connector.filled .connector-fill {
          width: 100%;
        }

        .snippet-connector.filling .connector-fill {
          width: 100%;
          animation: fill-line 0.5s ease-out forwards;
        }

        @keyframes fill-line {
          from { width: 0%; }
          to { width: 100%; }
        }

        .snippet-card {
          position: relative;
          flex: 1 1 0;
          min-width: 0;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%);
          border: 2px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px;
          padding: 0;
          cursor: pointer;
          overflow: visible;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
        }

        .snippet-card:hover:not(:disabled):not(.locked) {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.08) 100%);
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .snippet-card:active:not(:disabled):not(.locked) {
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }

        .snippet-card:disabled {
          cursor: not-allowed;
        }

        /* Current playing level - highlighted and scaled */
        .snippet-card.current {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0.15) 100%);
          border-color: #34d399;
          border-width: 3px;
          box-shadow:
            0 0 0 4px rgba(16, 185, 129, 0.15),
            0 0 25px rgba(16, 185, 129, 0.4),
            0 8px 20px rgba(16, 185, 129, 0.25);
        }

        .snippet-card.current .snippet-icon {
          background: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
        }

        .snippet-card.current .snippet-duration {
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.8);
        }

        /* Next available level - ready to use, pulsing */
        .snippet-card.next {
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

        .snippet-card.next .snippet-icon {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .snippet-card.next .snippet-duration {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }

        /* Passed levels - slightly dimmed */
        .snippet-card.passed {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%);
          border-color: rgba(16, 185, 129, 0.25);
          box-shadow: none;
        }

        .snippet-card.passed .snippet-icon {
          opacity: 0.7;
        }

        .snippet-card.passed .snippet-duration {
          opacity: 0.7;
        }

        /* Locked levels - greyed out */
        .snippet-card.locked {
          background: transparent;
          border-color: rgba(60, 60, 70, 0.3);
          box-shadow: none;
          pointer-events: none;
          cursor: not-allowed;
        }

        .snippet-card.locked .snippet-icon {
          background: rgba(60, 60, 70, 0.4);
          color: rgba(100, 100, 110, 0.6);
        }

        .snippet-card.locked .snippet-duration {
          color: rgba(100, 100, 110, 0.6);
          text-shadow: none;
        }

        .snippet-card.locked .snippet-points-pill {
          background: rgba(40, 40, 50, 0.5);
        }

        .snippet-card.locked .snippet-points-pill span {
          color: rgba(100, 100, 110, 0.6);
        }

        .snippet-card.locked .snippet-points-pill small {
          color: rgba(100, 100, 110, 0.5);
        }

        .snippet-card-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 10px;
          border-radius: inherit;
        }

        .snippet-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 12px;
          color: #34d399;
        }

        .snippet-icon svg {
          width: 22px;
          height: 22px;
        }

        .snippet-card:hover:not(:disabled):not(.locked) .snippet-icon {
          background: rgba(16, 185, 129, 0.25);
        }

        .snippet-duration {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: #34d399;
          text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }

        .snippet-points-pill {
          display: flex;
          align-items: baseline;
          gap: 3px;
          padding: 5px 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 16px;
        }

        .snippet-points-pill span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .snippet-points-pill small {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
        }

        .snippet-active-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #10b981, #34d399);
          animation: snippet-progress 0.5s ease-out;
          border-radius: 0 0 18px 18px;
        }

        @keyframes snippet-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
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

        .player-status.ready {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .status-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .game-footer.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(16, 185, 129, 0.2);
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .host-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          min-width: 0;
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

        .action-reset.blindtest {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        .action-reset.blindtest:hover {
          background: rgba(16, 185, 129, 0.18);
          border-color: rgba(16, 185, 129, 0.4);
        }

        .action-skip.blindtest {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.25);
          color: #fbbf24;
        }

        .action-skip.blindtest:hover {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.4);
        }

        .action-end.blindtest {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.25);
          color: #f87171;
        }

        .action-end.blindtest:hover {
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

        .buzz-card.blindtest {
          width: 100%;
          max-width: 400px;
          background-color: #1a1625 !important;
          border: 2px solid #34d399;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2), 0 8px 32px rgba(0, 0, 0, 0.9);
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
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: #34d399;
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
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }

        .buzz-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-points.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 10px;
          padding: 8px 12px;
          text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }

        .buzz-answer.blindtest {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
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
          min-width: 0;
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
          background: #34d399;
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
