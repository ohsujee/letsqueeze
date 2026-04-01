'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shuffle, RotateCcw, ChevronDown, ChevronUp, UserPlus, UserMinus, User } from 'lucide-react';
import { ALIBI_GROUP_CONFIG } from '@/lib/config/rooms';
import './AlibiGroupSelector.css';

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
    </div>
  );
}
