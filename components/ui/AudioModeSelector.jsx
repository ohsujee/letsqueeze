'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Speaker, Volume2, X } from 'lucide-react';

/**
 * AudioModeSelector - Modal de sélection du mode audio (DeezTest)
 *
 * Affiché après la sélection du Game Master Mode pour choisir où l'audio sera joué.
 * Permet de choisir entre:
 * - Single: Le son vient uniquement du téléphone qui pose la question (comportement actuel)
 * - All: Le son est joué sur tous les téléphones en même temps (synchronisé)
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Si le modal est ouvert
 * @param {Function} props.onClose - Callback pour fermer le modal
 * @param {Function} props.onSelectMode - Callback avec le mode sélectionné ('single' | 'all')
 * @param {Object} props.game - Infos du jeu (pour le style)
 */
export default function AudioModeSelector({ isOpen, onClose, onSelectMode, game }) {
  const themeColor = game?.themeColor || '#A238FF';

  const handleSelect = (mode) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="gms-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container - for centering */}
          <div className="gms-container">
            {/* Modal - for animation */}
            <motion.div
              className="gms-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
            {/* Close button */}
            <button className="gms-close" onClick={onClose}>
              <X size={20} />
            </button>

            {/* Header */}
            <div className="gms-header">
              <h2 className="gms-title">D'où vient le son ?</h2>
              <p className="gms-subtitle">Choisis la sortie audio</p>
            </div>

            {/* Options */}
            <div className="gms-options">
              {/* Single Mode - Téléphone de l'asker uniquement */}
              <motion.button
                className="gms-option"
                onClick={() => handleSelect('single')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ '--option-color': themeColor }}
              >
                <div className="gms-option-icon">
                  <Speaker size={32} />
                </div>
                <div className="gms-option-content">
                  <h3 className="gms-option-title">Téléphone de l'asker</h3>
                  <p className="gms-option-desc">
                    Le son vient uniquement du téléphone qui pose la question
                  </p>
                </div>
              </motion.button>

              {/* All Mode - Tous les téléphones */}
              <motion.button
                className="gms-option gms-option-party"
                onClick={() => handleSelect('all')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ '--option-color': '#06b6d4' }}
              >
                <div className="gms-option-icon party">
                  <Volume2 size={32} />
                </div>
                <div className="gms-option-content">
                  <h3 className="gms-option-title">Tous les téléphones</h3>
                  <p className="gms-option-desc">
                    Le son est joué sur tous les téléphones en même temps
                  </p>
                </div>
              </motion.button>
            </div>
            </motion.div>
          </div>

          <style jsx>{`
            :global(.gms-backdrop) {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              z-index: 9998;
            }

            .gms-container {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              padding: 16px;
              pointer-events: none;
            }

            :global(.gms-modal) {
              position: relative;
              width: 100%;
              max-width: 400px;
              background: linear-gradient(180deg, rgb(22, 18, 35) 0%, rgb(14, 12, 22) 100%);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 24px;
              padding: 24px;
              box-shadow:
                0 25px 50px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
              pointer-events: auto;
            }

            .gms-close {
              position: absolute;
              top: -12px;
              right: -12px;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              color: white;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
              z-index: 10;
            }

            .gms-close:hover {
              background: linear-gradient(135deg, #f87171, #ef4444);
              transform: scale(1.1);
              box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
            }

            .gms-close:active {
              transform: scale(0.95);
            }

            .gms-header {
              text-align: center;
              margin-bottom: 24px;
            }

            .gms-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 1.4rem;
              color: white;
              margin: 0 0 8px 0;
            }

            .gms-subtitle {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 0.9rem;
              color: rgba(255, 255, 255, 0.5);
              margin: 0;
            }

            .gms-options {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            :global(.gms-option) {
              position: relative;
              display: flex;
              align-items: center;
              gap: 16px;
              padding: 16px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 16px;
              cursor: pointer;
              text-align: left;
              transition: all 0.2s ease;
            }

            :global(.gms-option:hover) {
              background: rgba(var(--option-color-rgb, 139, 92, 246), 0.1);
              border-color: var(--option-color, #8b5cf6);
              box-shadow: 0 0 20px rgba(var(--option-color-rgb, 139, 92, 246), 0.2);
            }

            :global(.gms-option-party:hover) {
              background: rgba(6, 182, 212, 0.1);
              border-color: #06b6d4;
              box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
            }

            .gms-option-icon {
              width: 56px;
              height: 56px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 14px;
              color: #a78bfa;
              flex-shrink: 0;
            }

            .gms-option-icon.party {
              background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1));
              border-color: rgba(6, 182, 212, 0.3);
              color: #22d3ee;
            }

            .gms-option-content {
              flex: 1;
              min-width: 0;
            }

            .gms-option-title {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1.1rem;
              font-weight: 700;
              color: white;
              margin: 0 0 4px 0;
            }

            .gms-option-desc {
              font-family: var(--font-body, 'Inter'), sans-serif;
              font-size: 0.85rem;
              color: rgba(255, 255, 255, 0.5);
              margin: 0;
              line-height: 1.4;
            }

          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
