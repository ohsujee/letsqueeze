'use client';

import { motion } from 'framer-motion';

/**
 * PlayerPresenceIndicator - Indicateur visuel du statut de connexion d'un joueur
 *
 * Affiche un point coloré selon le statut:
 * - 🟢 Vert: online (heartbeat récent)
 * - 🟡 Jaune: uncertain (heartbeat > seuil mais < 1.5x seuil)
 * - 🔴 Rouge: offline
 * - ⚫ Gris: unknown (pas de données)
 *
 * @param {Object} props
 * @param {string} props.status - 'online' | 'uncertain' | 'offline' | 'unknown'
 * @param {number} props.size - Taille en pixels (défaut: 10)
 * @param {boolean} props.pulse - Animer le point (défaut: true pour online)
 * @param {boolean} props.showLabel - Afficher le label textuel (défaut: false)
 * @param {string} props.className - Classes CSS additionnelles
 */
export function PlayerPresenceIndicator({
  status = 'unknown',
  size = 10,
  pulse = null,
  showLabel = false,
  className = ''
}) {
  // Déterminer si on pulse (par défaut: seulement pour online)
  const shouldPulse = pulse !== null ? pulse : status === 'online';

  // Configuration par status
  const statusConfig = {
    online: {
      color: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.5)',
      label: 'En ligne'
    },
    uncertain: {
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.5)',
      label: 'Connexion instable'
    },
    offline: {
      color: '#ef4444',
      glow: 'rgba(239, 68, 68, 0.5)',
      label: 'Hors ligne'
    },
    unknown: {
      color: '#6b7280',
      glow: 'rgba(107, 114, 128, 0.3)',
      label: 'Inconnu'
    }
  };

  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <div
      className={`presence-indicator ${className}`}
      title={config.label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      <motion.span
        className="presence-dot"
        animate={shouldPulse ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        } : {}}
        transition={shouldPulse ? {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        } : {}}
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 ${size * 0.8}px ${config.glow}`,
          flexShrink: 0
        }}
      />
      {showLabel && (
        <span
          style={{
            fontSize: '0.75rem',
            color: config.color,
            fontFamily: 'var(--font-body, Inter), sans-serif',
            fontWeight: 500
          }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * PlayerPresenceBadge - Badge avec nom du joueur et indicateur de présence
 *
 * Combine le nom du joueur avec l'indicateur de présence.
 * Utile pour les listes de joueurs dans le lobby.
 *
 * @param {Object} props
 * @param {string} props.name - Nom du joueur
 * @param {string} props.status - 'online' | 'uncertain' | 'offline' | 'unknown'
 * @param {boolean} props.isHost - Si le joueur est l'hôte
 * @param {string} props.gameColor - Couleur du jeu pour le badge host
 */
export function PlayerPresenceBadge({
  name,
  status = 'unknown',
  isHost = false,
  gameColor = '#06b6d4'
}) {
  return (
    <div className="presence-badge">
      <PlayerPresenceIndicator status={status} size={8} />
      <span className="presence-badge-name">{name}</span>
      {isHost && (
        <span
          className="presence-badge-host"
          style={{ '--host-color': gameColor }}
        >
          Host
        </span>
      )}

      <style jsx>{`
        .presence-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .presence-badge-name {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .presence-badge-host {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          background: var(--host-color);
          color: #0a0a0f;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

/**
 * PresenceLegend - Légende des indicateurs de présence
 *
 * Affiche une légende explicative des différents statuts.
 * Utile pour l'interface host.
 */
export function PresenceLegend({ compact = false }) {
  const statuses = [
    { status: 'online', label: 'Connecté' },
    { status: 'uncertain', label: 'Instable' },
    { status: 'offline', label: 'Déconnecté' }
  ];

  if (compact) {
    return (
      <div className="presence-legend compact">
        {statuses.map(({ status, label }) => (
          <div key={status} className="legend-item">
            <PlayerPresenceIndicator status={status} size={6} pulse={false} />
            <span>{label}</span>
          </div>
        ))}

        <style jsx>{`
          .presence-legend.compact {
            display: flex;
            gap: 12px;
            font-size: 0.7rem;
            color: rgba(255, 255, 255, 0.5);
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="presence-legend">
      <div className="legend-title">Statut connexion</div>
      <div className="legend-items">
        {statuses.map(({ status, label }) => (
          <div key={status} className="legend-item">
            <PlayerPresenceIndicator status={status} size={8} pulse={false} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .presence-legend {
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }

        .legend-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 10px;
        }

        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}

export default PlayerPresenceIndicator;
