'use client';

import GameLoader from './GameLoader';
import { GAME_COLORS } from '@/lib/config/colors';

/**
 * LoadingScreen - Plein écran de chargement pour les pages
 *
 * Remplace les patterns de loading dupliqués dans les pages.
 * Utilise GameLoader en interne avec theming par jeu.
 *
 * Usage:
 *   <LoadingScreen />
 *   <LoadingScreen game="alibi" />
 *   <LoadingScreen game="quiz" text="Chargement du quiz..." />
 *   <LoadingScreen variant="spinner" />
 */
export default function LoadingScreen({
  game = 'quiz',
  variant = 'spinner',
  size = 'lg',
  text = null,
  className = '',
}) {
  // Get color from game config or fallback to quiz
  const gameColor = GAME_COLORS[game]?.primary || GAME_COLORS.quiz.primary;

  return (
    <div className={`loading-screen ${game} ${className}`}>
      <GameLoader
        variant={variant}
        size={size}
        color={gameColor}
        text={text}
      />
      <style jsx>{`
        .loading-screen {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #0a0a0f);
        }

        /* Game-specific backgrounds */
        .loading-screen.quiz {
          background: radial-gradient(
            ellipse at center,
            rgba(139, 92, 246, 0.1) 0%,
            #0a0a0f 70%
          );
        }

        .loading-screen.alibi {
          background: radial-gradient(
            ellipse at center,
            rgba(245, 158, 11, 0.1) 0%,
            #0a0a0f 70%
          );
        }

        .loading-screen.deeztest {
          background: radial-gradient(
            ellipse at center,
            rgba(162, 56, 255, 0.1) 0%,
            #0a0a0f 70%
          );
        }

        .loading-screen.laloi {
          background: radial-gradient(
            ellipse at center,
            rgba(6, 182, 212, 0.1) 0%,
            #0a0a0f 70%
          );
        }

        .loading-screen.mime {
          background: radial-gradient(
            ellipse at center,
            rgba(0, 255, 102, 0.1) 0%,
            #0a0a0f 70%
          );
        }
      `}</style>
    </div>
  );
}

/**
 * SimpleSpinner - Spinner CSS simple sans Framer Motion
 * Pour les cas où on veut un spinner léger
 */
export function SimpleSpinner({
  size = 40,
  color = '#8b5cf6',
  thickness = 3,
  className = '',
}) {
  return (
    <div
      className={`simple-spinner ${className}`}
      style={{
        width: size,
        height: size,
        border: `${thickness}px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
      }}
    >
      <style jsx>{`
        .simple-spinner {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * InlineLoader - Petit loader pour inline/boutons
 */
export function InlineLoader({
  size = 16,
  color = 'currentColor',
}) {
  return (
    <div
      className="inline-loader"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
      }}
    >
      <style jsx>{`
        .inline-loader {
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
