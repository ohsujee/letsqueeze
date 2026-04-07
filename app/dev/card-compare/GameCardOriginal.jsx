'use client';

import { Heart, SealQuestion } from '@phosphor-icons/react';
import './game-card-original.css';

/**
 * GameCardOriginal — Reproduit le style original des game cards
 * (glow néon, aspect 4/5, box-shadow, hover zoom, glassmorphism pills)
 * Usage: page card-compare uniquement (app/dev/)
 */
export default function GameCardOriginal({ game }) {
  const { image } = game;

  return (
    <div
      className={`gc-og ${game.comingSoon ? 'gc-og--soon' : ''}`}
      data-game={game.id}
    >
      {/* Background Image */}
      {image && (
        <div className="gc-og-bg">
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* Overlay */}
      <div className="gc-og-overlay" />

      {/* Coming Soon Badge */}
      {game.comingSoon && (
        <div className="gc-og-soon-badge">À VENIR</div>
      )}

      {/* Favorite — top left */}
      {!game.comingSoon && (
        <div className="gc-og-action gc-og-fav">
          <Heart weight="regular" size={34} />
        </div>
      )}

      {/* Help — top right */}
      {!game.comingSoon && (
        <div className="gc-og-action gc-og-help">
          <SealQuestion weight="fill" size={34} />
        </div>
      )}

      {/* Title with glow */}
      <div className="gc-og-title">
        <h3 className="gc-og-name">{game.name}</h3>
      </div>

      {/* New Badge */}
      {game.isNew && !game.comingSoon && (
        <div className="gc-og-new">NOUVEAU</div>
      )}

      {/* Powered By */}
      {game.poweredBy && !game.isNew && (
        <div className={`gc-og-powered ${game.poweredBy}`}>
          {game.poweredBy === 'deezer' ? 'Deezer' : game.poweredBy}
        </div>
      )}

      {/* Players pill */}
      {game.minPlayers && !game.comingSoon && (
        <div className="gc-og-players">{game.minPlayers}+ joueurs</div>
      )}
    </div>
  );
}
