'use client';

/**
 * GameModals — Accuse, Vote, and Accused modals for LOL
 * Pure JSX extraction from play/page.jsx.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Warning, HandPalm, X } from '@phosphor-icons/react';

const ACCENT = '#EF4444';

export default function GameModals({
  // Accuse modal
  showAccuseModal, setShowAccuseModal, accusablePlayers, handleAccuse, myUid,
  // Vote modal
  currentVote, handleVote, voteTimeLeft, players,
  // Accused
  isAccused,
}) {
  return (
    <>
      {/* ACCUSE MODAL — Player selector */}
      <AnimatePresence>
        {showAccuseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setShowAccuseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '360px',
                background: '#14141e',
                borderRadius: '20px',
                border: `1px solid ${ACCENT}30`,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '20px 20px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                  Qui a rigolé ?
                </h3>
                <button
                  onClick={() => setShowAccuseModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
                    padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div style={{
                padding: '8px 12px 16px',
                maxHeight: '50vh', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {accusablePlayers.map((player) => (
                  <motion.button
                    key={player.uid}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAccuse(player.uid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px',
                      background: player.uid === myUid ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${player.uid === myUid ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', flex: 1 }}>
                      {player.name}
                      {player.uid === myUid && (
                        <span style={{ color: 'rgba(255,215,0,0.6)', fontSize: '0.75rem', marginLeft: '6px' }}>
                          (moi-meme)
                        </span>
                      )}
                    </span>
                    {player.yellowCards >= 1 && <span>🟡</span>}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VOTE MODAL */}
      <AnimatePresence>
        {currentVote && !isAccused && !isEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{
                width: '100%', maxWidth: '360px',
                background: '#14141e',
                borderRadius: '20px',
                border: `1px solid ${ACCENT}40`,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <Warning size={40} weight="fill" color={ACCENT} style={{ marginBottom: '12px' }} />

              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                {players.find(p => p.uid === currentVote.accusedId)?.name || '?'} a rigolé ?
              </h3>

              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                Accusé par {players.find(p => p.uid === currentVote.accuserId)?.name || '?'}
              </p>

              {/* Vote timer */}
              <div style={{
                margin: '0 0 20px',
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                <Timer size={14} weight="bold" color="rgba(255,255,255,0.5)" />
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: voteTimeLeft < 5000 ? ACCENT : '#fff',
                }}>
                  {voteTimeLeft !== null ? Math.ceil(voteTimeLeft / 1000) : '--'}s
                </span>
              </div>

              {!hasVoted && currentVote.accuserId !== myUid ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote(true)}
                    style={{
                      flex: 1, padding: '14px',
                      background: ACCENT, border: 'none', borderRadius: '14px',
                      color: '#fff', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Oui
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote(false)}
                    style={{
                      flex: 1, padding: '14px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '14px',
                      color: '#fff', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Non
                  </motion.button>
                </div>
              ) : (
                <div style={{
                  padding: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem', fontWeight: 700,
                }}>
                  {currentVote.accuserId === myUid ? 'Tu as accusé — vote OUI auto' : 'Vote enregistré !'}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCUSED MODAL — Fun notification for the accused */}
      <AnimatePresence>
        {currentVote && isAccused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                width: '100%', maxWidth: '340px',
                background: '#14141e',
                borderRadius: '24px',
                border: `2px solid ${ACCENT}60`,
                padding: '32px 24px',
                textAlign: 'center',
                boxShadow: `0 0 60px ${ACCENT}30`,
              }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ fontSize: '3rem', marginBottom: '16px' }}
              >
                😱
              </motion.div>

              <h2 style={{
                margin: '0 0 8px',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.2rem',
                color: ACCENT,
                textShadow: `0 0 20px ${ACCENT}66`,
              }}>
                On t'accuse !
              </h2>

              <p style={{
                margin: '0 0 20px',
                fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.4,
              }}>
                {players.find(p => p.uid === currentVote.accuserId)?.name || '?'} dit que tu as rigolé...
                <br />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  Les autres votent en ce moment
                </span>
              </p>

              {/* Waiting animation */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ACCENT,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
