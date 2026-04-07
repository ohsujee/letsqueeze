'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { AVATARS, AVATAR_COLORS, getAvatarUrl } from '@/lib/config/avatars';
import './avatar-picker.css';

export default function AvatarPickerModal({ isOpen, onClose, currentAvatarId, currentColor, onSave }) {
  const [selectedId, setSelectedId] = useState(currentAvatarId || null);
  const [selectedColor, setSelectedColor] = useState(currentColor || '#8b5cf6');

  if (!isOpen) return null;

  const outlineColor = selectedColor === '#ffffff' ? '#ef4444' : '#ffffff';

  const handleSave = () => {
    onSave({ avatarId: selectedId, avatarColor: selectedColor });
    onClose();
  };

  return (
    <div className="avatar-picker-overlay" onClick={onClose}>
      <motion.div
        className="avatar-picker-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
      >
        <div className="avatar-picker-header">
          <h2 className="avatar-picker-title">Choisis ton avatar</h2>
          <button className="avatar-picker-close" onClick={onClose}>
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Preview */}
        <div className="avatar-picker-preview">
          <div
            className="avatar-picker-preview-circle"
            style={{ backgroundColor: selectedColor }}
          >
            {selectedId ? (
              <img src={getAvatarUrl(selectedId)} alt="" draggable={false} />
            ) : (
              <span className="avatar-picker-preview-letter">?</span>
            )}
          </div>
        </div>

        {/* Color picker */}
        <div className="avatar-picker-section">
          <span className="avatar-picker-label">Couleur</span>
          <div className="avatar-picker-colors">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                className={`avatar-color-btn ${selectedColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Animal picker */}
        <div className="avatar-picker-section avatar-picker-section-scroll">
          <span className="avatar-picker-label">Animal</span>
          <div className="avatar-picker-grid">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                className={`avatar-grid-item ${selectedId === avatar.id ? 'active' : ''}`}
                style={{
                  backgroundColor: selectedColor,
                  '--avatar-outline-color': outlineColor,
                }}
                onClick={() => setSelectedId(avatar.id)}
              >
                <img src={getAvatarUrl(avatar.id)} alt={avatar.name} draggable={false} />
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button className="avatar-picker-save" onClick={handleSave}>
          Valider
        </button>
      </motion.div>
    </div>
  );
}
