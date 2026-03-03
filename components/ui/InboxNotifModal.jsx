'use client';

import { motion, AnimatePresence } from 'framer-motion';

const GAME_LABELS = {
  semantique: 'Sémantique',
  motmystere: 'Mot Mystère',
  wordle: 'Mot Mystère',
  semantic: 'Sémantique',
};

function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function InboxNotifModal({ notification, onClose }) {
  if (!notification) return null;

  const gameLabel = GAME_LABELS[notification.game] || notification.game;
  const dateLabel = formatDate(notification.date);

  return (
    <AnimatePresence>
      {notification && (
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
              border: '1px solid rgba(255,165,0,0.25)',
              borderRadius: '20px',
              padding: '28px 24px',
              maxWidth: '360px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '10px', lineHeight: 1 }}>👀</div>
              <h2 style={{
                fontFamily: 'var(--font-title, Bungee, sans-serif)',
                fontSize: '1.2rem',
                color: '#fff',
                margin: 0,
              }}>
                On a revu le classement
              </h2>
            </div>

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
                On a détecté un résultat inhabituel sur ta partie de{' '}
                <strong>{gameLabel}</strong>
                {dateLabel ? ` du ${dateLabel}` : ''} et on a préféré la retirer
                du classement pour garder le jeu équitable.
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
                Si tu penses que c&apos;est une erreur, pas de souci — écris-nous !
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '13px 20px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              J&apos;ai compris
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
