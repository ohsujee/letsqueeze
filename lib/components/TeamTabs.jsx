'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, RotateCcw } from 'lucide-react';
import TeamCard from '@/components/game/TeamCard';
import './TeamTabs.css';

/**
 * TeamTabs — Gestion d'équipes host (grille de TeamCards)
 * Réutilisable par tous les jeux avec mode équipes.
 */
export default function TeamTabs({
  teams,
  players,
  onAssignToTeam,
  onRemoveFromTeam,
  onAutoBalance,
  onResetTeams,
  onUpdateTeamName,
  teamCount = 4,
  onTeamCountChange,
}) {
  const teamsSorted = Object.keys(teams).map(id => ({ id, ...teams[id] }));
  const unassignedPlayers = players.filter(p => !p.teamId || p.teamId === "");
  const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);

  return (
    <div className="teams-compact">
      {/* Header */}
      <div className="teams-header">
        <div className="teams-header-left">
          <span className="teams-label">Équipes</span>
          {onTeamCountChange && (
            <div className="team-count-inline">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  className={`count-btn-inline ${teamCount === count ? "active" : ""}`}
                  onClick={() => onTeamCountChange(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="teams-actions">
          <button className="action-chip" onClick={onAutoBalance} title="Répartir automatiquement">
            <Shuffle size={14} /> Auto
          </button>
          <button className="action-chip danger" onClick={onResetTeams} title="Réinitialiser">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Teams Grid — utilise TeamCard avec animations */}
      <div className="teams-grid">
        <AnimatePresence mode="popLayout">
          {teamsSorted.slice(0, teamCount).map((team, i) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, delay: i * 0.05 }}
            >
              <TeamCard
                team={team}
                teamPlayers={getTeamPlayers(team.id)}
                canEdit={!!onUpdateTeamName}
                canManage={true}
                onUpdateName={onUpdateTeamName ? (name) => onUpdateTeamName(team.id, name) : undefined}
                onRemovePlayer={onRemoveFromTeam}
                onAssignPlayer={(uid) => onAssignToTeam(uid, team.id)}
                unassignedPlayers={unassignedPlayers}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Unassigned */}
      {unassignedPlayers.length > 0 && (
        <div className="unassigned-row">
          <span className="unassigned-label">Sans équipe</span>
          <div className="unassigned-chips">
            {unassignedPlayers.map(p => (
              <span key={p.uid} className="unassigned-chip">{p.name?.slice(0, 10)}{p.name?.length > 10 ? '…' : ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
