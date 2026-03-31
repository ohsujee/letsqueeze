'use client';

/**
 * ChoosingPhase — Phase de vote pour choisir la règle secrète (La Règle)
 * Extrait de play/page.jsx
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Check } from 'lucide-react';
import { db, ref, set, update } from '@/lib/firebase';
import {
  getRandomRulesForVoting,
  getCategoryDisplayName,
  getDifficultyInfo,
} from '@/data/laregle-rules';

const ACCENT = '#00e5ff';
const MAX_REROLLS = 3;

export default function ChoosingPhase({ state, meta, code, myUid, isHost, players }) {
  // Local state (choosing-specific)
  const [preVote, setPreVote] = useState(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [revealPhase, setRevealPhase] = useState(null);
  const [tieFlashIndex, setTieFlashIndex] = useState(0);
  const [winningRuleId, setWinningRuleId] = useState(null);
  const autoConfirmTriggeredRef = useRef(false);

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

  const myValidatedVote = state?.votes?.[myUid];
  const totalVotes = Object.keys(state?.votes || {}).length;

  const requiredVoters = useMemo(() => {
    return players.filter(p => p.role !== 'investigator');
  }, [players]);

  const playersCount = requiredVoters.length;

  const getCardState = (ruleId) => {
    if (revealPhase === 'winner') return ruleId === winningRuleId ? 'winner' : 'hidden';
    if (revealPhase === 'revealing') return ruleId === winningRuleId ? 'glowing' : 'fading';
    if (revealPhase === 'tiebreaker') {
      const tiedIds = state?.tiedRuleIds || [];
      if (!tiedIds.includes(ruleId)) return 'fading';
      return tiedIds[tieFlashIndex] === ruleId ? 'flash' : 'dimmed';
    }
    if (preVote === ruleId) return 'selected';
    return 'normal';
  };

  // Handlers
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

  return (
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

  );
}
