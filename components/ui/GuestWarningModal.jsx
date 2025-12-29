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

  // Icônes SVG
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );

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
                  <AppleIcon />
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
                <GoogleIcon />
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
                  <AppleIcon />
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
