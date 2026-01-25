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
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { GameEndTransition } from "@/components/transitions";

export default function BlindTestHostGame() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

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

  // Server time sync (300ms tick for score updates)
  const { serverNow } = useServerTime(300);

  // Player error state
  const [playerError, setPlayerError] = useState(null);

  // Pause music - défini tôt car utilisé dans le système de buzz
  const pauseMusic = useCallback(async () => {
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
      snippetStopRef.current = null;
    }
    await pause();
    setIsPlaying(false);
  }, []);

  // Initialize Spotify Player
  useEffect(() => {
    const init = async () => {
      try {
        await initializePlayer({
          onReady: (deviceId) => {
            setPlayerReady(true);
            setPlayerError(null);
          },
          onStateChange: (playerState) => {
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
    if (state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const myUid = auth.currentUser?.uid;

  // Room guard - détecte fermeture room (host is always host here)
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: true
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    isHost: true
  });

  // Keep screen awake during game
  useWakeLock({ enabled: true });

  // Inactivity detection for host
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
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
    // If nothing has been played yet, return 0 (shouldn't happen during buzz)
    if (highestLevelPlayed === null) return { pointsEnJeu: SNIPPET_LEVELS[0].start };
    // Score is based on the highest level the host has reached
    const levelConfig = SNIPPET_LEVELS[highestLevelPlayed];
    return { pointsEnJeu: levelConfig?.start || 0 };
  }, [highestLevelPlayed]);

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevLock = useRef(null);

  // *** SYSTÈME DE BUZZ ROBUSTE ***
  // Fenêtre de tolérance pour capturer tous les buzzes (compense les latences réseau)
  const BUZZ_WINDOW_MS = 150;
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({}); // Cache local - JAMAIS ignoré
  const isResolving = useRef(false);

  // *** SYSTÈME DE BUZZ ROBUSTE: LISTENER DÉDIÉ + CACHE LOCAL ***
  useEffect(() => {
    if (!isHost || !code) return;

    const pendingBuzzesRef = ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`);

    // Fonction de résolution - utilise le cache local
    const resolveBuzzes = async () => {
      // Marquer comme en cours de résolution
      isResolving.current = true;
      buzzWindowTimeout.current = null;

      try {
        // Copier le cache actuel (snapshot des buzzes reçus)
        const buzzesToResolve = { ...buzzCache.current };
        const buzzCount = Object.keys(buzzesToResolve).length;

        if (buzzCount === 0) {
          console.log('[Buzz] Aucun buzz à résoudre');
          return;
        }

        console.log(`[Buzz] Résolution de ${buzzCount} buzz(es)...`);

        // Vérifier que lockUid n'est pas déjà défini
        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms_blindtest/${code}/state/lockUid`));
        if (lockSnap.val()) {
          console.log('[Buzz] lockUid déjà défini, abandon');
          return;
        }

        // Trouver le gagnant (plus petit adjustedTime = premier à avoir buzzé)
        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        console.log(`[Buzz] Gagnant: ${winner.name} (adjustedTime: ${winner.adjustedTime})`);

        // Utiliser une transaction pour garantir l'atomicité
        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms_blindtest/${code}/state/lockUid`), (currentLock) => {
          // Si déjà défini par quelqu'un d'autre, on abandonne
          if (currentLock) return currentLock;
          // Sinon on écrit le gagnant
          return winner.uid;
        });

        // Vérifier si on a gagné la transaction
        if (lockResult.snapshot.val() !== winner.uid) {
          console.log('[Buzz] Transaction perdue, quelqu\'un d\'autre a écrit lockUid');
          return;
        }

        // Pause la musique
        pauseMusic();

        // Transaction réussie - mettre à jour les autres champs
        await update(ref(db, `rooms_blindtest/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        // Supprimer les pendingBuzzes
        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

        // Son
        playBuzz();

        console.log('[Buzz] ✅ Résolution terminée');

      } catch (error) {
        console.error('[Buzz] ❌ Erreur résolution:', error);
      } finally {
        isResolving.current = false;
        // Vider le cache après résolution
        buzzCache.current = {};
      }
    };

    // Listener DÉDIÉ qui met TOUJOURS à jour le cache (jamais ignoré)
    const unsubscribe = onValue(pendingBuzzesRef, (snapshot) => {
      const pendingBuzzes = snapshot.val() || {};
      const buzzCount = Object.keys(pendingBuzzes).length;

      // Toujours mettre à jour le cache
      buzzCache.current = pendingBuzzes;

      // Si pas de buzzes, rien à faire
      if (buzzCount === 0) return;

      // Si un timeout est déjà programmé, les nouveaux buzzes seront
      // capturés via le cache quand la résolution s'exécutera
      if (buzzWindowTimeout.current) {
        console.log(`[Buzz] +1 buzz ajouté au cache (total: ${buzzCount})`);
        return;
      }

      // Si résolution en cours, le cache sera traité au prochain cycle si nécessaire
      if (isResolving.current) {
        console.log('[Buzz] Résolution en cours, buzz ajouté au cache');
        return;
      }

      // Premier buzz détecté - démarrer la fenêtre de 150ms
      console.log(`[Buzz] Premier buzz détecté, démarrage fenêtre ${BUZZ_WINDOW_MS}ms`);
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
  }, [isHost, code, playBuzz, pauseMusic]);

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
    if (!isHost || !playerReady || !currentTrack?.spotifyUri) return;

    // Small delay to avoid preloading during rapid transitions
    const timer = setTimeout(async () => {
      await preloadTrack(currentTrack.spotifyUri);
    }, 300);

    return () => clearTimeout(timer);
  }, [isHost, playerReady, currentTrack?.spotifyUri]);

  // Play snippet at specific level
  const playLevel = async (level) => {
    if (!isHost) return;
    if (!currentTrack) return;
    if (!playerReady) {
      setPlayerError("Le lecteur Spotify n'est pas prêt");
      return;
    }

    // Stop previous snippet if playing
    if (snippetStopRef.current) {
      await snippetStopRef.current.stop();
    }

    const config = SNIPPET_LEVELS[level];
    const trackUri = currentTrack.spotifyUri;

    try {
      const snippet = await playSnippet(trackUri, config.duration);
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

  // Full stop - resets everything for new question
  const stopMusic = async () => {
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
      // Fermer la room proprement - les joueurs seront redirigés via useRoomGuard
      await update(ref(db, `rooms_blindtest/${code}/meta`), { closed: true });
    }
    router.push('/home');
  }

  // Reset buzzers
  async function resetBuzzers() {
    if (!isHost) return;
    // Reset le flag de résolution
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
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
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

    // Appliquer la pénalité de temps
    if (meta?.mode === "équipes") {
      // Mode équipes : bloquer toute l'équipe
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p => p.teamId === teamId).forEach(p => {
          updates[`rooms_blindtest/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      } else {
        // Fallback si pas d'équipe trouvée
        updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
      }
    } else {
      // Mode individuel : bloquer seulement le joueur
      updates[`rooms_blindtest/${code}/players/${uid}/blockedUntil`] = until;
    }
    updates[`rooms_blindtest/${code}/state/lockUid`] = null;
    updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";
    updates[`rooms_blindtest/${code}/state/buzz`] = null;
    updates[`rooms_blindtest/${code}/state/pausedAt`] = null;
    updates[`rooms_blindtest/${code}/state/lockedAt`] = null;

    // Reset le flag de résolution
    isResolving.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});

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

    // Reset le flag de résolution
    isResolving.current = false;

    await update(ref(db), updates);
    // Supprimer les buzzes en attente séparément
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
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
    <div className="blindtest-host-page game-page">
      {/* Transition de fin de partie */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="blindtest"
            onComplete={() => router.replace(`/blindtest/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

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
                    <Bell />
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
                    <X />
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={validate}>
                    <Check />
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
                    <Music />
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
                {isPlaying ? <Pause /> : <Play style={{ marginLeft: '0.5vh' }} />}
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

                  // Styles dynamiques pour chaque état (valeurs originales)
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
                        whileTap={!isLocked ? { scale: 0.95 } : {}}
                        disabled={!playerReady || isLocked}
                      >
                        <div className="snippet-card-inner">
                          <div className="snippet-icon" style={getIconStyle()}>
                            {idx === 0 && <Zap />}
                            {idx === 1 && <Clock />}
                            {idx === 2 && <Timer />}
                            {idx === 3 && <Disc />}
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
                <Check />
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
        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Footer Actions */}
      <footer className="game-footer blindtest">
        <div className="host-actions">
          <button className="action-btn action-reset blindtest" onClick={resetBuzzers}>
            <RotateCcw />
            <span>Reset</span>
          </button>
          <button className="action-btn action-skip blindtest" onClick={skip}>
            <SkipForward />
            <span>Passer</span>
          </button>
          <button className="action-btn action-end blindtest" onClick={end}>
            <X />
            <span>Fin</span>
          </button>
        </div>
      </footer>

      {/* Game Status Banners - for connection lost indicator */}
      <GameStatusBanners
        isHost={true}
        isHostTemporarilyDisconnected={false}
        hostDisconnectedAt={null}
      />

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
        /* Exception for carousel-track which needs 200% width */
        .blindtest-host-page .carousel-track {
          max-width: none;
        }
      `}</style>
      <style jsx>{`
        /* ===== PAGE LAYOUT - Proportional ===== */
        .blindtest-host-page {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
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

        /* ===== HEADER - 7% of screen ===== */
        .game-header.blindtest {
          height: 7vh;
          min-height: 7vh;
          max-height: 7vh;
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          padding: 0 2vw;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 2vw;
          min-width: 0;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 2vw;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .game-header-progress.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.2vh;
          color: #34d399;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.6vh;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 1.5vw;
          flex-shrink: 0;
        }

        /* ===== CONTENT - 81% of screen (fills between header & footer) ===== */
        .game-content.blindtest {
          flex: 1;
          min-height: 0;
          min-width: 0;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5vh 3vw;
          gap: 1.5vh;
          overflow: hidden;
          width: 100%;
        }

        /* ===== TRACK CARD - 58% of content area ===== */
        .track-card {
          width: 100%;
          max-width: 500px;
          flex: 0 0 58%;
          min-height: 0;
          background: rgba(20, 20, 30, 0.7);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 2vh;
          padding: 1.5vh 2vw;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .track-empty {
          text-align: center;
          color: var(--text-muted);
          padding: 3vh 2vw;
          font-size: 1.8vh;
        }

        /* Track Header */
        .track-header {
          display: flex;
          align-items: center;
          gap: 2vw;
          padding-bottom: 1vh;
          margin-bottom: 1vh;
          border-bottom: 1px solid rgba(16, 185, 129, 0.1);
          flex-shrink: 0;
          min-width: 0;
          width: 100%;
        }

        .track-cover-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .track-cover {
          width: 8vh;
          height: 8vh;
          border-radius: 1.2vh;
          object-fit: cover;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .track-cover-placeholder {
          width: 8vh;
          height: 8vh;
          border-radius: 1.2vh;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #34d399;
        }

        .track-cover-placeholder svg {
          width: 3vh;
          height: 3vh;
        }

        .track-playing-indicator {
          position: absolute;
          bottom: -0.8vh;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: flex-end;
          gap: 0.3vh;
          height: 2vh;
          padding: 0.4vh 0.8vh;
          background: rgba(16, 185, 129, 0.9);
          border-radius: 0.8vh;
        }

        .track-playing-indicator span {
          width: 0.3vh;
          background: white;
          border-radius: 1px;
          animation: equalizer 0.8s ease-in-out infinite;
        }

        .track-playing-indicator span:nth-child(1) { height: 0.8vh; animation-delay: 0s; }
        .track-playing-indicator span:nth-child(2) { height: 1.2vh; animation-delay: 0.2s; }
        .track-playing-indicator span:nth-child(3) { height: 0.6vh; animation-delay: 0.4s; }

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
          font-size: 2vh;
          color: var(--text-primary);
          margin-bottom: 0.3vh;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-artist-host {
          display: block;
          font-size: 1.6vh;
          color: var(--text-secondary);
          margin-bottom: 0.8vh;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-points-badge {
          display: inline-flex;
          align-items: baseline;
          gap: 0.5vh;
          padding: 0.6vh 1.2vh;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 2vh;
        }

        .track-points-badge .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2vh;
          color: #34d399;
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        .track-points-badge .points-label {
          font-size: 1.2vh;
          color: rgba(52, 211, 153, 0.7);
          font-weight: 600;
        }

        /* ===== MAIN PLAY SECTION ===== */
        .main-play-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8vh;
          flex: 1;
          justify-content: center;
          width: 100%;
          min-height: 0;
        }

        .main-play-btn {
          position: relative;
          width: 9vh;
          height: 9vh;
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

        .main-play-btn svg {
          width: 4vh;
          height: 4vh;
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
          font-size: 1.3vh;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* ===== SNIPPET SECTION - Duration buttons ===== */
        .snippet-section {
          width: 100%;
          flex-shrink: 0;
          padding: 0.5vh 0;
          overflow: hidden;
        }

        .snippet-section-label {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.3vh;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1vh;
          text-align: center;
        }

        .snippet-grid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0;
          width: 100%;
          overflow: hidden;
          padding: 0 0.5vw;
        }

        /* Connector between buttons */
        .snippet-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 1 2vw;
          min-width: 0;
        }

        .connector-line {
          width: 100%;
          height: 0.25vh;
          background: rgba(100, 100, 100, 0.3);
          border-radius: 1px;
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
          border-radius: 1px;
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
          flex: 1 1 20%;
          min-width: 0;
          max-width: 24%;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%);
          border: 0.2vh solid rgba(16, 185, 129, 0.3);
          border-radius: 1.2vh;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s ease;
          box-shadow: 0 0.2vh 0.8vh rgba(16, 185, 129, 0.1);
        }

        .snippet-card:hover:not(:disabled):not(.locked) {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.08) 100%);
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0.5vh 1.5vh rgba(16, 185, 129, 0.2);
        }

        .snippet-card:active:not(:disabled):not(.locked) {
          box-shadow: 0 0.2vh 0.5vh rgba(0, 0, 0, 0.3);
        }

        .snippet-card:disabled {
          cursor: not-allowed;
        }

        /* Current playing level - highlighted */
        .snippet-card.current {
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.35) 0%, rgba(16, 185, 129, 0.15) 100%);
          border-color: #34d399;
          border-width: 0.35vh;
          box-shadow:
            0 0 0 0.4vh rgba(16, 185, 129, 0.15),
            0 0 2vh rgba(16, 185, 129, 0.4);
        }

        .snippet-card.current .snippet-icon {
          background: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 1.5vh rgba(16, 185, 129, 0.5);
        }

        .snippet-card.current .snippet-duration {
          text-shadow: 0 0 1.5vh rgba(16, 185, 129, 0.8);
        }

        /* Next available level - ready to use, pulsing */
        .snippet-card.next {
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.08) 100%);
          border-color: rgba(251, 191, 36, 0.6);
          box-shadow: 0 0 1.5vh rgba(251, 191, 36, 0.2);
          animation: next-pulse 2s ease-in-out infinite;
        }

        @keyframes next-pulse {
          0%, 100% {
            box-shadow: 0 0 1.5vh rgba(251, 191, 36, 0.2);
            border-color: rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 2.5vh rgba(251, 191, 36, 0.35);
            border-color: rgba(251, 191, 36, 0.8);
          }
        }

        .snippet-card.next .snippet-icon {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .snippet-card.next .snippet-duration {
          color: #fbbf24;
          text-shadow: 0 0 1vh rgba(251, 191, 36, 0.5);
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
          gap: 0.5vh;
          padding: 1vh 0.3vw;
          border-radius: inherit;
          min-width: 0;
          width: 100%;
        }

        .snippet-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3.5vh;
          height: 3.5vh;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 1vh;
          color: #34d399;
          flex-shrink: 0;
        }

        .snippet-icon svg {
          width: 1.8vh;
          height: 1.8vh;
        }

        .snippet-card:hover:not(:disabled):not(.locked) .snippet-icon {
          background: rgba(16, 185, 129, 0.25);
        }

        .snippet-duration {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.5vh;
          color: #34d399;
          text-shadow: 0 0 0.8vh rgba(16, 185, 129, 0.4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .snippet-points-pill {
          display: flex;
          align-items: baseline;
          gap: 0.2vh;
          padding: 0.3vh 0.6vh;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0.8vh;
        }

        .snippet-points-pill span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1vh;
          font-weight: 700;
          color: #ffffff;
        }

        .snippet-points-pill small {
          font-size: 0.9vh;
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

        /* Player Status - Pure vh */
        .player-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1vh;
          padding: 1vh 2vw;
          border-radius: 1.2vh;
          font-size: 1.4vh;
          font-weight: 500;
        }

        .player-status svg {
          width: 2vh;
          height: 2vh;
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
          width: 2vh;
          height: 2vh;
          border: 0.25vh solid rgba(251, 191, 36, 0.3);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ===== FOOTER - 12% of screen ===== */
        .game-footer.blindtest {
          height: 12vh;
          min-height: 12vh;
          max-height: 12vh;
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 1.5vh 3vw;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(16, 185, 129, 0.2);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .host-actions {
          display: flex;
          gap: 2vw;
          justify-content: center;
          width: 100%;
          max-width: 500px;
        }

        .action-btn {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5vh;
          padding: 1.5vh 2vw;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1.5vh;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn svg {
          width: 3vh;
          height: 3vh;
        }

        .action-btn span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.3vh;
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

        /* Buzz Modal - Pure vh */
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
          padding: 3vw;
        }

        .buzz-card.blindtest {
          width: 100%;
          max-width: 500px;
          background-color: #1a1625 !important;
          border: 0.3vh solid #34d399;
          border-radius: 2.5vh;
          padding: 3vh 4vw;
          box-shadow: 0 0 0 0.5vh rgba(16, 185, 129, 0.2), 0 1vh 4vh rgba(0, 0, 0, 0.9);
        }

        .buzz-header {
          display: flex;
          align-items: center;
          gap: 3vw;
          margin-bottom: 2.5vh;
          padding-bottom: 2vh;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .buzz-icon {
          width: 6vh;
          height: 6vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 1.5vh;
          color: #34d399;
          animation: buzz-ring 0.5s ease-out;
        }

        .buzz-icon svg {
          width: 3.5vh;
          height: 3.5vh;
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
          gap: 0.3vh;
        }

        .buzz-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.5vh;
          color: #ffffff;
          text-shadow: 0 0 1.2vh rgba(16, 185, 129, 0.3);
        }

        .buzz-label {
          font-size: 1.5vh;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-points.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.2vh;
          color: #34d399;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 1.2vh;
          padding: 1vh 1.5vh;
          text-shadow: 0 0 1vh rgba(16, 185, 129, 0.4);
        }

        .buzz-answer.blindtest {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 1.5vh;
          padding: 1.8vh 3vw;
          margin-bottom: 2.5vh;
        }

        .track-reveal {
          display: flex;
          align-items: center;
          gap: 3vw;
        }

        .track-album-art {
          width: 7vh;
          height: 7vh;
          border-radius: 1vh;
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
          font-size: 1.8vh;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .track-artist {
          display: block;
          font-size: 1.5vh;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .buzz-actions {
          display: flex;
          gap: 2vw;
          margin-bottom: 1.5vh;
          min-width: 0;
          width: 100%;
        }

        .buzz-btn {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.5vw;
          padding: 1.8vh 3vw;
          border-radius: 1.5vh;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.8vh;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn svg {
          width: 2.5vh;
          height: 2.5vh;
        }

        .buzz-btn-wrong {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: rgba(239, 68, 68, 0.22);
          border-color: rgba(239, 68, 68, 0.5);
          transform: translateY(-0.3vh);
        }

        .buzz-btn-correct {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: rgba(34, 197, 94, 0.22);
          border-color: rgba(34, 197, 94, 0.5);
          transform: translateY(-0.3vh);
        }

        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.5vh;
          color: rgba(255, 255, 255, 0.4);
          background: transparent;
          border: none;
          padding: 1.2vh;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 1vh;
          margin-bottom: 2vh;
        }

        .loading-dots span {
          width: 1.2vh;
          height: 1.2vh;
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
