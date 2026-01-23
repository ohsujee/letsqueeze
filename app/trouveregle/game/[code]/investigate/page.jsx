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
import { useToast } from "@/lib/hooks/useToast";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { Clock, Send, AlertCircle, CheckCircle, XCircle, Pause, Play } from "lucide-react";
import ExitButton from "@/lib/components/ExitButton";
import { TROUVE_COLORS } from "@/data/trouveregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;

export default function TrouveRegleInvestigatePage() {
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

  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_trouveregle' });

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
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost: false
  });

  // Host disconnect - ferme la room si l'hôte perd sa connexion
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    isHost
  });

  // Player cleanup (phase: 'playing' to preserve score if disconnect)
  const { markActive, leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection (30s timeout)
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_trouveregle/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
      }
    });

    const stateUnsub = onValue(ref(db, `rooms_trouveregle/${code}/state`), (snap) => {
      const s = snap.val();
      setState(s);

      // Redirect on phase changes
      if (s?.phase === 'lobby') {
        router.push(`/trouveregle/room/${code}`);
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
            await update(ref(db, `rooms_trouveregle/${code}/state`), {
              revealPhase: 'tiebreaker',
              tiedRuleIds: tiedRules.map(r => r.id)
            });
          } else {
            // Single winner - direct reveal
            const winnerId = tiedRules[0]?.id || state.ruleOptions[0].id;
            await update(ref(db, `rooms_trouveregle/${code}/state`), {
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
        update(ref(db, `rooms_trouveregle/${code}/state`), {
          revealPhase: 'revealing',
          winningRuleId: randomWinner
        });
      }, 2600); // 12 flashes * 200ms + buffer
      return () => clearTimeout(timer);
    }

    if (state.revealPhase === 'revealing' && state.winningRuleId) {
      // After glow animation, move to winner phase
      const timer = setTimeout(() => {
        update(ref(db, `rooms_trouveregle/${code}/state`), {
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

        update(ref(db, `rooms_trouveregle/${code}/state`), {
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
      if (remaining <= 0 && isHost && currentPhase === 'playing') {
        update(ref(db, `rooms_trouveregle/${code}/state`), {
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

    if (timerPaused) {
      // Resume: recalculate timerEndAt based on remaining time
      const newTimerEndAt = Date.now() + timeLeftWhenPaused * 1000;
      await update(ref(db, `rooms_trouveregle/${code}/state`), {
        timerPaused: false,
        timerEndAt: newTimerEndAt,
        timeLeftWhenPaused: null
      });
    } else {
      // Pause: store current remaining time
      const remaining = Math.max(0, Math.floor((timerEndAt - Date.now()) / 1000));
      await update(ref(db, `rooms_trouveregle/${code}/state`), {
        timerPaused: true,
        timeLeftWhenPaused: remaining
      });
    }
  };

  // Propose a guess (triggers voting on player screens)
  const handleProposeGuess = async () => {
    if (state?.phase !== 'playing' || attemptsLeft <= 0) return;

    await update(ref(db, `rooms_trouveregle/${code}/state`), {
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

    await update(ref(db, `rooms_trouveregle/${code}/state`), {
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
            updates[`rooms_trouveregle/${code}/players/${uid}/score`] = (player.score || 0) + Math.max(points, 1);
          }
        });

        updates[`rooms_trouveregle/${code}/state/phase`] = 'ended';
        updates[`rooms_trouveregle/${code}/state/foundByInvestigators`] = true;
        updates[`rooms_trouveregle/${code}/state/guessVotes`] = null;

        update(ref(db), updates);
      } else {
        // Wrong guess
        const newAttempts = state.guessAttempts || 0;
        if (newAttempts >= 3) {
          // Out of attempts - players win, go directly to ended
          const updates = {};
          players.filter(p => p.role !== 'investigator').forEach(player => {
            updates[`rooms_trouveregle/${code}/players/${player.uid}/score`] = (player.score || 0) + 5;
          });
          updates[`rooms_trouveregle/${code}/state/phase`] = 'ended';
          updates[`rooms_trouveregle/${code}/state/foundByInvestigators`] = false;
          updates[`rooms_trouveregle/${code}/state/guessVotes`] = null;
          update(ref(db), updates);
        } else {
          // Continue playing
          update(ref(db, `rooms_trouveregle/${code}/state`), {
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
      <div className="trouve-investigate game-page">
        <div className="loading">
          <div className="spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouve-investigate game-page">
      {/* End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="trouveregle"
            onComplete={() => router.replace(`/trouveregle/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="investigate-header">
        <div className="header-left">
          <ExitButton
            variant="header"
            confirmMessage="Voulez-vous vraiment quitter la partie ?"
            onExit={async () => {
              await leaveRoom();
              router.push('/home');
            }}
          />
          <span className="role-badge">🔍 Enquêteur</span>
        </div>
        {state.phase === 'playing' && (
          <button
            className={`timer ${timeLeft <= 30 ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''} ${timerPaused ? 'paused' : ''} ${isHost ? 'clickable' : ''}`}
            onClick={handleTogglePause}
            disabled={!isHost}
          >
            <Clock size={18} />
            <span>{formatTime(timeLeft)}</span>
            {isHost && (
              <span className="pause-indicator">
                {timerPaused ? <Play size={14} /> : <Pause size={14} />}
              </span>
            )}
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="investigate-main">
        {/* PHASE: CHOOSING (Waiting Room) */}
        {state.phase === 'choosing' && (
          <div className="waiting-phase">
            <div className="waiting-card">
              <div className="waiting-animation">
                <div className={`waiting-circle ${state.revealPhase ? 'revealing' : ''}`} />
                <span className="waiting-icon">{state.revealPhase ? '✨' : '🔍'}</span>
              </div>
              <h2>
                {state.revealPhase === 'winner'
                  ? 'Règle choisie !'
                  : state.revealPhase
                    ? 'Sélection en cours...'
                    : 'Salle d\'attente'}
              </h2>
              <p>
                {state.revealPhase === 'winner'
                  ? 'La partie va commencer...'
                  : state.revealPhase
                    ? 'Les joueurs ont voté, la règle va être révélée !'
                    : 'Les joueurs choisissent une règle secrète...'}
              </p>

              <div className="waiting-tips">
                <h3>Pendant ce temps, prépare-toi !</h3>
                <ul>
                  <li>Tu pourras poser des questions aux joueurs</li>
                  <li>Observe leurs réponses et comportements</li>
                  <li>Tu auras 3 essais pour deviner la règle</li>
                </ul>
              </div>

              {otherInvestigators.length > 0 && (
                <div className="co-investigators">
                  <span className="co-label">Co-enquêteur{otherInvestigators.length > 1 ? 's' : ''} :</span>
                  <div className="co-names">
                    {otherInvestigators.map(p => (
                      <span key={p.uid} className="co-name">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE: PLAYING */}
        {state.phase === 'playing' && (
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

            <div className="instruction-card">
              <h2>🎭 Trouve la règle !</h2>
              <p>
                Les joueurs suivent une règle secrète dans leurs réponses.
                Pose des questions et observe pour la découvrir !
              </p>
            </div>

            <div className="players-section">
              <h3>Joueurs à interroger</h3>
              <div className="players-grid">
                {gamePlayers.map(player => (
                  <div key={player.uid} className="player-card">
                    <div className="player-avatar">
                      {player.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="player-name">{player.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Propose guess button */}
            <div className="propose-section">
              <motion.button
                className="propose-btn"
                onClick={handleProposeGuess}
                disabled={attemptsLeft <= 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Proposer une règle
              </motion.button>
              <p className="propose-hint">
                Dis ta réponse à voix haute, les joueurs voteront
              </p>
            </div>
          </div>
        )}

        {/* PHASE: GUESSING (Waiting for votes) */}
        {state.phase === 'guessing' && (
          <div className="guessing-phase">
            <div className="guess-pending">
              <div className="pending-icon">🎤</div>
              <h2>Proposition en cours</h2>
              <p className="pending-instruction">
                Dis ta réponse à voix haute !
              </p>
              <div className="voting-status">
                <div className="spinner small" />
                <span>En attente des votes des joueurs...</span>
              </div>
              <div className="vote-progress">
                {(() => {
                  const voteCount = Object.keys(state.guessVotes || {}).length;
                  const totalVoters = gamePlayers.length;
                  return `${voteCount}/${totalVoters} ont voté`;
                })()}
              </div>

              {/* Cancel button - only if no votes yet */}
              {Object.keys(state.guessVotes || {}).length === 0 && (
                <motion.button
                  className="cancel-btn"
                  onClick={handleCancelGuess}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Annuler
                </motion.button>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Disconnect alert overlay */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_trouveregle"
        playerUid={myUid}
        onReconnect={markActive}
      />

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .trouve-investigate {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #0a0a0f);
  }

  .trouve-investigate::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
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
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top-color: #a855f7;
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
  .investigate-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(168, 85, 247, 0.2);
  }

  .header-left, .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .role-badge {
    padding: 6px 12px;
    background: rgba(168, 85, 247, 0.2);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #c084fc;
  }

  .timer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(168, 85, 247, 0.15);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 10px;
    font-family: var(--font-title, 'Bungee'), cursive;
    font-size: 1.2rem;
    color: #c084fc;
    cursor: default;
    transition: all 0.2s ease;
  }

  .timer.clickable {
    cursor: pointer;
  }

  .timer.clickable:hover {
    background: rgba(168, 85, 247, 0.25);
    border-color: rgba(168, 85, 247, 0.5);
  }

  .timer.clickable:active {
    transform: scale(0.98);
  }

  .timer.paused {
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.4);
    animation: pausePulse 1.5s ease-in-out infinite;
  }

  .pause-indicator {
    display: flex;
    align-items: center;
    margin-left: 4px;
    opacity: 0.7;
  }

  .timer.clickable:hover .pause-indicator {
    opacity: 1;
  }

  @keyframes pausePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .timer.warning {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
  }

  .timer.danger {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    color: #f87171;
    animation: pulse 0.5s ease-in-out infinite;
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
    background: #06b6d4;
    box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
  }

  .attempt-dot.used {
    background: rgba(239, 68, 68, 0.3);
    border: 1px solid rgba(239, 68, 68, 0.5);
  }

  /* Main */
  .investigate-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    position: relative;
    z-index: 1;
  }

  /* WAITING PHASE */
  .waiting-phase {
    max-width: 500px;
    margin: 0 auto;
  }

  .waiting-card {
    text-align: center;
    padding: 32px 24px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
  }

  .waiting-animation {
    position: relative;
    width: 100px;
    height: 100px;
    margin: 0 auto 20px;
  }

  .waiting-circle {
    position: absolute;
    inset: 0;
    border: 3px solid rgba(168, 85, 247, 0.2);
    border-top-color: #a855f7;
    border-radius: 50%;
    animation: spin 2s linear infinite;
  }

  .waiting-circle.revealing {
    border-color: rgba(6, 182, 212, 0.3);
    border-top-color: ${CYAN_LIGHT};
    animation: spin 1s linear infinite;
    box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
  }

  .waiting-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
  }

  .waiting-card h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.4rem;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .waiting-card > p {
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 24px 0;
  }

  .waiting-tips {
    text-align: left;
    padding: 16px;
    background: rgba(168, 85, 247, 0.1);
    border-radius: 12px;
  }

  .waiting-tips h3 {
    font-size: 0.9rem;
    color: #c084fc;
    margin: 0 0 12px 0;
  }

  .waiting-tips ul {
    margin: 0;
    padding-left: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .waiting-tips li {
    margin-bottom: 8px;
  }

  .co-investigators {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .co-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .co-names {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
  }

  .co-name {
    padding: 4px 12px;
    background: rgba(168, 85, 247, 0.2);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #c084fc;
  }

  /* PLAYING PHASE */
  .playing-phase {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .instruction-card {
    padding: 20px;
    background: rgba(168, 85, 247, 0.1);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 14px;
    text-align: center;
  }

  .instruction-card h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.3rem;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .instruction-card p {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .players-section {
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 16px;
  }

  .players-section h3 {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px 0;
  }

  .players-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.2);
    border-radius: 10px;
  }

  .player-avatar {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${CYAN_PRIMARY};
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    color: #0a0a0f;
  }

  .player-name {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.9);
  }

  /* Propose section */
  .propose-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
  }

  .propose-btn {
    width: 100%;
    padding: 20px 32px;
    border: none;
    border-radius: 14px;
    background: linear-gradient(135deg, #c084fc, #a855f7);
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: center;
    cursor: pointer;
    box-shadow:
      0 4px 20px rgba(168, 85, 247, 0.4),
      0 0 30px rgba(168, 85, 247, 0.2);
    transition: all 0.2s ease;
  }

  .propose-btn:hover:not(:disabled) {
    box-shadow:
      0 6px 25px rgba(168, 85, 247, 0.5),
      0 0 40px rgba(168, 85, 247, 0.3);
  }

  .propose-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  .propose-hint {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    margin: 0;
  }

  /* GUESSING PHASE */
  .guessing-phase {
    max-width: 500px;
    margin: 0 auto;
  }

  .guess-pending {
    text-align: center;
    padding: 32px 24px;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(168, 85, 247, 0.25);
    border-radius: 16px;
  }

  .pending-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
    filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.5));
  }

  .guess-pending h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.3rem;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .pending-instruction {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 24px 0;
  }

  .voting-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin-bottom: 12px;
  }

  .vote-progress {
    font-family: var(--font-mono, 'Roboto Mono'), monospace;
    font-size: 0.85rem;
    color: #c084fc;
    padding: 8px 16px;
    background: rgba(168, 85, 247, 0.15);
    border-radius: 8px;
  }

  .cancel-btn {
    margin-top: 20px;
    padding: 12px 32px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.6);
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
  }

  /* REVEAL PHASE */
  .reveal-phase {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
    padding: 20px 0;
  }

  .reveal-result {
    width: 100%;
    text-align: center;
    padding: 32px 24px;
    border-radius: 20px;
  }

  .reveal-result.won {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08));
    border: 2px solid rgba(34, 197, 94, 0.4);
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.2);
  }

  .reveal-result.lost {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
    border: 2px solid rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);
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
    text-align: center;
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

  .your-guesses {
    width: 100%;
    background: rgba(20, 20, 30, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 16px;
  }

  .your-guesses h3 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .waiting-host {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
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
`;
