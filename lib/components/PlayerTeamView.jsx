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
          gap: var(--space-4);
        }

        .view-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: white;
          margin: 0;
        }

        /* My Team Banner */
        .my-team-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: linear-gradient(135deg, rgba(66, 153, 225, 0.2), rgba(66, 153, 225, 0.1));
          border: 2px solid rgba(66, 153, 225, 0.4);
          border-radius: 12px;
          color: white;
        }

        .banner-emoji {
          font-size: 24px;
        }

        .banner-text {
          font-size: 16px;
          font-weight: 500;
        }

        .banner-text strong {
          font-weight: 700;
          color: var(--brand-electric);
        }

        /* Teams Grid */
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-4);
        }

        .team-card {
          position: relative;
          padding: var(--space-4);
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .team-card.my-team {
          background: rgba(66, 153, 225, 0.15);
          border-color: rgba(66, 153, 225, 0.4);
          transform: scale(1.02);
          box-shadow: 0 4px 16px rgba(66, 153, 225, 0.2);
        }

        .team-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .team-card.my-team:hover {
          border-color: rgba(66, 153, 225, 0.5);
        }

        /* Team Header */
        .team-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }

        .team-color-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px currentColor;
        }

        .team-name {
          flex: 1;
          font-size: 16px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .team-count {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        /* Team Players */
        .team-players {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          min-height: 60px;
        }

        .empty-text {
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          font-style: italic;
          text-align: center;
          padding: var(--space-2);
        }

        .player-tag {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .player-tag.me {
          font-weight: 700;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 12px rgba(66, 153, 225, 0.4);
        }

        /* Team Badge */
        .team-badge {
          position: absolute;
          top: -12px;
          right: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background: rgba(251, 191, 36, 0.15);
          border: 2px solid rgba(251, 191, 36, 0.4);
          border-radius: 12px;
          color: white;
        }

        .warning-emoji {
          font-size: 24px;
          flex-shrink: 0;
        }

        .warning-text {
          font-size: 14px;
          line-height: 1.5;
        }

        .warning-text strong {
          font-weight: 700;
          color: #FCD34D;
        }

        .warning-sub {
          font-size: 13px;
          opacity: 0.8;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .teams-grid {
            grid-template-columns: 1fr;
          }

          .my-team-banner {
            padding: var(--space-3);
          }

          .banner-text {
            font-size: 14px;
          }

          .team-card {
            padding: var(--space-3);
          }
        }
      `}</style>
    </div>
  );
}
