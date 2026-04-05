'use client';

import { useState, useCallback, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import './TeamNameEditor.css';

/**
 * TeamNameEditor — Éditeur de nom d'équipe inline (partagé entre tous les jeux)
 *
 * @param {Object} group - { id, name, color }
 * @param {function} onUpdateName - (newName) => Promise
 * @param {boolean} canEdit - peut éditer
 * @param {boolean} compact - mode compact (pas de label)
 */
export default function TeamNameEditor({
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
    if (trimmed.length < 2) { setError('Min. 2 caractères'); return; }
    if (trimmed.length > 20) { setError('Max. 20 caractères'); return; }
    if (trimmed === group?.name) { cancelEditing(); return; }

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
    if (e.key === 'Enter') { e.preventDefault(); saveNameChange(); }
    else if (e.key === 'Escape') { cancelEditing(); }
  }, [saveNameChange, cancelEditing]);

  if (!group) return null;

  return (
    <div className={`tne-editor ${compact ? 'tne-compact' : ''}`}>
      <div className="tne-row">
        {isEditing ? (
          <>
            <input
              type="text"
              className={`tne-input ${error ? 'tne-error' : ''}`}
              value={editedName}
              onChange={(e) => { setEditedName(e.target.value); if (error) setError(''); }}
              onKeyDown={handleKeyDown}
              maxLength={20}
              autoFocus
              placeholder="Nom de l'équipe"
            />
            <button className="tne-btn tne-btn-save" onClick={saveNameChange} disabled={saving}>
              <Check size={16} />
            </button>
            <button className="tne-btn tne-btn-cancel" onClick={cancelEditing} disabled={saving}>
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="tne-name">{group.name}</span>
            {canEdit && (
              <button className="tne-btn tne-btn-edit" onClick={startEditing}>
                <Pencil size={13} />
              </button>
            )}
          </>
        )}
      </div>
      {error && <div className="tne-error-text">{error}</div>}
    </div>
  );
}
