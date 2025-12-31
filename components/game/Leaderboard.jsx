'use client';

/**
 * Leaderboard - Composant de classement réutilisable
 * Utilisé côté host et player pour afficher le classement des joueurs
 */
export default function Leaderboard({ players = [], currentPlayerUid = null }) {
  // Trier par score décroissant
  const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <span className="leaderboard-title">Classement</span>
        <span className="leaderboard-count">{players.length} joueurs</span>
      </div>
      <div className="leaderboard-list">
        {sorted.map((p, i) => {
          const isMe = currentPlayerUid && p.uid === currentPlayerUid;
          const rankClass = i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : '';

          return (
            <div
              key={p.uid}
              className={`player-row ${rankClass} ${isMe ? 'is-me' : ''}`}
            >
              <span className="player-rank">
                {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="rank-number">{i + 1}</span>}
              </span>
              <span className="player-name">
                {p.name}
                {isMe && <span className="you-badge">vous</span>}
              </span>
              <span className="player-score">{p.score || 0}</span>
            </div>
          );
        })}
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
          border-radius: 16px;
          padding: 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-sizing: border-box;
          overflow: hidden;
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .leaderboard-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 0.9rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .leaderboard-count {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--quiz-glow, #a78bfa);
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .leaderboard-list {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
        }

        .leaderboard-list::-webkit-scrollbar { width: 4px; }
        .leaderboard-list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
        .leaderboard-list::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.4); border-radius: 2px; }

        .player-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(20, 20, 30, 0.6);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .player-row.first {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1));
          border-color: rgba(255, 215, 0, 0.6);
        }

        .player-row.second {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.08));
          border-color: rgba(192, 192, 192, 0.5);
        }

        .player-row.third {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.08));
          border-color: rgba(205, 127, 50, 0.5);
        }

        .player-row.is-me {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15)) !important;
          border-color: rgba(139, 92, 246, 0.7) !important;
        }

        .player-rank {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 1rem;
        }

        .rank-number {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          background: rgba(255, 255, 255, 0.08);
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-name {
          flex: 1;
          min-width: 0;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .you-badge {
          display: inline;
          font-size: 0.55rem;
          padding: 2px 6px;
          margin-left: 6px;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .player-score {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
          margin-left: auto;
          background: rgba(34, 197, 94, 0.12);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .no-players {
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          padding: 16px;
        }
      `}</style>
    </div>
  );
}
