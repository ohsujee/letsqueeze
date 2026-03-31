'use client';

/**
 * GuessVoteSheet — Bottom sheet de vote sur la devinette de l'enquêteur
 */

import { motion, AnimatePresence } from 'framer-motion';
import PlayerBanner from '@/components/game/PlayerBanner';

const ACCENT = '#00e5ff';

export default function GuessVoteSheet({ state, gamePlayers, handleCancelGuess }) {
  const guessVotes = state?.guessVotes || {};
  const attemptsLeft = 3 - (state?.guessAttempts || 0);

  return (
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

  );
}
