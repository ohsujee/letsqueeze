"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameEndTransition } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useToast } from "@/lib/hooks/useToast";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { Clock, Pause, Play } from "lucide-react";
import ExitButton from "@/lib/components/ExitButton";
import PlayerBanner from "@/components/game/PlayerBanner";

const ACCENT = '#00e5ff';

export default function LaLoiInvestigatePage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showEndTransition, setShowEndTransition] = useState(false);

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

  // Keep screen awake
  useWakeLock({ enabled: true });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    hostUid: meta?.hostUid
  });

  // Player cleanup (phase: 'playing' to preserve score if disconnect)
  const { markActive, leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection (30s timeout)
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_laregle',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

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

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router]);

  // Auto-confirm when all voters have voted (host only - for when host is investigator)
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

    // Non-investigators are the voters (they're on the play page)
    const nonInvestigators = players.filter(p => p.role !== 'investigator');

    const votes = state?.votes || {};
    const voteCount = Object.keys(votes).length;

    // Check if all non-investigators have voted
    if (nonInvestigators.length > 0 && voteCount >= nonInvestigators.length) {
      // Mark as triggered to prevent re-runs
      autoConfirmTriggeredRef.current = true;

      // Small delay to let the UI update
      const timer = setTimeout(async () => {
        // Double-check we're still in choosing phase
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
          autoConfirmTriggeredRef.current = false;
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isHost, state?.phase, state?.votes, state?.ruleOptions, state?.revealPhase, players, meta?.hostUid, code]);

  // Handle reveal animation phases (host triggers transitions from here if they're investigator)
  useEffect(() => {
    if (!state?.revealPhase || !isHost) return;

    if (state.revealPhase === 'tiebreaker' && state.tiedRuleIds) {
      // After tiebreaker animation completes on play page, host picks winner
      const timer = setTimeout(() => {
        const randomWinner = state.tiedRuleIds[Math.floor(Math.random() * state.tiedRuleIds.length)];
        update(ref(db, `rooms_laregle/${code}/state`), {
          revealPhase: 'revealing',
          winningRuleId: randomWinner
        });
      }, 2600); // 12 flashes * 200ms + buffer
      return () => clearTimeout(timer);
    }

    if (state.revealPhase === 'revealing' && state.winningRuleId) {
      // After glow animation, move to winner phase
      const timer = setTimeout(() => {
        update(ref(db, `rooms_laregle/${code}/state`), {
          revealPhase: 'winner'
        });
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (state.revealPhase === 'winner' && state.winningRuleId) {
      // After showing winner centered, start playing phase
      const timer = setTimeout(() => {
        const selectedRule = state.ruleOptions?.find(r => r.id === state.winningRuleId);
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
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isHost, state?.revealPhase, state?.tiedRuleIds, state?.winningRuleId, state?.ruleOptions, state?.playedRuleIds, meta?.timerMinutes, code]);

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

      // Host on investigate page handles timer end - go directly to ended
      // Award +5 to civilians since investigators failed to find the rule in time
      if (remaining <= 0 && isHost && currentPhase === 'playing') {
        const scoreUpdates = {};
        players.forEach(p => {
          if (p.role !== 'investigator') {
            scoreUpdates[`rooms_laregle/${code}/players/${p.uid}/score`] = (p.score || 0) + 5;
          }
        });
        update(ref(db), {
          [`rooms_laregle/${code}/state/phase`]: 'ended',
          [`rooms_laregle/${code}/state/foundByInvestigators`]: false,
          ...scoreUpdates
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerEndAt, timerPaused, timeLeftWhenPaused, currentPhase, isHost, code, players]);

  // Toggle timer pause (host only)
  const handleTogglePause = async () => {
    if (!isHost || state?.phase !== 'playing') return;

    if (timerPaused) {
      // Resume: recalculate timerEndAt based on remaining time
      const newTimerEndAt = Date.now() + timeLeftWhenPaused * 1000;
      await update(ref(db, `rooms_laregle/${code}/state`), {
        timerPaused: false,
        timerEndAt: newTimerEndAt,
        timeLeftWhenPaused: null
      });
    } else {
      // Pause: store current remaining time
      const remaining = Math.max(0, Math.floor((timerEndAt - Date.now()) / 1000));
      await update(ref(db, `rooms_laregle/${code}/state`), {
        timerPaused: true,
        timeLeftWhenPaused: remaining
      });
    }
  };

  // Propose a guess (triggers voting on player screens)
  const handleProposeGuess = async () => {
    if (state?.phase !== 'playing' || attemptsLeft <= 0) return;

    await update(ref(db, `rooms_laregle/${code}/state`), {
      phase: 'guessing',
      guessAttempts: (state.guessAttempts || 0) + 1,
      guessVotes: null // Reset votes for new guess
    });
  };

  // Cancel a guess proposal (only if no votes yet)
  const handleCancelGuess = async () => {
    if (state?.phase !== 'guessing') return;

    // Only allow cancel if no one has voted yet
    const voteCount = Object.keys(state.guessVotes || {}).length;
    if (voteCount > 0) return;

    await update(ref(db, `rooms_laregle/${code}/state`), {
      phase: 'playing',
      guessAttempts: Math.max(0, (state.guessAttempts || 1) - 1), // Refund the attempt
      guessVotes: null
    });
  };

  // Process guess votes (host only - needed here when host is investigator)
  useEffect(() => {
    if (!isHost || state?.phase !== 'guessing' || !state?.guessVotes) return;

    const nonInvestigators = players.filter(p => p.role !== 'investigator');
    const voteCount = Object.keys(state.guessVotes).length;

    if (voteCount >= nonInvestigators.length && nonInvestigators.length > 0) {
      // All players voted
      const correctVotes = Object.values(state.guessVotes).filter(v => v === true).length;
      const isCorrect = correctVotes > nonInvestigators.length / 2;

      if (isCorrect) {
        // Investigators found it! Go directly to ended
        const points = 10 - (state.guessAttempts - 1) * 3; // 10, 7, 4 points
        const updates = {};

        // Award points to investigators
        (state.investigatorUids || []).forEach(uid => {
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
        const newAttempts = state.guessAttempts || 0;
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
  }, [isHost, state?.phase, state?.guessVotes, state?.guessAttempts, state?.investigatorUids, players, code]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const attemptsLeft = 3 - (state?.guessAttempts || 0);
  const otherInvestigators = players.filter(p =>
    p.role === 'investigator' && p.uid !== myUid
  );
  const gamePlayers = players.filter(p => p.role !== 'investigator');

  // Loading
  if (!meta || !state) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#04060f' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ width: '40px', height: '40px', border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'invSpin 1s linear infinite' }} />
          <p>Chargement...</p>
        </div>
        <style>{`
          @keyframes invSpin { to { transform: rotate(360deg); } }
        `}</style>
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
            textShadow: `0 0 14px ${ACCENT}99`,
          }}>
            🔍 Enqueteur
          </span>
        </div>

        {/* Timer (playing & guessing phases) */}
        <AnimatePresence>
          {(state.phase === 'playing' || state.phase === 'guessing') && (
            isHost ? (
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
        padding: `16px 16px ${state.phase === 'playing' ? '96px' : '16px'}`,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* PHASE: CHOOSING (Waiting Room) */}
          {state.phase === 'choosing' && (
            <>
              {/* Instruction strip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 14px',
                background: 'rgba(0,229,255,0.05)',
                borderLeft: '2px solid rgba(0,229,255,0.45)',
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🔍</span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                  Pose des questions, observe les comportements, devine la regle.
                </span>
              </div>

              {/* Waiting card */}
              <div style={{
                background: 'rgba(8,14,32,0.92)',
                border: '1px solid rgba(0,229,255,0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: 'rgba(238,242,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>
                    Prepare-toi
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.25)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      {state.revealPhase
                        ? 'Selection en cours...'
                        : 'Les joueurs choisissent...'}
                    </span>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, animation: 'invPulse 1.5s ease-in-out infinite' }} />
                  </div>
                </div>

                {/* Waiting status */}
                <div style={{
                  margin: '10px 12px 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '10px 14px',
                  background: `${ACCENT}08`,
                  border: `1px solid ${ACCENT}20`,
                  borderRadius: '10px',
                }}>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: ACCENT,
                        animation: 'invPulse 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.22}s`,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                    {state.revealPhase === 'winner'
                      ? 'Regle choisie ! La partie va commencer...'
                      : state.revealPhase
                        ? 'Les joueurs ont vote, la regle va etre revelee !'
                        : 'Les joueurs choisissent une regle secrete'}
                  </span>
                </div>

                {/* Tips */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { icon: '💬', text: 'Pose des questions ouvertes aux joueurs' },
                    { icon: '👁️', text: 'Observe leurs reponses et comportements' },
                    { icon: '🎯', text: 'Tu auras 3 essais pour deviner la regle' },
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1 }}>{tip.icon}</span>
                      <span style={{ fontSize: '0.83rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>{tip.text}</span>
                    </div>
                  ))}

                  {otherInvestigators.length > 0 && (
                    <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.3)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                        Co-enqueteur{otherInvestigators.length > 1 ? 's' : ''} :
                      </span>
                      {otherInvestigators.map(p => (
                        <span key={p.uid} style={{ padding: '3px 10px', background: `${ACCENT}15`, borderRadius: '6px', fontSize: '0.72rem', color: ACCENT, fontWeight: 600, fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* PHASE: REVEALING */}

          {/* PHASE: PLAYING */}
          {state.phase === 'playing' && (
            <>
              {/* Instruction strip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 14px',
                background: 'rgba(0,229,255,0.05)',
                borderLeft: '2px solid rgba(0,229,255,0.45)',
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🔍</span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                  Pose des questions, observe les reponses, devine la regle.
                </span>
              </div>

              {/* Suspects card */}
              <div style={{
                background: 'rgba(8,14,32,0.92)',
                border: '1px solid rgba(0,229,255,0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                {/* Header : label + attempts */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: 'rgba(238,242,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>
                    Suspects
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.28)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      {attemptsLeft} essai{attemptsLeft !== 1 ? 's' : ''} restant{attemptsLeft !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '9px', height: '9px',
                          borderRadius: '50%',
                          background: i < (state.guessAttempts || 0) ? 'rgba(239,68,68,0.2)' : ACCENT,
                          border: i < (state.guessAttempts || 0) ? '1px solid rgba(239,68,68,0.4)' : 'none',
                          boxShadow: i < (state.guessAttempts || 0) ? 'none' : `0 0 6px ${ACCENT}80`,
                          transition: 'all 0.3s ease',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Player rows with PlayerBanner */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {gamePlayers.map(player => (
                    <PlayerBanner key={player.uid} player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PHASE: GUESSING (Waiting for votes) — handled by bottom sheet modal */}
          {state.phase === 'guessing' && (
            <>
              {/* Instruction strip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 14px',
                background: 'rgba(0,229,255,0.05)',
                borderLeft: '2px solid rgba(0,229,255,0.45)',
                borderRadius: '10px',
              }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🔍</span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", lineHeight: 1.4 }}>
                  Pose des questions, observe les reponses, devine la regle.
                </span>
              </div>

              {/* Suspects card (same as playing) */}
              <div style={{
                background: 'rgba(8,14,32,0.92)',
                border: '1px solid rgba(0,229,255,0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: 'rgba(238,242,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>
                    Suspects
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.28)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      {attemptsLeft} essai{attemptsLeft !== 1 ? 's' : ''} restant{attemptsLeft !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '9px', height: '9px',
                          borderRadius: '50%',
                          background: i < (state.guessAttempts || 0) ? 'rgba(239,68,68,0.2)' : ACCENT,
                          border: i < (state.guessAttempts || 0) ? '1px solid rgba(239,68,68,0.4)' : 'none',
                          boxShadow: i < (state.guessAttempts || 0) ? 'none' : `0 0 6px ${ACCENT}80`,
                          transition: 'all 0.3s ease',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {gamePlayers.map(player => {
                    const vote = state.guessVotes?.[player.uid];
                    return (
                      <div key={player.uid} style={{ display: 'grid' }}>
                        <div style={{ gridArea: '1/1', opacity: vote !== undefined ? 0.72 : 1, transition: 'opacity 0.25s ease' }}>
                          <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                        </div>
                        <div style={{
                          gridArea: '1/1', zIndex: 2, pointerEvents: 'none',
                          paddingTop: '10px', paddingRight: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        }}>
                          <AnimatePresence mode="wait">
                            {vote !== undefined ? (
                              <motion.div
                                key={vote ? 'correct' : 'wrong'}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.18 }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '5px',
                                  padding: '4px 10px',
                                  background: vote ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                  border: `1px solid ${vote ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                  borderRadius: '8px',
                                }}
                              >
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: vote ? '#4ade80' : '#f87171', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                                  {vote ? 'Oui' : 'Non'}
                                </span>
                              </motion.div>
                            ) : (
                              <motion.span
                                key="pending"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ color: 'rgba(238,242,255,0.2)', fontSize: '1.1rem', letterSpacing: '-1px', lineHeight: 1 }}
                              >
                                ···
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Fixed bottom button: "J'ai devine la regle !" */}
      <AnimatePresence>
        {state.phase === 'playing' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 15,
              padding: '12px 16px 24px',
              background: 'linear-gradient(to top, rgba(4,6,15,1) 50%, rgba(4,6,15,0) 100%)',
            }}
          >
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {attemptsLeft > 0 && (
                <p style={{
                  fontSize: '0.75rem', color: 'rgba(238,242,255,0.4)',
                  margin: 0, textAlign: 'center',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  Dis ta reponse a voix haute — les joueurs voteront
                </p>
              )}
              <motion.button
                whileHover={{ scale: attemptsLeft > 0 ? 1.015 : 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={attemptsLeft <= 0}
                onClick={handleProposeGuess}
                style={{
                  width: '100%',
                  padding: '17px 24px',
                  border: 'none',
                  borderRadius: '14px',
                  background: attemptsLeft <= 0
                    ? 'rgba(238,242,255,0.06)'
                    : 'linear-gradient(135deg, #c084fc, #a855f7)',
                  color: attemptsLeft <= 0 ? 'rgba(238,242,255,0.25)' : '#0a0a0f',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: attemptsLeft <= 0 ? 'not-allowed' : 'pointer',
                  boxShadow: attemptsLeft <= 0 ? 'none' : '0 4px 24px rgba(168,85,247,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                {attemptsLeft <= 0 ? "Plus d'essais" : "J'ai devine la regle !"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess Modal — bottom sheet (guessing phase) */}
      <AnimatePresence>
        {state.phase === 'guessing' && (
          <>
            <motion.div
              key="guess-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(4,6,15,0.82)',
                backdropFilter: 'blur(5px)',
              }}
            />
            <motion.div
              key="guess-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                background: '#0c1228',
                borderTop: `1px solid ${ACCENT}25`,
                borderRadius: '20px 20px 0 0',
                paddingBottom: '32px',
                maxHeight: '75vh',
                overflowY: 'auto',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>

              <div style={{ padding: '0 16px 4px' }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-title, 'Bungee'), sans-serif",
                    fontSize: '0.95rem',
                    color: '#eef2ff',
                    letterSpacing: '0.04em',
                    textShadow: `0 0 16px ${ACCENT}55`,
                  }}>
                    Les joueurs votent
                  </p>
                </div>

                {/* Votes card */}
                <div style={{
                  background: 'rgba(8,14,32,0.92)',
                  border: '1px solid rgba(0,229,255,0.1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: 'rgba(238,242,255,0.3)',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}>
                        Votes
                      </span>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, animation: 'invPulse 1.5s ease-in-out infinite' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.28)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                        {attemptsLeft} essai{attemptsLeft !== 1 ? 's' : ''} restant{attemptsLeft !== 1 ? 's' : ''}
                      </span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: '9px', height: '9px',
                            borderRadius: '50%',
                            background: i < (state.guessAttempts || 0) ? 'rgba(239,68,68,0.2)' : ACCENT,
                            border: i < (state.guessAttempts || 0) ? '1px solid rgba(239,68,68,0.4)' : 'none',
                            boxShadow: i < (state.guessAttempts || 0) ? 'none' : `0 0 6px ${ACCENT}80`,
                            transition: 'all 0.3s ease',
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Per-player vote rows */}
                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {gamePlayers.map(player => {
                      const vote = state.guessVotes?.[player.uid];
                      return (
                        <div key={player.uid} style={{ display: 'grid' }}>
                          <div style={{ gridArea: '1/1', opacity: vote !== undefined ? 0.72 : 1, transition: 'opacity 0.25s ease' }}>
                            <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                          </div>
                          <div style={{
                            gridArea: '1/1', zIndex: 2, pointerEvents: 'none',
                            paddingTop: '10px', paddingRight: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          }}>
                            <AnimatePresence mode="wait">
                              {vote !== undefined ? (
                                <motion.div
                                  key={vote ? 'correct' : 'wrong'}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.18 }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 10px',
                                    background: vote ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                    border: `1px solid ${vote ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                    borderRadius: '8px',
                                  }}
                                >
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: vote ? '#4ade80' : '#f87171', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                                    {vote ? 'Oui' : 'Non'}
                                  </span>
                                </motion.div>
                              ) : (
                                <motion.span
                                  key="pending"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  style={{ color: 'rgba(238,242,255,0.2)', fontSize: '1.1rem', letterSpacing: '-1px', lineHeight: 1 }}
                                >
                                  ···
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vote progress */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  marginTop: '14px',
                  padding: '12px 14px',
                  background: 'rgba(8,14,32,0.6)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                }}>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '5px', height: '5px', borderRadius: '50%',
                        background: ACCENT,
                        animation: 'invPulse 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.22}s`,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                    En attente —{' '}
                    <span style={{ color: ACCENT, fontWeight: 700 }}>
                      {Object.keys(state.guessVotes || {}).length}/{gamePlayers.length}
                    </span>
                    {' '}ont vote
                  </span>
                </div>

                {/* Cancel button - only if no votes yet */}
                {Object.keys(state.guessVotes || {}).length === 0 && (
                  <motion.button
                    onClick={handleCancelGuess}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', marginTop: '12px',
                      padding: '14px',
                      background: 'rgba(238,242,255,0.06)',
                      border: '1px solid rgba(238,242,255,0.1)',
                      borderRadius: '14px',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontSize: '0.9rem', fontWeight: 700,
                      color: 'rgba(238,242,255,0.7)',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Annuler
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Status banners */}
      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      {/* Disconnect alert overlay */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_laregle"
        playerUid={myUid}
        onReconnect={markActive}
      />

      <style>{`
        @keyframes invSpin { to { transform: rotate(360deg); } }
        @keyframes invPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.75); } }
      `}</style>
    </div>
  );
}
