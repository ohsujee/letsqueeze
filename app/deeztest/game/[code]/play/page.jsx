"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/game/Buzzer";
import Leaderboard from "@/components/game/Leaderboard";
import { motion, AnimatePresence } from "framer-motion";
import { triggerConfetti } from "@/components/shared/Confetti";
import ExitButton from "@/lib/components/ExitButton";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { storage } from "@/lib/utils/storage";
import { SNIPPET_LEVELS, getPointsForLevel, isValidLevel } from "@/lib/constants/blindtest";

// Deezer brand colors
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

export default function DeezTestPlayerGame() {
  const { code } = useParams();
  const router = useRouter();

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [myUid, setMyUid] = useState(null);

  // Centralized players hook
  const { players, me } = usePlayers({ roomCode: code, roomPrefix: 'rooms_deeztest' });

  // Server time sync
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLocalNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const u = onValue(ref(db, ".info/serverTimeOffset"), s => setOffset(Number(s.val()) || 0));
    return () => u();
  }, []);

  const serverNow = localNow + offset;

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        // Store last game info for rejoin
        storage.set('lq_last_game', JSON.stringify({
          roomCode: code,
          roomPrefix: 'rooms_deeztest',
          joinedAt: Date.now()
        }));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Player cleanup hook - preserves score on disconnect
  const { leaveRoom, markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Mark player as active when joining/rejoining
  useEffect(() => {
    if (myUid && code) {
      markActive();
    }
  }, [myUid, code, markActive]);

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    isHost: false
  });

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_deeztest/${code}/state`), s => {
      const v = s.val(); setState(v);
      if (v?.phase === "ended") router.replace(`/deeztest/game/${code}/end`);
      if (v?.phase === "lobby") router.replace(`/deeztest/room/${code}`);
    });
    const u2 = onValue(ref(db, `rooms_deeztest/${code}/meta`), s => {
      const m = s.val(); setMeta(m);
    });
    const u3 = onValue(ref(db, `rooms_deeztest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code, router]);

  const revealed = !!state?.revealed;

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
      triggerConfetti('reward');
      setTimeout(() => triggerConfetti('reward'), 100);
    }

    prevQuestionIndex.current = currentIndex;
    wasLockedByMe.current = isLockedByMe;
  }, [state?.currentIndex, state?.lockUid]);

  const isMyTurn = state?.lockUid === me?.uid;

  // Calcul de la latence (affichée si > 500ms)
  const latencyMs = Math.abs(offset);
  const showLatencyWarning = latencyMs > 500;

  return (
    <div className={`deeztest-player-page ${isMyTurn ? 'my-turn' : ''}`}>
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
      <header className="game-header deeztest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress deeztest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Deez Test'}</div>
            {showLatencyWarning && (
              <div className="latency-indicator" title={`Décalage: ${latencyMs}ms`}>
                <span className="latency-dot"></span>
                <span className="latency-text">{latencyMs}ms</span>
              </div>
            )}
          </div>
          <div className="game-header-right">
            <div className="my-score-badge deeztest">
              <span className="my-score-value">{me?.score || 0}</span>
              <span className="my-score-label">pts</span>
            </div>
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? Votre score sera conservé."
              onExit={async () => {
                await leaveRoom();
                router.push('/home');
              }}
            />
          </div>
        </div>
      </header>

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

      {/* Main Content */}
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
        <Leaderboard players={players} currentPlayerUid={me?.uid} />
      </main>

      {/* Buzzer */}
      <footer className="buzzer-footer deeztest">
        <Buzzer
          roomCode={code}
          roomPrefix="rooms_deeztest"
          playerUid={auth.currentUser?.uid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
        />
      </footer>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_deeztest"
        playerUid={myUid}
        onReconnect={markActive}
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

        /* Header */
        .game-header.deeztest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(162, 56, 255, 0.2);
          padding: 12px 16px;
          padding-top: 12px;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
          gap: 12px;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress.deeztest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: ${DEEZER_PURPLE};
          text-shadow: 0 0 15px rgba(162, 56, 255, 0.6);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

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

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .my-score-badge.deeztest {
          display: flex;
          align-items: baseline;
          gap: 4px;
          background: rgba(162, 56, 255, 0.15);
          border: 1px solid rgba(162, 56, 255, 0.3);
          border-radius: 20px;
          padding: 6px 12px;
        }

        .my-score-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: ${DEEZER_PURPLE};
        }

        .my-score-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
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
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
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
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
