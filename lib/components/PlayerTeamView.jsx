'use client';

import { useState } from 'react';

export default function PlayerTeamView({ teams, players, currentPlayerUid }) {
  const teamsSorted = Object.keys(teams).map(id => ({ id, ...teams[id] }));
  const currentPlayer = players.find(p => p.uid === currentPlayerUid);
  const myTeamId = currentPlayer?.teamId;

  return (
    <div className="player-team-view">
      <h3 className="view-title">Équipes</h3>

      {/* Player's Team Highlighted */}
      {myTeamId && (
        <div className="my-team-banner">
          <span className="banner-emoji">⭐</span>
          <span className="banner-text">
            Tu es dans l'équipe : <strong>{teams[myTeamId]?.name}</strong>
          </span>
        </div>
      )}

      {/* All Teams Grid */}
      <div className="teams-grid">
        {teamsSorted.map((team) => {
          const teamPlayers = players.filter(p => p.teamId === team.id);
          const isMyTeam = team.id === myTeamId;

          return (
            <div
              key={team.id}
              className={`team-card ${isMyTeam ? 'my-team' : ''}`}
            >
              {/* Team Header */}
              <div className="team-header">
                <div
                  className="team-color-dot"
                  style={{ backgroundColor: team.color }}
                />
                <h4 className="team-name">{team.name}</h4>
                <span className="team-count">{teamPlayers.length}</span>
              </div>

              {/* Team Players */}
              <div className="team-players">
                {teamPlayers.length === 0 ? (
                  <div className="empty-text">Aucun joueur</div>
                ) : (
                  teamPlayers.map(player => {
                    const isMe = player.uid === currentPlayerUid;
                    return (
                      <div
                        key={player.uid}
                        className={`player-tag ${isMe ? 'me' : ''}`}
                        style={isMe && isMyTeam ? { backgroundColor: team.color } : {}}
                      >
                        {isMe && '👤 '}
                        {player.name}
                      </div>
                    );
                  })
                )}
              </div>

              {/* My Team Indicator */}
              {isMyTeam && (
                <div className="team-badge" style={{ backgroundColor: team.color }}>
                  C'est ton équipe !
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning if not assigned */}
      {!myTeamId && (
        <div className="warning-banner">
          <span className="warning-emoji">⚠️</span>
          <div className="warning-text">
            <strong>Tu n'es pas encore assigné à une équipe</strong>
            <br />
            <span className="warning-sub">L'animateur va t'assigner bientôt</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .player-team-view {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .view-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* My Team Banner */
        .my-team-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
          border: 2px solid rgba(139, 92, 246, 0.4);
          border-radius: 14px;
          color: var(--text-primary, #ffffff);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.15);
        }

        .banner-emoji {
          font-size: 1.5rem;
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.5));
        }

        .banner-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 1rem;
          font-weight: 500;
        }

        .banner-text strong {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          color: var(--quiz-glow, #a78bfa);
        }

        /* Teams Grid */
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
        }

        .team-card {
          position: relative;
          padding: 1rem;
          background: rgba(20, 20, 30, 0.6);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .team-card.my-team {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08));
          border-color: rgba(139, 92, 246, 0.4);
          transform: scale(1.02);
          box-shadow:
            0 8px 24px rgba(139, 92, 246, 0.2),
            0 0 40px rgba(139, 92, 246, 0.1);
        }

        .team-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .team-card.my-team:hover {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow:
            0 12px 32px rgba(139, 92, 246, 0.25),
            0 0 50px rgba(139, 92, 246, 0.15);
        }

        /* Team Header */
        .team-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .team-color-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 12px currentColor;
        }

        .team-name {
          flex: 1;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
          margin: 0;
        }

        .team-count {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 0.5rem;
          background: rgba(139, 92, 246, 0.25);
          border-radius: 14px;
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--quiz-glow, #a78bfa);
        }

        /* Team Players */
        .team-players {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-height: 60px;
        }

        .empty-text {
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          font-style: italic;
          text-align: center;
          padding: 0.75rem;
        }

        .player-tag {
          padding: 0.625rem 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: var(--text-primary, #ffffff);
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .player-tag.me {
          font-weight: 700;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
          border: 2px solid rgba(139, 92, 246, 0.4);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
        }

        /* Team Badge */
        .team-badge {
          position: absolute;
          top: -10px;
          right: 12px;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.4),
            0 0 20px currentColor;
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 2px solid rgba(245, 158, 11, 0.3);
          border-radius: 14px;
          color: var(--text-primary, #ffffff);
        }

        .warning-emoji {
          font-size: 1.5rem;
          flex-shrink: 0;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        .warning-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .warning-text strong {
          font-weight: 700;
          color: var(--alibi-glow, #fbbf24);
        }

        .warning-sub {
          font-size: 0.8125rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .teams-grid {
            grid-template-columns: 1fr;
          }

          .my-team-banner {
            padding: 0.875rem;
          }

          .banner-text {
            font-size: 0.9375rem;
          }

          .team-card {
            padding: 0.875rem;
          }

          .team-card.my-team {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
