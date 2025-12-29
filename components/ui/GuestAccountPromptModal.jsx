'use client';

/**
 * GuestAccountPromptModal
 * Shows after 3 games for guest users to encourage account creation
 * Non-intrusive: dismissable, respects 24h cooldown or 3 more games delay
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { storage } from '@/lib/utils/storage';

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
    maxWidth: '380px',
    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(16, 16, 26, 0.99) 100%)',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
    border: '2px solid rgba(139, 92, 246, 0.3)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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
  emoji: {
    fontSize: '3.5rem',
    marginBottom: '16px',
    display: 'inline-block',
  },
  title: {
    fontFamily: "'Bungee', cursive",
    fontSize: '1.5rem',
    color: 'white',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  desc: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  error: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '16px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    color: '#ef4444',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '12px',
  },
  btnGoogle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '16px',
    background: '#ffffff',
    color: '#1f1f1f',
    border: 'none',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
  },
  btnApple: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '16px',
    background: '#000000',
    color: '#ffffff',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  btnLater: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    border: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};

export default function GuestAccountPromptModal({ isOpen, onClose, onConnected }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        // Clear the guest prompt tracking
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
        onConnected?.();
        onClose();
      }
    } catch (err) {
      console.error('Google connection error:', err);
      setError('Erreur de connexion');
      setLoadingGoogle(false);
    }
  };

  const handleAppleConnect = async () => {
    try {
      setLoadingApple(true);
      setError(null);
      const result = await signInWithApple();
      if (result?.user) {
        await initializeUserProfile(result.user);
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
        onConnected?.();
        onClose();
      }
    } catch (err) {
      console.error('Apple connection error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Connexion Apple bientôt disponible !');
      } else {
        setError('Erreur de connexion');
      }
      setLoadingApple(false);
    }
  };

  const handleLater = () => {
    // Set cooldown: don't show again for 24h
    storage.set('guestPromptDismissedAt', Date.now());
    // Reset games counter to delay by 3 more games
    storage.set('guestGamesPlayed', 0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={styles.overlay}
          onClick={handleLater}
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
              onClick={handleLater}
              whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={20} />
            </motion.button>

            {/* Emoji */}
            <motion.div
              style={styles.emoji}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🎮
            </motion.div>

            {/* Title */}
            <h2 style={styles.title}>Tu kiffes le jeu ?</h2>

            {/* Description */}
            <p style={styles.desc}>
              Crée un compte pour sauvegarder ta progression et ne rien perdre !
            </p>

            {/* Error */}
            {error && <div style={styles.error}>{error}</div>}

            {/* Connect Buttons */}
            <div style={styles.buttons}>
              <motion.button
                style={{
                  ...styles.btnGoogle,
                  opacity: (loadingGoogle || loadingApple) ? 0.6 : 1,
                  cursor: (loadingGoogle || loadingApple) ? 'wait' : 'pointer',
                }}
                onClick={handleGoogleConnect}
                disabled={loadingGoogle || loadingApple}
                whileHover={(loadingGoogle || loadingApple) ? {} : { scale: 1.02, y: -2 }}
                whileTap={(loadingGoogle || loadingApple) ? {} : { scale: 0.98 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loadingGoogle ? 'Connexion...' : 'Continuer avec Google'}
              </motion.button>

              <motion.button
                style={{
                  ...styles.btnApple,
                  opacity: (loadingGoogle || loadingApple) ? 0.6 : 1,
                  cursor: (loadingGoogle || loadingApple) ? 'wait' : 'pointer',
                }}
                onClick={handleAppleConnect}
                disabled={loadingGoogle || loadingApple}
                whileHover={(loadingGoogle || loadingApple) ? {} : { scale: 1.02, y: -2 }}
                whileTap={(loadingGoogle || loadingApple) ? {} : { scale: 0.98 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {loadingApple ? 'Connexion...' : 'Continuer avec Apple'}
              </motion.button>
            </div>

            {/* Later button */}
            <motion.button
              style={styles.btnLater}
              onClick={handleLater}
              whileHover={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              Plus tard
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
