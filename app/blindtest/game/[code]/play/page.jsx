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
import { Music } from "lucide-react";

// Scoring config for blind test
const SNIPPET_LEVELS = [
  { duration: 1000, label: "1s", start: 200, floor: 150 },
  { duration: 3000, label: "3s", start: 150, floor: 100 },
  { duration: 10000, label: "10s", start: 100, floor: 75 },
  { duration: null, label: "Full", start: 50, floor: 25 }
];

function useSound(url) {
  const aRef = useRef(null);
  useEffect(() => {
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if (aRef.current) {
      aRef.current.preload = "auto";
      aRef.current.volume = 0.5;
    }
  }, [url]);
  return useCallback(() => {
    if (aRef.current) {
      aRef.current.currentTime = 0;
      aRef.current.play().catch(() => {});
    }
  }, []);
}

export default function BlindTestPlayerGame() {
  const { code } = useParams();
  const router = useRouter();

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [playlist, setPlaylist] = useState(null);

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
      if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => {
      const v = s.val(); setState(v);
      if (v?.phase === "ended") router.replace(`/blindtest/game/${code}/end`);
      if (v?.phase === "lobby") router.replace(`/blindtest/room/${code}`);
    });
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => {
      const m = s.val(); setMeta(m);
    });
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/players`), s => {
      const v = s.val() || {}; const arr = Object.values(v);
      setPlayers(arr); setMe(arr.find(p => p.uid === auth.currentUser?.uid) || null);
    });
    const u4 = onValue(ref(db, `rooms_blindtest/${code}/meta/playlist`), s => setPlaylist(s.val()));
    return () => { u1(); u2(); u3(); u4(); };
  }, [code, router]);

  const revealed = !!state?.revealed;
  const snippetLevel = state?.snippetLevel || 0;
  const currentLevelConfig = SNIPPET_LEVELS[snippetLevel];

  const total = playlist?.tracks?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const currentTrack = playlist?.tracks?.[qIndex];
  const progressLabel = total ? `${Math.min(qIndex + 1, total)} / ${total}` : "";

  // Penalty check
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Points based on snippet level
  const pointsEnJeu = currentLevelConfig?.start || 0;

  // Sounds
  const playBuzz = useSound("/sounds/buzz.mp3");
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

  return (
    <div className={`blindtest-player-page ${isMyTurn ? 'my-turn' : ''}`}>
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
      <header className="game-header blindtest">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress blindtest">{progressLabel}</div>
            <div className="game-header-title">{playlist?.name || 'Blind Test'}</div>
          </div>
          <div className="game-header-right">
            <div className="my-score-badge blindtest">
              <span className="my-score-value">{me?.score || 0}</span>
              <span className="my-score-label">pts</span>
            </div>
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ?"
              onExit={() => router.push('/home')}
            />
          </div>
        </div>
      </header>

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
        {/* Music Card */}
        <div className="music-card">
          {/* Points */}
          <div className="points-badge blindtest">
            <span className="points-value">{pointsEnJeu}</span>
            <span className="points-label">points</span>
          </div>

          {/* Music visualization area */}
          <div className="music-content">
            {revealed ? (
              <motion.div
                className="audio-visualizer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {/* Audio bars animation */}
                <div className="audio-bars">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="audio-bar"
                      animate={{
                        height: ['20%', '100%', '40%', '80%', '20%'],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                <span className="listening-label">Écoute bien...</span>

                {/* Snippet level indicator */}
                <div className="snippet-indicator">
                  <span className="snippet-level">{currentLevelConfig?.label}</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                className="waiting-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="music-icon-wrapper">
                  <Music size={48} />
                </div>
                <div className="waiting-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="waiting-label">En attente...</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard players={players} currentPlayerUid={me?.uid} />
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
        />
      </footer>

      <style jsx>{`
        .blindtest-player-page {
          min-height: 100dvh;
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

        /* Header */
        .game-header.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(6, 182, 212, 0.2);
          padding: 12px 16px;
          padding-top: calc(12px + env(safe-area-inset-top));
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

        .game-header-progress.blindtest {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: #34d399;
          text-shadow: 0 0 15px rgba(6, 182, 212, 0.6);
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

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .my-score-badge.blindtest {
          display: flex;
          align-items: baseline;
          gap: 4px;
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          border-radius: 20px;
          padding: 6px 12px;
        }

        .my-score-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: #34d399;
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

        .buzz-notification.blindtest {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 2px solid #10b981;
          border-radius: 16px;
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.4);
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
          color: #34d399;
        }

        .buzz-notification-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: var(--text-primary);
        }

        /* Main content */
        .game-content.blindtest {
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

        /* Music card */
        .music-card {
          width: 100%;
          max-width: 500px;
          height: 220px;
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: 20px;
          padding: 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
        }

        .points-badge.blindtest {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 5px;
          margin-bottom: 10px;
          flex-shrink: 0;
        }

        .points-badge.blindtest .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: #34d399;
          text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .music-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Audio visualizer */
        .audio-visualizer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .audio-bars {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 60px;
        }

        .audio-bar {
          width: 12px;
          background: linear-gradient(to top, #10b981, #34d399);
          border-radius: 4px;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        .listening-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .snippet-indicator {
          background: rgba(6, 182, 212, 0.2);
          border: 1px solid rgba(6, 182, 212, 0.4);
          border-radius: 20px;
          padding: 4px 16px;
        }

        .snippet-level {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          font-weight: 700;
          color: #34d399;
        }

        /* Waiting state */
        .waiting-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .music-icon-wrapper {
          color: rgba(6, 182, 212, 0.4);
        }

        .waiting-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .waiting-dots span {
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .waiting-dots span:nth-child(1) { animation-delay: 0s; }
        .waiting-dots span:nth-child(2) { animation-delay: 0.2s; }
        .waiting-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        .waiting-label {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* Buzzer footer */
        .buzzer-footer.blindtest {
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
