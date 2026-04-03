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
 *     game="laregle"
 *     progress="2:45"
 *     title="La Règle"
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
          background: #1a1a2e;
          border-bottom: 3px solid #13132a;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          max-width: 600px;
          margin: 0 auto;
          gap: 12px;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress {
          font-family: 'Bungee', cursive;
          font-size: 0.8rem;
          color: #fff;
          background: var(--game-secondary, #7c3aed);
          border: none;
          border-bottom: 3px solid var(--game-dark, #5b21b6);
          padding: 0 10px;
          min-height: 40px;
          display: flex;
          align-items: center;
          border-radius: 10px;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .game-header-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--flat-text, #c4b5fd);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .my-score-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 0 12px;
          min-height: 40px;
          background: #3a3a58;
          border: none;
          border-bottom: 3px solid #2a2a45;
          border-radius: 10px;
        }

        .my-score-value {
          font-family: 'Bungee', cursive;
          font-size: 1rem;
          color: #fff;
          line-height: 1;
        }

        .my-score-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: #8a8aa0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .team-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: var(--game-secondary, #7c3aed);
          border: none;
          border-bottom: 2px solid var(--game-dark, #5b21b6);
          border-radius: 10px;
        }

        .team-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          color: #fff;
          font-weight: 600;
        }

        .team-score {
          font-family: 'Bungee', cursive;
          font-size: 0.85rem;
          color: #fff;
        }
      `}</style>
    </header>
  );
}
