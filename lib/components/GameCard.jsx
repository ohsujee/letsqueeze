'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SealQuestion, Heart } from '@phosphor-icons/react';
import { useCountdownTick, calculateCountdown } from '@/lib/hooks/useCountdownTick';

export default function GameCard({
  game,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  onShowHelp
}) {
  const router = useRouter();
  const [showHeart, setShowHeart] = useState(false);
  const { Illustration, image } = game;

  // Shared countdown tick (single interval for all cards)
  const tick = useCountdownTick();
  const countdown = game.releaseDate ? calculateCountdown(game.releaseDate, tick) : null;

  const handleCardClick = () => {
    if (onClick) {
      onClick(game);
    } else if (game.path) {
      router.push(game.path);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 300);
    onToggleFavorite?.(game.id);
  };

  const handleHelpClick = (e) => {
    e.stopPropagation();
    onShowHelp?.(game.id);
  };

  // Game-specific gradient colors
  const getGradient = () => {
    switch (game.id) {
      case 'quiz': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      case 'alibi': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'deeztest': return 'linear-gradient(135deg, #A238FF, #FF0092)';
      case 'memory': return 'linear-gradient(135deg, #ec4899, #db2777)';
      case 'mime': return 'linear-gradient(135deg, #84cc16, #65a30d)';
      case 'laregle': return 'linear-gradient(135deg, #06b6d4, #0891b2)';
      default: return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
  };

  return (
    <motion.div
      className={`game-card ${game.comingSoon ? 'coming-soon' : ''}`}
      data-game={game.id}
      onClick={handleCardClick}
      whileHover={game.comingSoon ? { y: -4, scale: 1.01 } : { y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{ background: image ? undefined : getGradient() }}
    >
      {/* Background Image */}
      {image && (
        <div
          className="card-bg"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}

      {/* Illustration */}
      {Illustration && (
        <div className="card-illustration">
          <Illustration />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="card-overlay" />

      {/* Coming Soon Badge */}
      {game.comingSoon && (
        <div className="coming-soon-badge">
          À VENIR
        </div>
      )}

      {/* Favorite Button - Top Left */}
      {!game.comingSoon && (
        <motion.button
          className={`card-action-btn favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Heart weight={isFavorite ? 'fill' : 'regular'} size={34} />
        </motion.button>
      )}

      {/* Help Button - Top Right */}
      {!game.comingSoon && onShowHelp && (
        <motion.button
          className="card-action-btn help"
          onClick={handleHelpClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <SealQuestion weight="fill" size={34} />
        </motion.button>
      )}

      {/* Heart Animation */}
      {showHeart && (
        <motion.div
          className="heart-pop"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.3, opacity: 1 }}
          exit={{ scale: 1, opacity: 0 }}
        >
          ❤️
        </motion.div>
      )}

      {/* Countdown - Above title for coming soon games with releaseDate */}
      {game.comingSoon && countdown && (
        <div className="countdown-badge">
          <span className="countdown-label">Disponible dans</span>
          <div className="countdown-values">
            <div className="countdown-unit">
              <span className="countdown-number">{countdown.days}</span>
              <span className="countdown-suffix">j</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-number">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="countdown-suffix">h</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-number">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="countdown-suffix">m</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-number">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="countdown-suffix">s</span>
            </div>
          </div>
        </div>
      )}

      {/* Game Title - Centered */}
      <div className="game-title">
        <h3 className="game-name">{game.name}</h3>
      </div>

      {/* Powered By Pill - Bottom Left */}
      {game.poweredBy && (
        <div className={`powered-pill powered-${game.poweredBy}`}>
          {game.poweredBy === 'deezer' ? 'Deezer' : game.poweredBy}
        </div>
      )}

      {/* Players Pill - Bottom Right (hidden for coming soon) */}
      {game.minPlayers && !game.comingSoon && (
        <div className="players-pill">
          {game.minPlayers}+ joueurs
        </div>
      )}
    </motion.div>
  );
}
