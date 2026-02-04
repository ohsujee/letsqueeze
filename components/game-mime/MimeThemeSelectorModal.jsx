"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock } from 'lucide-react';

// Thèmes disponibles par défaut
const DEFAULT_THEMES = [
  { id: 'actions', name: 'Actions', emoji: '🏃', wordCount: 50 },
  { id: 'animaux', name: 'Animaux', emoji: '🐕', wordCount: 40 },
  { id: 'metiers', name: 'Métiers', emoji: '👨‍🍳', wordCount: 35 },
  { id: 'sports', name: 'Sports', emoji: '⚽', wordCount: 30 },
  { id: 'films', name: 'Films', emoji: '🎬', wordCount: 45 },
  { id: 'objets', name: 'Objets', emoji: '📦', wordCount: 50 },
  { id: 'celebrites', name: 'Célébrités', emoji: '⭐', wordCount: 30 },
  { id: 'lieux', name: 'Lieux', emoji: '🏠', wordCount: 35 },
];

export default function MimeThemeSelectorModal({
  isOpen,
  onClose,
  themes = DEFAULT_THEMES,
  currentSelection = [],
  onSelectThemes,
  userIsPro = false
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState([]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedThemes(currentSelection || []);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentSelection]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleThemeToggle = (themeId, isLocked) => {
    if (isLocked) return;

    setSelectedThemes(prev =>
      prev.includes(themeId)
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handleSelectAll = () => {
    const availableThemes = themes
      .filter((theme, index) => userIsPro || index < 4)
      .map(theme => theme.id);

    const allSelected = availableThemes.every(id => selectedThemes.includes(id));
    setSelectedThemes(allSelected ? [] : availableThemes);
  };

  const handleValidate = () => {
    if (selectedThemes.length === 0) return;

    onSelectThemes({
      themeIds: selectedThemes,
      themes: themes.filter(t => selectedThemes.includes(t.id))
    });
    handleClose();
  };

  // Calculate total words from selected themes
  const totalWords = themes
    .filter(t => selectedThemes.includes(t.id))
    .reduce((sum, t) => sum + (t.wordCount || 0), 0);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="mime-modal-wrapper open">
      <div className="mime-modal-backdrop" onClick={handleClose} />

      <div className="mime-modal">
        {/* Handle */}
        <div className="mime-modal-handle" />

        {/* Header */}
        <div className="mime-modal-header">
          <h2 className="mime-modal-title">Choisis tes thèmes</h2>
          <button className="mime-modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="mime-modal-content">
          {/* Subtitle + Select All */}
          <div className="mime-themes-header">
            <p className="mime-themes-subtitle">
              Sélectionne les thèmes de mots à mimer
            </p>
            <button
              className="mime-select-all-btn"
              onClick={handleSelectAll}
            >
              {themes
                .filter((t, i) => userIsPro || i < 4)
                .every(t => selectedThemes.includes(t.id))
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
          </div>

          {/* Themes Grid */}
          <div className="mime-themes-grid">
            {themes.map((theme, index) => {
              const isSelected = selectedThemes.includes(theme.id);
              const isLocked = !userIsPro && index >= 4;

              return (
                <motion.button
                  key={theme.id}
                  className={`mime-theme-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                  onClick={() => handleThemeToggle(theme.id, isLocked)}
                  whileHover={!isLocked ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isLocked ? { scale: 0.98 } : {}}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {isSelected && (
                    <div className="mime-theme-check">
                      <Check size={14} />
                    </div>
                  )}
                  {isLocked && (
                    <div className="mime-theme-lock">
                      <Lock size={12} />
                      <span>PRO</span>
                    </div>
                  )}
                  <span className="mime-theme-emoji">{theme.emoji}</span>
                  <span className="mime-theme-name">{theme.name}</span>
                  <span className="mime-theme-count">{theme.wordCount} mots</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer with Validate Button */}
        <div className="mime-modal-footer">
          <motion.button
            className={`mime-validate-btn ${selectedThemes.length === 0 ? 'disabled' : ''}`}
            onClick={handleValidate}
            disabled={selectedThemes.length === 0}
            whileHover={selectedThemes.length > 0 ? { scale: 1.02 } : {}}
            whileTap={selectedThemes.length > 0 ? { scale: 0.98 } : {}}
          >
            <span className="validate-text">
              {selectedThemes.length === 0
                ? 'Sélectionne au moins 1 thème'
                : `Valider (${selectedThemes.length} thème${selectedThemes.length > 1 ? 's' : ''})`}
            </span>
            {totalWords > 0 && (
              <span className="validate-meta">
                {totalWords} mots disponibles
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
