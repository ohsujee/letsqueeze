"use client";

import { darkenColor } from '@/lib/utils/colorUtils';

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

/* darkenColor importé depuis lib/utils/colorUtils */
