"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/game/Buzzer";
import Leaderboard from "@/components/game/Leaderboard";
import BlindTestHostView from "@/components/game/BlindTestHostView";
import BlindTestRevealScreen from "@/components/game/BlindTestRevealScreen";
import AskerTransition from "@/components/game/AskerTransition";
import { motion, AnimatePresence } from "framer-motion";
import { GameEndTransition } from "@/components/transitions";
import { PREVIEW_START_OFFSET_SEC } from "@/lib/deezer/player";

import GamePlayHeader from "@/components/game/GamePlayHeader";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useAskerRotation } from "@/lib/hooks/useAskerRotation";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { storage } from "@/lib/utils/storage";
import { SNIPPET_LEVELS, getPointsForLevel, isValidLevel } from "@/lib/constants/blindtest";

// Deezer brand colors
const DEEZER_PURPLE = '#A238FF';

export default function DeezTestPlayerGame() {
  const { code } = useParams();
  const router = useRouter();

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showAskerTransition, setShowAskerTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const prevAskerUidRef = useRef(null);

  // Dérivé de state — déclaré tôt pour éviter TDZ dans les useEffect ci-dessous
  const revealed = !!state?.revealed;

  // Centralized players hook
  const { players, me } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Party Mode: Asker rotation hook
  const {
    isPartyMode,
    currentAsker,
    currentAskerUid,
    isCurrentAsker,
    canBuzz,
    advanceToNextAsker
  } = useAskerRotation({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    meta,
    state,
    players
  });

  // Am I the current asker in party mode?
  const amIAsker = isPartyMode && isCurrentAsker(myUid);

  // Server time sync (300ms tick for score updates)
  const { serverNow, offset } = useServerTime(300);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) setMyUid(u.uid);
      else {
        await signInAnonymously(auth);
      }
    });
    return unsub;
  }, []);

  // Player cleanup (mark disconnected on leave)
  const { leaveRoom, markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Mark player as active when joining/rejoining
  useEffect(() => {
    if (myUid && code) {
      markActive();
    }
  }, [myUid, code, markActive]);

  // Am I the actual host (room creator)?
  const isActualHost = meta?.hostUid === myUid;

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave, isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: isActualHost
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  // Désactivé quand amIAsker (BlindTestHostView gère son propre useHostDisconnect)
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    hostUid: amIAsker ? null : meta?.hostUid
  });

  // Keep screen awake during game
  useWakeLock({ enabled: true });

  // ========== AUDIO SYNC PLAYER (mode 'all') ==========
  const audioMode = meta?.audioMode || 'single';
  const shouldPlayAudio = audioMode === 'all' && !amIAsker; // Joueurs jouent l'audio (pas l'asker)

  const audioPlayerRef = useRef(null);
  const audioSyncTimeoutRef = useRef(null);
  // Ref pour accéder à l'offset serveur dans le callback Firebase sans re-subscribe
  const serverOffsetRef = useRef(offset);
  serverOffsetRef.current = offset;

  // Listener pour audioSync dans Firebase
  useEffect(() => {
    if (!shouldPlayAudio || !code) return;

    const audioSyncRef = ref(db, `rooms_blindtest/${code}/state/audioSync`);

    const unsubscribe = onValue(audioSyncRef, async (snapshot) => {
      const syncData = snapshot.val();

      if (!syncData || !syncData.startAt || !syncData.previewUrl) return;

      const { startAt, previewUrl, duration } = syncData;
      const serverNowMs = Date.now() + serverOffsetRef.current;
      const delay = startAt - serverNowMs;

      // Si le timestamp est dans le passé (>500ms en server time), ignorer
      if (delay < -500) return;

      // Clear ancien audio + timeout
      if (audioSyncTimeoutRef.current) {
        clearTimeout(audioSyncTimeoutRef.current);
        audioSyncTimeoutRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      // Preload l'audio
      try {
        const audio = new Audio(previewUrl);
        audio.preload = 'auto';
        audioPlayerRef.current = audio;

        // Attendre que l'audio soit prêt
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          setTimeout(() => reject(new Error('Audio load timeout')), 2000);
        });

        // Programmer le démarrage à startAt (server time)
        const finalDelay = Math.max(0, startAt - (Date.now() + serverOffsetRef.current));

        audioSyncTimeoutRef.current = setTimeout(async () => {
          try {
            audio.currentTime = PREVIEW_START_OFFSET_SEC;
            await audio.play();

            // Timer de durée démarre APRÈS que l'audio joue réellement
            // (même comportement que playSnippet côté asker)
            if (duration) {
              setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
              }, duration);
            }
          } catch (err) {
            console.error('[Audio Sync] Play error:', err);
          }
        }, finalDelay);

      } catch (error) {
        console.error('[Audio Sync] Preload error:', error);
      }
    });

    return () => {
      unsubscribe();
      if (audioSyncTimeoutRef.current) {
        clearTimeout(audioSyncTimeoutRef.current);
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, [shouldPlayAudio, code]);

  // Cleanup audio quand quelqu'un buzz
  useEffect(() => {
    if (state?.lockUid && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
  }, [state?.lockUid]);
  // ========== FIN AUDIO SYNC ==========

  // ========== REVEAL AUDIO SYNC (mode 'all') ==========
  const revealAudioPlayerRef = useRef(null);
  const revealAudioTimeoutRef = useRef(null);

  // Listener pour revealAudioSync dans Firebase
  useEffect(() => {
    if (!shouldPlayAudio || !code) return;

    const revealAudioSyncRef = ref(db, `rooms_blindtest/${code}/state/revealAudioSync`);

    const unsubscribe = onValue(revealAudioSyncRef, async (snapshot) => {
      const syncData = snapshot.val();

      if (!syncData || !syncData.action) return;

      const { action, startAt, previewUrl } = syncData;

      // Action: 'play', 'pause', 'resume'
      if (action === 'play' && startAt && previewUrl) {
        // Démarrage du reveal audio
        const serverNowMs = Date.now() + serverOffsetRef.current;
        const delay = startAt - serverNowMs;

        // Si le timestamp est dans le passé (>500ms), ignorer
        if (delay < -500) return;

        // Clear ancien audio + timeout
        if (revealAudioTimeoutRef.current) {
          clearTimeout(revealAudioTimeoutRef.current);
          revealAudioTimeoutRef.current = null;
        }
        if (revealAudioPlayerRef.current) {
          revealAudioPlayerRef.current.pause();
          revealAudioPlayerRef.current = null;
        }

        // Preload l'audio
        try {
          const audio = new Audio(previewUrl);
          audio.preload = 'auto';
          revealAudioPlayerRef.current = audio;

          // Attendre que l'audio soit prêt
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', reject, { once: true });
            setTimeout(() => reject(new Error('Reveal audio load timeout')), 2000);
          });

          // Programmer le démarrage à startAt (server time)
          const finalDelay = Math.max(0, startAt - (Date.now() + serverOffsetRef.current));

          revealAudioTimeoutRef.current = setTimeout(async () => {
            try {
              audio.currentTime = PREVIEW_START_OFFSET_SEC;
              await audio.play();
            } catch (err) {
              console.error('[Reveal Audio Sync] Play error:', err);
            }
          }, finalDelay);

        } catch (error) {
          console.error('[Reveal Audio Sync] Preload error:', error);
        }

      } else if (action === 'pause' && revealAudioPlayerRef.current) {
        // Pause du reveal audio
        revealAudioPlayerRef.current.pause();

      } else if (action === 'resume' && revealAudioPlayerRef.current) {
        // Resume du reveal audio
        try {
          await revealAudioPlayerRef.current.play();
        } catch (err) {
          console.error('[Reveal Audio Sync] Resume error:', err);
        }
      }
    });

    return () => {
      unsubscribe();
      if (revealAudioTimeoutRef.current) {
        clearTimeout(revealAudioTimeoutRef.current);
      }
      if (revealAudioPlayerRef.current) {
        revealAudioPlayerRef.current.pause();
        revealAudioPlayerRef.current = null;
      }
    };
  }, [shouldPlayAudio, code]);

  // Cleanup reveal audio quand on quitte le reveal
  useEffect(() => {
    if (!revealed && revealAudioPlayerRef.current) {
      revealAudioPlayerRef.current.pause();
      revealAudioPlayerRef.current = null;
    }
  }, [revealed]);
  // ========== FIN REVEAL AUDIO SYNC ==========

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => {
      const v = s.val(); setState(v);
      if (v?.phase === "ended" && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
      if (v?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
    });
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => {
      const m = s.val(); setMeta(m);
    });
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code, router]);

  // Reveal playback state from Firebase (time-based sync)
  const revealPlayback = state?.revealPlayback || null;
  const revealWinnerData = state?.revealWinner || null;
  const [playerRevealProgress, setPlayerRevealProgress] = useState(0);
  const playerRevealAnimRef = useRef(null);

  // Calculate reveal progress from Firebase time-based data
  useEffect(() => {
    if (!revealed || !revealPlayback) {
      setPlayerRevealProgress(0);
      if (playerRevealAnimRef.current) {
        cancelAnimationFrame(playerRevealAnimRef.current);
        playerRevealAnimRef.current = null;
      }
      return;
    }

    if (revealPlayback.paused) {
      // Paused: show static progress
      setPlayerRevealProgress(revealPlayback.startProgress || 0);
      if (playerRevealAnimRef.current) {
        cancelAnimationFrame(playerRevealAnimRef.current);
        playerRevealAnimRef.current = null;
      }
      return;
    }

    // Playing: animate progress from startProgress using time elapsed
    const REVEAL_DURATION_MS = 25000; // 25 seconds
    const startedAt = revealPlayback.startedAt || Date.now();
    const startProgress = revealPlayback.startProgress || 0;

    const animate = () => {
      const elapsed = Date.now() - startedAt;
      const progressIncrement = (elapsed / REVEAL_DURATION_MS) * 100;
      const newProgress = Math.min(100, startProgress + progressIncrement);
      setPlayerRevealProgress(newProgress);

      if (newProgress < 100) {
        playerRevealAnimRef.current = requestAnimationFrame(animate);
      }
    };

    playerRevealAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (playerRevealAnimRef.current) {
        cancelAnimationFrame(playerRevealAnimRef.current);
        playerRevealAnimRef.current = null;
      }
    };
  }, [revealed, revealPlayback?.paused, revealPlayback?.startedAt, revealPlayback?.startProgress]);

  // Validation des niveaux avec fallback sécurisé
  const rawSnippetLevel = state?.snippetLevel || 0;
  const snippetLevel = isValidLevel(rawSnippetLevel) ? rawSnippetLevel : 0;
  const rawHighestLevel = state?.highestSnippetLevel ?? -1;
  const highestSnippetLevel = rawHighestLevel >= 0 && isValidLevel(rawHighestLevel) ? rawHighestLevel : -1;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];
  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";

  // Penalty check
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Points based on HIGHEST snippet level reached (not current)
  const scoringLevel = highestSnippetLevel >= 0 ? highestSnippetLevel : 0;
  const pointsEnJeu = getPointsForLevel(scoringLevel);

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const prevLock = useRef(null);

  useEffect(() => {
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) playBuzz();
    prevLock.current = cur;
  }, [state?.lockUid, playBuzz]);

  // Confetti on correct answer
  const prevQuestionIndex = useRef(-1);
  const wasLockedByMe = useRef(false);
  useEffect(() => {
    const currentIndex = state?.currentIndex || 0;
    const isLockedByMe = state?.lockUid === auth.currentUser?.uid;

    if (currentIndex !== prevQuestionIndex.current && prevQuestionIndex.current >= 0 && wasLockedByMe.current) {
      // Confetti removed (caused white squares on Android)
    }

    prevQuestionIndex.current = currentIndex;
    wasLockedByMe.current = isLockedByMe;
  }, [state?.currentIndex, state?.lockUid]);

  const isMyTurn = state?.lockUid === me?.uid;

  // Party Mode: Show transition when asker changes (including first asker)
  useEffect(() => {
    if (!isPartyMode || !currentAskerUid) return;

    if (prevAskerUidRef.current !== currentAskerUid) {
      setShowAskerTransition(true);
    }
    prevAskerUidRef.current = currentAskerUid;
  }, [isPartyMode, currentAskerUid]);

  // Can I buzz? (Party Mode check)
  const canIBuzz = !amIAsker && canBuzz(myUid, me?.teamId);

  // Calcul de la latence (affichée si > 500ms)
  const latencyMs = Math.abs(offset);
  const showLatencyWarning = latencyMs > 500;

  // ========== PARTY MODE: ASKER VIEW ==========
  if (amIAsker) {
    return (
      <>
        {/* Asker Transition */}
        <AskerTransition
          show={showAskerTransition}
          asker={currentAsker}
          isTeamMode={meta?.mode === 'équipes'}
          onComplete={() => setShowAskerTransition(false)}
          themeColor={DEEZER_PURPLE}
        />

        {/* Use the shared host view component */}
        <BlindTestHostView
          code={code}
          isActualHost={false}
          onAdvanceAsker={advanceToNextAsker}
        />
      </>
    );
  }

  // ========== PLAYER VIEW ==========
  return (
    <div className={`deeztest-player-page game-page ${isMyTurn ? 'my-turn' : ''}`}>
      {/* Game End Transition (pas si room fermée - useRoomGuard gère la redirection) */}
      <AnimatePresence>
        {showEndTransition && !meta?.closed && (
          <GameEndTransition
            variant="deeztest"
            onComplete={() => router.replace(`/blindtest/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Asker Transition (Party Mode) */}
      <AskerTransition
        show={showAskerTransition}
        asker={currentAsker}
        isTeamMode={meta?.mode === 'équipes'}
        onComplete={() => setShowAskerTransition(false)}
        themeColor={DEEZER_PURPLE}
      />

      {/* Glow when it's my turn */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
              boxShadow: `inset 0 0 60px 5px rgba(162, 56, 255, 0.25)`
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <GamePlayHeader
        game="deeztest"
        progress={progressLabel}
        title={playlist?.name || 'Deez Test'}
        score={me?.score || 0}
        onExit={async () => {
          if (isActualHost) {
            // Host quitte -> fermer la room
            const { update, ref: dbRef } = await import('@/lib/firebase');
            await update(dbRef(db, `rooms_blindtest/${code}/state`), { phase: 'ended' });
            await update(dbRef(db, `rooms_blindtest/${code}/meta`), { closed: true });
          } else {
            await leaveRoom();
          }
          router.push('/home');
        }}
        exitMessage={isActualHost
          ? "Voulez-vous vraiment quitter ? La partie sera terminée pour tous."
          : "Voulez-vous vraiment quitter ? Votre score sera conservé."
        }
      >
        {showLatencyWarning && (
          <div className="latency-indicator" title={`Décalage: ${latencyMs}ms`}>
            <span className="latency-dot"></span>
            <span className="latency-text">{latencyMs}ms</span>
          </div>
        )}
      </GamePlayHeader>

      {/* Buzz notification */}
      <AnimatePresence>
        {state?.buzzBanner && state?.lockUid !== me?.uid && (
          <div className="buzz-notification-wrapper">
            <motion.div
              className="buzz-notification deeztest"
              initial={{ opacity: 0, scale: 0.9, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
            >
              <div className="buzz-notification-icon">🔔</div>
              <div className="buzz-notification-content">
                <span className="buzz-notification-label">Quelqu'un a buzzé !</span>
                <span className="buzz-notification-name">
                  {players.find(p => p.uid === state.lockUid)?.name || 'Joueur'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reveal Screen - Same view as host, read-only */}
      <BlindTestRevealScreen
        show={revealed && !!currentTrack}
        track={currentTrack}
        winner={revealWinnerData}
        isPlaying={revealPlayback ? !revealPlayback.paused : false}
        progress={playerRevealProgress}
        isController={false}
      />

      {/* Main Content - Hidden when revealed */}
      {!revealed && (
        <main className="game-content deeztest">
          {/* Points & Level Card */}
          <div className="points-card">
            <div className="points-main">
              <span className="points-value">{pointsEnJeu}</span>
              <span className="points-label">points</span>
            </div>
            <div className="level-indicator">
              <span className="level-label">Palier</span>
              <span className="level-value">{currentLevelConfig?.label || '—'}</span>
            </div>
          </div>

          {/* Leaderboard */}
          <Leaderboard players={players} currentPlayerUid={me?.uid} mode={meta?.mode} teams={meta?.teams} />
        </main>
      )}

      {/* Buzzer - Hidden when revealed */}
      {!revealed && (
        <footer className="buzzer-footer deeztest">
          <Buzzer
            roomCode={code}
            roomPrefix="rooms_blindtest"
            playerUid={auth.currentUser?.uid}
            playerName={me?.name}
            blockedUntil={me?.blockedUntil || 0}
            serverNow={serverNow}
            serverOffset={offset}
            disabled={!canIBuzz}
          />
        </footer>
      )}

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_blindtest"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={false}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      <style jsx>{`
        .deeztest-player-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .deeztest-player-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(162, 56, 255, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(255, 0, 146, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* Latency indicator (passed as children to GamePlayHeader) */
        .latency-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
          flex-shrink: 0;
        }

        .latency-dot {
          width: 6px;
          height: 6px;
          background: #fbbf24;
          border-radius: 50%;
          animation: latency-pulse 1s ease-in-out infinite;
        }

        @keyframes latency-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .latency-text {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.6rem;
          font-weight: 600;
          color: #fbbf24;
        }

        /* Buzz notification */
        .buzz-notification-wrapper {
          position: fixed;
          top: calc(70px + env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          z-index: 100;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .buzz-notification.deeztest {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 2px solid ${DEEZER_PURPLE};
          border-radius: 16px;
          box-shadow: 0 0 30px rgba(162, 56, 255, 0.4);
        }

        .buzz-notification-icon {
          font-size: 1.5rem;
          animation: buzz-icon-pulse 1s ease-in-out infinite;
        }

        @keyframes buzz-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .buzz-notification-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .buzz-notification-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          color: ${DEEZER_PURPLE};
        }

        .buzz-notification-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: var(--text-primary);
        }

        /* Main content */
        .game-content.deeztest {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 12px;
          overflow: hidden;
          min-height: 0;
        }

        /* Points card */
        .points-card {
          width: 100%;
          max-width: 500px;
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(162, 56, 255, 0.25);
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .points-main {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.5rem;
          color: ${DEEZER_PURPLE};
          text-shadow: 0 0 20px rgba(162, 56, 255, 0.5);
          line-height: 1;
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .level-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 20px;
          background: rgba(162, 56, 255, 0.1);
          border: 1px solid rgba(162, 56, 255, 0.3);
          border-radius: 12px;
        }

        .level-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .level-value {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: ${DEEZER_PURPLE};
        }

        /* Buzzer footer */
        .buzzer-footer.deeztest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 16px;
          /* Safe area gérée par AppShell */
        }

        /* Reveal screen styles are in BlindTestRevealScreen component */
      `}</style>
    </div>
  );
}
