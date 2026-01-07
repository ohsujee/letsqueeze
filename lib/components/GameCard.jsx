'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function GameCard({
  game,
  isFavorite = false,
  onToggleFavorite,
  onClick
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

      {/* Powered By Pill - Bottom Left */}
      {game.poweredBy && (
        <div className={`powered-pill powered-${game.poweredBy}`}>
          {game.poweredBy === 'deezer' ? 'Deezer' :
           game.poweredBy === 'spotify' ? 'Spotify' : game.poweredBy}
        </div>
      )}

      {/* Players Pill - Bottom Right */}
      {game.minPlayers && (
        <div className="players-pill">
          {game.minPlayers}+ joueurs
        </div>
      )}
    </motion.div>
  );
}
