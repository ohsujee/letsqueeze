'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal shown when the daily word changes at midnight (Paris time).
 * Blocks interaction until the player acknowledges the new day.
 */
export default function MidnightModal({ isOpen, previousDate, newDate, onPlayNewWord }) {
  if (!isOpen) return null;

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%',
              maxWidth: '340px',
              background: 'linear-gradient(170deg, #1a1a2e 0%, #0d0d1a 100%)',
              borderRadius: '20px',
              border: '1px solid rgba(249, 115, 22, 0.15)',
              boxShadow: '0 0 60px rgba(249, 115, 22, 0.08), 0 24px 48px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Top glow bar */}
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, transparent, #f97316, #fb923c, #f97316, transparent)',
              opacity: 0.8,
            }} />

            <div style={{ padding: '32px 28px 28px' }}>
              {/* Clock icon */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
                style={{
                  width: '72px',
                  height: '72px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, rgba(249, 115, 22, 0.2), rgba(249, 115, 22, 0.05))',
                  border: '2px solid rgba(249, 115, 22, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                }}
              >
                🕛
              </motion.div>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Bungee', sans-serif",
                fontSize: '1.15rem',
                color: '#fff',
                textAlign: 'center',
                margin: '0 0 6px',
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(249, 115, 22, 0.5)',
              }}>
                MINUIT EST PASSÉ !
              </h2>

              {/* Subtitle */}
              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.55)',
                textAlign: 'center',
                margin: '0 0 24px',
                lineHeight: 1.5,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Le mot du jour a changé
              </p>

              {/* Info card */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.06)',
                border: '1px solid rgba(249, 115, 22, 0.12)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>✓</span>
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    Progression du <span style={{ color: '#fff', fontWeight: 600 }}>{fmtDate(previousDate)}</span> sauvegardée
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(249, 115, 22, 0.15)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>★</span>
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    Nouveau mot disponible pour le <span style={{ color: '#f97316', fontWeight: 600 }}>{fmtDate(newDate)}</span>
                  </span>
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onPlayNewWord}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff',
                  fontFamily: "'Bungee', sans-serif",
                  fontSize: '0.9rem',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(249, 115, 22, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                JOUER LE MOT DU JOUR
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
