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

  // Vote system states
  const [preVote, setPreVote] = useState(null); // Local pre-vote before validation
  const [hasValidated, setHasValidated] = useState(false);

  // Reveal animation states
  const [revealPhase, setRevealPhase] = useState(null); // 'tiebreaker' | 'revealing' | 'winner' | null
  const [tieFlashIndex, setTieFlashIndex] = useState(0);
  const [winningRuleId, setWinningRuleId] = useState(null);

  // Rule card reveal (hold to reveal)
  const [isRuleRevealed, setIsRuleRevealed] = useState(false);

  // Elimination system
  const [eliminations, setEliminations] = useState({});
  const [flashUid, setFlashUid] = useState(null);
  const [reportMode, setReportMode] = useState(false);
  const [eliminationNotif, setEliminationNotif] = useState(null);
  const notifTimerRef = useRef(null);
  const prevEliminationsRef = useRef({});

  // Ref to prevent multiple auto-confirm triggers
  const autoConfirmTriggeredRef = useRef(false);
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

  // Pre-vote (local selection before validation)
  const handlePreVote = (ruleId) => {
    if (hasValidated || revealPhase) return;
    setPreVote(ruleId);
  };

  // Validate vote (send to Firebase)
  const handleValidateVote = async () => {
    if (!myUid || !preVote || hasValidated || revealPhase) return;
    await set(ref(db, `rooms_laregle/${code}/state/votes/${myUid}`), preVote);
    setHasValidated(true);
  };

  // Re-roll rules (host only)
  const handleReroll = async () => {
    if (!isHost || state.rerollsUsed >= MAX_REROLLS || revealPhase) return;

    const options = getRandomRulesForVoting({
      onlineOnly: meta?.mode === 'a_distance',
      excludeIds: [...(state.playedRuleIds || []), ...(state.ruleOptions?.map(r => r.id) || [])]
    });

    await update(ref(db, `rooms_laregle/${code}/state`), {
      ruleOptions: options.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty })),
      votes: {},
      rerollsUsed: (state.rerollsUsed || 0) + 1
    });

    // Reset local states
    setPreVote(null);
    setHasValidated(false);
  };

  // Confirm rule selection with animation (host only)
  const handleConfirmRule = async () => {
    if (!isHost || !state.ruleOptions || revealPhase) return;

    // Count votes
    const votes = state.votes || {};
    const voteCounts = {};
    state.ruleOptions.forEach(r => voteCounts[r.id] = 0);
    Object.values(votes).forEach(ruleId => {
      if (voteCounts[ruleId] !== undefined) voteCounts[ruleId]++;
    });

    // Find max vote count
    const maxVotes = Math.max(...Object.values(voteCounts), 0);

    // Find all rules with max votes (ties)
    const tiedRules = state.ruleOptions.filter(r => voteCounts[r.id] === maxVotes);

    // Write reveal state to Firebase so all players see animation
    if (tiedRules.length > 1) {
      // Multiple winners - tiebreaker animation
      await update(ref(db, `rooms_laregle/${code}/state`), {
        revealPhase: 'tiebreaker',
        tiedRuleIds: tiedRules.map(r => r.id)
      });
    } else {
      // Single winner - direct reveal
      const winnerId = tiedRules[0]?.id || state.ruleOptions[0].id;
      await update(ref(db, `rooms_laregle/${code}/state`), {
        revealPhase: 'revealing',
        winningRuleId: winnerId
      });
    }
  };

  // Handle reveal animation phases (all clients)
  useEffect(() => {
    if (!state?.revealPhase) {
      setRevealPhase(null);
      setWinningRuleId(null);
      return;
    }

    setRevealPhase(state.revealPhase);

    if (state.revealPhase === 'tiebreaker' && state.tiedRuleIds) {
      // Tiebreaker animation - flash between tied rules
      let flashCount = 0;
      const maxFlashes = 12;
      const interval = setInterval(() => {
        setTieFlashIndex(prev => (prev + 1) % state.tiedRuleIds.length);
        flashCount++;

        if (flashCount >= maxFlashes && isHost) {
          clearInterval(interval);
          // Host picks random winner
          const randomWinner = state.tiedRuleIds[Math.floor(Math.random() * state.tiedRuleIds.length)];
          update(ref(db, `rooms_laregle/${code}/state`), {
            revealPhase: 'revealing',
            winningRuleId: randomWinner
          });
        }
      }, 200);

      return () => clearInterval(interval);
    }

    if (state.revealPhase === 'revealing' && state.winningRuleId) {
      setWinningRuleId(state.winningRuleId);
      // After 2s of glow animation, show winner phase
      const timer = setTimeout(() => {
        if (isHost) {
          update(ref(db, `rooms_laregle/${code}/state`), {
            revealPhase: 'winner'
          });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (state.revealPhase === 'winner' && state.winningRuleId) {
      setWinningRuleId(state.winningRuleId);
      // After showing winner, start playing phase
      const timer = setTimeout(() => {
        if (isHost) {
          const selectedRule = state.ruleOptions.find(r => r.id === state.winningRuleId);
          const timerEndAt = Date.now() + (meta?.timerMinutes || 5) * 60 * 1000;

          update(ref(db, `rooms_laregle/${code}/state`), {
            phase: 'playing',
            currentRule: selectedRule,
            timerEndAt,
            playedRuleIds: [...(state.playedRuleIds || []), state.winningRuleId],
            revealPhase: null,
            winningRuleId: null,
            tiedRuleIds: null
          });
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state?.revealPhase, state?.tiedRuleIds, state?.winningRuleId, isHost, meta?.timerMinutes, code, state?.ruleOptions, state?.playedRuleIds]);

  // Reset vote states when ruleOptions change
  useEffect(() => {
    setPreVote(null);
    setHasValidated(false);
    autoConfirmTriggeredRef.current = false;
  }, [state?.ruleOptions]);

  // Auto-confirm when all required voters have voted (host only - Firebase rules)
  useEffect(() => {
    // Reset trigger ref when phase changes or options change
    if (state?.phase !== 'choosing' || !state?.ruleOptions) {
      autoConfirmTriggeredRef.current = false;
      return;
    }

    // Only host can write to state (Firebase rules)
    if (!isHost) return;

    // Don't trigger if reveal already started or already triggered
    if (state?.revealPhase || autoConfirmTriggeredRef.current) return;

    // Need required data
    if (!players.length || !meta?.hostUid) return;

    // Non-investigators are the voters
    const nonInvestigators = players.filter(p => p.role !== 'investigator');

    const votes = state?.votes || {};
    const voteCount = Object.keys(votes).length;

    // Check if all non-investigators have voted
    if (nonInvestigators.length > 0 && voteCount >= nonInvestigators.length) {
      // Mark as triggered to prevent re-runs
      autoConfirmTriggeredRef.current = true;

      // Small delay to let the UI update before starting animation
      const timer = setTimeout(async () => {
        // Double-check we're still in choosing phase and no reveal started
        if (state?.phase !== 'choosing' || state?.revealPhase) return;

        // Count votes for each rule
        const ruleVoteCounts = {};
        state.ruleOptions.forEach(r => ruleVoteCounts[r.id] = 0);
        Object.values(votes).forEach(ruleId => {
          if (ruleVoteCounts[ruleId] !== undefined) ruleVoteCounts[ruleId]++;
        });

        // Find max vote count
        const maxVotes = Math.max(...Object.values(ruleVoteCounts), 0);

        // Find all rules with max votes (ties)
        const tiedRules = state.ruleOptions.filter(r => ruleVoteCounts[r.id] === maxVotes);

        try {
          if (tiedRules.length > 1) {
            // Multiple winners - tiebreaker animation
            await update(ref(db, `rooms_laregle/${code}/state`), {
              revealPhase: 'tiebreaker',
              tiedRuleIds: tiedRules.map(r => r.id)
            });
          } else {
            // Single winner - direct reveal
            const winnerId = tiedRules[0]?.id || state.ruleOptions[0].id;
            await update(ref(db, `rooms_laregle/${code}/state`), {
              revealPhase: 'revealing',
              winningRuleId: winnerId
            });
          }
        } catch (error) {
          console.error('Auto-confirm error:', error);
          autoConfirmTriggeredRef.current = false; // Allow retry on error
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isHost, state?.phase, state?.votes, state?.ruleOptions, state?.revealPhase, players, meta?.hostUid, code]);

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

  // Computed values
  const voteCounts = useMemo(() => {
    if (!state?.votes || !state?.ruleOptions) return {};
    const counts = {};
    state.ruleOptions.forEach(r => counts[r.id] = 0);
    Object.values(state.votes).forEach(ruleId => {
      if (counts[ruleId] !== undefined) counts[ruleId]++;
    });
    return counts;
  }, [state?.votes, state?.ruleOptions]);

  const myValidatedVote = state?.votes?.[myUid]; // Vote already in Firebase
  const totalVotes = Object.keys(state?.votes || {}).length;

  // Required voters are all non-investigators (they're on this page)
  const requiredVoters = useMemo(() => {
    return players.filter(p => p.role !== 'investigator');
  }, [players]);

  const playersCount = requiredVoters.length;
  const allVoted = totalVotes >= playersCount;

  // Determine which rule is currently "highlighted" during animations
  const getCardState = (ruleId) => {
    if (revealPhase === 'winner') {
      return ruleId === winningRuleId ? 'winner' : 'hidden';
    }
    if (revealPhase === 'revealing') {
      return ruleId === winningRuleId ? 'glowing' : 'fading';
    }
    if (revealPhase === 'tiebreaker') {
      const tiedIds = state?.tiedRuleIds || [];
      if (!tiedIds.includes(ruleId)) return 'fading';
      return tiedIds[tieFlashIndex] === ruleId ? 'flash' : 'dimmed';
    }
    // Normal state
    if (preVote === ruleId) return 'selected';
    return 'normal';
  };

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Normal voting UI */}
              <AnimatePresence>
                {revealPhase !== 'winner' && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Instruction strip */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '9px 14px',
                      background: `${ACCENT}07`,
                      borderLeft: `2px solid ${ACCENT}45`,
                      borderRadius: '10px',
                      marginBottom: '14px',
                    }}>
                      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🗳️</span>
                      <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                        {revealPhase ? 'Sélection en cours...' : "Choisis une règle \u2014 l'enquêteur devra la deviner !"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Winner display (centered) */}
              <AnimatePresence>
                {revealPhase === 'winner' && winningRuleId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25, mass: 1, delay: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '1.1rem', fontWeight: 700,
                      color: ACCENT,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      <span style={{ fontSize: '1.5rem', animation: 'lrSparkle 1s ease-in-out infinite' }}>✨</span>
                      <span>Règle choisie</span>
                      <span style={{ fontSize: '1.5rem', animation: 'lrSparkle 1s ease-in-out infinite' }}>✨</span>
                    </div>
                    {(() => {
                      const winnerRule = state.ruleOptions?.find(r => r.id === winningRuleId);
                      const diffInfo = winnerRule ? getDifficultyInfo(winnerRule.difficulty) : null;
                      return winnerRule ? (
                        <div style={{
                          width: '100%', padding: '20px',
                          background: `linear-gradient(135deg, ${ACCENT}20, ${ACCENT}10)`,
                          border: `2px solid ${ACCENT}`,
                          borderRadius: '16px',
                          boxShadow: `0 0 50px ${ACCENT}40, 0 0 100px ${ACCENT}20, 0 20px 60px rgba(0,0,0,0.4), inset 0 0 30px ${ACCENT}10`,
                          animation: 'lrWinnerGlow 3s ease-in-out infinite',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{
                              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                              fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                              color: ACCENT,
                              padding: '3px 10px', background: `${ACCENT}18`, borderRadius: '6px',
                            }}>
                              {getCategoryDisplayName(winnerRule.category)}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                              {'★'.repeat(Math.min(diffInfo?.stars || 1, 3))}{'☆'.repeat(Math.max(0, 3 - (diffInfo?.stars || 1)))}
                            </span>
                          </div>
                          <p style={{
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.5, margin: 0, textAlign: 'center',
                          }}>
                            {winnerRule.text}
                          </p>
                        </div>
                      ) : null;
                    })()}
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>
                      Mémorisez cette règle !
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rules list (hidden in winner mode) */}
              <AnimatePresence mode="wait">
                {revealPhase !== 'winner' && (
                  <motion.div
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    {state.ruleOptions?.map((rule, idx) => {
                      const diffInfo = getDifficultyInfo(rule.difficulty);
                      const cardState = getCardState(rule.id);
                      const isSelected = preVote === rule.id;
                      const voteCount = voteCounts[rule.id] || 0;

                      return (
                        <motion.button
                          key={rule.id}
                          onClick={() => handlePreVote(rule.id)}
                          disabled={hasValidated || !!revealPhase}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: cardState === 'fading' || cardState === 'dimmed' ? 0.3 : cardState === 'hidden' ? 0 : 1,
                            y: 0,
                            scale: cardState === 'glowing' ? 1.02 : cardState === 'flash' ? 1.03 : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                          whileTap={!hasValidated && !revealPhase ? { scale: 0.98 } : {}}
                          style={{
                            width: '100%',
                            padding: '16px 18px',
                            textAlign: 'left',
                            background: isSelected ? `${ACCENT}12` : 'rgba(8,14,32,0.92)',
                            border: `1.5px solid ${isSelected ? ACCENT + '50' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '14px',
                            cursor: hasValidated || revealPhase ? 'default' : 'pointer',
                            opacity: hasValidated && !isSelected && !myValidatedVote ? 0.4 : undefined,
                            transition: 'all 0.25s ease',
                            boxShadow: isSelected
                              ? `0 0 20px ${ACCENT}15, inset 0 1px 0 rgba(255,255,255,0.04)`
                              : cardState === 'glowing'
                                ? `0 0 40px ${ACCENT}50, 0 0 80px ${ACCENT}30, 0 8px 32px ${ACCENT}40, inset 0 0 20px ${ACCENT}10`
                                : cardState === 'flash'
                                  ? `0 0 30px ${ACCENT}60, 0 0 60px ${ACCENT}30`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            {/* Radio selector */}
                            <div style={{
                              width: '20px', height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                              background: isSelected ? ACCENT : 'transparent',
                              flexShrink: 0,
                              marginTop: '2px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s ease',
                            }}>
                              {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#04060f' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#fff', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontWeight: 600, lineHeight: 1.4 }}>
                                {rule.text}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    fontSize: '0.68rem', fontWeight: 700,
                                    color: isSelected ? ACCENT : 'rgba(255,255,255,0.3)',
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                                  }}>
                                    {getCategoryDisplayName(rule.category)}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                                    {'★'.repeat(Math.min(diffInfo.stars, 3))}{'☆'.repeat(Math.max(0, 3 - diffInfo.stars))}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {hasValidated && myValidatedVote === rule.id && (
                                    <span style={{
                                      display: 'flex', alignItems: 'center', gap: '3px',
                                      fontSize: '0.65rem', fontWeight: 600, color: '#34d399',
                                      padding: '2px 8px', background: 'rgba(34,211,153,0.15)', border: '1px solid rgba(34,211,153,0.3)', borderRadius: '5px',
                                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                                    }}>
                                      <Check size={12} /> Validé
                                    </span>
                                  )}
                                  <span style={{
                                    fontFamily: "var(--font-mono, 'Roboto Mono'), monospace",
                                    fontSize: '0.75rem', fontWeight: 700, color: ACCENT,
                                    minWidth: '24px', height: '24px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `${ACCENT}20`, border: `1px solid ${ACCENT}30`, borderRadius: '6px',
                                  }}>
                                    {voteCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vote validate button */}
              <AnimatePresence mode="wait">
                {!revealPhase && (
                  <motion.div
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {!hasValidated ? (
                      <motion.button
                        key="validate"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        whileHover={{ scale: preVote ? 1.02 : 1 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={!preVote}
                        onClick={handleValidateVote}
                        style={{
                          width: '100%',
                          padding: '16px',
                          border: 'none',
                          borderRadius: '14px',
                          background: preVote
                            ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                            : 'rgba(255,255,255,0.06)',
                          color: preVote ? '#04060f' : 'rgba(255,255,255,0.3)',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          cursor: preVote ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s ease',
                          boxShadow: preVote ? `0 4px 20px ${ACCENT}40` : 'none',
                        }}
                      >
                        {preVote ? 'Valider mon vote' : 'Sélectionne une règle'}
                      </motion.button>
                    ) : (
                      <motion.div
                        key="confirmed"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          padding: '12px 16px',
                          background: 'rgba(34,211,153,0.15)',
                          border: '1px solid rgba(34,211,153,0.3)',
                          borderRadius: '14px',
                          color: '#34d399',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          fontSize: '0.9rem', fontWeight: 600,
                        }}
                      >
                        <Check size={18} />
                        <span>Vote enregistré !</span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vote status & host actions */}
              <AnimatePresence>
                {!revealPhase && (
                  <motion.div
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    {/* Waiting status */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px',
                      background: 'rgba(8,14,32,0.92)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: ACCENT,
                            animation: 'lrPulse 1.2s ease-in-out infinite',
                            animationDelay: `${i * 0.22}s`,
                          }} />
                        ))}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                        En attente —{' '}
                        <span style={{ color: ACCENT, fontWeight: 700 }}>{totalVotes}/{playersCount}</span>
                        {' '}ont choisi
                      </span>
                    </div>

                    {isHost && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <motion.button
                          onClick={handleReroll}
                          disabled={state.rerollsUsed >= MAX_REROLLS}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            flex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(8px)',
                            color: 'rgba(255,255,255,0.9)',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            fontSize: '0.75rem', fontWeight: 600,
                            cursor: state.rerollsUsed >= MAX_REROLLS ? 'not-allowed' : 'pointer',
                            opacity: state.rerollsUsed >= MAX_REROLLS ? 0.4 : 1,
                          }}
                        >
                          <RefreshCw size={16} />
                          Re-roll ({MAX_REROLLS - (state.rerollsUsed || 0)} restants)
                        </motion.button>

                        <motion.button
                          onClick={handleConfirmRule}
                          disabled={totalVotes === 0}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            flex: 1.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                            color: '#04060f',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            fontSize: '0.8rem', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            cursor: totalVotes === 0 ? 'not-allowed' : 'pointer',
                            opacity: totalVotes === 0 ? 0.4 : 1,
                            boxShadow: totalVotes > 0 ? `0 3px 12px ${ACCENT}40, 0 0 15px ${ACCENT}20` : 'none',
                          }}
                        >
                          <Check size={18} />
                          Confirmer
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* PHASE: PLAYING */}
          {state.phase === 'playing' && state.currentRule && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Rule card — hold-to-reveal */}
              <div
                style={{
                  padding: '20px',
                  background: `${ACCENT}0a`,
                  border: `2px solid ${isRuleRevealed ? ACCENT + '70' : ACCENT + '35'}`,
                  borderRadius: '16px',
                  boxShadow: isRuleRevealed ? `0 0 40px ${ACCENT}25` : `0 0 30px ${ACCENT}15`,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  textAlign: 'center',
                  cursor: 'pointer',
                  touchAction: 'none',
                }}
                onMouseDown={() => setIsRuleRevealed(true)}
                onMouseUp={() => setIsRuleRevealed(false)}
                onMouseLeave={() => setIsRuleRevealed(false)}
                onTouchStart={() => setIsRuleRevealed(true)}
                onTouchEnd={() => setIsRuleRevealed(false)}
                onTouchCancel={() => setIsRuleRevealed(false)}
                onContextMenu={e => e.preventDefault()}
              >
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px', pointerEvents: 'none' }}>
                  🤫 Ta règle secrète
                </p>

                {/* Content + overlay stacked */}
                <div style={{ position: 'relative' }}>
                  {/* Content — blurred when hidden */}
                  <div style={{
                    filter: isRuleRevealed ? 'none' : 'blur(12px)',
                    transition: 'filter 0.15s ease',
                    pointerEvents: 'none',
                  }}>
                    <p style={{ fontSize: '1.05rem', color: '#fff', margin: '0 0 12px', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
                      {state.currentRule.text}
                    </p>
                    {state.currentRule.category && (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: ACCENT, background: `${ACCENT}15`, padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                          {getCategoryDisplayName(state.currentRule.category)}
                        </span>
                        {state.currentRule.difficulty && (
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: '3px 0' }}>
                            {'★'.repeat(getDifficultyInfo(state.currentRule.difficulty).stars)}{'☆'.repeat(3 - getDifficultyInfo(state.currentRule.difficulty).stars)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Overlay hint — centered on blurred content */}
                  <AnimatePresence>
                    {!isRuleRevealed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          pointerEvents: 'none',
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>👆</span>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 600,
                          color: 'rgba(238,242,255,0.85)',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                        }}>
                          Maintiens pour voir
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Instruction strip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 14px',
                background: `${ACCENT}07`,
                borderLeft: `2px solid ${ACCENT}45`,
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🤫</span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                  Réponds en <strong style={{ color: '#eef2ff' }}>respectant la règle</strong> sans la révéler !
                </span>
              </div>

              {/* Attempts indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                padding: '8px 16px',
                background: `${ACCENT}08`,
                border: `1px solid ${ACCENT}18`,
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                  Essais restants
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '11px', height: '11px',
                      borderRadius: '50%',
                      background: i < (state.guessAttempts || 0) ? 'rgba(239,68,68,0.35)' : ACCENT,
                      border: i < (state.guessAttempts || 0) ? '1px solid rgba(239,68,68,0.5)' : 'none',
                      boxShadow: i < (state.guessAttempts || 0) ? 'none' : `0 0 8px ${ACCENT}70`,
                      transition: 'all 0.3s ease',
                    }} />
                  ))}
                </div>
              </div>

              {/* Eliminated banner — if I'm eliminated */}
              <AnimatePresence>
                {amIEliminated && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      padding: '16px 20px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1.5px solid rgba(239,68,68,0.3)',
                      borderRadius: '14px',
                      textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Tu as été éliminé
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                      Un coéquipier pense que tu n'as pas suivi la règle.
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleContestElimination}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(34,197,94,0.12)',
                        border: '1px solid rgba(34,197,94,0.35)',
                        borderRadius: '10px',
                        color: '#4ade80',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}
                    >
                      Voté par erreur
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Report mode header */}
              <AnimatePresence>
                {reportMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: '12px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600, fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      Qui n'a pas suivi la règle ?
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setReportMode(false)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(238,242,255,0.5)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}
                    >
                      Annuler
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Team card — with elimination system */}
              <div style={{
                background: 'rgba(8,14,32,0.92)',
                border: `1px solid ${reportMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                transition: 'border-color 0.2s ease',
              }}>
                <div style={{
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: 'rgba(238,242,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>
                    Ton équipe
                  </span>
                </div>
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...civilPlayers]
                    .sort((a, b) => (eliminations[a.uid] ? 1 : 0) - (eliminations[b.uid] ? 1 : 0))
                    .map(player => {
                    const isEliminated = !!eliminations[player.uid];
                    const isMe = player.uid === myUid;
                    return (
                      <motion.div
                        key={player.uid}
                        layout
                        transition={{ layout: { type: 'spring', stiffness: 280, damping: 26 } }}
                        style={{ display: 'grid', cursor: (reportMode && !isMe && !isEliminated) || (isEliminated && !isMe) ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (reportMode && !isMe && !isEliminated) handleEliminate(player.uid);
                          else if (isEliminated && !isMe) handleEliminate(player.uid);
                        }}
                      >
                        {/* Layer 1 — PlayerBanner */}
                        <div style={{ gridArea: '1/1', opacity: isEliminated ? 0.38 : 1, transition: 'opacity 0.3s ease' }}>
                          <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                        </div>

                        {/* Layer 2 — Red flash on elimination */}
                        <AnimatePresence>
                          {flashUid === player.uid && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 0.45, 0] }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.45, ease: 'easeOut' }}
                              style={{
                                gridArea: '1/1', zIndex: 3, pointerEvents: 'none',
                                paddingTop: '10px',
                              }}
                            >
                              <div style={{
                                height: '100%',
                                borderRadius: '14px',
                                background: 'rgba(239,68,68,0.35)',
                                boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                              }} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Layer 3 — ÉLIMINÉ badge */}
                        <AnimatePresence>
                          {isEliminated && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, delay: 0.15 }}
                              style={{
                                gridArea: '1/1', zIndex: 1, pointerEvents: 'none',
                                paddingTop: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 700,
                                color: '#f87171',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                padding: '3px 10px', borderRadius: '6px',
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                              }}>
                                Éliminé
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Layer 4 — Undo icon for eliminated */}
                        {isEliminated && !isMe && (
                          <div style={{
                            gridArea: '1/1', zIndex: 2,
                            paddingTop: '10px', paddingRight: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          }}>
                            <div style={{
                              width: '24px', height: '24px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(34,197,94,0.1)',
                              border: '1px solid rgba(34,197,94,0.25)',
                              borderRadius: '8px',
                              color: '#4ade80',
                              fontSize: '0.7rem',
                            }}>
                              ↩
                            </div>
                          </div>
                        )}

                        {/* Layer 5 — Report mode highlight */}
                        {reportMode && !isEliminated && !isMe && (
                          <div style={{
                            gridArea: '1/1', zIndex: 2,
                            paddingTop: '10px', paddingRight: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          }}>
                            <div style={{
                              width: '24px', height: '24px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: '8px',
                              color: '#f87171',
                              fontSize: '0.7rem',
                            }}>
                              ✕
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Waiting for investigators */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px',
                background: 'rgba(8,14,32,0.6)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%', background: ACCENT,
                    animation: 'lrPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.22}s`,
                  }} />
                ))}
                <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.35)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", marginLeft: '4px' }}>
                  Les enquêteurs posent des questions...
                </span>
              </div>
            </div>
          )}

          {/* PHASE: GUESSING */}
          {state.phase === 'guessing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Guess notification card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                  padding: '20px',
                  background: 'rgba(8,14,32,0.92)',
                  border: `1px solid ${ACCENT}20`,
                  borderRadius: '16px',
                  boxShadow: `0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
                  textAlign: 'center',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🎤</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: '0 0 2px', fontFamily: "var(--font-title, 'Bungee'), sans-serif", fontSize: '0.95rem', color: '#eef2ff', letterSpacing: '0.04em' }}>
                      L'enquêteur propose
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.78rem', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      Est-ce que c'est la bonne règle ?
                    </p>
                  </div>
                </div>

                {/* Rule reminder */}
                <div style={{
                  padding: '12px 14px',
                  background: `${ACCENT}0a`,
                  border: `1px solid ${ACCENT}20`,
                  borderRadius: '12px',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                    La vraie règle
                  </p>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.5 }}>
                    {state.currentRule?.text}
                  </p>
                </div>

                {/* Vote buttons or confirmation */}
                {!state.guessVotes?.[myUid] ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleGuessVote(true)}
                      style={{
                        flex: 1, padding: '16px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1.5px solid rgba(34,197,94,0.3)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                        cursor: 'pointer',
                      }}
                    >
                      <ThumbsUp size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>Oui !</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleGuessVote(false)}
                      style={{
                        flex: 1, padding: '16px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1.5px solid rgba(239,68,68,0.3)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                        cursor: 'pointer',
                      }}
                    >
                      <ThumbsDown size={20} style={{ color: '#f87171', flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>Non !</span>
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                    style={{
                      borderRadius: '18px', overflow: 'hidden',
                      background: state.guessVotes[myUid] === true ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                      border: `1px solid ${state.guessVotes[myUid] === true ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      boxShadow: state.guessVotes[myUid] === true
                        ? '0 0 32px rgba(34,197,94,0.1), inset 0 1px 0 rgba(255,255,255,0.04)'
                        : '0 0 32px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ padding: '24px 20px 20px', textAlign: 'center' }}>
                      <motion.div
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 16 }}
                        style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute', inset: -12, borderRadius: '50%',
                            background: state.guessVotes[myUid] === true
                              ? 'radial-gradient(circle, rgba(34,197,94,0.55) 0%, transparent 70%)'
                              : 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)',
                            filter: 'blur(8px)',
                          }}
                        />
                        <span style={{ fontSize: '2.6rem', lineHeight: 1, display: 'block', position: 'relative' }}>
                          {state.guessVotes[myUid] === true ? '✅' : '❌'}
                        </span>
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                        style={{
                          fontFamily: "var(--font-title, 'Bungee'), sans-serif",
                          fontSize: '1.5rem', letterSpacing: '0.05em', margin: '0 0 6px',
                          color: state.guessVotes[myUid] === true ? '#4ade80' : '#f87171',
                          textShadow: state.guessVotes[myUid] === true
                            ? '0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.25)'
                            : '0 0 20px rgba(239,68,68,0.55), 0 0 40px rgba(239,68,68,0.2)',
                        }}
                      >
                        {state.guessVotes[myUid] === true ? 'OUI !' : 'NON !'}
                      </motion.p>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.28 }}
                        style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(238,242,255,0.45)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}
                      >
                        {state.guessVotes[myUid] === true ? "Tu penses que c'est la bonne règle" : "Tu penses que ce n'est pas la bonne règle"}
                      </motion.p>
                    </div>
                    <div style={{ height: '1px', background: state.guessVotes[myUid] === true ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', margin: '0 16px' }} />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', gap: '10px' }}
                    >
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: ACCENT, animation: 'lrPulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.22}s` }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                        En attente des autres joueurs...
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </div>
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
      <AnimatePresence>
        {eliminationNotif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'rgba(8, 8, 12, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '320px',
                background: 'linear-gradient(180deg, rgba(45, 20, 20, 0.98) 0%, rgba(28, 12, 12, 0.98) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '24px',
                padding: '32px 24px 24px',
                textAlign: 'center',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: '72px', height: '72px',
                  margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                  border: '2px solid rgba(239,68,68,0.5)',
                  borderRadius: '50%',
                  boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 0 20px rgba(239,68,68,0.1)',
                }}
              >
                <AlertTriangle size={36} color="#f87171" />
              </motion.div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                  Joueur éliminé
                </span>
                <div style={{ width: '100%' }}>
                  <PlayerBanner player={eliminationNotif} accentColor="#ef4444" accentDark="#dc2626" />
                </div>
                <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                  N'a pas suivi la règle
                </span>
              </div>
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 2.5, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '4px',
                  background: '#ef4444',
                  transformOrigin: 'left center',
                  boxShadow: '0 0 10px #ef4444',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
