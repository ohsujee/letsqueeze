'use client';

/**
 * PlayingPhase — Phase de jeu active avec règle secrète, équipe et éliminations
 */

import { motion, AnimatePresence } from 'framer-motion';
import PlayerBanner from '@/components/game/PlayerBanner';
import { getCategoryDisplayName, getDifficultyInfo } from '@/data/laregle-rules';

const ACCENT = '#00e5ff';

export default function PlayingPhase({
  state, code, myUid, players, civilPlayers,
  isRuleRevealed, setIsRuleRevealed,
  eliminations, flashUid, reportMode, setReportMode,
  amIEliminated, handleEliminate, handleContestElimination,
}) {
  return (
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

  );
}
