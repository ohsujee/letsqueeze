'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, X, Users } from 'lucide-react';

/**
 * AlibiGroupNameEditor - Éditeur de nom de groupe inline (style pseudo)
 *
 * Permet aux joueurs de modifier le nom de leur groupe.
 * S'affiche en haut de la vue joueur dans le lobby.
 *
 * @param {Object} props
 * @param {Object} props.group - Données du groupe { id, name, color }
 * @param {Function} props.onUpdateName - Callback (newName) => Promise
 * @param {boolean} props.canEdit - Si l'utilisateur peut modifier
 * @param {boolean} props.compact - Version compacte pour le header
 */
export default function AlibiGroupNameEditor({
  group,
  onUpdateName,
  canEdit = true,
  compact = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync avec le nom actuel quand il change
  useEffect(() => {
    if (!isEditing && group?.name) {
      setEditedName(group.name);
    }
  }, [group?.name, isEditing]);

  const startEditing = useCallback(() => {
    if (!canEdit) return;
    setEditedName(group?.name || '');
    setError('');
    setIsEditing(true);
  }, [canEdit, group?.name]);

  const cancelEditing = useCallback(() => {
    setEditedName(group?.name || '');
    setError('');
    setIsEditing(false);
  }, [group?.name]);

  const saveNameChange = useCallback(async () => {
    const trimmed = editedName.trim();

    // Validation
    if (trimmed.length < 2) {
      setError('Min. 2 caractères');
      return;
    }
    if (trimmed.length > 20) {
      setError('Max. 20 caractères');
      return;
    }

    // Pas de changement
    if (trimmed === group?.name) {
      cancelEditing();
      return;
    }

    try {
      setSaving(true);
      await onUpdateName(trimmed);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [editedName, group?.name, onUpdateName, cancelEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveNameChange();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [saveNameChange, cancelEditing]);

  if (!group) return null;

  const groupColor = group.color || '#f59e0b';

  return (
    <div className={`group-name-editor ${compact ? 'compact' : ''}`}>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            className="group-name-edit-row"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div
              className="group-color-dot"
              style={{ background: groupColor, boxShadow: `0 0 10px ${groupColor}` }}
            />
            <input
              type="text"
              className={`group-name-input ${error ? 'has-error' : ''}`}
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoFocus
              placeholder="Nom du groupe"
              style={{ '--accent-color': groupColor }}
            />
            <button
              className="group-name-action save"
              onClick={saveNameChange}
              disabled={saving}
              title="Confirmer"
            >
              <Check size={16} />
            </button>
            <button
              className="group-name-action cancel"
              onClick={cancelEditing}
              disabled={saving}
              title="Annuler"
            >
              <X size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            className="group-name-display"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            {!compact && (
              <div className="group-name-label">
                <Users size={14} style={{ color: groupColor }} />
                <span>Ton équipe</span>
              </div>
            )}
            <div className="group-name-value">
              <div
                className="group-color-dot"
                style={{ background: groupColor, boxShadow: `0 0 10px ${groupColor}` }}
              />
              <span
                className="group-name-text"
                style={{ color: groupColor }}
              >
                {group.name}
              </span>
              {canEdit && (
                <button
                  className="group-name-edit-btn"
                  onClick={startEditing}
                  title="Modifier le nom"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="group-name-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .group-name-editor {
          width: 100%;
        }

        .group-name-editor.compact {
          width: auto;
        }

        .group-name-display {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .compact .group-name-display {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        .group-name-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .group-name-value {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .group-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .group-name-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
        }

        .compact .group-name-text {
          font-size: 0.95rem;
        }

        .group-name-edit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .group-name-edit-btn:hover {
          background: rgba(245, 158, 11, 0.3);
          color: white;
        }

        .group-name-edit-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
        }

        .group-name-input {
          flex: 1;
          min-width: 80px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--accent-color, #f59e0b);
          border-radius: 8px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s;
        }

        .group-name-input:focus {
          border-color: var(--accent-color, #f59e0b);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
        }

        .group-name-input.has-error {
          border-color: #ef4444;
        }

        .group-name-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .group-name-action.save {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .group-name-action.save:hover {
          background: rgba(34, 197, 94, 0.4);
        }

        .group-name-action.cancel {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .group-name-action.cancel:hover {
          background: rgba(239, 68, 68, 0.4);
        }

        .group-name-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .group-name-error {
          font-size: 0.8rem;
          color: #ef4444;
          padding: 4px 0;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
