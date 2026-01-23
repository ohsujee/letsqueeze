'use client';

import { motion } from 'framer-motion';
import { auth } from '@/lib/firebase';

/**
 * TeamPlayerView - Vue joueur du mode équipe en lobby
 * Affiche la bannière "Ton équipe" + la grille de toutes les équipes
 *
 * @param {Object} props
 * @param {Object} props.teams - Objet des équipes { team1: { name, color, score }, ... }
 * @param {Array} props.players - Liste des joueurs avec teamId
 * @param {number} props.teamCount - Nombre d'équipes à afficher (2, 3, ou 4)
 * @param {string} props.currentPlayerUid - UID du joueur actuel (optionnel, utilise auth.currentUser sinon)
 */
export default function TeamPlayerView({
  teams = {},
  players = [],
  teamCount = 2,
  currentPlayerUid
}) {
  const myUid = currentPlayerUid || auth.currentUser?.uid;
  const myPlayer = players.find(p => p.uid === myUid);
  const myTeamId = myPlayer?.teamId;
  const myTeam = myTeamId ? teams[myTeamId] : null;

  return (
    <>
      {/* My Team Banner */}
      {myTeamId && myTeam ? (
        <div
          className="my-team-banner"
          style={{ '--team-color': myTeam.color }}
        >
          <div className="banner-glow" />
          <span className="banner-label">Ton équipe</span>
          <span className="banner-team-name">{myTeam.name}</span>
        </div>
      ) : (
        <div className="pending-banner">
          <span className="pending-icon">⏳</span>
          <span className="pending-text">L'hôte va t'assigner à une équipe...</span>
        </div>
      )}

      {/* Teams Grid with Players */}
      <div className={`teams-grid-player teams-${teamCount}`}>
        {Object.entries(teams).slice(0, teamCount).map(([id, team]) => {
          const teamPlayers = players.filter(p => p.teamId === id);
          const isMyTeam = myTeamId === id;

          return (
            <div
              key={id}
              className={`team-card-player ${isMyTeam ? 'my-team' : ''}`}
              style={{ '--team-color': team.color }}
            >
              <div className="team-card-bar" style={{ backgroundColor: team.color }} />
              <div className="team-card-header">
                <span className="team-card-name">{team.name.replace('Équipe ', '')}</span>
                <span className="team-card-count">{teamPlayers.length}</span>
              </div>
              <div className="team-card-players">
                {teamPlayers.length === 0 ? (
                  <span className="no-players-text">Vide</span>
                ) : (
                  teamPlayers.slice(0, 4).map((player) => (
                    <span
                      key={player.uid}
                      className={`player-tag ${player.uid === myUid ? 'is-me' : ''}`}
                    >
                      {player.uid === myUid && '👤 '}
                      {player.name}
                    </span>
                  ))
                )}
                {teamPlayers.length > 4 && (
                  <span className="player-tag more">+{teamPlayers.length - 4}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
