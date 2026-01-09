'use client';

/**
 * GuestWarningModal
 * Modal affichée quand un utilisateur veut jouer sans compte
 * Explique les limitations (rejoindre seulement) et propose de se connecter
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserX, ArrowRight } from 'lucide-react';
import { shouldShowAppleSignIn, isIOSDevice } from '@/lib/services/authService';
import { GoogleIcon, AppleIcon } from '@/components/icons';

// Styles suivant le style guide
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
    border: '1px solid rgba(139, 92, 246, 0.3)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
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
    fontSize: '1.25rem',
    color: 'white',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  desc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem',
    color: 'rgba(255, 255, 255, 0.6)',
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
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.15)',
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
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  btnSecondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
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
  onSignIn, // Legacy prop - utilisé si onSignInGoogle non fourni
  context = 'onboarding' // 'onboarding' ou 'home'
}) {
  const [showApple, setShowApple] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

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
              <UserX size={32} />
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
              {/* Apple Sign-In - Premier sur iOS */}
              {showApple && isIOS && onSignInApple && (
                <motion.button
                  style={styles.btnApple}
                  onClick={onSignInApple}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AppleIcon size={18} />
                  <span>Continuer avec Apple</span>
                </motion.button>
              )}

              {/* Google Sign-In */}
              <motion.button
                style={styles.btnGoogle}
                onClick={handleGoogleSignIn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GoogleIcon size={18} />
                <span>Continuer avec Google</span>
              </motion.button>

              {/* Apple Sign-In - Après Google sur non-iOS */}
              {showApple && !isIOS && onSignInApple && (
                <motion.button
                  style={styles.btnApple}
                  onClick={onSignInApple}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AppleIcon size={18} />
                  <span>Continuer avec Apple</span>
                </motion.button>
              )}

              {/* Continue as Guest (only in onboarding) */}
              {!isHomeContext && onContinueAsGuest && (
                <motion.button
                  style={styles.btnSecondary}
                  onClick={onContinueAsGuest}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continuer quand même</span>
                  <ArrowRight size={16} />
                </motion.button>
              )}

              {/* Close (only in home context) */}
              {isHomeContext && (
                <motion.button
                  style={styles.btnSecondary}
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
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
