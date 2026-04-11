'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, ArrowCounterClockwise } from '@phosphor-icons/react';
import TeamCard from '@/components/game/TeamCard';
import PlayerBanner from '@/components/game/PlayerBanner';
import './TeamTabs.css';

export const DEFAULT_TEAM_COLORS = ['#E84466', '#1EAEE0', '#30C968', '#DDB830', '#B06DEA', '#F07038'];

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
  label = 'Équipes',
}) {
  const teamsSorted = Object.keys(teams).map((id, i) => ({
    id,
    ...teams[id],
    color: teams[id].color || DEFAULT_TEAM_COLORS[i % DEFAULT_TEAM_COLORS.length],
  }));
  const unassignedPlayers = players.filter(p => !p.teamId || p.teamId === "");
  const getTeamPlayers = (teamId) => players.filter(p => p.teamId === teamId);

  return (
    <div className="teams-compact">
      {/* Header */}
      <div className="teams-header">
        <div className="teams-header-left">
          <span className="teams-label">{label}</span>
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
            <Shuffle size={14} /> Assignation auto
          </button>
          <button className="action-chip danger" onClick={onResetTeams} title="Réinitialiser">
            <ArrowCounterClockwise size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Teams Grid — utilise TeamCard avec animations */}
      <div className="teams-grid">
        <AnimatePresence mode="sync">
          {teamsSorted.slice(0, teamCount).map((team, i) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: i * 0.03 }}
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
        <div className="unassigned-section">
          <span className="unassigned-section-label">Sans équipe · {unassignedPlayers.length}</span>
          <div className="unassigned-players-list">
            {unassignedPlayers.map((p, i) => (
              <motion.div
                key={p.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.15 }}
              >
                <PlayerBanner player={p} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
