"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Lock } from 'lucide-react';

// Mapping d'emojis pour chaque alibi
const ALIBI_EMOJIS = {
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

export default function AlibiSelectorModal({
  isOpen,
  onClose,
  alibiOptions,
  selectedAlibiId,
  onSelectAlibi,
  userIsPro
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const handleSelect = (alibiId, isLocked) => {
    if (isLocked) return;
    onSelectAlibi(alibiId);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="alibi-modal-wrapper">
          {/* Backdrop */}
          <motion.div
            className="alibi-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="alibi-modal"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Handle */}
            <div className="alibi-modal-handle" />

            {/* Header */}
            <div className="alibi-modal-header">
              <h2 className="alibi-modal-title">Choisir un Alibi</h2>
              <button className="alibi-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* Alibi List */}
            <div className="alibi-modal-list">
              {alibiOptions.map((alibi, index) => {
                const isSelected = selectedAlibiId === alibi.id;
                const isLocked = !userIsPro && index >= 3;
                const emoji = ALIBI_EMOJIS[alibi.id] || '🎭';

                return (
                  <motion.button
                    key={alibi.id}
                    className={`alibi-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(alibi.id, isLocked)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                  >
                    <span className="alibi-item-emoji">{emoji}</span>
                    <div className="alibi-item-info">
                      <span className="alibi-item-title">{alibi.title}</span>
                      <span className="alibi-item-meta">
                        10 questions • Interrogatoire
                      </span>
                    </div>
                    <div className="alibi-item-status">
                      {isLocked ? (
                        <span className="alibi-item-lock">
                          <Lock size={14} />
                          PRO
                        </span>
                      ) : isSelected ? (
                        <span className="alibi-item-check">
                          <Check size={18} />
                        </span>
                      ) : null}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
