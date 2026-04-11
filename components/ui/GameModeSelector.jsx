'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Confetti, X } from '@phosphor-icons/react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import './selector-flat.css';

/**
 * GameModeSelector - Modal de sélection du mode de jeu
 * Game Master vs Party Mode
 */
export default function GameModeSelector({ isOpen, onClose, onSelectMode, game }) {
  useBackHandler(onClose, isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="sel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="sel-container">
            <motion.div
              className="sel-modal"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button className="sel-close" onClick={onClose}>
                <X weight="bold" size={18} />
              </button>

              <div className="sel-header">
                <h2 className="sel-title">Comment veux-tu jouer ?</h2>
                <p className="sel-subtitle">Choisis ton mode de jeu</p>
              </div>

              <div className="sel-options">
                {/* Game Master Mode */}
                <motion.button
                  className="sel-option"
                  onClick={() => onSelectMode('gamemaster')}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#8b5cf6', borderBottomColor: '#6d28d9' }}>
                    <Crown weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <div className="sel-option-title-row">
                      <h3 className="sel-option-title">Game Master</h3>
                      {game?.id === 'alibi' && <span className="sel-player-pill">3+ joueurs</span>}
                    </div>
                    <p className="sel-option-desc">
                      Tu animes le jeu mais ne joues pas
                    </p>
                  </div>
                </motion.button>

                {/* Party Mode */}
                <motion.button
                  className="sel-option"
                  onClick={() => onSelectMode('party')}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#f59e0b', borderBottomColor: '#b45309' }}>
                    <Confetti weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <div className="sel-option-title-row">
                      <h3 className="sel-option-title">Party Mode</h3>
                      {game?.id === 'alibi' && <span className="sel-player-pill">4+ joueurs</span>}
                    </div>
                    <p className="sel-option-desc">
                      Chacun pose une question à tour de rôle
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
