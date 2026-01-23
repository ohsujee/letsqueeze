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
import GamePlayHeader from "@/components/game/GamePlayHeader";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { storage } from "@/lib/utils/storage";
import { SNIPPET_LEVELS, getPointsForLevel, isValidLevel } from "@/lib/constants/blindtest";
import { GameEndTransition } from "@/components/transitions";

export default function BlindTestPlayerGame() {
  const { code } = useParams();
  const router = useRouter();

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Centralized players hook
  const { players, me } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Server time sync (300ms tick for score updates)
  const { serverNow } = useServerTime(300);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        // Store last game info for rejoin
        storage.set('last_game', {
          roomCode: code,
          roomPrefix: 'rooms_blindtest',
          joinedAt: Date.now()
        });
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Player cleanup hook - preserves score on disconnect
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

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: false
  });

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
    <div className={`blindtest-player-page game-page ${isMyTurn ? 'my-turn' : ''}`}>
      {/* Transition de fin de partie (pas si room fermée - useRoomGuard gère la redirection) */}
      <AnimatePresence>
        {showEndTransition && !meta?.closed && (
          <GameEndTransition
            variant="blindtest"
            onComplete={() => router.replace(`/blindtest/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

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
              boxShadow: 'inset 0 0 60px 5px rgba(34, 197, 94, 0.25)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <GamePlayHeader
        game="blindtest"
        progress={progressLabel}
        title={playlist?.name || 'Blind Test'}
        score={me?.score || 0}
        onExit={async () => {
          await leaveRoom();
          router.push('/home');
        }}
        exitMessage="Voulez-vous vraiment quitter ? Votre score sera conservé."
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
              className="buzz-notification blindtest"
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
      <main className="game-content blindtest">
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

      {/* Buzzer */}
      <footer className="buzzer-footer blindtest">
        <Buzzer
          roomCode={code}
          roomPrefix="rooms_blindtest"
          playerUid={auth.currentUser?.uid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          serverOffset={offset}
        />
      </footer>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_blindtest"
        playerUid={myUid}
        onReconnect={markActive}
      />

      <style jsx>{`
        .blindtest-player-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
        }

        .blindtest-player-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* Latency indicator (passed as children to GamePlayHeader) */
        .latency-indicator {
          display: flex;
          align-items: center;
          gap: 0.5vw;
          padding: 0.4vh 1.5vw;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 1.5vh;
          flex-shrink: 0;
        }

        .latency-dot {
          width: 0.8vh;
          height: 0.8vh;
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
          font-size: 1.1vh;
          font-weight: 600;
          color: #fbbf24;
        }

        /* Buzz notification */
        .buzz-notification-wrapper {
          position: fixed;
          top: calc(8vh + env(safe-area-inset-top));
          left: 3vw;
          right: 3vw;
          z-index: 100;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .buzz-notification.blindtest {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 2vw;
          padding: 1.5vh 3vw;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 0.25vh solid #10b981;
          border-radius: 2vh;
          box-shadow: 0 0 4vh rgba(6, 182, 212, 0.4);
        }

        .buzz-notification-icon {
          font-size: 2.5vh;
          animation: buzz-icon-pulse 1s ease-in-out infinite;
        }

        @keyframes buzz-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .buzz-notification-content {
          display: flex;
          flex-direction: column;
          gap: 0.3vh;
        }

        .buzz-notification-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.3vh;
          font-weight: 600;
          text-transform: uppercase;
          color: #34d399;
        }

        .buzz-notification-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2vh;
          color: var(--text-primary);
        }

        /* Main content - fills remaining space */
        .game-content.blindtest {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5vh 3vw;
          gap: 1.5vh;
          overflow: hidden;
          min-height: 0;
        }

        /* Points card - flex-shrink for fit */
        .points-card {
          width: 100%;
          max-width: 500px;
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 2vh;
          padding: 2vh 3vw;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3vw;
        }

        .points-main {
          display: flex;
          align-items: baseline;
          gap: 1.5vw;
        }

        .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 5vh;
          color: #34d399;
          text-shadow: 0 0 2.5vh rgba(16, 185, 129, 0.5);
          line-height: 1;
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.6vh;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .level-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5vh;
          padding: 1.5vh 3vw;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 1.5vh;
        }

        .level-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.2vh;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .level-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2vh;
          color: #34d399;
        }

        /* Buzzer footer - 12vh */
        .buzzer-footer.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          height: 12vh;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 3vw;
          padding-bottom: var(--safe-area-bottom);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
