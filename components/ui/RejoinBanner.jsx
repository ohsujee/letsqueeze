'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RejoinBanner({ activeGame, onDismiss }) {
  const router = useRouter();

  if (!activeGame) return null;

  const handleRejoin = () => {
    router.push(activeGame.rejoinUrl);
  };

  // Build progress text based on phase
  let progressText = '';
  if (activeGame.phase === 'lobby') {
    progressText = 'Lobby - En attente';
  } else if (activeGame.currentProgress) {
    if (activeGame.totalProgress) {
      progressText = `${activeGame.progressLabel} ${activeGame.currentProgress}/${activeGame.totalProgress}`;
    } else {
      progressText = `${activeGame.progressLabel} ${activeGame.currentProgress}`;
    }
  } else if (activeGame.phase) {
    // Fallback: show phase name for other phases
    const phaseNames = {
      'playing': 'En cours',
      'prep': 'Préparation',
      'interrogation': 'Interrogatoire',
      'choosing': 'Choix de la règle',
      'guessing': 'Devinez la règle',
      'reveal': 'Révélation',
      'ended': 'Terminée'
    };
    progressText = phaseNames[activeGame.phase] || activeGame.phase;
  }

  return (
    <AnimatePresence>
      <motion.div
        style={styles.banner}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Glow effect */}
        <div style={styles.glow} />

        {/* Top section: Image + Info + Badge */}
        <div style={styles.topSection}>
          {/* Game image */}
          <div style={styles.imageWrapper}>
            {activeGame.gameImage ? (
              <Image
                src={activeGame.gameImage}
                alt={activeGame.gameName || 'Game'}
                fill
                style={{ objectFit: 'cover', borderRadius: '10px' }}
              />
            ) : (
              <span style={styles.fallbackEmoji}>🎮</span>
            )}
            <div style={styles.pulsingDot} />
          </div>

          {/* Info */}
          <div style={styles.info}>
            <span style={styles.gameName}>{activeGame.gameName || 'Partie en cours'}</span>
            <span style={styles.roomCode}>{activeGame.roomCode}</span>
            {progressText && <span style={styles.progress}>{progressText}</span>}
          </div>

          {/* Status badge */}
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            <span>En cours</span>
          </div>
        </div>

        {/* Bottom section: Actions */}
        <div style={styles.actions}>
          <motion.button
            style={styles.rejoinBtn}
            onClick={handleRejoin}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span>Reprendre la partie</span>
            <ArrowRight size={20} strokeWidth={2.5} />
          </motion.button>
          <motion.button
            style={styles.dismissBtn}
            onClick={onDismiss}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            aria-label="Fermer"
          >
            <X size={20} />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const styles = {
  banner: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '14px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '16px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-30%',
    left: '-15%',
    width: '50%',
    height: '160%',
    background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  topSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    position: 'relative',
    zIndex: 1,
  },
  imageWrapper: {
    position: 'relative',
    width: '60px',
    height: '60px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  fallbackEmoji: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: '1.5rem',
    background: 'rgba(16, 185, 129, 0.15)',
  },
  pulsingDot: {
    position: 'absolute',
    top: '3px',
    right: '3px',
    width: '10px',
    height: '10px',
    background: '#10b981',
    borderRadius: '50%',
    border: '2px solid rgba(10, 10, 20, 0.9)',
    animation: 'pulse 2s ease-in-out infinite',
    zIndex: 2,
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  gameName: {
    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.2,
  },
  roomCode: {
    fontFamily: "var(--font-mono, 'Roboto Mono'), monospace",
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'rgba(16, 185, 129, 0.9)',
    letterSpacing: '0.05em',
  },
  progress: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '2px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    background: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative',
    zIndex: 1,
  },
  rejoinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    flex: 1,
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
  },
  dismissBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'rgba(255, 255, 255, 0.4)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
};
