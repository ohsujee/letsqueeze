"use client";

/**
 * Footer unifié pour tous les écrans de fin de partie
 * Bouton "Nouvelle partie" avec couleur dynamique selon le jeu
 */
export function EndScreenFooter({ gameColor, onNewGame, label = "Nouvelle partie" }) {
  const footerStyle = {
    flexShrink: 0,
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
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
    color: 'white',
    background: `linear-gradient(135deg, ${gameColor}, ${gameColor}cc)`,
    boxShadow: `0 5px 0 ${gameColor}88, 0 8px 15px ${gameColor}40`,
  };

  return (
    <div style={footerStyle}>
      <button style={buttonStyle} onClick={onNewGame}>
        {label}
      </button>
    </div>
  );
}
