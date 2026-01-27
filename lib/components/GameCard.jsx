'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// Helper to format countdown with days, hours, minutes, seconds
function formatCountdown(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) return null; // Released!

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export default function GameCard({
  game,
  isFavorite = false,
  onToggleFavorite,
  onClick
}) {
  const router = useRouter();
  const [showHeart, setShowHeart] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const { Illustration, image } = game;

  // Countdown timer for games with releaseDate (updates every second)
  useEffect(() => {
    if (!game.releaseDate) return;

    const updateCountdown = () => {
      const formatted = formatCountdown(game.releaseDate);
      setCountdown(formatted);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [game.releaseDate]);

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

  // Game-specific gradient colors
  const getGradient = () => {
    switch (game.id) {
      case 'quiz': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      case 'alibi': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'deeztest': return 'linear-gradient(135deg, #A238FF, #FF0092)'; // Deezer purple/pink
      case 'blindtest': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'memory': return 'linear-gradient(135deg, #ec4899, #db2777)';
      case 'mime': return 'linear-gradient(135deg, #84cc16, #65a30d)';
      case 'trouveregle': return 'linear-gradient(135deg, #06b6d4, #0891b2)'; // Cyan
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

      {/* Favorite Button - Hidden for coming soon games */}
      {!game.comingSoon && (
        <motion.button
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isFavorite ? '❤️' : '🤍'}
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
          {game.poweredBy === 'deezer' ? 'Deezer' :
           game.poweredBy === 'spotify' ? 'Spotify' : game.poweredBy}
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
