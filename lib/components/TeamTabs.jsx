'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamTabs({
  teams,
  players,
  onAssignToTeam,
  onRemoveFromTeam,
  onAutoBalance,
  onResetTeams
}) {
  const teamsSorted = Object.keys(teams).map(id => ({ id, ...teams[id] }));
  const [activeTab, setActiveTab] = useState(teamsSorted[0]?.id || 'team1');

  const unassignedPlayers = players.filter(p => !p.teamId || p.teamId === "");
  const activeTeam = teamsSorted.find(t => t.id === activeTab);
  const teamPlayers = players.filter(p => p.teamId === activeTab);

  return (
    <div className="team-tabs-container">
      {/* Header with actions */}
      <div className="team-header">
        <h3 className="team-title">Gestion des équipes</h3>
        <div className="team-actions">
          <button className="action-btn" onClick={onAutoBalance}>
            ⚖️ Auto
          </button>
          <button className="action-btn danger" onClick={onResetTeams}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-nav">
        {teamsSorted.map((team) => {
          const count = players.filter(p => p.teamId === team.id).length;
          return (
            <button
              key={team.id}
              className={`tab-btn ${activeTab === team.id ? 'active' : ''}`}
              onClick={() => setActiveTab(team.id)}
            >
              <div
                className="tab-color"
                style={{ backgroundColor: team.color }}
              />
              <span className="tab-label">{team.name}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Active Team Content */}
      <AnimatePresence mode="wait">
        {activeTeam && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="team-content"
          >
            {/* Team Players */}
            <div className="players-section">
              <h4 className="section-title">
                Joueurs ({teamPlayers.length})
              </h4>
              <div className="players-list">
                {teamPlayers.length === 0 ? (
                  <div className="empty-state">Aucun joueur</div>
                ) : (
                  teamPlayers.map(player => (
                    <div key={player.uid} className="player-item">
                      <span className="player-name">{player.name}</span>
                      <button
                        className="remove-btn"
                        onClick={() => onRemoveFromTeam(player.uid)}
                        title="Retirer de l'équipe"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Player Dropdown */}
              {unassignedPlayers.length > 0 && (
                <select
                  className="add-player-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignToTeam(e.target.value, activeTab);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Ajouter un joueur</option>
                  {unassignedPlayers.map(p => (
                    <option key={p.uid} value={p.uid}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unassigned Players Section */}
      {unassignedPlayers.length > 0 && (
        <div className="unassigned-section">
          <h4 className="section-title">
            Joueurs sans équipe ({unassignedPlayers.length})
          </h4>
          <div className="unassigned-list">
            {unassignedPlayers.map(player => (
              <div key={player.uid} className="unassigned-item">
                {player.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .team-tabs-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .team-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .team-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: white;
          margin: 0;
        }

        .team-actions {
          display: flex;
          gap: var(--space-2);
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          min-height: 44px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .action-btn.danger {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        /* Tabs Navigation */
        .tabs-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-2);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          min-height: 56px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .tab-btn.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .tab-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px currentColor;
        }

        .tab-label {
          flex: 1;
          text-align: left;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab-count {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
        }

        /* Team Content */
        .team-content {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: var(--space-4);
        }

        .players-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .section-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-bold);
          color: white;
          margin: 0;
          opacity: 0.9;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          min-height: 80px;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          color: rgba(255, 255, 255, 0.5);
          font-size: var(--font-size-sm);
          font-style: italic;
        }

        .player-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .player-item:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .player-name {
          font-size: 14px;
          color: white;
          font-weight: 500;
        }

        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 6px;
          color: #EF4444;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          transform: scale(1.05);
        }

        .add-player-select {
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-player-select:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .add-player-select option {
          background: #1E293B;
          color: white;
        }

        /* Unassigned Section */
        .unassigned-section {
          padding: var(--space-4);
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
        }

        .unassigned-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-top: var(--space-3);
        }

        .unassigned-item {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          color: white;
          font-size: 14px;
          font-weight: 500;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .tabs-nav {
            grid-template-columns: repeat(2, 1fr);
          }

          .tab-label {
            font-size: 12px;
          }

          .team-title {
            font-size: var(--font-size-base);
          }

          .action-btn {
            padding: 8px 12px;
            font-size: 13px;
          }

          .team-content {
            padding: var(--space-3);
          }

          .unassigned-section {
            padding: var(--space-3);
          }
        }
      `}</style>
    </div>
  );
}
