"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import './SelectorModal.css';

/**
 * Modal générique de sélection d'items (Quiz, Alibi, etc.)
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - État d'ouverture du modal
 * @param {Function} props.onClose - Callback de fermeture
 * @param {Array} props.options - Liste des options [{id, title, emoji?, difficulty?, questionCount?, description?}]
 * @param {string} props.selectedId - ID de l'option sélectionnée
 * @param {Function} props.onSelect - Callback de sélection (id) => void
 * @param {boolean} props.userIsPro - Si l'utilisateur est Pro
 * @param {string} props.title - Titre du modal
 * @param {Object} props.emojis - Mapping optionnel id => emoji
 * @param {string} props.variant - 'quiz' | 'alibi' pour les couleurs (défaut: 'quiz')
 * @param {number} props.freeLimit - Nombre d'items gratuits (défaut: 3)
 */
export default function SelectorModal({
  isOpen,
  onClose,
  options = [],
  selectedId,
  onSelect,
  userIsPro = false,
  title = "Sélectionner",
  emojis = {},
  variant = 'quiz',
  freeLimit = 3
}) {
  const [mounted, setMounted] = useState(false);

  useBackHandler(onClose, isOpen);

  // Couleurs selon la variante (guide de style UI)
  const colors = variant === 'alibi'
    ? {
        gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)',
        border: 'rgba(255, 255, 255, 0.1)',
        borderSelected: 'var(--alibi-primary, #f59e0b)',
        bgSelected: 'rgba(245, 158, 11, 0.15)',
        shadow: 'rgba(245, 158, 11, 0.3)',
        glowColor: '#f59e0b',
        btnClass: 'btn-accent'
      }
    : {
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        border: 'rgba(255, 255, 255, 0.1)',
        borderSelected: 'var(--success, #22c55e)',
        bgSelected: 'rgba(34, 197, 94, 0.15)',
        shadow: 'rgba(34, 197, 94, 0.3)',
        glowColor: '#22c55e',
        btnClass: 'btn-primary'
      };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="selector-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="selector-modal-backdrop"
          />

          {/* Modal Container */}
          <div className="selector-modal-container">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="selector-modal-panel"
              style={{
                border: `2px solid ${variant === 'alibi' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                boxShadow: `0 24px 64px rgba(0, 0, 0, 0.5), 0 0 60px ${variant === 'alibi' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)'}`
              }}
            >
              {/* Header */}
              <div className="selector-modal-header" style={{
                borderBottom: `1px solid ${variant === 'alibi' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`
              }}>
                <motion.h2
                  className="selector-modal-title"
                  style={{
                    textShadow: variant === 'alibi'
                      ? '0 0 10px rgba(245, 158, 11, 0.5), 0 0 30px rgba(245, 158, 11, 0.3)'
                      : '0 0 10px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)'
                  }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {title}
                </motion.h2>
                <button
                  onClick={onClose}
                  className="selector-modal-close-btn"
                >
                  ×
                </button>
              </div>

              {/* Options Grid - Scrollable */}
              <div className="selector-modal-scroll">
                <div className="selector-modal-grid">
                  {options.map((option, index) => {
                    const isSelected = selectedId === option.id;
                    const isLocked = !userIsPro && index >= freeLimit;
                    const emoji = emojis[option.id] || option.emoji || '📝';

                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        whileHover={!isLocked ? { scale: 1.05, y: -5 } : {}}
                        whileTap={!isLocked ? { scale: 0.98 } : {}}
                        onClick={() => !isLocked && onSelect(option.id)}
                        className="selector-modal-option"
                        style={{
                          background: isSelected ? colors.bgSelected : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? `3px solid ${colors.borderSelected}` : '2px solid rgba(255, 255, 255, 0.1)',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          boxShadow: isSelected ? `0 4px 20px ${colors.shadow}` : '0 4px 12px rgba(0, 0, 0, 0.2)',
                          opacity: isLocked ? 0.6 : 1,
                          filter: isLocked ? 'grayscale(0.5)' : 'none'
                        }}
                      >
                        {/* Lock Badge */}
                        {isLocked && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: index * 0.04 + 0.2, type: "spring" }}
                            className="selector-modal-lock-badge"
                          >
                            🔒 PRO
                          </motion.div>
                        )}

                        {/* Selected Badge */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="selector-modal-selected-badge"
                            style={{
                              background: colors.borderSelected,
                              boxShadow: `0 4px 12px ${colors.shadow}`
                            }}
                          >
                            ✓
                          </motion.div>
                        )}

                        {/* Emoji */}
                        <div className="selector-modal-emoji">
                          {emoji}
                        </div>

                        {/* Title */}
                        <div className="selector-modal-option-title">
                          {option.title}
                        </div>

                        {/* Meta (optionnel - pour quiz) */}
                        {(option.difficulty || option.questionCount) && (
                          <div className="selector-modal-meta">
                            {option.difficulty && (
                              <span className="selector-modal-difficulty">
                                {option.difficulty}
                              </span>
                            )}
                            {option.questionCount && (
                              <span className="selector-modal-question-count">
                                {option.questionCount} Q
                              </span>
                            )}
                          </div>
                        )}

                        {/* Description (optionnel) */}
                        {option.description && (
                          <div className="selector-modal-description">
                            {option.description}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <motion.div
                className="selector-modal-footer"
                style={{
                  borderTop: `1px solid ${variant === 'alibi' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`
                }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="selector-modal-confirm-btn"
                  style={{
                    background: variant === 'alibi'
                      ? 'linear-gradient(135deg, #f59e0b, #ea580c)'
                      : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    boxShadow: variant === 'alibi'
                      ? '0 4px 15px rgba(245, 158, 11, 0.4), 0 0 30px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      : '0 4px 15px rgba(139, 92, 246, 0.4), 0 0 30px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  Confirmer
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

// Mapping d'emojis prédéfinis pour les alibis
export const ALIBI_EMOJIS = {
  "match-equipe-locale": "⚽",
  "terrain-basket": "🏀",
  "karting-competition": "🏎️",
  "paintball-equipes": "🎯",
  "comedie-club": "🎭",
  "escape-game": "🔐",
  "japan-expo": "🎌",
  "restaurant-italien": "🍝",
  "pub-karaoke": "🎤",
  "studio-enregistrement": "🎙️",
  "tournage-clip": "🎬",
  "session-teamspeak": "🎮",
  "salle-de-sport": "💪",
  "seance-cinema": "🎥",
  "visite-musee": "🖼️",
  "degustation-vins": "🍷",
  "marche-producteurs": "🥬",
  "studio-photo": "📸"
};
