'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
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
      {!compact && (
        <div className="display-label">
          <Users size={14} style={{ color: groupColor }} />
          <span>Ton équipe</span>
        </div>
      )}

      <div className="inline-row">
        <span className="color-dot" style={{ background: groupColor }} />

        {isEditing ? (
          <>
            <input
              type="text"
              className={`inline-input ${error ? 'has-error' : ''}`}
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoFocus
              placeholder="Nom du groupe"
              style={{ borderColor: groupColor, color: groupColor }}
            />
            <button
              className="action-btn-icon save"
              onClick={saveNameChange}
              disabled={saving}
            >
              <Check size={18} />
            </button>
            <button
              className="action-btn-icon cancel"
              onClick={cancelEditing}
              disabled={saving}
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <span className="display-name" style={{ color: groupColor }}>
              {group.name}
            </span>
            {canEdit && (
              <button className="edit-btn" onClick={startEditing}>
                <Pencil size={14} />
              </button>
            )}
          </>
        )}
      </div>

      {error && <div className="edit-error">{error}</div>}

      <style jsx>{`
        .group-name-editor {
          width: 100%;
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

        .inline-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
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

        /* === INLINE INPUT === */
        .inline-input {
          width: 130px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid;
          border-radius: 8px;
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }

        .inline-input:focus {
          background: rgba(255, 255, 255, 0.12);
        }

        .inline-input.has-error {
          border-color: #ef4444 !important;
        }

        /* === ACTION BUTTONS === */
        .action-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn-icon.save {
          background: rgba(34, 197, 94, 0.25);
          color: #22c55e;
        }

        .action-btn-icon.save:hover {
          background: rgba(34, 197, 94, 0.4);
        }

        .action-btn-icon.cancel {
          background: rgba(239, 68, 68, 0.25);
          color: #ef4444;
        }

        .action-btn-icon.cancel:hover {
          background: rgba(239, 68, 68, 0.4);
        }

        .action-btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-error {
          font-size: 0.75rem;
          color: #ef4444;
          text-align: center;
        }

        /* === COMPACT MODE === */
        .compact .inline-row {
          gap: 8px;
        }

        .compact .display-name {
          font-size: 0.95rem;
        }

        .compact .inline-input {
          width: 110px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
