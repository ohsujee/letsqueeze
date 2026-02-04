"use client";

/**
 * Footer unifié pour tous les écrans de fin de partie
 * Bouton "Nouvelle partie" avec couleur dynamique selon le jeu
 */
export function EndScreenFooter({ gameColor, onNewGame, label = "Nouvelle partie" }) {
  // Calculer si la couleur est très lumineuse (comme le vert #00ff66)
  const isHighBrightness = getColorBrightness(gameColor) > 180;

  // Pour les couleurs lumineuses, assombrir le gradient et utiliser du texte sombre
  const darkenedColor = isHighBrightness ? darkenColor(gameColor, 30) : gameColor;
  const textColor = isHighBrightness ? '#0a0a0f' : 'white';

  const footerStyle = {
    flexShrink: 0,
    padding: '12px 16px',
    // Safe area gérée par AppShell - pas de paddingBottom supplémentaire
    background: 'rgba(10, 10, 15, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: `1px solid ${gameColor}40`,
  };

  const buttonStyle = {
    display: 'block',
    width: '100%',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: textColor,
    background: `linear-gradient(135deg, ${darkenedColor}, ${darkenColor(darkenedColor, 20)})`,
    boxShadow: `0 5px 0 ${darkenedColor}88, 0 8px 15px ${gameColor}40`,
    textShadow: isHighBrightness ? 'none' : '0 1px 2px rgba(0,0,0,0.2)',
  };

  return (
    <div style={footerStyle}>
      <button style={buttonStyle} onClick={onNewGame}>
        {label}
      </button>
    </div>
  );
}

/**
 * Calcule la luminosité perçue d'une couleur (0-255)
 */
function getColorBrightness(hex) {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  // Formule de luminosité perçue
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
