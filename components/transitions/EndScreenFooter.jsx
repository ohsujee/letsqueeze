"use client";

/**
 * Footer unifié pour tous les écrans de fin de partie
 * Style flat cartoon avec couleur dynamique selon le jeu
 */
export function EndScreenFooter({ gameColor = '#8b5cf6', onNewGame, label = "Nouvelle partie" }) {
  const darkerColor = darkenColor(gameColor, 30);

  return (
    <div style={{
      flexShrink: 0,
      padding: '12px 16px',
      background: '#0e0e1a',
    }}>
      <button
        onClick={onNewGame}
        style={{
          display: 'block',
          width: '100%',
          padding: '16px 24px',
          border: 'none',
          borderBottom: `5px solid ${darkerColor}`,
          borderRadius: '14px',
          cursor: 'pointer',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '1rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#fff',
          background: gameColor,
        }}
      >
        {label}
      </button>
    </div>
  );
}

function darkenColor(hex, amount) {
  const color = hex.replace('#', '');
  const r = Math.max(0, parseInt(color.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(color.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(color.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
