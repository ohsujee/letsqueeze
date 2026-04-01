'use client';

import { useState } from 'react';
import './PlayerTeamView.css';

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
    </div>
  );
}
