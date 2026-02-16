'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X } from 'lucide-react';

/**
 * CreateOrJoinSelector - Modal pour choisir entre créer ou rejoindre une partie
 *
 * Affiché en PREMIER quand l'utilisateur clique sur un jeu.
 * Permet de clarifier le flow: créer (host) vs rejoindre (player).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Si le modal est ouvert
 * @param {Function} props.onClose - Callback pour fermer le modal
 * @param {Function} props.onSelectCreate - Callback quand l'utilisateur choisit "Créer"
 * @param {Function} props.onSelectJoin - Callback quand l'utilisateur choisit "Rejoindre"
 * @param {Object} props.game - Infos du jeu (pour le style et le nom)
 */
export default function CreateOrJoinSelector({ isOpen, onClose, onSelectCreate, onSelectJoin, game }) {
  const themeColor = game?.themeColor || '#8b5cf6';

  const handleCreate = () => {
    onSelectCreate();
  };

  const handleJoin = () => {
    onSelectJoin();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="coj-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container - for centering */}
          <div className="coj-container">
            {/* Modal - for animation */}
            <motion.div
              className="coj-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <button className="coj-close" onClick={onClose}>
                <X size={20} />
              </button>

              {/* Header */}
              <div className="coj-header">
                <h2 className="coj-title">{game?.name || 'Jeu'}</h2>
                <p className="coj-subtitle">Comment voulez-vous jouer ?</p>
              </div>

              {/* Options */}
              <div className="coj-options">
                {/* Create - Créer la partie */}
                <motion.button
                  className="coj-option"
                  onClick={handleCreate}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ '--option-color': themeColor }}
                >
                  <div className="coj-option-icon create">
                    <Users size={32} />
                  </div>
                  <div className="coj-option-content">
                    <h3 className="coj-option-title">Créer la partie</h3>
                    <p className="coj-option-desc">
                      Vous hébergez la partie et partagez le code à vos joueurs
                    </p>
                  </div>
                </motion.button>

                {/* Join - Rejoindre une partie */}
                <motion.button
                  className="coj-option"
                  onClick={handleJoin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ '--option-color': '#06b6d4' }}
                >
                  <div className="coj-option-icon join">
                    <UserPlus size={32} />
                  </div>
                  <div className="coj-option-content">
                    <h3 className="coj-option-title">Rejoindre une partie</h3>
                    <p className="coj-option-desc">
                      Entrez le code de l'hôte qui a créé la partie
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>

          <style jsx>{`
            :global(.coj-backdrop) {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              z-index: 9998;
            }

            .coj-container {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              padding: 16px;
              pointer-events: none;
            }

            :global(.coj-modal) {
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

            .coj-close {
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

            .coj-close:hover {
              background: linear-gradient(135deg, #f87171, #ef4444);
              transform: scale(1.1);
              box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
            }

            .coj-close:active {
              transform: scale(0.95);
            }

            .coj-header {
              text-align: center;
              margin-bottom: 24px;
            }

            .coj-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 1.4rem;
              color: white;
              margin: 0 0 8px 0;
            }

            .coj-subtitle {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 0.9rem;
              color: rgba(255, 255, 255, 0.5);
              margin: 0;
            }

            .coj-options {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            :global(.coj-option) {
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

            :global(.coj-option:hover) {
              background: rgba(var(--option-color-rgb, 139, 92, 246), 0.1);
              border-color: var(--option-color, #8b5cf6);
              box-shadow: 0 0 20px rgba(var(--option-color-rgb, 139, 92, 246), 0.2);
            }

            .coj-option-icon {
              width: 56px;
              height: 56px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 14px;
              flex-shrink: 0;
            }

            .coj-option-icon.create {
              background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
              border: 1px solid rgba(139, 92, 246, 0.3);
              color: #a78bfa;
            }

            .coj-option-icon.join {
              background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1));
              border: 1px solid rgba(6, 182, 212, 0.3);
              color: #22d3ee;
            }

            .coj-option-content {
              flex: 1;
              min-width: 0;
            }

            .coj-option-title {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1.1rem;
              font-weight: 700;
              color: white;
              margin: 0 0 4px 0;
            }

            .coj-option-desc {
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
