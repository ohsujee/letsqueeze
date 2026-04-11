'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, X } from '@phosphor-icons/react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import './selector-flat.css';

/**
 * CreateOrJoinSelector - Modal pour choisir entre créer ou rejoindre une partie
 */
export default function CreateOrJoinSelector({ isOpen, onClose, onSelectCreate, onSelectJoin, game }) {
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
                <h2 className="sel-title">{game?.name || 'Jeu'}</h2>
                <p className="sel-subtitle">Comment voulez-vous jouer ?</p>
              </div>

              <div className="sel-options">
                <motion.button
                  className="sel-option"
                  onClick={onSelectCreate}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#8b5cf6', borderBottomColor: '#6d28d9' }}>
                    <Users weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <h3 className="sel-option-title">Créer la partie</h3>
                    <p className="sel-option-desc">
                      Vous hébergez la partie et partagez le code à vos joueurs
                    </p>
                  </div>
                </motion.button>

                <motion.button
                  className="sel-option"
                  onClick={onSelectJoin}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#06b6d4', borderBottomColor: '#0e7490' }}>
                    <UserPlus weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <h3 className="sel-option-title">Rejoindre une partie</h3>
                    <p className="sel-option-desc">
                      Entrez le code de l'hôte qui a créé la partie
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
