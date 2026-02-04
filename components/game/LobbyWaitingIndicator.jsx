'use client';

import { motion } from 'framer-motion';

/**
 * LobbyWaitingIndicator - Indicateur d'attente pour la vue joueur dans les lobbies
 *
 * @param {string} gameColor - Couleur principale du jeu (ex: '#8b5cf6')
 * @param {string} label - Texte affiché (défaut: 'En attente du lancement...')
 */
export default function LobbyWaitingIndicator({
  gameColor = '#8b5cf6',
  label = 'En attente du lancement...'
}) {
  // Animation des dots
  const dotVariants = {
    initial: { y: 0, opacity: 0.4 },
    animate: { y: -8, opacity: 1 }
  };

  const containerStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px 16px calc(24px + var(--safe-area-bottom, 0px))',
    background: 'linear-gradient(to top, var(--bg-primary, #0a0a0f) 70%, transparent)',
    zIndex: 10,
  };

  const dotsContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '40px',
  };

  const dotStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: gameColor,
    boxShadow: `0 0 12px ${gameColor}88`,
  };

  const labelStyle = {
    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '0.02em',
    textAlign: 'center',
  };

  const lineStyle = {
    width: '60px',
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${gameColor}66, transparent)`,
    borderRadius: '1px',
  };

  return (
    <div style={containerStyle}>
      {/* Dots animation */}
      <div style={dotsContainerStyle}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={dotStyle}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.15,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Decorative line */}
      <motion.div
        style={lineStyle}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Label */}
      <span style={labelStyle}>{label}</span>
    </div>
  );
}
