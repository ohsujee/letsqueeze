'use client';

import { motion } from 'framer-motion';

/**
 * LobbyStartButton — Bouton flat cartoon pour lancer la partie
 * Couleur dynamique selon le jeu
 */
export default function LobbyStartButton({
  gameColor = '#8b5cf6',
  icon,
  label = 'Commencer',
  disabled = false,
  onClick,
  loading = false,
}) {
  const darkerColor = darkenColor(gameColor, 30);
  const isHighBrightness = getColorBrightness(gameColor) > 180;
  const textColor = isHighBrightness ? '#0a0a0f' : '#fff';

  return (
    <motion.button
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '16px 24px',
        background: disabled ? '#222240' : gameColor,
        border: 'none',
        borderBottom: disabled ? '4px solid #1a1a35' : `5px solid ${darkerColor}`,
        borderRadius: '14px',
        color: disabled ? '#6b6b8a' : textColor,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      whileTap={disabled ? {} : { y: 3 }}
    >
      {loading ? (
        <div style={{
          width: 20,
          height: 20,
          border: '3px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </motion.button>
  );
}

function getColorBrightness(hex) {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function darkenColor(hex, amount) {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(color.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(color.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
