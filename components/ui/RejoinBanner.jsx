'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from '@phosphor-icons/react';
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

          {/* Status badge — flat */}
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
            whileTap={{ y: 2 }}
          >
            <span>Reprendre la partie</span>
            <ArrowRight weight="bold" size={20} />
          </motion.button>
          <motion.button
            style={styles.dismissBtn}
            onClick={onDismiss}
            whileTap={{ scale: 0.95 }}
            aria-label="Fermer"
          >
            <X weight="bold" size={18} />
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
    background: '#0a3028',
    border: 'none',
    borderBottom: '3px solid #063d2e',
    borderRadius: '14px',
    marginBottom: '20px',
    overflow: 'hidden',
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
    border: '2px solid #22c55e',
  },
  fallbackEmoji: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: '1.5rem',
    background: '#0d4035',
  },
  pulsingDot: {
    position: 'absolute',
    top: '3px',
    right: '3px',
    width: '10px',
    height: '10px',
    background: '#22c55e',
    borderRadius: '50%',
    border: '2px solid #0a3028',
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
    color: '#22c55e',
    letterSpacing: '0.05em',
  },
  progress: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b6b8a',
    marginTop: '2px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: '#22c55e',
    border: 'none',
    borderBottom: '2px solid #16a34a',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: '6px',
    height: '6px',
    background: '#fff',
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
    background: '#22c55e',
    border: 'none',
    borderBottom: '3px solid #16a34a',
    borderRadius: '12px',
    color: 'white',
    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  dismissBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#222240',
    border: 'none',
    borderBottom: '2px solid #1a1a35',
    borderRadius: '10px',
    color: '#6b6b8a',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
