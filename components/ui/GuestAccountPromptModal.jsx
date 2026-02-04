'use client';

/**
 * GuestAccountPromptModal
 * Self-contained component - add to any lobby page
 * Shows after 2+ completed games for guest users (non-hosts) to encourage account creation
 *
 * Usage: <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { useToast } from '@/lib/hooks/useToast';
import { GoogleIcon, AppleIcon } from '@/components/icons';

const SESSION_KEY_SHOWN = 'guestPromptShown';
const SESSION_KEY_GAMES = 'guestGamesCompleted';
const MIN_GAMES_BEFORE_PROMPT = 2;

// Private helpers
function wasGuestPromptShown() {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SESSION_KEY_SHOWN) === 'true';
}

function markGuestPromptShown() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY_SHOWN, 'true');
}

function shouldShowGuestPrompt() {
  if (typeof window === 'undefined') return false;
  if (wasGuestPromptShown()) return false;
  const gamesCompleted = parseInt(sessionStorage.getItem(SESSION_KEY_GAMES) || '0', 10);
  return gamesCompleted >= MIN_GAMES_BEFORE_PROMPT;
}

// Public helper - call from END pages to increment counter
export function incrementGuestGamesCompleted() {
  if (typeof window === 'undefined') return 0;
  const current = parseInt(sessionStorage.getItem(SESSION_KEY_GAMES) || '0', 10);
  const newCount = current + 1;
  sessionStorage.setItem(SESSION_KEY_GAMES, String(newCount));
  return newCount;
}

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

/**
 * Self-contained guest account prompt modal
 * Handles all display logic internally - just pass currentUser and isHost
 */
export default function GuestAccountPromptModal({ currentUser, isHost, onConnected }) {
  const { isAndroid } = usePlatform();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [error, setError] = useState(null);

  // Self-managed display logic
  useEffect(() => {
    // Not a guest user
    if (!currentUser?.isAnonymous) return;
    // Hosts create rooms, they're not guests joining
    if (isHost) return;
    // Already shown or not enough games played
    if (!shouldShowGuestPrompt()) return;

    // Small delay to let lobby load
    const timer = setTimeout(() => {
      markGuestPromptShown();
      setIsOpen(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentUser, isHost]);

  if (!isOpen) return null;

  const handleClose = () => setIsOpen(false);

  const handleGoogleConnect = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        markGuestPromptShown();
        toast.success('Connecté avec Google !');
        onConnected?.();
        handleClose();
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
        markGuestPromptShown();
        toast.success('Connecté avec Apple !');
        onConnected?.();
        handleClose();
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
    // Mark as shown so it won't appear again this session
    markGuestPromptShown();
    handleClose();
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
            <h2 style={styles.title}>T'aimes le jeu ?</h2>

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
                <GoogleIcon />
                {loadingGoogle ? 'Connexion...' : 'Continuer avec Google'}
              </motion.button>

              {!isAndroid && (
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
                  <AppleIcon />
                  {loadingApple ? 'Connexion...' : 'Continuer avec Apple'}
                </motion.button>
              )}
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
