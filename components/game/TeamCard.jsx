'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus } from '@phosphor-icons/react';
import TeamNameEditor from '@/components/game/TeamNameEditor';
import PlayerBanner from '@/components/game/PlayerBanner';
import Avatar from '@/components/ui/Avatar';
import './TeamCard.css';

/**
 * TeamCard — Card d'équipe réutilisable (host + joueur)
 * Fond de la couleur d'équipe, liste joueurs 1 à 1.
 *
 * @param {Object} team - { id, name, color, score }
 * @param {Array} teamPlayers - joueurs dans cette équipe
 * @param {boolean} isMyTeam - si c'est l'équipe du joueur courant
 * @param {string} myUid - uid du joueur courant
 * @param {boolean} canEdit - peut éditer le nom (host ou joueur assigné)
 * @param {boolean} canManage - peut assigner/retirer des joueurs (host only)
 * @param {function} onUpdateName - (newName) => Promise
 * @param {function} onRemovePlayer - (playerUid) => void
 * @param {function} onAssignPlayer - (playerUid) => void
 * @param {Array} unassignedPlayers - joueurs sans équipe (pour le bouton ajouter)
 */
export default function TeamCard({
  team,
  teamPlayers = [],
  isMyTeam = false,
  myUid,
  canEdit = false,
  canManage = false,
  onUpdateName,
  onRemovePlayer,
  onAssignPlayer,
  unassignedPlayers = [],
}) {
  const [showAdd, setShowAdd] = useState(false);

  if (!team) return null;

  return (
    <div className={`tc-card ${isMyTeam ? 'tc-my-team' : ''}`} style={{ '--tc-color': team.color }}>
      {/* Header — nom éditable + count */}
      <div className="tc-header">
        {canEdit && onUpdateName ? (
          <TeamNameEditor
            group={{ id: team.id, name: team.name }}
            onUpdateName={onUpdateName}
            canEdit={true}
            compact={true}
          />
        ) : (
          <span className="tc-name">{team.name}</span>
        )}
        <span className="tc-count">{teamPlayers.length}</span>
      </div>

      {/* Liste joueurs */}
      <div className="tc-players">
        {teamPlayers.length === 0 ? (
          <span className="tc-empty">Aucun joueur</span>
        ) : (
          teamPlayers.map(player => (
            <PlayerBanner
              key={player.uid}
              player={player}
              isMe={player.uid === myUid}
              rootClassName="tc-player-row"
              suffix={
                canManage && onRemovePlayer ? (
                  <button className="tc-remove-btn" onClick={() => onRemovePlayer(player.uid)}>
                    <X size={14} />
                  </button>
                ) : null
              }
            />
          ))
        )}
      </div>

      {/* Ajouter un joueur (host only) */}
      {canManage && unassignedPlayers.length > 0 && (
        <div className="tc-add-section">
          <button className="tc-add-toggle" onClick={() => setShowAdd(true)}>
            <UserPlus size={15} />
            <span>Ajouter ({unassignedPlayers.length})</span>
          </button>
        </div>
      )}

      {/* Modal d'ajout de joueur */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="tc-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
            >
              <motion.div
                className="tc-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={e => e.stopPropagation()}
                style={{ '--tc-color': team.color }}
              >
                <div className="tc-modal-header">
                  <span className="tc-modal-title">Ajouter à {team.name}</span>
                  <button className="tc-modal-close" onClick={() => setShowAdd(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="tc-modal-list">
                  {unassignedPlayers.map(p => (
                    <button
                      key={p.uid}
                      className="tc-modal-player"
                      onClick={() => { onAssignPlayer?.(p.uid); if (unassignedPlayers.length <= 1) setShowAdd(false); }}
                    >
                      <Avatar
                        initial={(p.name?.[0] || '?').toUpperCase()}
                        size="xs"
                        avatarId={p.avatar?.id}
                        avatarColor={p.avatar?.color || team.color}
                      />
                      <span className="tc-modal-player-name">{p.name}</span>
                      <UserPlus size={16} className="tc-modal-player-icon" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
