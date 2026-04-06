'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, X } from '@phosphor-icons/react';

/**
 * ConfirmModal — Modal flat réutilisable pour garde-fou
 * Utilisée par tous les jeux pour Passer / Fin / etc.
 */
function ConfirmModal({ isOpen, title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgb(8, 8, 15, 0.92)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            style={{
              background: '#1a1a2e',
              borderBottom: '4px solid #13132a',
              borderRadius: 18,
              padding: 28,
              maxWidth: 360,
              width: '100%',
              textAlign: 'center',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{
              fontFamily: "'Bungee', cursive",
              fontSize: '1.1rem',
              color: '#fff',
              margin: '0 0 12px',
            }}>
              {title}
            </h2>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.85rem',
              color: '#c4b5fd',
              margin: '0 0 24px',
              lineHeight: 1.5,
            }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  minHeight: 48,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  background: '#4a3a8a',
                  border: 'none',
                  borderBottom: '4px solid #3a2a70',
                  borderRadius: 12,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1,
                  minHeight: 48,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  background: confirmColor || '#ef4444',
                  border: 'none',
                  borderBottom: `4px solid ${confirmColor === '#f59e0b' ? '#d97706' : confirmColor === '#ef4444' ? '#b91c1c' : '#b91c1c'}`,
                  borderRadius: 12,
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * HostActionFooter - Footer d'actions partagé entre Host et Asker (Party Mode)
 * Boutons: Passer, Fin — avec modales de confirmation
 * Réutilisable par tous les jeux.
 */
export default function HostActionFooter({ onSkip, onEnd }) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  return (
    <footer className="game-footer">
      <div className="host-actions">
        <button className="action-btn action-skip" onClick={() => setShowSkipConfirm(true)}>
          <SkipForward size={18} weight="bold" />
          <span>Passer</span>
        </button>
        <button className="action-btn action-end" onClick={() => setShowEndConfirm(true)}>
          <X size={18} weight="bold" />
          <span>Fin</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={showSkipConfirm}
        title="Passer la question ?"
        message="La question sera passée et personne ne marquera de points."
        confirmLabel="Passer"
        confirmColor="#f59e0b"
        onConfirm={() => { setShowSkipConfirm(false); onSkip?.(); }}
        onCancel={() => setShowSkipConfirm(false)}
      />

      <ConfirmModal
        isOpen={showEndConfirm}
        title="Terminer la partie ?"
        message="La partie se termine et tous les joueurs verront le classement final."
        confirmLabel="Terminer"
        confirmColor="#ef4444"
        onConfirm={() => { setShowEndConfirm(false); onEnd?.(); }}
        onCancel={() => setShowEndConfirm(false)}
      />
    </footer>
  );
}

// Export pour réutilisation dans d'autres jeux
export { ConfirmModal };
