'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, X, Users } from 'lucide-react';

/**
 * AlibiGroupNameEditor - Éditeur de nom de groupe inline (style pseudo)
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

    if (trimmed.length < 2) {
      setError('Min. 2 caractères');
      return;
    }
    if (trimmed.length > 20) {
      setError('Max. 20 caractères');
      return;
    }

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
          // MODE ÉDITION
          <motion.div
            key="editing"
            className="edit-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="edit-row">
              <input
                type="text"
                className={`edit-input ${error ? 'has-error' : ''}`}
                value={editedName}
                onChange={(e) => {
                  setEditedName(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyDown}
                maxLength={20}
                autoFocus
                placeholder="Nom du groupe"
                style={{ borderColor: groupColor }}
              />
            </div>
            <div className="edit-actions">
              <button
                className="action-btn save"
                onClick={saveNameChange}
                disabled={saving}
              >
                <Check size={14} />
                <span>OK</span>
              </button>
              <button
                className="action-btn cancel"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X size={14} />
                <span>Annuler</span>
              </button>
            </div>
            {error && <div className="edit-error">{error}</div>}
          </motion.div>
        ) : (
          // MODE AFFICHAGE
          <motion.div
            key="display"
            className="display-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {!compact && (
              <div className="display-label">
                <Users size={14} style={{ color: groupColor }} />
                <span>Ton équipe</span>
              </div>
            )}
            <div className="display-row">
              <span className="color-dot" style={{ background: groupColor, boxShadow: `0 0 10px ${groupColor}` }} />
              <span className="display-name" style={{ color: groupColor }}>
                {group.name}
              </span>
              {canEdit && (
                <button className="edit-btn" onClick={startEditing}>
                  <Pencil size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .group-name-editor {
          width: 100%;
        }

        /* === MODE AFFICHAGE === */
        .display-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .display-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .display-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .display-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
        }

        .edit-btn {
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

        .edit-btn:hover {
          background: rgba(245, 158, 11, 0.3);
          color: white;
        }

        /* === MODE ÉDITION === */
        .edit-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
        }

        .edit-row {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .edit-input {
          width: 160px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid;
          border-radius: 8px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }

        .edit-input:focus {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }

        .edit-input.has-error {
          border-color: #ef4444 !important;
        }

        .edit-actions {
          display: flex;
          gap: 6px;
          margin-top: 2px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 5px 10px;
          border: none;
          border-radius: 6px;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.save {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .action-btn.save:hover {
          background: rgba(34, 197, 94, 0.35);
        }

        .action-btn.cancel {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .action-btn.cancel:hover {
          background: rgba(239, 68, 68, 0.35);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-error {
          font-size: 0.75rem;
          color: #ef4444;
          text-align: center;
          margin-top: -4px;
        }

        /* === COMPACT MODE === */
        .compact .display-container {
          flex-direction: row;
          gap: 8px;
        }

        .compact .display-name {
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
