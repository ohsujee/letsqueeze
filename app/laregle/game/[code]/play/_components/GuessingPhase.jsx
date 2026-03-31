'use client';

/**
 * GuessingPhase — Phase de devinette (vote sur la proposition de l'enquêteur)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const ACCENT = '#00e5ff';

export default function GuessingPhase({ state, myUid, onGuessVote }) {
  return (
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
                      onClick={() => onGuessVote(true)}
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
                      onClick={() => onGuessVote(false)}
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

  );
}
