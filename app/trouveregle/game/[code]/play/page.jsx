"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { Clock, RefreshCw, Check, X, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  getRandomRulesForVoting,
  getRuleById,
  getCategoryDisplayName,
  getDifficultyInfo,
  TROUVE_COLORS
} from "@/data/trouveregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;
const MAX_REROLLS = 3;

export default function TrouveReglePlayPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

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

  // Player cleanup
  const { markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Inactivity detection
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
      } else if (s?.phase === 'ended') {
        router.push(`/trouveregle/game/${code}/end`);
      }
    });

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router]);

  // Generate rule options when entering choosing phase (host only)
  useEffect(() => {
    if (!isHost || !state || state.phase !== 'choosing') return;
    if (state.ruleOptions && state.ruleOptions.length > 0) return;

    const options = getRandomRulesForVoting({
      onlineOnly: meta?.mode === 'a_distance',
      excludeIds: state.playedRuleIds || []
    });

    update(ref(db, `rooms_trouveregle/${code}/state`), {
      ruleOptions: options.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty }))
    });
  }, [isHost, state?.phase, state?.ruleOptions, meta?.mode, code]);

  // Timer countdown
  useEffect(() => {
    if (!state?.timerEndAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((state.timerEndAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && isHost && state.phase === 'playing') {
        // Time's up - move to reveal
        update(ref(db, `rooms_trouveregle/${code}/state`), {
          phase: 'reveal',
          foundByInvestigators: false
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.timerEndAt, state?.phase, isHost, code]);

  // Vote for a rule
  const handleVote = async (ruleId) => {
    if (!myUid) return;
    await update(ref(db, `rooms_trouveregle/${code}/state/votes/${myUid}`), ruleId);
  };

  // Re-roll rules (host only)
  const handleReroll = async () => {
    if (!isHost || state.rerollsUsed >= MAX_REROLLS) return;

    const options = getRandomRulesForVoting({
      onlineOnly: meta?.mode === 'a_distance',
      excludeIds: [...(state.playedRuleIds || []), ...(state.ruleOptions?.map(r => r.id) || [])]
    });

    await update(ref(db, `rooms_trouveregle/${code}/state`), {
      ruleOptions: options.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty })),
      votes: {},
      rerollsUsed: (state.rerollsUsed || 0) + 1
    });
  };

  // Confirm rule selection (host only)
  const handleConfirmRule = async () => {
    if (!isHost || !state.ruleOptions) return;

    // Count votes
    const votes = state.votes || {};
    const voteCounts = {};
    state.ruleOptions.forEach(r => voteCounts[r.id] = 0);
    Object.values(votes).forEach(ruleId => {
      if (voteCounts[ruleId] !== undefined) voteCounts[ruleId]++;
    });

    // Find winner (most votes, or first if tie)
    let winnerId = state.ruleOptions[0].id;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = id;
      }
    });

    const selectedRule = state.ruleOptions.find(r => r.id === winnerId);
    const timerEndAt = Date.now() + (meta?.timerMinutes || 5) * 60 * 1000;

    await update(ref(db, `rooms_trouveregle/${code}/state`), {
      phase: 'playing',
      currentRule: selectedRule,
      timerEndAt,
      playedRuleIds: [...(state.playedRuleIds || []), winnerId]
    });
  };

  // Vote on investigator's guess
  const handleGuessVote = async (isCorrect) => {
    if (!myUid) return;
    await update(ref(db, `rooms_trouveregle/${code}/state/guessVotes/${myUid}`), isCorrect);
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
        // Investigators found it!
        const points = 10 - (state.guessAttempts - 1) * 3; // 10, 7, 4 points
        const updates = {};

        // Award points to investigators
        state.investigatorUids.forEach(uid => {
          const player = players.find(p => p.uid === uid);
          if (player) {
            updates[`rooms_trouveregle/${code}/players/${uid}/score`] = (player.score || 0) + Math.max(points, 1);
          }
        });

        updates[`rooms_trouveregle/${code}/state/phase`] = 'reveal';
        updates[`rooms_trouveregle/${code}/state/foundByInvestigators`] = true;
        updates[`rooms_trouveregle/${code}/state/guessVotes`] = null;

        update(ref(db), updates);
      } else {
        // Wrong guess
        const newAttempts = state.guessAttempts;
        if (newAttempts >= 3) {
          // Out of attempts - players win
          const updates = {};
          players.filter(p => p.role !== 'investigator').forEach(player => {
            updates[`rooms_trouveregle/${code}/players/${player.uid}/score`] = (player.score || 0) + 5;
          });
          updates[`rooms_trouveregle/${code}/state/phase`] = 'reveal';
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

  const myVote = state?.votes?.[myUid];
  const totalVotes = Object.keys(state?.votes || {}).length;
  const playersCount = players.filter(p => p.role !== 'investigator').length;
  const allVoted = totalVotes >= playersCount;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading
  if (!meta || !state) {
    return (
      <div className="trouve-play">
        <div className="loading">
          <div className="spinner" />
          <p>Chargement...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="trouve-play">
      {/* Header */}
      <header className="play-header">
        <div className="header-left">
          <span className="game-icon">🔍</span>
          <span className="round-badge">Manche {state.roundNumber || 1}</span>
        </div>
        {state.phase === 'playing' && (
          <div className={`timer ${timeLeft <= 30 ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
        <div className="header-right">
          <span className="attempts-badge">
            Essais: {3 - (state.guessAttempts || 0)}/3
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="play-main">
        {/* PHASE: CHOOSING */}
        {state.phase === 'choosing' && (
          <div className="choosing-phase">
            <div className="phase-title">
              <span className="phase-icon">🗳️</span>
              <h2>Choisissez une règle</h2>
              <p className="phase-subtitle">Les enquêteurs attendent...</p>
            </div>

            <div className="rules-list">
              {state.ruleOptions?.map((rule, idx) => {
                const diffInfo = getDifficultyInfo(rule.difficulty);
                const isSelected = myVote === rule.id;
                const voteCount = voteCounts[rule.id] || 0;

                return (
                  <motion.button
                    key={rule.id}
                    className={`rule-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVote(rule.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="rule-header">
                      <span className="rule-category">{getCategoryDisplayName(rule.category)}</span>
                      <span className="rule-difficulty" style={{ color: diffInfo.color }}>
                        {'⭐'.repeat(diffInfo.stars)}
                      </span>
                    </div>
                    <p className="rule-text">{rule.text}</p>
                    <div className="rule-footer">
                      {voteCount > 0 && (
                        <span className="vote-count">{voteCount} vote{voteCount > 1 ? 's' : ''}</span>
                      )}
                      {isSelected && <Check size={18} className="check-icon" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="choosing-actions">
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
            </div>
          </div>
        )}

        {/* PHASE: PLAYING */}
        {state.phase === 'playing' && state.currentRule && (
          <div className="playing-phase">
            <div className="rule-display">
              <div className="rule-label">
                <span className="secret-icon">🤫</span>
                La règle secrète
              </div>
              <div className="rule-box">
                <p className="rule-main-text">{state.currentRule.text}</p>
              </div>
              <div className="rule-meta">
                <span className="rule-category-badge">
                  {getCategoryDisplayName(state.currentRule.category)}
                </span>
                <span className="rule-id">#{state.currentRule.id}</span>
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
            <div className="guess-header">
              <span className="guess-icon">🤔</span>
              <h2>L'enquêteur propose :</h2>
            </div>

            <div className="guess-box">
              <p className="guess-text">
                "{state.guesses?.[state.guesses.length - 1] || '...'}"
              </p>
            </div>

            <div className="vote-question">
              <p>Est-ce la bonne règle ?</p>
              <p className="real-rule-hint">
                (La vraie règle : "{state.currentRule?.text}")
              </p>
            </div>

            {!state.guessVotes?.[myUid] ? (
              <div className="vote-buttons">
                <motion.button
                  className="vote-btn correct"
                  onClick={() => handleGuessVote(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ThumbsUp size={24} />
                  <span>Correct !</span>
                </motion.button>
                <motion.button
                  className="vote-btn wrong"
                  onClick={() => handleGuessVote(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ThumbsDown size={24} />
                  <span>Raté !</span>
                </motion.button>
              </div>
            ) : (
              <div className="vote-waiting">
                <div className="spinner small" />
                <span>En attente des autres votes...</span>
              </div>
            )}
          </div>
        )}

        {/* PHASE: REVEAL */}
        {state.phase === 'reveal' && (
          <div className="reveal-phase">
            <div className={`reveal-result ${state.foundByInvestigators ? 'found' : 'not-found'}`}>
              <span className="reveal-icon">
                {state.foundByInvestigators ? '🎉' : '🎭'}
              </span>
              <h2>
                {state.foundByInvestigators
                  ? 'Les enquêteurs ont trouvé !'
                  : 'Les joueurs gagnent !'}
              </h2>
            </div>

            <div className="reveal-rule">
              <span className="reveal-label">La règle était :</span>
              <p className="reveal-text">{state.currentRule?.text}</p>
            </div>

            {isHost && (
              <motion.button
                className="next-btn"
                onClick={() => {
                  router.push(`/trouveregle/game/${code}/end`);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Voir les résultats
              </motion.button>
            )}

            {!isHost && (
              <div className="waiting-host">
                <div className="spinner small" />
                <span>L'hôte va afficher les résultats...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Disconnect Alert */}
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

  .round-badge {
    padding: 4px 10px;
    background: rgba(6, 182, 212, 0.2);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 8px;
    font-size: 0.8rem;
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

  .attempts-badge {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Main */
  .play-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    position: relative;
    z-index: 1;
  }

  /* CHOOSING PHASE */
  .choosing-phase {
    max-width: 500px;
    margin: 0 auto;
  }

  .phase-title {
    text-align: center;
    margin-bottom: 24px;
  }

  .phase-icon {
    font-size: 2.5rem;
    display: block;
    margin-bottom: 8px;
  }

  .phase-title h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.4rem;
    color: #ffffff;
    margin: 0;
  }

  .phase-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 4px;
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .rule-card {
    position: relative;
    padding: 16px;
    background: rgba(20, 20, 30, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }

  .rule-card:hover {
    border-color: rgba(6, 182, 212, 0.3);
  }

  .rule-card.selected {
    background: rgba(6, 182, 212, 0.1);
    border-color: ${CYAN_PRIMARY};
  }

  .rule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .rule-category {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .rule-difficulty {
    font-size: 0.8rem;
  }

  .rule-text {
    font-size: 1rem;
    color: #ffffff;
    line-height: 1.4;
    margin: 0;
  }

  .rule-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }

  .vote-count {
    font-size: 0.75rem;
    color: ${CYAN_LIGHT};
    padding: 2px 8px;
    background: rgba(6, 182, 212, 0.2);
    border-radius: 4px;
  }

  .check-icon {
    color: ${CYAN_LIGHT};
  }

  .choosing-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .vote-status {
    text-align: center;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .host-actions {
    display: flex;
    gap: 12px;
  }

  .reroll-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
    cursor: pointer;
  }

  .reroll-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .confirm-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
  }

  .confirm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* PLAYING PHASE */
  .playing-phase {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    padding: 24px;
    background: rgba(6, 182, 212, 0.1);
    border: 2px solid ${CYAN_PRIMARY};
    border-radius: 16px;
    box-shadow: 0 0 30px rgba(6, 182, 212, 0.2);
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

  .rule-meta {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 12px;
  }

  .rule-category-badge {
    font-size: 0.75rem;
    padding: 4px 10px;
    background: rgba(6, 182, 212, 0.2);
    border-radius: 6px;
    color: ${CYAN_LIGHT};
  }

  .rule-id {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
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
    max-width: 500px;
    margin: 0 auto;
    text-align: center;
  }

  .guess-header {
    margin-bottom: 20px;
  }

  .guess-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 8px;
  }

  .guess-header h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.2rem;
    color: #ffffff;
  }

  .guess-box {
    padding: 20px;
    background: rgba(168, 85, 247, 0.1);
    border: 2px solid rgba(168, 85, 247, 0.3);
    border-radius: 14px;
    margin-bottom: 20px;
  }

  .guess-text {
    font-size: 1.1rem;
    font-style: italic;
    color: #ffffff;
    margin: 0;
  }

  .vote-question p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 8px 0;
  }

  .real-rule-hint {
    font-size: 0.8rem;
    color: ${CYAN_LIGHT};
    background: rgba(6, 182, 212, 0.1);
    padding: 8px 12px;
    border-radius: 8px;
  }

  .vote-buttons {
    display: flex;
    gap: 16px;
    margin-top: 24px;
  }

  .vote-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
  }

  .vote-btn.correct {
    background: linear-gradient(135deg, #34d399, #10b981);
    color: #0a0a0f;
  }

  .vote-btn.wrong {
    background: linear-gradient(135deg, #f87171, #ef4444);
    color: #ffffff;
  }

  .vote-waiting {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    color: rgba(255, 255, 255, 0.6);
  }

  /* REVEAL PHASE */
  .reveal-phase {
    max-width: 500px;
    margin: 0 auto;
    text-align: center;
  }

  .reveal-result {
    padding: 24px;
    border-radius: 16px;
    margin-bottom: 24px;
  }

  .reveal-result.found {
    background: rgba(34, 197, 94, 0.15);
    border: 2px solid rgba(34, 197, 94, 0.3);
  }

  .reveal-result.not-found {
    background: rgba(168, 85, 247, 0.15);
    border: 2px solid rgba(168, 85, 247, 0.3);
  }

  .reveal-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 12px;
  }

  .reveal-result h2 {
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1.3rem;
    color: #ffffff;
    margin: 0;
  }

  .reveal-rule {
    padding: 20px;
    background: rgba(6, 182, 212, 0.1);
    border: 1px solid rgba(6, 182, 212, 0.3);
    border-radius: 14px;
    margin-bottom: 24px;
  }

  .reveal-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
  }

  .reveal-text {
    font-size: 1.1rem;
    color: ${CYAN_LIGHT};
    margin: 8px 0 0 0;
  }

  .next-btn {
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, ${CYAN_LIGHT}, ${CYAN_PRIMARY});
    color: #0a0a0f;
    font-family: var(--font-display, 'Space Grotesk'), sans-serif;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
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
