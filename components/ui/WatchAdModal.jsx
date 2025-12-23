'use client';

/**
 * WatchAdModal
 * Modal affichée quand l'utilisateur doit regarder une pub pour jouer
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Zap, Crown, Film } from 'lucide-react';

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '360px',
    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(16, 16, 26, 0.98) 100%)',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
  },
  modalQuiz: {
    border: '1px solid rgba(139, 92, 246, 0.3)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  modalAlibi: {
    border: '1px solid rgba(245, 158, 11, 0.3)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  iconQuiz: {
    width: '72px',
    height: '72px',
    margin: '0 auto 20px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
  },
  iconAlibi: {
    width: '72px',
    height: '72px',
    margin: '0 auto 20px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
  },
  title: {
    fontFamily: "'Bungee', cursive",
    fontSize: '1.375rem',
    color: 'white',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  desc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '0 0 20px 0',
    lineHeight: 1.6,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '999px',
    marginBottom: '24px',
  },
  badgeText: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#4ade80',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  btnWatchAd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.0625rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    cursor: 'pointer',
    boxShadow: '0 4px 0 #15803d, 0 6px 20px rgba(34, 197, 94, 0.3)',
  },
  btnUpgrade: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    cursor: 'pointer',
  },
  noGamesLeft: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: '0 0 8px 0',
    padding: '18px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '14px',
    lineHeight: 1.5,
  },
  spinner: {
    width: '22px',
    height: '22px',
    border: '2.5px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default function WatchAdModal({
  isOpen,
  onClose,
  onWatchAd,
  onUpgrade,
  rewardedGamesRemaining = 0,
  gameType = 'quiz'
}) {
  const [isWatching, setIsWatching] = useState(false);

  if (!isOpen) return null;

  const handleWatchAd = async () => {
    setIsWatching(true);
    const success = await onWatchAd();
    setIsWatching(false);

    if (success) {
      onClose();
    }
  };

  const gameLabel = gameType === 'quiz' ? 'Quiz' : 'Alibi';
  const isAlibi = gameType === 'alibi';

  const modalStyle = {
    ...styles.modal,
    ...(isAlibi ? styles.modalAlibi : styles.modalQuiz),
  };

  const iconStyle = isAlibi ? styles.iconAlibi : styles.iconQuiz;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={styles.overlay}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            style={modalStyle}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Close button */}
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>

            {/* Icon */}
            <div style={iconStyle}>
              <Film size={32} />
            </div>

            {/* Title */}
            <h2 style={styles.title}>Parties gratuites épuisées</h2>

            {/* Description */}
            <p style={styles.desc}>
              Tu as utilisé tes 3 parties {gameLabel} gratuites aujourd'hui.
              {rewardedGamesRemaining > 0 && (
                <> Regarde une courte pub pour débloquer une partie supplémentaire !</>
              )}
            </p>

            {/* Remaining rewarded */}
            {rewardedGamesRemaining > 0 && (
              <motion.div
                style={styles.badge}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Zap size={14} color="#22c55e" />
                <span style={styles.badgeText}>
                  {rewardedGamesRemaining} partie{rewardedGamesRemaining > 1 ? 's' : ''} bonus disponible{rewardedGamesRemaining > 1 ? 's' : ''}
                </span>
              </motion.div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              {rewardedGamesRemaining > 0 ? (
                <motion.button
                  style={{
                    ...styles.btnWatchAd,
                    opacity: isWatching ? 0.7 : 1,
                    cursor: isWatching ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleWatchAd}
                  disabled={isWatching}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98, y: 2 }}
                >
                  {isWatching ? (
                    <div style={styles.spinner} />
                  ) : (
                    <>
                      <Play size={18} />
                      <span>Regarder une pub</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <p style={styles.noGamesLeft}>
                  Tu as utilisé toutes tes parties bonus aujourd'hui.
                  Reviens demain ou passe Pro !
                </p>
              )}

              <motion.button
                style={styles.btnUpgrade}
                onClick={onUpgrade}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Crown size={18} />
                <span>Passer Pro - Illimité</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Keyframes for spinner - injected once */}
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
