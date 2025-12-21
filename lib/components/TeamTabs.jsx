'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, RotateCcw, UserPlus, X } from 'lucide-react';

export default function TeamTabs({
  teams,
  players,
  onAssignToTeam,
  onRemoveFromTeam,
  onAutoBalance,
  onResetTeams,
  teamCount = 4
}) {
  const teamsSorted = Object.keys(teams).map(id => ({ id, ...teams[id] }));
  const unassignedPlayers = players.filter(p => !p.teamId || p.teamId === "");
  const [expandedTeam, setExpandedTeam] = useState(null);

  // Get players for a specific team
  const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);

  return (
    <div className="teams-compact">
      {/* Header with Quick Actions */}
      <div className="teams-header">
        <span className="teams-label">Équipes</span>
        <div className="teams-actions">
          <motion.button
            className="action-chip"
            onClick={onAutoBalance}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Répartir automatiquement"
          >
            <Shuffle size={14} />
            Auto
          </motion.button>
          <motion.button
            className="action-chip danger"
            onClick={onResetTeams}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Réinitialiser"
          >
            <RotateCcw size={14} />
          </motion.button>
        </div>
      </div>

      {/* Teams Grid - adapts to team count */}
      <div className={`teams-grid teams-${teamCount}`}>
        {teamsSorted.slice(0, teamCount).map((team) => {
          const teamPlayers = getTeamPlayers(team.id);
          const isExpanded = expandedTeam === team.id;

          return (
            <motion.div
              key={team.id}
              className={`team-card-compact ${isExpanded ? 'expanded' : ''}`}
              style={{ '--team-color': team.color }}
              onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Team Color Bar */}
              <div className="team-color-bar" style={{ backgroundColor: team.color }} />

              {/* Team Info */}
              <div className="team-info-compact">
                <span className="team-name-compact">{team.name.replace('Équipe ', '')}</span>
                <span className="team-count-compact">{teamPlayers.length}</span>
              </div>

              {/* Player Names Preview */}
              <div className="team-players-preview">
                {teamPlayers.length === 0 ? (
                  <span className="no-players">Vide</span>
                ) : (
                  <>
                    {teamPlayers.slice(0, 3).map((player) => (
                      <span key={player.uid} className="player-name-chip">
                        {player.name?.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                      </span>
                    ))}
                    {teamPlayers.length > 3 && (
                      <span className="player-name-chip more">+{teamPlayers.length - 3}</span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Team Detail (Modal-like) */}
      <AnimatePresence>
        {expandedTeam && (
          <motion.div
            className="team-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedTeam(null)}
          >
            <motion.div
              className="team-detail-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ '--team-color': teams[expandedTeam]?.color }}
            >
              <div className="detail-header">
                <div
                  className="detail-color-dot"
                  style={{ backgroundColor: teams[expandedTeam]?.color }}
                />
                <h4 className="detail-title">{teams[expandedTeam]?.name}</h4>
                <button className="detail-close" onClick={() => setExpandedTeam(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Team Players */}
              <div className="detail-players">
                {getTeamPlayers(expandedTeam).map(player => (
                  <div key={player.uid} className="detail-player">
                    <div
                      className="player-dot"
                      style={{ backgroundColor: teams[expandedTeam]?.color }}
                    >
                      {player.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="player-name">{player.name}</span>
                    <button
                      className="remove-player-btn"
                      onClick={() => onRemoveFromTeam(player.uid)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {getTeamPlayers(expandedTeam).length === 0 && (
                  <p className="empty-team">Aucun joueur dans cette équipe</p>
                )}
              </div>

              {/* Add Player */}
              {unassignedPlayers.length > 0 && (
                <div className="detail-add">
                  <span className="add-label">
                    <UserPlus size={14} /> Ajouter
                  </span>
                  <div className="add-chips">
                    {unassignedPlayers.map(p => (
                      <button
                        key={p.uid}
                        className="add-player-chip"
                        onClick={() => onAssignToTeam(p.uid, expandedTeam)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unassigned Players Row - Compact single line */}
      {unassignedPlayers.length > 0 && !expandedTeam && (
        <div className="unassigned-row">
          <span className="unassigned-label">Sans équipe</span>
          <div className="unassigned-chips">
            {unassignedPlayers.slice(0, 4).map(p => (
              <span key={p.uid} className="unassigned-chip">{p.name?.slice(0, 8)}{p.name?.length > 8 ? '…' : ''}</span>
            ))}
            {unassignedPlayers.length > 4 && (
              <span className="unassigned-chip more">+{unassignedPlayers.length - 4}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
