'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreUpdateModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
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
              padding: '28px 20px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Mascotte + Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src="/images/mascot/giggly-excited.webp"
                alt="Giggly"
                style={{ width: 90, height: 90, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }}
              />
              <h2 style={{
                fontFamily: 'var(--font-title, Bungee, sans-serif)',
                fontSize: '1.2rem',
                color: '#fff',
                margin: 0,
                letterSpacing: '0.02em',
              }}>
                Nouveau système de points !
              </h2>
            </div>

            {/* Body */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <p style={{ margin: '0 0 12px 0' }}>
                On a revu le calcul des scores de Sémantique pour un meilleur équilibre.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                marginBottom: '12px',
              }}>
                {[
                  { label: '5 essais', before: '1 000', after: '4 167' },
                  { label: '20 essais', before: '250', after: '2 564' },
                  { label: '100 essais', before: '100', after: '840' },
                ].map(({ label, before, after }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '8px 6px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,100,100,0.8)', textDecoration: 'line-through' }}>{before} pts</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ade80' }}>{after} pts</div>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                Les scores passés ont également été recalculés pour tout le monde.
              </p>
            </div>

            {/* Button */}
            <motion.button
              onClick={onClose}
              whileHover={{ opacity: 0.88 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 20px',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              C&apos;est parti ! 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
