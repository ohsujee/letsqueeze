'use client';

/**
 * ReviewPromptProvider
 * Global provider that shows the review prompt modal when conditions are met
 *
 * Triggers when:
 * - User navigates to a lobby page
 * - Conditions are met (7+ days installed, 5+ games played, 90+ days since last ask)
 * - Native platform (iOS/Android)
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useAppReview } from '@/lib/hooks/useAppReview';

export const ReviewPromptContext = createContext(null);

// Session key to prevent showing multiple times per session
const SESSION_KEY = 'reviewPromptShownThisSession';

// Lobby route patterns
const LOBBY_PATTERNS = [
  /^\/room\/[A-Z0-9]+$/i,
  /^\/deeztest\/room\/[A-Z0-9]+$/i,
  /^\/alibi\/room\/[A-Z0-9]+$/i,
  /^\/laregle\/room\/[A-Z0-9]+$/i,
];

function isLobbyRoute(pathname) {
  return LOBBY_PATTERNS.some(pattern => pattern.test(pathname));
}

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
    maxWidth: '340px',
    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(16, 16, 26, 0.99) 100%)',
    borderRadius: '24px',
    padding: '32px 24px',
    textAlign: 'center',
    border: '2px solid rgba(139, 92, 246, 0.3)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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
  mascot: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  title: {
    fontFamily: "'Bungee', cursive",
    fontSize: '1.5rem',
    color: 'white',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  buttons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  btnSecondary: {
    padding: '14px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
  },
};

export function ReviewPromptProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { shouldShowPrompt, onDecline, onConfirm } = useAppReview();
  const hasCheckedRef = useRef(false);

  // Check when navigating to a lobby
  useEffect(() => {
    // Reset check flag when leaving lobby
    if (!isLobbyRoute(pathname)) {
      hasCheckedRef.current = false;
      return;
    }

    // Don't check twice on same lobby visit
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Don't show if already shown this session
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
      return;
    }

    // Check conditions
    if (!shouldShowPrompt()) {
      return;
    }

    // Small delay to let lobby load
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, 'true');
      }
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname, shouldShowPrompt]);

  const handleClose = useCallback(() => {
    onDecline();
    setIsOpen(false);
  }, [onDecline]);

  const handleConfirm = useCallback(async () => {
    setIsOpen(false);
    await onConfirm();
  }, [onConfirm]);

  return (
    <ReviewPromptContext.Provider value={{}}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            style={styles.overlay}
            onClick={handleClose}
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
                onClick={handleClose}
                whileHover={{ scale: 1.1, background: 'rgba(255, 255, 255, 0.1)' }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={20} />
              </motion.button>

              {/* Mascot */}
              <div style={styles.mascot}>
                <Image
                  src="/images/mascot/giggly-excited.webp"
                  alt="Giggly"
                  width={100}
                  height={100}
                  priority
                />
              </div>

              {/* Title */}
              <h2 style={styles.title}>Tu t'amuses bien ?</h2>

              {/* Subtitle */}
              <p style={styles.subtitle}>
                Ton avis compte beaucoup pour nous !
              </p>

              {/* Buttons */}
              <div style={styles.buttons}>
                <motion.button
                  style={styles.btnSecondary}
                  onClick={handleClose}
                  whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.08)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Bof...
                </motion.button>
                <motion.button
                  style={styles.btnPrimary}
                  onClick={handleConfirm}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Oui !
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ReviewPromptContext.Provider>
  );
}
