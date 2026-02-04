'use client';

import { motion } from 'framer-motion';

/**
 * LobbyStartButton - Bouton "Démarrer la partie" réutilisable pour tous les lobbies
 *
 * @param {string} gameColor - Couleur principale du jeu (ex: '#8b5cf6' pour Quiz)
 * @param {string|ReactNode} icon - Emoji ou composant React à afficher (ex: '🚀' ou <MySvg />)
 * @param {string} label - Texte du bouton (défaut: 'Démarrer la partie')
 * @param {string} loadingLabel - Texte pendant le chargement (défaut: 'Lancement...')
 * @param {boolean} disabled - État désactivé
 * @param {boolean} loading - État de chargement
 * @param {function} onClick - Callback au clic
 */
export default function LobbyStartButton({
  gameColor = '#8b5cf6',
  icon = '🚀',
  label = 'Démarrer la partie',
  loadingLabel = 'Lancement...',
  disabled = false,
  loading = false,
  onClick
}) {
  const isDisabled = disabled || loading;
  const canAnimate = !isDisabled;

  // Détecter les couleurs très lumineuses (comme #00ff66)
  const isHighBrightness = getColorBrightness(gameColor) > 180;

  // Pour les couleurs lumineuses, utiliser une version assombrie et du texte sombre
  const effectiveColor = isHighBrightness ? darkenColor(gameColor, 40) : gameColor;
  const textColor = isHighBrightness ? '#0a0a0f' : 'white';

  const colorDark = adjustColor(effectiveColor, -20);
  const glowColor = `${gameColor}66`; // 40% opacity (garder le glow avec la couleur originale)
  const glowColorStrong = `${gameColor}99`; // 60% opacity

  const baseStyles = {
    width: '100%',
    height: '7vh',
    minHeight: '52px',
    padding: '0 24px',
    background: `linear-gradient(135deg, ${effectiveColor}, ${colorDark})`,
    border: 'none',
    borderRadius: '1.8vh',
    color: textColor,
    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    fontWeight: 700,
    fontSize: '2vh',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: isDisabled
      ? `0 2px 10px ${gameColor}26, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
      : `0 4px 20px ${glowColor}, 0 0 30px ${gameColor}33, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
    opacity: isDisabled ? 0.5 : 1,
    transition: 'box-shadow 0.3s ease, transform 0.2s ease',
  };

  const iconStyles = {
    fontSize: '2.2vh',
    minWidth: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const spinnerStyles = {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'lobby-btn-spin 0.8s linear infinite',
  };

  return (
    <>
      <motion.button
        style={baseStyles}
        onClick={isDisabled ? undefined : onClick}
        disabled={isDisabled}
        whileHover={canAnimate ? {
          scale: 1.02,
          y: -2,
          boxShadow: `0 8px 35px ${glowColorStrong}, 0 0 50px ${gameColor}66`
        } : {}}
        whileTap={canAnimate ? {
          scale: 0.98,
          y: 1,
          boxShadow: `0 2px 15px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`
        } : {}}
      >
        {loading ? (
          <div style={spinnerStyles} />
        ) : (
          <span style={iconStyles}>{icon}</span>
        )}
        <span>{loading ? loadingLabel : label}</span>
      </motion.button>

      <style jsx global>{`
        @keyframes lobby-btn-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

/**
 * Ajuste une couleur hex en l'assombrissant ou l'éclaircissant
 */
function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Calcule la luminosité perçue d'une couleur (0-255)
 */
function getColorBrightness(hex) {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Assombrit une couleur hex
 */
function darkenColor(hex, amount) {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(color.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(color.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
