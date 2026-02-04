'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shuffle, RotateCcw, ChevronDown, ChevronUp, UserPlus, UserMinus, User } from 'lucide-react';
import { ALIBI_GROUP_CONFIG } from '@/lib/config/rooms';

/**
 * AlibiGroupSelector - Interface d'assignation des joueurs aux groupes
 *
 * Utilisé dans le lobby en mode Party pour :
 * - Choisir le nombre de groupes (2-4)
 * - Assigner manuellement ou automatiquement les joueurs
 * - Voir l'état de chaque groupe
 *
 * @param {Object} props
 * @param {Object} props.groups - { groupId: { name, color, alibiId } }
 * @param {Array} props.players - Liste des joueurs
 * @param {Object} props.playersByGroup - { groupId: [players], unassigned: [players] }
 * @param {number} props.groupCount - Nombre de groupes actuel
 * @param {Function} props.onGroupCountChange - (count) => void
 * @param {Function} props.onAssignPlayer - (playerUid, groupId) => void
 * @param {Function} props.onRemovePlayer - (playerUid) => void
 * @param {Function} props.onAutoAssign - () => void
 * @param {Function} props.onReset - () => void
 * @param {Function} props.isGroupValid - (groupId) => boolean
 */
export default function AlibiGroupSelector({
  groups,
  players,
  playersByGroup,
  groupCount,
  onGroupCountChange,
  onAssignPlayer,
  onRemovePlayer,
  onAutoAssign,
  onReset,
  isGroupValid,
  myUid
}) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  const groupIds = useMemo(() => {
    return Object.keys(groups).filter(id => id.startsWith('group')).sort();
  }, [groups]);

  const unassignedPlayers = playersByGroup?.unassigned || [];
  const minPlayersPerGroup = ALIBI_GROUP_CONFIG.MIN_PLAYERS_PER_GROUP;

  // Compter les joueurs valides
  const assignedCount = players.length - unassignedPlayers.length;
  const totalRequired = groupCount * minPlayersPerGroup;

  // Find which group the host (myUid) is in
  const myGroupId = useMemo(() => {
    if (!myUid) return null;
    for (const groupId of groupIds) {
      const groupPlayers = playersByGroup[groupId] || [];
      if (groupPlayers.some(p => p.uid === myUid)) {
        return groupId;
      }
    }
    return null;
  }, [myUid, groupIds, playersByGroup]);

  return (
    <div className="group-selector">
      {/* Header avec contrôles */}
      <div className="selector-header">
        <h3 className="selector-title">
          <Users size={18} />
          <span>Groupes</span>
        </h3>

        {/* Sélecteur nombre de groupes */}
        <div className="group-count-selector">
          {[2, 3, 4].map(count => (
            <button
              key={count}
              className={`count-btn ${groupCount === count ? 'active' : ''}`}
              onClick={() => onGroupCountChange(count)}
              disabled={players.length < count * minPlayersPerGroup}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="quick-actions">
        <button
          className="action-btn"
          onClick={onAutoAssign}
          disabled={players.length < totalRequired}
        >
          <Shuffle size={16} />
          <span>Auto-répartir</span>
        </button>
        <button
          className="action-btn"
          onClick={onReset}
          disabled={assignedCount === 0}
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
      </div>

      {/* Liste des groupes */}
      <div className="groups-list">
        {groupIds.map(groupId => {
          const group = groups[groupId];
          const groupPlayers = playersByGroup[groupId] || [];
          const isValid = isGroupValid(groupId);
          const isExpanded = expandedGroup === groupId;

          return (
            <div
              key={groupId}
              className={`group-card ${isValid ? 'valid' : 'invalid'} ${groupId === myGroupId ? 'is-my-group' : ''}`}
              style={{ '--group-color': group?.color }}
            >
              {/* Header du groupe */}
              <button
                className="group-header"
                onClick={() => setExpandedGroup(isExpanded ? null : groupId)}
              >
                <div className="group-info">
                  <div
                    className="group-dot"
                    style={{ background: group?.color }}
                  />
                  <span className="group-name">{group?.name}</span>
                  <span className="player-count">
                    ({groupPlayers.length}/{minPlayersPerGroup}+)
                  </span>
                </div>
                {groupId === myGroupId && (
                  <span className="my-group-badge">
                    <User size={12} />
                    Toi
                  </span>
                )}
                <div className="group-status">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Contenu expandable */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="group-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Joueurs du groupe */}
                    {groupPlayers.length > 0 ? (
                      <div className="player-list">
                        {groupPlayers.map(player => (
                          <div key={player.uid} className="player-item">
                            <span className="player-name">{player.name}</span>
                            <button
                              className="remove-btn"
                              onClick={() => onRemovePlayer(player.uid)}
                              title="Retirer du groupe"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-group">
                        Aucun joueur assigné
                      </div>
                    )}

                    {/* Ajouter des joueurs non assignés */}
                    {unassignedPlayers.length > 0 && (
                      <div className="add-players">
                        <span className="add-label">Ajouter :</span>
                        <div className="unassigned-list">
                          {unassignedPlayers.map(player => (
                            <button
                              key={player.uid}
                              className="add-player-btn"
                              onClick={() => onAssignPlayer(player.uid, groupId)}
                            >
                              <UserPlus size={12} />
                              <span>{player.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Joueurs en attente d'assignation */}
      {unassignedPlayers.length > 0 && (
        <div className="unassigned-row">
          <span className="unassigned-label">En attente</span>
          <div className="unassigned-chips">
            {unassignedPlayers.slice(0, 5).map(p => (
              <span key={p.uid} className="unassigned-chip">
                {p.name?.slice(0, 8)}{p.name?.length > 8 ? '…' : ''}
              </span>
            ))}
            {unassignedPlayers.length > 5 && (
              <span className="unassigned-chip more">+{unassignedPlayers.length - 5}</span>
            )}
          </div>
        </div>
      )}


      <style jsx>{`
        .group-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .selector-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }

        .group-count-selector {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .count-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .count-btn:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.2);
          color: white;
        }

        .count-btn.active {
          background: #f59e0b;
          color: white;
        }

        .count-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .quick-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .groups-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .group-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .group-card.valid {
          border-color: rgba(34, 197, 94, 0.3);
        }

        .group-card.invalid {
          border-color: rgba(239, 68, 68, 0.3);
        }

        .group-card.is-my-group {
          background: rgba(245, 158, 11, 0.08);
          border-color: var(--group-color);
          box-shadow: 0 0 12px color-mix(in srgb, var(--group-color) 25%, transparent);
        }

        .my-group-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: var(--group-color);
          background: color-mix(in srgb, var(--group-color) 15%, transparent);
          padding: 3px 8px;
          border-radius: 10px;
          margin-left: auto;
          margin-right: 8px;
        }

        .group-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .group-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .group-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .group-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .group-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          color: var(--group-color);
        }

        .player-count {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .group-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.5);
        }

        :global(.group-content) {
          overflow: hidden;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .player-list {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .player-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .player-name {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.15);
          border: none;
          border-radius: 6px;
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s;
        }

        .remove-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .empty-group {
          padding: 16px;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
        }

        .add-players {
          padding: 10px 14px;
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
        }

        .add-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
          display: block;
        }

        .unassigned-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .add-player-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 16px;
          color: #22c55e;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-player-btn:hover {
          background: rgba(34, 197, 94, 0.2);
        }

        .unassigned-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px dashed rgba(245, 158, 11, 0.3);
          border-radius: 10px;
        }

        .unassigned-row .unassigned-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #fbbf24;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .unassigned-row .unassigned-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .unassigned-row .unassigned-chip {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .unassigned-row .unassigned-chip.more {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

      `}</style>
    </div>
  );
}
