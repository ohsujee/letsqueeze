'use client';

/**
 * InvestigatePhases — Les 3 phases de la vue enquêteur (La Règle)
 * Choosing (attente), Playing (suspects + éliminations), Guessing (votes)
 */

import { motion, AnimatePresence } from 'framer-motion';
import PlayerBanner from '@/components/game/PlayerBanner';

const ACCENT = '#00e5ff';

export function ChoosingWaitPhase() {
  return (
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
                  Pose des questions, observe les comportements, devine la règle.
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
                    Prépare-toi
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.25)', fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif" }}>
                      {state.revealPhase
                        ? 'Sélection en cours...'
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
                      ? 'Règle choisie ! La partie va commencer...'
                      : state.revealPhase
                        ? 'Les joueurs ont voté, la règle va être révélée !'
                        : 'Les joueurs choisissent une règle secrète'}
                  </span>
                </div>

                {/* Tips */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { icon: '💬', text: 'Pose des questions ouvertes aux joueurs' },
                    { icon: '👁️', text: 'Observe leurs réponses et comportements' },
                    { icon: '🎯', text: 'Tu auras 3 essais pour deviner la règle' },
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
  );
}

export function PlayingInvestPhase({ state, gamePlayers, eliminations, flashUid }) {
  const attemptsLeft = 3 - (state?.guessAttempts || 0);
  return (
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
                  Pose des questions, observe les réponses, devine la règle.
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

                {/* Player rows with PlayerBanner + elimination */}
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[...gamePlayers]
                    .sort((a, b) => (eliminations[a.uid] ? 1 : 0) - (eliminations[b.uid] ? 1 : 0))
                    .map(player => {
                    const isEliminated = !!eliminations[player.uid];
                    return (
                      <motion.div
                        key={player.uid}
                        layout
                        transition={{ layout: { type: 'spring', stiffness: 280, damping: 26 } }}
                        style={{ display: 'grid' }}
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
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
  );
}

export function GuessingInvestPhase({ state, gamePlayers }) {
  const guessVotes = state?.guessVotes || {};
  const attemptsLeft = 3 - (state?.guessAttempts || 0);
  return (
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
                  Pose des questions, observe les réponses, devine la règle.
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
  );
}
