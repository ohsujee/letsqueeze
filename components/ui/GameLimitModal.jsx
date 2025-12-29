'use client';

/**
 * GameLimitModal
 * Affiche quand l'utilisateur a atteint sa limite de parties gratuites
 * Propose de regarder une pub pour une partie bonus ou de passer Pro
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Crown, Film } from 'lucide-react';

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
    maxWidth: '380px',
    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(16, 16, 26, 0.99) 100%)',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
    border: '2px solid rgba(139, 92, 246, 0.3)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15)',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    margin: '0 auto 20px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
  },
  title: {
    fontFamily: "'Bungee', cursive",
    fontSize: '1.25rem',
    color: 'white',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  remaining: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.875rem',
    color: '#fbbf24',
    fontWeight: 600,
    marginBottom: '20px',
    padding: '8px 16px',
    background: 'rgba(251, 191, 36, 0.1)',
    borderRadius: '8px',
    display: 'inline-block',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  btnAd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #15803d, 0 6px 20px rgba(34, 197, 94, 0.3)',
  },
  btnPro: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 0 #6d28d9, 0 6px 20px rgba(139, 92, 246, 0.3)',
  },
  btnClose: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    cursor: 'pointer',
    marginTop: '4px',
  },
};

export default function GameLimitModal({
  isOpen,
  onClose,
  onWatchAd,
  onUpgrade,
  isWatchingAd = false,
}) {
  if (!isOpen) return null;

  // On peut toujours regarder une pub (illimité)
  const canWatchAd = true;

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
            style={styles.modal}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Close Button */}
            <motion.button
              style={styles.closeBtn}
              onClick={onClose}
              whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={20} />
            </motion.button>

            {/* Icon */}
            <div style={styles.iconContainer}>
              <Play size={36} />
            </div>

            {/* Title */}
            <h2 style={styles.title}>
              Parties gratuites épuisées
            </h2>

            {/* Subtitle */}
            <p style={styles.subtitle}>
              Tu as utilisé tes 3 parties gratuites du jour. Regarde une pub pour continuer à jouer !
            </p>

            {/* Actions */}
            <div style={styles.actions}>
              {/* Watch Ad Button */}
              {canWatchAd && (
                <motion.button
                  style={{
                    ...styles.btnAd,
                    opacity: isWatchingAd ? 0.6 : 1,
                    cursor: isWatchingAd ? 'wait' : 'pointer',
                  }}
                  onClick={onWatchAd}
                  disabled={isWatchingAd}
                  whileHover={isWatchingAd ? {} : { scale: 1.02, y: -2 }}
                  whileTap={isWatchingAd ? {} : { scale: 0.98 }}
                >
                  <Film size={20} />
                  {isWatchingAd ? 'Chargement...' : 'Regarder une pub'}
                </motion.button>
              )}

              {/* Upgrade to Pro */}
              <motion.button
                style={styles.btnPro}
                onClick={onUpgrade}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Crown size={20} />
                Passer Pro - Illimité
              </motion.button>

              {/* Close */}
              <motion.button
                style={styles.btnClose}
                onClick={onClose}
                whileHover={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                Plus tard
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
