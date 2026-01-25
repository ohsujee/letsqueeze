'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { X } from 'lucide-react';

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
  const [expandedTeam, setExpandedTeam] = useState(null);
  const myUid = currentPlayerUid || auth.currentUser?.uid;
  const myPlayer = players.find(p => p.uid === myUid);
  const myTeamId = myPlayer?.teamId;
  const myTeam = myTeamId ? teams[myTeamId] : null;

  const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);

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

      {/* Teams Grid with Players - Player's team first */}
      <div className={`teams-grid-player teams-${teamCount}`}>
        {Object.entries(teams)
          .slice(0, teamCount)
          .sort(([idA], [idB]) => {
            // Player's team always first
            if (idA === myTeamId) return -1;
            if (idB === myTeamId) return 1;
            return 0;
          })
          .map(([id, team]) => {
          const teamPlayers = players.filter(p => p.teamId === id);
          const isMyTeam = myTeamId === id;
          const hasMore = teamPlayers.length > 4;

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
                {hasMore && (
                  <button
                    className="player-tag more clickable"
                    onClick={() => setExpandedTeam(id)}
                  >
                    +{teamPlayers.length - 4}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Detail Modal */}
      <AnimatePresence>
        {expandedTeam && teams[expandedTeam] && (
          <motion.div
            className="team-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedTeam(null)}
          >
            <motion.div
              className="team-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ '--team-color': teams[expandedTeam].color }}
            >
              <div className="team-modal-header">
                <div
                  className="team-modal-color"
                  style={{ backgroundColor: teams[expandedTeam].color }}
                />
                <h3 className="team-modal-name">{teams[expandedTeam].name}</h3>
                <button className="team-modal-close" onClick={() => setExpandedTeam(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className="team-modal-players">
                {getTeamPlayers(expandedTeam).map((player) => (
                  <div
                    key={player.uid}
                    className={`team-modal-player ${player.uid === myUid ? 'is-me' : ''}`}
                  >
                    <div
                      className="player-avatar"
                      style={{ backgroundColor: teams[expandedTeam].color }}
                    >
                      {player.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="player-name">
                      {player.name}
                      {player.uid === myUid && ' (toi)'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
