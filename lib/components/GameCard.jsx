'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function GameCard({
  game,
  isLocked = false,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  user,
  comingSoon = false
}) {
  const router = useRouter();
  const [showHeart, setShowHeart] = useState(false);
  const { Illustration, image } = game;

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
      case 'blindtest': return 'linear-gradient(135deg, #10b981, #059669)';
      case 'memory': return 'linear-gradient(135deg, #ec4899, #db2777)';
      default: return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
  };

  return (
    <motion.div
      className="game-card"
      data-game={game.id}
      onClick={handleCardClick}
      whileHover={{ y: -8, scale: 1.02 }}
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

      {/* Lock Badge */}
      {isLocked && !game.comingSoon && (
        <div className="lock-badge">
          <span>🔒</span>
          <span>Pro</span>
        </div>
      )}

      {/* Favorite Button */}
      <motion.button
        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isFavorite ? '❤️' : '🤍'}
      </motion.button>

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

      {/* Game Title - Centered */}
      <div className="game-title">
        <h3 className="game-name">{game.name}</h3>
      </div>

      {/* Players Pill - Bottom Right */}
      <div className="players-pill">
        Jusqu'à 20
      </div>
    </motion.div>
  );
}
