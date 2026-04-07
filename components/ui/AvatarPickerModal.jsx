'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';
import { AVATARS, AVATARS_V2, AVATAR_COLORS, DEFAULT_AVATAR, getAvatarUrl } from '@/lib/config/avatars';
import './avatar-picker.css';

const PACKS = [
  { key: 'v1', label: 'Mini', avatars: AVATARS },
  { key: 'v2', label: 'Wild', avatars: AVATARS_V2 },
];

export default function AvatarPickerModal({ isOpen, onClose, currentAvatarId, currentColor, onSave }) {
  const [selectedId, setSelectedId] = useState(currentAvatarId || DEFAULT_AVATAR.id);
  const [selectedColor, setSelectedColor] = useState(currentColor || DEFAULT_AVATAR.color);
  const [packIndex, setPackIndex] = useState(
    currentAvatarId?.startsWith('v2-') ? 1 : 0
  );
  const [slideDir, setSlideDir] = useState(1);

  if (!isOpen) return null;

  const outlineColor = selectedColor === '#ffffff' ? '#ef4444' : '#ffffff';
  const activePack = PACKS[packIndex];

  const switchPack = (newIndex) => {
    if (newIndex === packIndex) return;
    setSlideDir(newIndex > packIndex ? 1 : -1);
    setPackIndex(newIndex);
  };

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

        {/* Pack toggle */}
        <div className="avatar-picker-section">
          <div className="avatar-pack-tabs">
            {PACKS.map((pack, i) => (
              <button
                key={pack.key}
                className={`avatar-pack-tab ${packIndex === i ? 'active' : ''}`}
                onClick={() => switchPack(i)}
              >
                {pack.label}
                {packIndex === i && (
                  <motion.div
                    className="avatar-pack-tab-indicator"
                    layoutId="pack-indicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Animal grid with carousel animation */}
        <div className="avatar-picker-section avatar-picker-section-scroll">
          <AnimatePresence mode="wait" initial={false} custom={slideDir}>
            <motion.div
              key={activePack.key}
              className="avatar-picker-grid"
              custom={slideDir}
              initial="enter"
              animate="center"
              exit="exit"
              variants={{
                enter: (dir) => ({ opacity: 0, x: dir * 80 }),
                center: { opacity: 1, x: 0 },
                exit: (dir) => ({ opacity: 0, x: dir * -80 }),
              }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {activePack.avatars.map((avatar) => (
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Save */}
        <button className="avatar-picker-save" onClick={handleSave}>
          Valider
        </button>
      </motion.div>
    </div>
  );
}
