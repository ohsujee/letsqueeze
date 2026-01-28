'use client';

import { useRouter } from 'next/navigation';
import ExitButton from '@/lib/components/ExitButton';
import { GAME_COLORS } from '@/lib/config/colors';

/**
 * GamePlayHeader - Header unifié pour les pages play/host
 *
 * Remplace les headers dupliqués dans toutes les pages de jeu.
 *
 * Usage:
 *   <GamePlayHeader
 *     game="quiz"
 *     progress="3/10"
 *     title="Culture Générale"
 *     score={120}
 *     onExit={handleExit}
 *   />
 *
 *   // Mode équipe
 *   <GamePlayHeader
 *     game="alibi"
 *     progress="Q5"
 *     title="Interrogatoire"
 *     teamName="Les Suspects"
 *     teamScore={3}
 *     onExit={handleExit}
 *   />
 *
 *   // Sans score
 *   <GamePlayHeader
 *     game="laloi"
 *     progress="2:45"
 *     title="La Loi"
 *     showScore={false}
 *   />
 */
export default function GamePlayHeader({
  game = 'quiz',
  progress,
  title,
  score,
  showScore = true,
  teamName,
  teamScore,
  onExit,
  exitMessage = 'Voulez-vous vraiment quitter ? Votre score sera conservé.',
  className = '',
  children,
}) {
  const router = useRouter();
  const gameColor = GAME_COLORS[game]?.primary || '#8b5cf6';

  const handleExit = async () => {
    if (onExit) {
      await onExit();
    } else {
      router.push('/home');
    }
  };

  return (
    <header
      className={`game-play-header ${game} ${className}`}
      style={{ '--game-color': gameColor }}
    >
      <div className="game-header-content">
        {/* Left side - Progress & Title */}
        <div className="game-header-left">
          {progress && <div className="game-header-progress">{progress}</div>}
          {title && <div className="game-header-title">{title}</div>}
        </div>

        {/* Right side - Score & Exit */}
        <div className="game-header-right">
          {/* Team info */}
          {teamName && (
            <div className="team-badge">
              <span className="team-name">{teamName}</span>
              {teamScore !== undefined && (
                <span className="team-score">{teamScore} pts</span>
              )}
            </div>
          )}

          {/* Individual score */}
          {showScore && score !== undefined && !teamName && (
            <div className="my-score-badge">
              <span className="my-score-value">{score}</span>
              <span className="my-score-label">pts</span>
            </div>
          )}

          {/* Custom children (e.g., extra buttons) */}
          {children}

          {/* Exit button */}
          <ExitButton
            variant="header"
            confirmMessage={exitMessage}
            onExit={handleExit}
          />
        </div>
      </div>

      <style jsx>{`
        .game-play-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress {
          font-family: 'Bungee', cursive;
          font-size: 1rem;
          color: var(--game-color);
          white-space: nowrap;
        }

        .game-header-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          color: white;
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .my-score-badge {
          display: flex;
          align-items: baseline;
          gap: 3px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .my-score-value {
          font-family: 'Bungee', cursive;
          font-size: 1.1rem;
          color: var(--game-color);
        }

        .my-score-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .team-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .team-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          color: var(--game-color);
          font-weight: 600;
        }

        .team-score {
          font-family: 'Bungee', cursive;
          font-size: 0.9rem;
          color: white;
        }

        /* Game-specific border colors */
        .game-play-header.quiz {
          border-bottom-color: rgba(139, 92, 246, 0.2);
        }

        .game-play-header.alibi {
          border-bottom-color: rgba(245, 158, 11, 0.2);
        }

        .game-play-header.blindtest {
          border-bottom-color: rgba(16, 185, 129, 0.2);
        }

        .game-play-header.deeztest {
          border-bottom-color: rgba(162, 56, 255, 0.2);
        }

        .game-play-header.laloi {
          border-bottom-color: rgba(6, 182, 212, 0.2);
        }
      `}</style>
    </header>
  );
}
