'use client';

import { useRouter } from 'next/navigation';
import ExitButton from '@/lib/components/ExitButton';
import { GAME_COLORS } from '@/lib/config/colors';
import './GamePlayHeader.css';

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

    </header>
  );
}
