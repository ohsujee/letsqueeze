'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useBackHandler } from '@/lib/hooks/useBackHandler';

const EXAMPLES = [
  { label: '2 essais, 4 min', before: '5 600', after: '5 251', highlight: false },
  { label: '3 essais, 30 sec', before: '6 700', after: '4 841', highlight: true },
];

export default function WordleScoreUpdateModal({ isOpen, onClose }) {
  useBackHandler(onClose, isOpen);

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
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <p style={{ margin: '0 0 12px 0' }}>
                Les <strong style={{ color: '#4ade80' }}>essais priment toujours</strong> sur la vitesse. Le temps ne sert plus qu&apos;à départager à égalité.
              </p>

              {/* Comparison table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {EXAMPLES.map(({ label, before, after, highlight }) => (
                  <div
                    key={label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center',
                      gap: '8px',
                      background: highlight ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.04)',
                      border: highlight ? '1px solid rgba(74,222,128,0.2)' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: highlight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,100,100,0.7)', textDecoration: 'line-through', whiteSpace: 'nowrap' }}>
                      {before}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ade80', whiteSpace: 'nowrap' }}>
                      {after} pts
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                Les scores passés ont été recalculés pour tout le monde.
              </p>
            </div>

            {/* Button */}
            <motion.button
              onClick={onClose}
              whileHover={{ opacity: 0.88 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669, #10b981)',
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
              Compris !
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
