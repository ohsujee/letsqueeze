"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  set,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameEndTransition } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { Clock, RefreshCw, Check, X, ThumbsUp, ThumbsDown, Pause, Play, AlertTriangle } from "lucide-react";
import ExitButton from "@/lib/components/ExitButton";
import PlayerBanner from "@/components/game/PlayerBanner";
import EliminationNotifModal from "@/components/game/EliminationNotifModal";
import ChoosingPhase from "./_components/ChoosingPhase";
import PlayingPhase from "./_components/PlayingPhase";
import GuessingPhase from "./_components/GuessingPhase";
import {
  getRandomRulesForVoting,
  getRuleById,
  getCategoryDisplayName,
  getDifficultyInfo,
  TROUVE_COLORS
} from "@/data/laregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;
const ACCENT = '#00e5ff';
const MAX_REROLLS = 3;

export default function LaLoiPlayPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showEndTransition, setShowEndTransition] = useState(false);

  // (Vote + reveal states moved to ChoosingPhase component)

  // Rule card reveal (hold to reveal)
  const [isRuleRevealed, setIsRuleRevealed] = useState(false);

  // Elimination system
  const [eliminations, setEliminations] = useState({});
  const [flashUid, setFlashUid] = useState(null);
  const [reportMode, setReportMode] = useState(false);
  const [eliminationNotif, setEliminationNotif] = useState(null);
  const notifTimerRef = useRef(null);
  const prevEliminationsRef = useRef({});

  // (autoConfirmTriggeredRef moved to ChoosingPhase)
  const endTransitionTriggeredRef = useRef(false);

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_laregle' });

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  const isHost = myUid && meta?.hostUid === myUid;
  const myPlayer = players.find(p => p.uid === myUid);

  // Room guard
  const { isHostTemporarilyDisconnected, hostDisconnectedAt, closeRoom } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    isHost
  });

  // Keep screen awake during game

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    hostUid: meta?.hostUid
  });

  // Player cleanup
  const { markActive, leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Hold-to-reveal: global listeners to ensure rule re-hides even if mouseup/touchend fires outside
  useEffect(() => {
    const hide = () => setIsRuleRevealed(false);
    window.addEventListener('mouseup', hide);
    window.addEventListener('touchend', hide);
    window.addEventListener('touchcancel', hide);
    return () => {
      window.removeEventListener('mouseup', hide);
      window.removeEventListener('touchend', hide);
      window.removeEventListener('touchcancel', hide);
    };
  }, []);

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_laregle/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_laregle/${code}/state`), (snap) => {
      const s = snap.val();
      setState(s);

      // Redirect on phase changes
      if (s?.phase === 'lobby') {
        router.push(`/laregle/room/${code}`);
      } else if (s?.phase === 'ended' && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
    });

    const elimUnsub = onValue(ref(db, `rooms_laregle/${code}/eliminations`), (snap) => {
      const data = snap.val() || {};
      setEliminations(data);
    });

    return () => {
      metaUnsub();
      stateUnsub();
      elimUnsub();
    };
  }, [code, router]);

  // Detect new eliminations → flash + notification
  const eliminatedUids = useMemo(() => Object.keys(eliminations), [eliminations]);
  useEffect(() => {
    const prevUids = Object.keys(prevEliminationsRef.current);
    const newUids = eliminatedUids.filter(uid => !prevUids.includes(uid));
    if (newUids.length > 0) {
      const newUid = newUids[0];
      setFlashUid(newUid);
      setTimeout(() => setFlashUid(null), 500);
      const player = players.find(p => p.uid === newUid);
      if (player) {
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        setEliminationNotif(player);
        notifTimerRef.current = setTimeout(() => setEliminationNotif(null), 2500);
      }
    }
    prevEliminationsRef.current = eliminations;
  }, [eliminatedUids, players, eliminations]);

  const amIEliminated = myUid ? !!eliminations[myUid] : false;

  const handleEliminate = async (uid) => {
    if (!myUid || !code) return;
    if (eliminations[uid]) {
      // Undo elimination
      await set(ref(db, `rooms_laregle/${code}/eliminations/${uid}`), null);
    } else {
      await set(ref(db, `rooms_laregle/${code}/eliminations/${uid}`), { reportedBy: myUid, at: Date.now() });
    }
    setReportMode(false);
  };

  const handleContestElimination = async () => {
    if (!myUid || !code) return;
    await set(ref(db, `rooms_laregle/${code}/eliminations/${myUid}`), null);
  };

  // Timer countdown (with pause support)
  const timerEndAt = state?.timerEndAt;
  const timerPaused = state?.timerPaused || false;
  const timeLeftWhenPaused = state?.timeLeftWhenPaused || 0;
  const currentPhase = state?.phase;

  useEffect(() => {
    if (!timerEndAt) return;

    // If paused, just show the frozen time
    if (timerPaused) {
      setTimeLeft(timeLeftWhenPaused);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.floor((timerEndAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && isHost && currentPhase === 'playing') {
        // Time's up - go directly to ended
        update(ref(db, `rooms_laregle/${code}/state`), {
          phase: 'ended',
          foundByInvestigators: false
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerEndAt, timerPaused, timeLeftWhenPaused, currentPhase, isHost, code]);

  // Toggle timer pause (host only)
  const handleTogglePause = async () => {
    if (!isHost || state?.phase !== 'playing') return;

    if (state?.timerPaused) {
      // Resume: recalculate timerEndAt based on remaining time
      const newTimerEndAt = Date.now() + (state.timeLeftWhenPaused || 0) * 1000;
      await update(ref(db, `rooms_laregle/${code}/state`), {
        timerPaused: false,
        timerEndAt: newTimerEndAt,
        timeLeftWhenPaused: null
      });
    } else {
      // Pause: store current remaining time
      const remaining = Math.max(0, Math.floor((state.timerEndAt - Date.now()) / 1000));
      await update(ref(db, `rooms_laregle/${code}/state`), {
        timerPaused: true,
        timeLeftWhenPaused: remaining
      });
    }
  };


  // Vote on investigator's guess
  const handleGuessVote = async (isCorrect) => {
    if (!myUid) return;
    await set(ref(db, `rooms_laregle/${code}/state/guessVotes/${myUid}`), isCorrect);
  };

  // Process guess votes (host only)
  useEffect(() => {
    if (!isHost || state?.phase !== 'guessing' || !state?.guessVotes) return;

    const nonInvestigators = players.filter(p => p.role !== 'investigator');
    const voteCount = Object.keys(state.guessVotes).length;

    if (voteCount >= nonInvestigators.length) {
      // All players voted
      const correctVotes = Object.values(state.guessVotes).filter(v => v === true).length;
      const isCorrect = correctVotes > nonInvestigators.length / 2;

      if (isCorrect) {
        // Investigators found it! Go directly to ended
        const points = 10 - (state.guessAttempts - 1) * 3; // 10, 7, 4 points
        const updates = {};

        // Award points to investigators
        state.investigatorUids.forEach(uid => {
          const player = players.find(p => p.uid === uid);
          if (player) {
            updates[`rooms_laregle/${code}/players/${uid}/score`] = (player.score || 0) + Math.max(points, 1);
          }
        });

        updates[`rooms_laregle/${code}/state/phase`] = 'ended';
        updates[`rooms_laregle/${code}/state/foundByInvestigators`] = true;
        updates[`rooms_laregle/${code}/state/guessVotes`] = null;

        update(ref(db), updates);
      } else {
        // Wrong guess
        const newAttempts = state.guessAttempts;
        if (newAttempts >= 3) {
          // Out of attempts - players win, go directly to ended
          const updates = {};
          players.filter(p => p.role !== 'investigator').forEach(player => {
            updates[`rooms_laregle/${code}/players/${player.uid}/score`] = (player.score || 0) + 5;
          });
          updates[`rooms_laregle/${code}/state/phase`] = 'ended';
          updates[`rooms_laregle/${code}/state/foundByInvestigators`] = false;
          updates[`rooms_laregle/${code}/state/guessVotes`] = null;
          update(ref(db), updates);
        } else {
          // Continue playing
          update(ref(db, `rooms_laregle/${code}/state`), {
            phase: 'playing',
            guessVotes: null
          });
        }
      }
    }
  }, [isHost, state?.phase, state?.guessVotes, players]);


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Non-investigator players (for team display)
  const civilPlayers = useMemo(() => {
    return players.filter(p => p.role !== 'investigator');
  }, [players]);

  // Loading
  if (!meta || !state) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#04060f', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ width: '40px', height: '40px', border: `3px solid rgba(0,229,255,0.2)`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'lrSpin 1s linear infinite' }} />
          <p style={{ margin: 0, fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>Chargement...</p>
        </div>
        <style>{`@keyframes lrSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#04060f', position: 'relative' }}>

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}12 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 90%, ${ACCENT}07 0%, transparent 45%)`,
      }} />

      {/* End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="laregle"
            onComplete={() => router.replace(`/laregle/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(4,6,15,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${ACCENT}22`,
        flexShrink: 0,
      }}>
        {/* Left: exit + role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ExitButton
            variant="header"
            confirmMessage="Voulez-vous vraiment quitter la partie ?"
            onExit={async () => {
              if (isHost) await closeRoom();
              await leaveRoom();
              router.push('/home');
            }}
          />
          <span style={{
            fontFamily: "var(--font-title, 'Bungee'), sans-serif",
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            color: '#eef2ff',
            textShadow: '0 0 14px rgba(192,132,252,0.8)',
          }}>
            🎭 Joueur
          </span>
        </div>

        {/* Right: timer (playing & guessing phases) */}
        <AnimatePresence>
          {(state.phase === 'playing' || state.phase === 'guessing') && (
            isHost ? (
              /* Host: interactive timer with pause/play */
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleTogglePause}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px',
                  background: timerPaused
                    ? 'rgba(251,191,36,0.12)'
                    : timeLeft <= 30
                      ? 'rgba(239,68,68,0.12)'
                      : `${ACCENT}12`,
                  border: `1px solid ${timerPaused ? 'rgba(251,191,36,0.35)' : timeLeft <= 30 ? 'rgba(239,68,68,0.35)' : ACCENT + '35'}`,
                  borderRadius: '10px',
                  fontFamily: "var(--font-title, 'Bungee'), sans-serif",
                  fontSize: '1.1rem',
                  color: timerPaused ? '#fbbf24' : timeLeft <= 30 ? '#f87171' : ACCENT,
                  cursor: 'pointer',
                }}
              >
                <Clock size={16} />
                <span>{formatTime(timeLeft)}</span>
                <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                  {timerPaused ? <Play size={12} /> : <Pause size={12} />}
                </span>
              </motion.button>
            ) : (
              /* Player: read-only timer */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px',
                  background: timerPaused
                    ? 'rgba(251,191,36,0.08)'
                    : timeLeft <= 30
                      ? 'rgba(239,68,68,0.1)'
                      : `${ACCENT}0a`,
                  border: `1px solid ${timerPaused ? 'rgba(251,191,36,0.2)' : timeLeft <= 30 ? 'rgba(239,68,68,0.25)' : ACCENT + '25'}`,
                  borderRadius: '10px',
                  fontFamily: "var(--font-title, 'Bungee'), sans-serif",
                  fontSize: '1.1rem',
                  color: timerPaused ? 'rgba(251,191,36,0.6)' : timeLeft <= 30 ? '#f87171' : `${ACCENT}cc`,
                  opacity: timerPaused ? 0.6 : 1,
                }}
              >
                <Clock size={16} />
                <span>{formatTime(timeLeft)}</span>
                {timerPaused && (
                  <span style={{ fontSize: '0.6rem', color: 'rgba(251,191,36,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontWeight: 700, letterSpacing: '0.06em' }}>
                    PAUSE
                  </span>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '16px 16px 16px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* PHASE: CHOOSING */}
          {state.phase === 'choosing' && (
            <ChoosingPhase state={state} meta={meta} code={code} myUid={myUid} isHost={isHost} players={players} />
          )}

          {/* PHASE: PLAYING */}
          {state.phase === 'playing' && state.currentRule && (
            <PlayingPhase
              state={state} code={code} myUid={myUid} players={players} civilPlayers={civilPlayers}
              isRuleRevealed={isRuleRevealed} setIsRuleRevealed={setIsRuleRevealed}
              eliminations={eliminations} flashUid={flashUid}
              reportMode={reportMode} setReportMode={setReportMode}
              amIEliminated={amIEliminated}
              handleEliminate={handleEliminate} handleContestElimination={handleContestElimination}
            />
          )}

          {/* PHASE: GUESSING */}
          {state.phase === 'guessing' && (
            <GuessingPhase state={state} myUid={myUid} onGuessVote={handleGuessVote} />
          )}

        </div>
      </main>

      {/* Fixed bottom button — report elimination (playing/guessing, not eliminated, not in report mode) */}
      <AnimatePresence>
        {(state?.phase === 'playing' || state?.phase === 'guessing') && !amIEliminated && !reportMode && myPlayer?.role !== 'investigator' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 50,
              padding: '12px 16px 20px',
              background: 'linear-gradient(to top, rgba(4,6,15,0.95) 60%, transparent)',
              pointerEvents: 'none',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setReportMode(true)}
              style={{
                pointerEvents: 'auto',
                width: '100%',
                padding: '15px 20px',
                border: 'none',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <AlertTriangle size={18} />
              Un joueur n'a pas suivi la règle
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elimination notification modal */}
      <EliminationNotifModal player={eliminationNotif} />

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_laregle"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={false}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      {/* Animations */}
      <style>{`
        @keyframes lrSpin { to { transform: rotate(360deg); } }
        @keyframes lrPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.75); } }
        @keyframes lrSparkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.2); } }
        @keyframes lrWinnerGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(0,229,255,0.35), 0 0 80px rgba(0,229,255,0.15), 0 20px 60px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 55px rgba(0,229,255,0.45), 0 0 100px rgba(0,229,255,0.25), 0 22px 65px rgba(0,0,0,0.45); }
        }
      `}</style>
    </div>
  );
}
