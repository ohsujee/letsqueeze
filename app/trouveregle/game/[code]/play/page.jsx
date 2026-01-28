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
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { GameEndTransition } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { Clock, RefreshCw, Check, X, ThumbsUp, ThumbsDown, Pause, Play } from "lucide-react";
import ExitButton from "@/lib/components/ExitButton";
import {
  getRandomRulesForVoting,
  getRuleById,
  getCategoryDisplayName,
  getDifficultyInfo,
  TROUVE_COLORS
} from "@/data/laloi-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;
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

  // Ref to prevent multiple auto-confirm triggers
  const autoConfirmTriggeredRef = useRef(false);
  const endTransitionTriggeredRef = useRef(false);

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_laloi' });

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
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_laloi',
    playerUid: myUid,
    isHost: false
  });

  // Keep screen awake during game
  useWakeLock({ enabled: true });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_laloi',
    isHost
  });

  // Player cleanup
  const { markActive, leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_laloi',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_laloi',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_laloi/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_laloi/${code}/state`), (snap) => {
      const s = snap.val();
      setState(s);

      // Redirect on phase changes
      if (s?.phase === 'lobby') {
        router.push(`/laloi/room/${code}`);
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
        update(ref(db, `rooms_laloi/${code}/state`), {
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
      await update(ref(db, `rooms_laloi/${code}/state`), {
        timerPaused: false,
        timerEndAt: newTimerEndAt,
        timeLeftWhenPaused: null
      });
    } else {
      // Pause: store current remaining time
      const remaining = Math.max(0, Math.floor((state.timerEndAt - Date.now()) / 1000));
      await update(ref(db, `rooms_laloi/${code}/state`), {
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
    await set(ref(db, `rooms_laloi/${code}/state/votes/${myUid}`), preVote);
    setHasValidated(true);
  };

  // Re-roll rules (host only)
  const handleReroll = async () => {
    if (!isHost || state.rerollsUsed >= MAX_REROLLS || revealPhase) return;

    const options = getRandomRulesForVoting({
      onlineOnly: meta?.mode === 'a_distance',
      excludeIds: [...(state.playedRuleIds || []), ...(state.ruleOptions?.map(r => r.id) || [])]
    });

    await update(ref(db, `rooms_laloi/${code}/state`), {
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
      await update(ref(db, `rooms_laloi/${code}/state`), {
        revealPhase: 'tiebreaker',
        tiedRuleIds: tiedRules.map(r => r.id)
      });
    } else {
      // Single winner - direct reveal
      const winnerId = tiedRules[0]?.id || state.ruleOptions[0].id;
      await update(ref(db, `rooms_laloi/${code}/state`), {
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
          update(ref(db, `rooms_laloi/${code}/state`), {
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
          update(ref(db, `rooms_laloi/${code}/state`), {
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

          update(ref(db, `rooms_laloi/${code}/state`), {
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
            await update(ref(db, `rooms_laloi/${code}/state`), {
              revealPhase: 'tiebreaker',
              tiedRuleIds: tiedRules.map(r => r.id)
            });
          } else {
            // Single winner - direct reveal
            const winnerId = tiedRules[0]?.id || state.ruleOptions[0].id;
            await update(ref(db, `rooms_laloi/${code}/state`), {
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
    await set(ref(db, `rooms_laloi/${code}/state/guessVotes/${myUid}`), isCorrect);
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
            updates[`rooms_laloi/${code}/players/${uid}/score`] = (player.score || 0) + Math.max(points, 1);
          }
        });

        updates[`rooms_laloi/${code}/state/phase`] = 'ended';
        updates[`rooms_laloi/${code}/state/foundByInvestigators`] = true;
        updates[`rooms_laloi/${code}/state/guessVotes`] = null;

        update(ref(db), updates);
      } else {
        // Wrong guess
        const newAttempts = state.guessAttempts;
        if (newAttempts >= 3) {
          // Out of attempts - players win, go directly to ended
          const updates = {};
          players.filter(p => p.role !== 'investigator').forEach(player => {
            updates[`rooms_laloi/${code}/players/${player.uid}/score`] = (player.score || 0) + 5;
          });
          updates[`rooms_laloi/${code}/state/phase`] = 'ended';
          updates[`rooms_laloi/${code}/state/foundByInvestigators`] = false;
          updates[`rooms_laloi/${code}/state/guessVotes`] = null;
          update(ref(db), updates);
        } else {
          // Continue playing
          update(ref(db, `rooms_laloi/${code}/state`), {
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

  // Loading
  if (!meta || !state) {
    return (
      <div className="trouve-play game-page">
        <div className="loading">
          <div className="spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouve-play game-page">
      {/* End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="laloi"
            onComplete={() => router.replace(`/laloi/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="play-header">
        <div className="header-left">
          <ExitButton
            variant="header"
            confirmMessage="Voulez-vous vraiment quitter la partie ?"
            onExit={async () => {
              await leaveRoom();
              router.push('/home');
            }}
          />
          <span className="role-badge">🎭 Joueur</span>
        </div>
        {state.phase === 'playing' && (
          <button
            className={`timer ${timeLeft <= 30 ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''} ${state.timerPaused ? 'paused' : ''} ${isHost ? 'clickable' : ''}`}
            onClick={handleTogglePause}
            disabled={!isHost}
          >
            {state.timerPaused ? <Pause size={18} /> : <Clock size={18} />}
            <span>{formatTime(timeLeft)}</span>
            {isHost && (
              <span className="pause-hint">
                {state.timerPaused ? <Play size={14} /> : <Pause size={14} />}
              </span>
            )}
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="play-main">
        {/* PHASE: CHOOSING */}
        {state.phase === 'choosing' && (
          <div className={`choosing-phase ${revealPhase === 'winner' ? 'winner-mode' : ''}`}>
            {/* Normal voting UI */}
            <AnimatePresence>
              {revealPhase !== 'winner' && (
                <motion.div
                  className="phase-title"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="phase-icon">🗳️</span>
                  <h2>{revealPhase ? 'Sélection en cours...' : 'Choisissez une règle'}</h2>
                  <p className="phase-subtitle">
                    {revealPhase ? 'La règle va être révélée !' : 'Les enquêteurs attendent...'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Winner display (centered) */}
            <AnimatePresence>
              {revealPhase === 'winner' && winningRuleId && (
                <motion.div
                  className="winner-display"
                  initial={{ opacity: 0, scale: 0.85, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    mass: 1,
                    delay: 0.15
                  }}
                >
                  <div className="winner-label">
                    <span className="winner-icon">✨</span>
                    <span>Règle choisie</span>
                    <span className="winner-icon">✨</span>
                  </div>
                  {(() => {
                    const winnerRule = state.ruleOptions?.find(r => r.id === winningRuleId);
                    const diffInfo = winnerRule ? getDifficultyInfo(winnerRule.difficulty) : null;
                    return winnerRule ? (
                      <div className="winner-card">
                        <div className="rule-header">
                          <span className="rule-category">{getCategoryDisplayName(winnerRule.category)}</span>
                          <span className="rule-difficulty" style={{ color: diffInfo?.color }}>
                            {'⭐'.repeat(diffInfo?.stars || 1)}
                          </span>
                        </div>
                        <p className="rule-text">{winnerRule.text}</p>
                      </div>
                    ) : null;
                  })()}
                  <p className="winner-hint">Mémorisez cette règle !</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rules list (hidden in winner mode) */}
            <AnimatePresence mode="wait">
              {revealPhase !== 'winner' && (
                <motion.div
                  className="rules-list"
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                >
                  {state.ruleOptions?.map((rule, idx) => {
                    const diffInfo = getDifficultyInfo(rule.difficulty);
                    const cardState = getCardState(rule.id);
                    const isSelected = preVote === rule.id;
                    const voteCount = voteCounts[rule.id] || 0;
                    const isWinner = rule.id === winningRuleId;

                    return (
                      <motion.button
                        key={rule.id}
                        className={`rule-card ${cardState}`}
                        onClick={() => handlePreVote(rule.id)}
                        disabled={hasValidated || !!revealPhase}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: cardState === 'fading' || cardState === 'dimmed' ? 0.3 : cardState === 'hidden' ? 0 : 1,
                          y: 0,
                          scale: cardState === 'glowing' ? 1.02 : cardState === 'flash' ? 1.03 : 1,
                        }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          mass: 0.8
                        }}
                        whileTap={!hasValidated && !revealPhase ? { scale: 0.98 } : {}}
                      >
                        <div className="rule-header">
                          <span className="rule-category">{getCategoryDisplayName(rule.category)}</span>
                          <span className="rule-difficulty" style={{ color: diffInfo.color }}>
                            {'⭐'.repeat(diffInfo.stars)}
                          </span>
                        </div>
                        <p className="rule-text">{rule.text}</p>
                        <div className="rule-footer">
                          <div className="footer-left">
                            {isSelected && !hasValidated && <Check size={18} className="check-icon" />}
                            {hasValidated && myValidatedVote === rule.id && (
                              <span className="validated-badge">
                                <Check size={14} /> Validé
                              </span>
                            )}
                          </div>
                          <span className="vote-count">{voteCount}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Vote validate button (everyone can vote) */}
            <AnimatePresence>
              {!revealPhase && (
                <motion.div
                  className="player-validate-section"
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {!hasValidated ? (
                    <motion.button
                      className="validate-btn"
                      onClick={handleValidateVote}
                      disabled={!preVote}
                      whileHover={{ scale: preVote ? 1.02 : 1 }}
                      whileTap={{ scale: preVote ? 0.98 : 1 }}
                    >
                      <Check size={18} />
                      {preVote ? 'Valider mon vote' : 'Sélectionne une règle'}
                    </motion.button>
                  ) : (
                    <div className="vote-confirmed">
                      <Check size={18} />
                      <span>Vote enregistré !</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!revealPhase && (
                <motion.div
                  className="choosing-actions"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="vote-status">
                    {totalVotes}/{playersCount} ont voté
                  </div>

                  {isHost && (
                    <div className="host-actions">
                      <motion.button
                        className="reroll-btn"
                        onClick={handleReroll}
                        disabled={state.rerollsUsed >= MAX_REROLLS}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RefreshCw size={16} />
                        Re-roll ({MAX_REROLLS - (state.rerollsUsed || 0)} restants)
                      </motion.button>

                      <motion.button
                        className="confirm-btn"
                        onClick={handleConfirmRule}
                        disabled={totalVotes === 0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
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
          <div className="playing-phase">
            {/* Attempts indicator */}
            <div className="attempts-bar">
              <span className="attempts-label">Essais restants</span>
              <div className="attempts-dots">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`attempt-dot ${i < (state.guessAttempts || 0) ? 'used' : 'available'}`}
                  />
                ))}
              </div>
            </div>

            <div className="rule-display">
              <div className="rule-label">
                <span className="secret-icon">🤫</span>
                La règle secrète
              </div>
              <div
                className={`rule-box ${isRuleRevealed ? 'revealed' : 'blurred'}`}
                onMouseDown={() => setIsRuleRevealed(true)}
                onMouseUp={() => setIsRuleRevealed(false)}
                onMouseLeave={() => setIsRuleRevealed(false)}
                onTouchStart={() => setIsRuleRevealed(true)}
                onTouchEnd={() => setIsRuleRevealed(false)}
              >
                <p className="rule-main-text">{state.currentRule.text}</p>
                <div className="blur-overlay">
                  <span className="reveal-hint">👆 Maintenir pour révéler</span>
                </div>
              </div>
            </div>

            <div className="tips-card">
              <h3>📝 Rappels</h3>
              <ul>
                <li>Reste naturel dans tes réponses</li>
                <li>Si tu te trompes, continue comme si de rien n'était</li>
                <li>Ne révèle JAMAIS la règle directement !</li>
              </ul>
            </div>

            <div className="waiting-investigators">
              <div className="pulse-dot" />
              <span>Les enquêteurs posent des questions...</span>
            </div>
          </div>
        )}

        {/* PHASE: GUESSING */}
        {state.phase === 'guessing' && (
          <div className="guessing-phase">
            <motion.div
              className="guess-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="guess-badge">
                <span>🎤</span>
                Proposition en cours
              </div>

              <h2 className="guess-title">L'enquêteur a une idée !</h2>
              <p className="guess-subtitle">Écoute sa proposition à voix haute</p>

              <div className="rule-box-reminder">
                <span className="reminder-label">La vraie règle</span>
                <p className="reminder-rule">{state.currentRule?.text}</p>
              </div>

              {!state.guessVotes?.[myUid] ? (
                <>
                  <p className="vote-prompt">A-t-il trouvé ?</p>
                  <div className="vote-actions">
                    <motion.button
                      className="vote-btn success"
                      onClick={() => handleGuessVote(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check size={20} />
                      Oui
                    </motion.button>
                    <motion.button
                      className="vote-btn danger"
                      onClick={() => handleGuessVote(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <X size={20} />
                      Non
                    </motion.button>
                  </div>
                </>
              ) : (
                <div className="vote-submitted">
                  <div className="submitted-icon">
                    <Check size={20} />
                  </div>
                  <span>Vote enregistré</span>
                  <p className="submitted-hint">En attente des autres joueurs...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

      </main>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_laloi"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={false}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .trouve-play {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #0a0a0f);
  }

  .trouve-play::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 50%),
      var(--bg-primary, #0a0a0f);
    pointer-events: none;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.6);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(6, 182, 212, 0.2);
    border-top-color: ${CYAN_PRIMARY};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .play-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(6, 182, 212, 0.2);
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .game-icon {
    font-size: 1.3rem;
  }

  .role-badge {
    padding: 6px 12px;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 10px;
    font-family: var(--font-title, 'Bungee'), cursive;
    font-size: 1.2rem;
    color: ${CYAN_LIGHT};
    cursor: default;
    transition: all 0.2s ease;
  }

  .timer.clickable {
    cursor: pointer;
  }

  .timer.clickable:hover {
    background: rgba(6, 182, 212, 0.25);
    border-color: rgba(6, 182, 212, 0.5);
  }

  .timer.paused {
    background: rgba(168, 85, 247, 0.2);
    border-color: rgba(168, 85, 247, 0.4);
    color: #a855f7;
    animation: paused-pulse 2s ease-in-out infinite;
  }

  @keyframes paused-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .timer .pause-hint {
    display: flex;
    align-items: center;
    opacity: 0.5;
    margin-left: 4px;
  }

  .timer.clickable:hover .pause-hint {
    opacity: 1;
  }

  .timer.warning {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
  }

  .timer.warning.clickable:hover {
    background: rgba(251, 191, 36, 0.25);
  }

  .timer.danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
    animation: pulse 0.5s ease-in-out infinite;
  }

  .timer.danger.clickable:hover {
    background: rgba(239, 68, 68, 0.25);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Attempts bar - below header */
  .attempts-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(6, 182, 212, 0.08);
    border: 1px solid rgba(6, 182, 212, 0.15);
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .attempts-label {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .attempts-dots {
    display: flex;
    gap: 6px;
  }

  .attempt-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .attempt-dot.available {
    background: ${CYAN_PRIMARY};
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
  }

  .attempt-dot.used {
    background: rgba(239, 68, 68, 0.3);
    border: 1px solid rgba(239, 68, 68, 0.5);
  }

  /* Main */
  .play-main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }

  /* CHOOSING PHASE - fills parent and distributes space to cards */
  .choosing-phase {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    overflow: hidden;
  }

  .choosing-phase.winner-mode {
    justify-content: center;
    align-items: center;
  }

  .phase-title {
    flex-shrink: 0;
    text-align: center;
    margin-bottom: 8px;
  }

  .phase-icon {
    font-size: 1.5rem;
    display: block;
    margin-bottom: 2px;
    filter: drop-shadow(0 0 12px rgba(6, 182, 212, 0.5));
  }

  .phase-title h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .phase-subtitle {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }

  .rules-list {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px 4px;
    margin: 0 -4px;
    padding-left: 8px;
    padding-right: 8px;
    overflow: hidden;
  }

  /* Winner display (centered) */
  .winner-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px;
    width: 100%;
    max-width: 400px;
  }

  .winner-label {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: ${CYAN_LIGHT};
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .winner-icon {
    font-size: 1.5rem;
    animation: sparkle 1s ease-in-out infinite;
  }

  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
  }

  .winner-card {
    width: 100%;
    padding: 20px;
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1));
    border: 2px solid ${CYAN_PRIMARY};
    border-radius: 16px;
    box-shadow:
      0 0 50px rgba(6, 182, 212, 0.4),
      0 0 100px rgba(6, 182, 212, 0.2),
      0 20px 60px rgba(0, 0, 0, 0.4),
      inset 0 0 30px rgba(6, 182, 212, 0.1);
    animation: winner-glow 3s ease-in-out infinite;
  }

  @keyframes winner-glow {
    0%, 100% {
      box-shadow:
        0 0 40px rgba(6, 182, 212, 0.35),
        0 0 80px rgba(6, 182, 212, 0.15),
        0 20px 60px rgba(0, 0, 0, 0.4);
    }
    50% {
      box-shadow:
        0 0 55px rgba(6, 182, 212, 0.45),
        0 0 100px rgba(6, 182, 212, 0.25),
        0 22px 65px rgba(0, 0, 0, 0.45);
    }
  }

  .winner-card .rule-header {
    margin-bottom: 12px;
  }

  .winner-card .rule-text {
    font-size: 1.1rem;
    line-height: 1.5;
    text-align: center;
  }

  .winner-hint {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
    margin: 0;
  }

  .rule-card {
    flex: 1;
    min-height: 0;
    position: relative;
    padding: clamp(6px, 8%, 16px) clamp(8px, 5%, 14px);
    background: var(--bg-card, rgba(20, 20, 30, 0.8));
    border: 2px solid var(--border-primary, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-lg, 14px);
    text-align: left;
    cursor: pointer;
    transition: all 0.25s ease;
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    container-type: size;
    container-name: rulecard;
  }

  .rule-card:hover {
    border-color: rgba(6, 182, 212, 0.4);
    background: rgba(6, 182, 212, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(6, 182, 212, 0.15);
  }

  .rule-card.selected {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.08));
    border-color: ${CYAN_PRIMARY};
    box-shadow:
      0 0 20px rgba(6, 182, 212, 0.3),
      0 4px 15px rgba(6, 182, 212, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .rule-card:disabled {
    cursor: default;
  }

  /* Animation states for rule cards */
  .rule-card.glowing {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(6, 182, 212, 0.15));
    border-color: ${CYAN_LIGHT};
    box-shadow:
      0 0 40px rgba(6, 182, 212, 0.5),
      0 0 80px rgba(6, 182, 212, 0.3),
      0 8px 32px rgba(6, 182, 212, 0.4),
      inset 0 0 20px rgba(6, 182, 212, 0.1);
    animation: soft-glow 2s ease-in-out infinite;
  }

  @keyframes soft-glow {
    0%, 100% {
      box-shadow:
        0 0 35px rgba(6, 182, 212, 0.4),
        0 0 70px rgba(6, 182, 212, 0.2),
        0 8px 30px rgba(6, 182, 212, 0.3);
    }
    50% {
      box-shadow:
        0 0 50px rgba(6, 182, 212, 0.5),
        0 0 90px rgba(6, 182, 212, 0.3),
        0 10px 35px rgba(6, 182, 212, 0.4);
    }
  }

  .rule-card.fading {
    opacity: 0.3;
    filter: grayscale(0.5);
    pointer-events: none;
  }

  .rule-card.flash {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.2));
    border-color: ${CYAN_LIGHT};
    box-shadow:
      0 0 30px rgba(6, 182, 212, 0.6),
      0 0 60px rgba(6, 182, 212, 0.3);
    animation: flash-pulse 0.2s ease-in-out;
  }

  @keyframes flash-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.015); opacity: 0.95; }
  }

  .rule-card.dimmed {
    opacity: 0.5;
    filter: grayscale(0.3);
  }

  .rule-card.winner {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.2));
    border-color: ${CYAN_LIGHT};
    border-width: 3px;
    box-shadow:
      0 0 50px rgba(6, 182, 212, 0.6),
      0 0 100px rgba(6, 182, 212, 0.4),
      0 15px 50px rgba(6, 182, 212, 0.5),
      inset 0 0 30px rgba(6, 182, 212, 0.15);
  }

  .rule-card.hidden {
    pointer-events: none;
  }

  .rule-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: clamp(4px, 6cqh, 8px);
  }

  .rule-category {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: clamp(0.5rem, 10cqh, 0.75rem);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${CYAN_LIGHT};
    padding: clamp(2px, 3cqh, 4px) clamp(4px, 5cqh, 8px);
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.25);
    border-radius: 5px;
  }

  .rule-difficulty {
    font-size: clamp(0.6rem, 12cqh, 1rem);
    letter-spacing: -2px;
  }

  .rule-text {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    font-family: var(--font-body, 'Inter'), sans-serif;
    font-size: clamp(0.8rem, 18cqh, 1.1rem);
    font-weight: 500;
    color: #ffffff;
    line-height: 1.3;
    margin: 0;
    overflow: hidden;
  }

  .rule-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: clamp(4px, 6cqh, 8px);
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: clamp(4px, 5cqh, 8px);
  }

  .validated-badge {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: clamp(0.55rem, 9cqh, 0.7rem);
    font-weight: 600;
    color: #34d399;
    padding: clamp(2px, 3cqh, 4px) clamp(5px, 6cqh, 10px);
    background: rgba(34, 211, 153, 0.15);
    border: 1px solid rgba(34, 211, 153, 0.3);
    border-radius: 5px;
  }

  .vote-count {
    font-family: var(--font-mono, 'Roboto Mono'), monospace;
    font-size: clamp(0.6rem, 10cqh, 0.85rem);
    font-weight: 700;
    color: ${CYAN_LIGHT};
    min-width: clamp(20px, 22cqh, 30px);
    height: clamp(20px, 22cqh, 30px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 6px;
  }

  .check-icon {
    color: ${CYAN_LIGHT};
    filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.6));
    width: clamp(14px, 15cqh, 20px);
    height: clamp(14px, 15cqh, 20px);
  }

  /* Player validate section */
  .player-validate-section {
    flex-shrink: 0;
    padding: 8px 0;
  }

  .validate-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 16px;
    border: none;
    border-radius: var(--radius-lg, 12px);
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow:
      0 3px 12px rgba(6, 182, 212, 0.4),
      0 0 15px rgba(6, 182, 212, 0.2);
  }

  .validate-btn:hover:not(:disabled) {
    box-shadow:
      0 5px 16px rgba(6, 182, 212, 0.5),
      0 0 20px rgba(6, 182, 212, 0.3);
  }

  .validate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    box-shadow: none;
  }

  .vote-confirmed {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(34, 211, 153, 0.15);
    border: 1px solid rgba(34, 211, 153, 0.3);
    border-radius: var(--radius-lg, 12px);
    color: #34d399;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .choosing-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
  }

  .vote-status {
    text-align: center;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
  }

  .host-actions {
    display: flex;
    gap: 8px;
  }

  .reroll-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-lg, 12px);
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    color: rgba(255, 255, 255, 0.9);
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reroll-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .reroll-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .confirm-btn {
    flex: 1.5;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 10px 14px;
    border: none;
    border-radius: var(--radius-lg, 12px);
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow:
      0 3px 12px rgba(6, 182, 212, 0.4),
      0 0 15px rgba(6, 182, 212, 0.2);
  }

  .confirm-btn:hover:not(:disabled) {
    box-shadow:
      0 5px 16px rgba(6, 182, 212, 0.5),
      0 0 20px rgba(6, 182, 212, 0.3);
  }

  .confirm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* PLAYING PHASE */
  .playing-phase {
    flex: 1;
    min-height: 0;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  .rule-display {
    text-align: center;
  }

  .rule-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
  }

  .secret-icon {
    font-size: 1.2rem;
  }

  .rule-box {
    position: relative;
    padding: 24px;
    background: rgba(6, 182, 212, 0.1);
    border: 2px solid ${CYAN_PRIMARY};
    border-radius: 16px;
    box-shadow: 0 0 30px rgba(6, 182, 212, 0.2);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .rule-box.blurred .rule-main-text {
    filter: blur(12px);
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .rule-box.revealed .rule-main-text {
    filter: blur(0);
    opacity: 1;
    transition: all 0.2s ease;
  }

  .rule-box.revealed {
    border-color: ${CYAN_LIGHT};
    box-shadow: 0 0 40px rgba(6, 182, 212, 0.4);
  }

  .blur-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(6, 182, 212, 0.05);
    opacity: 1;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .rule-box.revealed .blur-overlay {
    opacity: 0;
  }

  .reveal-hint {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
    padding: 10px 18px;
    background: rgba(10, 10, 15, 0.9);
    border: 1px solid rgba(6, 182, 212, 0.4);
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    animation: hint-pulse 2s ease-in-out infinite;
  }

  @keyframes hint-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.02); opacity: 0.85; }
  }

  .rule-main-text {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.3rem;
    font-weight: 600;
    color: #ffffff;
    line-height: 1.4;
    margin: 0;
    text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
  }

  .tips-card {
    padding: 16px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }

  .tips-card h3 {
    font-size: 0.9rem;
    color: #ffffff;
    margin: 0 0 10px 0;
  }

  .tips-card ul {
    margin: 0;
    padding-left: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .tips-card li {
    margin-bottom: 6px;
  }

  .waiting-investigators {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    background: rgba(6, 182, 212, 0.1);
    border-radius: 10px;
    color: ${CYAN_LIGHT};
    font-size: 0.9rem;
  }

  .pulse-dot {
    width: 10px;
    height: 10px;
    background: ${CYAN_PRIMARY};
    border-radius: 50%;
    animation: pulse-scale 1.5s ease-in-out infinite;
  }

  @keyframes pulse-scale {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.7; }
  }

  /* GUESSING PHASE */
  .guessing-phase {
    flex: 1;
    min-height: 0;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .guess-card {
    width: 100%;
    padding: 24px 20px;
    background: var(--bg-card, rgba(20, 20, 30, 0.8));
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    text-align: center;
  }

  .guess-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(6, 182, 212, 0.15);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 20px;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 16px;
  }

  .guess-title {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px 0;
  }

  .guess-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 20px 0;
  }

  .rule-box-reminder {
    padding: 16px;
    background: rgba(6, 182, 212, 0.08);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .rule-box-reminder .reminder-label {
    display: block;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }

  .reminder-rule {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
    margin: 0;
    line-height: 1.4;
  }

  .vote-prompt {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 14px 0;
  }

  .vote-actions {
    display: flex;
    gap: 12px;
  }

  .vote-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 20px;
    border: none;
    border-radius: 12px;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .vote-btn.success {
    background: linear-gradient(135deg, #34d399, #10b981);
    color: #0a0a0f;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  }

  .vote-btn.success:hover {
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  }

  .vote-btn.danger {
    background: linear-gradient(135deg, #f87171, #ef4444);
    color: #ffffff;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
  }

  .vote-btn.danger:hover {
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
  }

  .vote-submitted {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 12px;
  }

  .submitted-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.2);
    border-radius: 50%;
    color: #34d399;
  }

  .vote-submitted > span {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: #34d399;
  }

  .submitted-hint {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  /* REVEAL PHASE */
  .reveal-phase {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 24px;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    text-align: center;
    padding: 20px 0;
  }

  .reveal-result {
    width: 100%;
    padding: 32px 24px;
    border-radius: 20px;
  }

  .reveal-result.found {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
    border: 2px solid rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);
  }

  .reveal-result.not-found {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08));
    border: 2px solid rgba(34, 197, 94, 0.4);
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.2);
  }

  .reveal-icon {
    font-size: 4rem;
    display: block;
    margin-bottom: 16px;
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
  }

  .reveal-result h2 {
    font-family: var(--font-title, 'Bungee'), cursive;
    font-size: 1.4rem;
    color: #ffffff;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .reveal-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .reveal-rule {
    width: 100%;
    padding: 24px;
    background: rgba(6, 182, 212, 0.1);
    border: 2px solid rgba(6, 182, 212, 0.3);
    border-radius: 16px;
    box-shadow: 0 0 30px rgba(6, 182, 212, 0.15);
  }

  .reveal-label {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .reveal-text {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: ${CYAN_LIGHT};
    margin: 12px 0 0 0;
    line-height: 1.4;
    text-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
  }

  .reveal-actions {
    width: 100%;
  }

  .next-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px 24px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow:
      0 4px 20px rgba(6, 182, 212, 0.4),
      0 0 40px rgba(6, 182, 212, 0.2);
    transition: all 0.2s ease;
  }

  .next-btn:hover {
    box-shadow:
      0 6px 25px rgba(6, 182, 212, 0.5),
      0 0 50px rgba(6, 182, 212, 0.3);
  }

  .waiting-host {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px;
    color: rgba(255, 255, 255, 0.6);
  }
`;
