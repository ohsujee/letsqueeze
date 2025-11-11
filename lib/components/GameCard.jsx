'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GameCard({
  game,
  isLocked = false,
  isFavorite = false,
  onToggleFavorite,
  onClick,
  user
}) {
  const router = useRouter();
  const [showHeart, setShowHeart] = useState(false);
  const { Illustration, image } = game;

  const handleCardClick = () => {
    // Use custom onClick handler if provided, otherwise use path-based navigation
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

  // Determine glow color based on game type
  const getGlowColor = () => {
    switch (game.id) {
      case 'quiz': return 'var(--glow-violet)';
      case 'alibi': return 'var(--glow-sunset)';
      case 'buzzer': return 'var(--glow-neon)';
      default: return 'var(--glow-electric)';
    }
  };

  return (
    <div
      className={`game-card ${game.id}`}
      onClick={handleCardClick}
    >
      {/* Custom Illustration or Image Background */}
      {Illustration ? (
        <div className="card-illustration">
          <Illustration />
        </div>
      ) : image ? (
        <div
          className="card-background"
          style={{ backgroundImage: `url(${image})` }}
        />
      ) : null}

      {/* Gradient Overlay (lighter for illustrations) */}
      <div className={`card-overlay ${Illustration ? 'illustration-overlay' : ''}`}></div>

      {/* Lock Badge - Glassmorphism */}
      {isLocked && (
        <div className="lock-badge glass">
          <span className="lock-icon">🔒</span>
          <span className="lock-text">Pro</span>
        </div>
      )}

      {/* Favorite Button - Glassmorphism */}
      <button
        className={`favorite-btn glass ${isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
      >
        {isFavorite ? '❤️' : '🤍'}
      </button>

      {/* Heart Animation */}
      {showHeart && (
        <div className="heart-animation">❤️</div>
      )}

      {/* Game Info */}
      <div className="game-info">
        <h3 className="game-name">{game.name}</h3>
        <p className="game-players">{game.players}</p>
      </div>

      {/* Gradient Border (visible on hover) */}
      <div className="card-border"></div>

      <style jsx>{`
        .game-card {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 2;
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.3s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          box-shadow: var(--shadow-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          isolation: isolate;
        }

        /* Hover State - Lift + Subtle Glow */
        .game-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow:
            var(--shadow-lg),
            0 0 30px ${getGlowColor()};
        }

        .game-card:active {
          transform: translateY(-2px) scale(1.01);
          transition: all 0.1s var(--spring-smooth);
        }

        /* Background Image */
        .card-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: 0;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .game-card:hover .card-background {
          transform: scale(1.1);
        }

        /* Custom Illustration */
        .card-illustration {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
        }

        .card-illustration :global(svg) {
          width: 100%;
          height: 100%;
          max-width: 85%;
          max-height: 85%;
          transform: scale(1);
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .game-card:hover .card-illustration :global(svg) {
          transform: scale(1.05) rotate(1deg);
        }

        /* Gradient Overlay + Vignette Effect */
        .card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.85) 0%,
              rgba(0, 0, 0, 0.4) 50%,
              rgba(0, 0, 0, 0.2) 70%,
              transparent 100%
            ),
            radial-gradient(
              circle at center,
              transparent 40%,
              rgba(0, 0, 0, 0.3) 100%
            );
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.3s ease;
        }

        /* Lighter overlay for illustrations */
        .card-overlay.illustration-overlay {
          background:
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.75) 0%,
              rgba(0, 0, 0, 0.3) 50%,
              rgba(0, 0, 0, 0.1) 80%,
              transparent 100%
            );
        }

        .game-card:hover .card-overlay {
          opacity: 0.85;
        }

        .game-card:hover .card-overlay.illustration-overlay {
          opacity: 0.9;
        }

        /* Gradient Border (hover glow) */
        .card-border {
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
          border-radius: var(--radius-lg);
          padding: 2px;
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 3;
        }

        .game-card.quiz .card-border {
          background: var(--game-quiz-gradient);
        }

        .game-card.alibi .card-border {
          background: var(--game-alibi-gradient);
        }

        .game-card.buzzer .card-border {
          background: var(--game-buzzer-gradient);
        }

        .game-card:hover .card-border {
          opacity: 0.6;
        }

        /* Glassmorphism Badges */
        .glass {
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--glass-border);
          box-shadow:
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        /* Lock Badge */
        .lock-badge {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 4;
          transition: all 0.2s ease;
        }

        .lock-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .lock-icon {
          font-size: 0.875rem;
          line-height: 1;
        }

        .lock-text {
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Favorite Button */
        .favorite-btn {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          border: none;
          min-width: 44px;
          min-height: 44px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          font-size: 1.25rem;
          z-index: 4;
        }

        .favorite-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .favorite-btn:active {
          transform: scale(0.95);
        }

        .favorite-btn.active {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
        }

        /* Heart Animation */
        .heart-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 5rem;
          animation: heartPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          z-index: 5;
          filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.8));
        }

        @keyframes heartPop {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        /* Game Info */
        .game-info {
          position: relative;
          z-index: 2;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .game-card:hover .game-info {
          transform: translateY(-4px);
        }

        .game-name {
          font-family: var(--font-display);
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-extrabold);
          color: white;
          margin-bottom: var(--space-1);
          text-shadow:
            0 2px 6px rgba(0, 0, 0, 0.8),
            0 0 16px ${getGlowColor()};
          line-height: var(--line-height-tight);
          letter-spacing: var(--letter-spacing-tight);
        }

        .game-players {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.9);
          font-weight: var(--font-weight-medium);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
          letter-spacing: 0.01em;
        }

        /* Game-specific fallback colors (if no image) */
        .game-card.quiz {
          background: var(--game-quiz-gradient);
        }

        .game-card.alibi {
          background: var(--game-alibi-gradient);
        }

        .game-card.buzzer {
          background: var(--game-buzzer-gradient);
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .game-card {
            padding: var(--space-4);
            min-height: 200px;
          }

          .game-name {
            font-size: var(--font-size-lg);
          }

          .game-players {
            font-size: var(--font-size-xs);
          }

          .favorite-btn,
          .lock-badge {
            top: var(--space-2);
          }

          .favorite-btn {
            left: var(--space-2);
          }

          .lock-badge {
            right: var(--space-2);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .game-card,
          .card-background,
          .game-info,
          .favorite-btn,
          .lock-badge {
            transition: none;
          }

          .heart-animation {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
