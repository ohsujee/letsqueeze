'use client';

/**
 * GuestWarningModal — Flat Cartoon Style
 * Modal affichée quand un utilisateur veut jouer sans compte
 */

import { useState, useEffect } from 'react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { UserMinus, ArrowRight } from '@phosphor-icons/react';
import { shouldShowAppleSignIn, isIOSDevice } from '@/lib/services/authService';
import { GoogleIcon, AppleIcon } from '@/components/icons';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(8, 8, 15, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '360px',
    background: '#1a1a2e',
    borderRadius: '20px',
    padding: '32px 24px',
    textAlign: 'center',
    border: 'none',
    borderBottom: '4px solid #13132a',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
  },
  iconContainer: {
    width: '72px',
    height: '72px',
    margin: '0 auto 20px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    background: '#f59e0b',
    border: 'none',
    borderBottom: '3px solid #b45309',
  },
  title: {
    fontFamily: "'Bungee', cursive",
    fontSize: '1.25rem',
    color: 'white',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  desc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: '#6b6b8a',
    margin: '0 0 24px 0',
    lineHeight: 1.6,
  },
  highlight: {
    color: '#fbbf24',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  btnGoogle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: '#ffffff',
    color: '#1f1f1f',
    border: 'none',
    borderBottom: '3px solid #d1d5db',
    borderRadius: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnApple: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '16px',
    background: '#000000',
    color: '#ffffff',
    border: 'none',
    borderBottom: '3px solid #333333',
    borderRadius: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px',
    background: '#222240',
    color: '#6b6b8a',
    border: 'none',
    borderBottom: '2px solid #1a1a35',
    borderRadius: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
};

export default function GuestWarningModal({
  isOpen,
  onClose,
  onContinueAsGuest,
  onSignInGoogle,
  onSignInApple,
  onSignIn,
  context = 'onboarding'
}) {
  const [showApple, setShowApple] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useBackHandler(onClose, isOpen);

  useEffect(() => {
    setShowApple(shouldShowAppleSignIn());
    setIsIOS(isIOSDevice());
  }, []);

  if (!isOpen) return null;

  const isHomeContext = context === 'home';
  const handleGoogleSignIn = onSignInGoogle || onSignIn;

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
            {/* Icon */}
            <div style={styles.iconContainer}>
              <UserMinus weight="fill" size={32} />
            </div>

            {/* Title */}
            <h2 style={styles.title}>
              {isHomeContext ? 'Connexion requise' : 'Mode invité limité'}
            </h2>

            {/* Description */}
            <p style={styles.desc}>
              {isHomeContext ? (
                <>
                  Pour <span style={styles.highlight}>créer une partie</span>, tu dois te connecter.
                  <br /><br />
                  Tu peux toujours <span style={styles.highlight}>rejoindre</span> une partie créée par quelqu'un d'autre !
                </>
              ) : (
                <>
                  Sans compte, tu pourras uniquement <span style={styles.highlight}>rejoindre</span> des parties créées par d'autres joueurs.
                  <br /><br />
                  Pour <span style={styles.highlight}>créer tes propres parties</span>, connecte-toi !
                </>
              )}
            </p>

            {/* Actions */}
            <div style={styles.actions}>
              {showApple && isIOS && onSignInApple && (
                <motion.button
                  style={styles.btnApple}
                  onClick={onSignInApple}
                  whileTap={{ scale: 0.98 }}
                >
                  <AppleIcon size={18} />
                  <span>Continuer avec Apple</span>
                </motion.button>
              )}

              <motion.button
                style={styles.btnGoogle}
                onClick={handleGoogleSignIn}
                whileTap={{ scale: 0.98 }}
              >
                <GoogleIcon size={18} />
                <span>Continuer avec Google</span>
              </motion.button>

              {showApple && !isIOS && onSignInApple && (
                <motion.button
                  style={styles.btnApple}
                  onClick={onSignInApple}
                  whileTap={{ scale: 0.98 }}
                >
                  <AppleIcon size={18} />
                  <span>Continuer avec Apple</span>
                </motion.button>
              )}

              {!isHomeContext && onContinueAsGuest && (
                <motion.button
                  style={styles.btnSecondary}
                  onClick={onContinueAsGuest}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continuer quand même</span>
                  <ArrowRight weight="bold" size={16} />
                </motion.button>
              )}

              {isHomeContext && (
                <motion.button
                  style={styles.btnSecondary}
                  onClick={onClose}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Fermer</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
