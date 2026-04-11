'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PencilSimple, Check, X } from '@phosphor-icons/react';
import './TeamNameEditor.css';

// Measure text width using canvas — matches actual font rendering
let _canvas;
function measureText(text, font) {
  if (!_canvas) _canvas = document.createElement('canvas');
  const ctx = _canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text || ' ').width;
}

/**
 * TeamNameEditor — Inline name editor, always renders as input.
 * Non-editing: looks like plain text. Editing: subtle border appears + action buttons.
 */
export default function TeamNameEditor({
  group,
  onUpdateName,
  canEdit = true,
  compact = false
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(group?.name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

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
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // On mobile, ensure the input is visible above the keyboard
      setTimeout(() => inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    });
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
      setError(err.message || 'Erreur');
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
        <input
          ref={inputRef}
          type="text"
          className={`tne-input ${isEditing ? 'tne-active' : ''} ${error ? 'tne-error' : ''}`}
          value={editedName}
          onChange={(e) => { setEditedName(e.target.value); if (error) setError(''); }}
          onKeyDown={handleKeyDown}
          maxLength={20}
          readOnly={!isEditing}
          tabIndex={isEditing ? 0 : -1}
          style={{ width: Math.ceil(measureText(editedName, '0.85rem Bungee') + 16) + 'px' }}
        />

        {!isEditing && canEdit && (
          <button className="tne-btn tne-btn-edit" onClick={startEditing}>
            <PencilSimple size={13} weight="bold" />
          </button>
        )}

        {isEditing && (
          <>
            <button className="tne-btn tne-btn-save" onClick={saveNameChange} disabled={saving}>
              <Check size={14} weight="bold" />
            </button>
            <button className="tne-btn tne-btn-cancel" onClick={cancelEditing} disabled={saving}>
              <X size={14} weight="bold" />
            </button>
          </>
        )}
      </div>
      {error && <div className="tne-error-text">{error}</div>}
    </div>
  );
}
