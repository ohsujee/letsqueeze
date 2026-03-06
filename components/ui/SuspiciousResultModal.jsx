'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';

export default function SuspiciousResultModal({ isOpen, onAccept, onPlayAlternative, isWatchingAd = false }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="srm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '28px 16px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Mascotte + Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src="/images/mascot/giggly-curious.webp"
                alt="Giggly"
                style={{ width: 100, height: 100, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }}
              />
              <h2 style={{
                fontFamily: 'var(--font-title, Bungee, sans-serif)',
                fontSize: '1.3rem',
                color: '#fff',
                margin: 0,
                letterSpacing: '0.02em',
              }}>
                Oulà, première tentative ?
              </h2>
            </div>

            {/* Body text */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <p style={{ margin: '0 0 10px 0' }}>
                C&apos;est statistiquement quasi-impossible de trouver le mot du premier coup…
                Tu aurais eu de l&apos;aide ? 😏
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                Pas de jugement — mais pour garder le classement équitable pour tout le monde,
                ton résultat ne sera pas affiché aujourd&apos;hui.
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                (Si c&apos;était vraiment toi, toutes nos excuses — tu es juste un vrai génie.)
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.button
                onClick={onPlayAlternative}
                disabled={isWatchingAd}
                whileHover={isWatchingAd ? {} : { opacity: 0.88 }}
                whileTap={isWatchingAd ? {} : { scale: 0.98 }}
                style={{
                  position: 'relative',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: isWatchingAd ? 'wait' : 'pointer',
                  opacity: isWatchingAd ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  letterSpacing: '0.01em',
                  overflow: 'visible',
                }}
              >
                {/* Sticker PUB */}
                {!isWatchingAd && (
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    right: -4,
                    background: 'white',
                    color: '#7c3aed',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    padding: '3px 7px',
                    borderRadius: 5,
                    transform: 'rotate(8deg)',
                    letterSpacing: '0.1em',
                    fontFamily: "'Space Grotesk', sans-serif",
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
                  }}>
                    Pub
                  </div>
                )}
                <Play size={15} fill="white" strokeWidth={0} />
                {isWatchingAd ? 'Chargement...' : 'Jouer un autre mot'}
              </motion.button>
              <div>
                <button
                  onClick={onAccept}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Je comprends
                </button>
                <p style={{
                  margin: '6px 0 0',
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.28)',
                }}>
                  Tu ne seras pas classé pour cette partie.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
