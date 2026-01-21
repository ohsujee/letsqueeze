'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

/**
 * Leaderboard - Composant de classement réutilisable avec animations
 * - Score animé (compte progressivement)
 * - Triangle vert ▲ / rouge ▼ pour les changements de position
 * - Animation de glissement quand les positions changent
 * - Largeur fixe pour les scores (4 digits max)
 */
export default function Leaderboard({ players = [], currentPlayerUid = null }) {
  const prevPositionsRef = useRef({});
  const prevScoresRef = useRef({});
  const [displayScores, setDisplayScores] = useState({});
  const [positionChanges, setPositionChanges] = useState({});

  // Sort by score descending
  const sorted = useMemo(() =>
    [...players].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [players]
  );

  // Count active players
  const activeCount = useMemo(() =>
    players.filter(p => !p.status || p.status === 'active').length,
    [players]
  );

  // Track position changes
  useEffect(() => {
    const newPositions = {};
    const newChanges = {};

    sorted.forEach((p, i) => {
      const currentPos = i + 1;
      const prevPos = prevPositionsRef.current[p.uid];
      newPositions[p.uid] = currentPos;

      // Only show triangle if position actually changed
      if (prevPos !== undefined && prevPos !== currentPos) {
        newChanges[p.uid] = prevPos > currentPos ? 'up' : 'down';
        // Clear the indicator after 3s (longer visibility)
        setTimeout(() => {
          setPositionChanges(prev => {
            const updated = { ...prev };
            delete updated[p.uid];
            return updated;
          });
        }, 3000);
      }
    });

    setPositionChanges(prev => ({ ...prev, ...newChanges }));
    prevPositionsRef.current = newPositions;
  }, [sorted]);

  // Animate scores
  useEffect(() => {
    const newScores = {};
    players.forEach(p => {
      newScores[p.uid] = p.score || 0;
    });

    Object.keys(newScores).forEach(uid => {
      const target = newScores[uid];
      const current = displayScores[uid] ?? prevScoresRef.current[uid] ?? target;

      if (current !== target) {
        const diff = target - current;
        const steps = 15; // More steps for smoother animation
        const stepValue = diff / steps;
        let step = 0;

        const interval = setInterval(() => {
          step++;
          if (step >= steps) {
            setDisplayScores(prev => ({ ...prev, [uid]: target }));
            clearInterval(interval);
          } else {
            setDisplayScores(prev => ({
              ...prev,
              [uid]: Math.round(current + stepValue * step)
            }));
          }
        }, 40);
      }
    });

    prevScoresRef.current = newScores;
  }, [players]);

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <span className="leaderboard-title">Classement</span>
        <span className="leaderboard-count">
          {activeCount === players.length
            ? `${players.length} joueurs`
            : `${activeCount}/${players.length} actifs`
          }
        </span>
      </div>
      <div className="leaderboard-list">
        <AnimatePresence>
          {sorted.map((p, i) => {
            const isMe = currentPlayerUid && p.uid === currentPlayerUid;
            const isDisconnected = p.status === 'disconnected' || p.status === 'left';
            const rankClass = i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : '';
            const posChange = positionChanges[p.uid];
            const animatedScore = displayScores[p.uid] ?? p.score ?? 0;

            return (
              <motion.div
                key={p.uid}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{
                  layout: { duration: 0.5, ease: "easeInOut" },
                  opacity: { duration: 0.3 }
                }}
                className={`player-row ${rankClass} ${isMe ? 'is-me' : ''} ${isDisconnected ? 'disconnected' : ''} ${posChange ? `moved-${posChange}` : ''}`}
              >
                <span className="player-rank">
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="rank-number">{i + 1}</span>}
                </span>
                <span className="player-name">
                  {p.name}
                  {isMe && <span className="you-badge">vous</span>}
                  {isDisconnected && <WifiOff size={12} className="disconnected-icon" />}
                </span>
                <div className="score-area">
                  {posChange && (
                    <motion.span
                      className={`pos-triangle ${posChange}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {posChange === 'up' ? '▲' : '▼'}
                    </motion.span>
                  )}
                  <span className="player-score">{animatedScore}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {players.length === 0 && (
          <div className="no-players">Aucun joueur</div>
        )}
      </div>

      <style jsx>{`
        .leaderboard-card,
        .leaderboard-card *,
        .leaderboard-card *::before,
        .leaderboard-card *::after {
          box-sizing: border-box;
        }

        .leaderboard-card {
          width: 100%;
          max-width: 500px;
          flex: 1;
          min-height: 0;
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 2vh;
          padding: 1.5vh 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1vh;
          padding-bottom: 1vh;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .leaderboard-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.8vh;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .leaderboard-count {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.3vh;
          font-weight: 600;
          color: var(--quiz-glow, #a78bfa);
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 0.5vh 1vh;
          border-radius: 1vh;
        }

        .leaderboard-list {
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.8vh;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 0.5vw;
        }

        .leaderboard-list::-webkit-scrollbar { width: 0.4vh; }
        .leaderboard-list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
        .leaderboard-list::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 2px; }

        .leaderboard-card :global(.player-row) {
          display: flex;
          align-items: center;
          gap: 1.5vw;
          padding: 1vh 2vw;
          background: rgba(20, 20, 30, 0.6);
          border-radius: 1.2vh;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          min-width: 0;
          max-width: 100%;
        }

        .leaderboard-card :global(.player-row.moved-up) {
          animation: flash-up 0.8s ease;
        }

        .leaderboard-card :global(.player-row.moved-down) {
          animation: flash-down 0.8s ease;
        }

        @keyframes flash-up {
          0% { background: rgba(34, 197, 94, 0.5); }
          100% { background: rgba(20, 20, 30, 0.6); }
        }

        @keyframes flash-down {
          0% { background: rgba(239, 68, 68, 0.4); }
          100% { background: rgba(20, 20, 30, 0.6); }
        }

        .leaderboard-card :global(.player-row.first) {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1));
          border-color: rgba(255, 215, 0, 0.6);
        }

        .leaderboard-card :global(.player-row.first.moved-up) {
          animation: flash-up-gold 0.8s ease;
        }

        @keyframes flash-up-gold {
          0% { background: rgba(34, 197, 94, 0.6); }
          100% { background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1)); }
        }

        .leaderboard-card :global(.player-row.second) {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.08));
          border-color: rgba(192, 192, 192, 0.5);
        }

        .leaderboard-card :global(.player-row.third) {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.08));
          border-color: rgba(205, 127, 50, 0.5);
        }

        .leaderboard-card :global(.player-row.is-me) {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15)) !important;
          border-color: rgba(139, 92, 246, 0.7) !important;
        }

        .leaderboard-card :global(.player-row.disconnected) {
          opacity: 0.45;
          filter: grayscale(0.6);
        }

        .leaderboard-card :global(.player-row.disconnected) .player-name {
          color: rgba(255, 255, 255, 0.5);
        }

        .leaderboard-card :global(.player-row.disconnected) .player-score {
          color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          text-shadow: none;
        }

        .disconnected-icon {
          display: inline-block;
          margin-left: 1vw;
          color: rgba(239, 68, 68, 0.7);
          vertical-align: middle;
        }

        .player-rank {
          width: 2.5vh;
          height: 2.5vh;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 2vh;
        }

        .rank-number {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.3vh;
          font-weight: 700;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          background: rgba(255, 255, 255, 0.08);
          width: 2.5vh;
          height: 2.5vh;
          border-radius: 0.6vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-name {
          flex: 1;
          min-width: 0;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.6vh;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
          display: flex;
          align-items: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .you-badge {
          display: inline;
          font-size: 1vh;
          padding: 0.3vh 0.6vh;
          margin-left: 1vw;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 0.4vh;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        .score-area {
          display: flex;
          align-items: center;
          gap: 0.8vh;
          margin-left: auto;
          flex-shrink: 0;
        }

        .leaderboard-card :global(.pos-triangle) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.2vh;
          height: 2.2vh;
          border-radius: 0.5vh;
          font-size: 1.1vh;
          font-weight: 700;
          line-height: 1;
        }

        .leaderboard-card :global(.pos-triangle.up) {
          color: #fff;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }

        .leaderboard-card :global(.pos-triangle.down) {
          color: #fff;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        .player-score {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 1.5vh;
          font-weight: 700;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
          background: rgba(34, 197, 94, 0.12);
          padding: 0.5vh 1vh;
          border-radius: 0.8vh;
          border: 1px solid rgba(34, 197, 94, 0.3);
          width: 6vh;
          text-align: center;
        }

        .no-players {
          text-align: center;
          font-size: 1.6vh;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          padding: 2vh;
        }
      `}</style>
    </div>
  );
}
