'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { SpeakerSimpleHigh, Broadcast, X } from '@phosphor-icons/react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import './selector-flat.css';

/**
 * AudioModeSelector - Modal de sélection du mode audio (DeezTest)
 */
export default function AudioModeSelector({ isOpen, onClose, onSelectMode, game }) {
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
                <h2 className="sel-title">D'où vient le son ?</h2>
                <p className="sel-subtitle">Choisis la sortie audio</p>
              </div>

              <div className="sel-options">
                {/* Single Mode */}
                <motion.button
                  className="sel-option"
                  onClick={() => onSelectMode('single')}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#A238FF', borderBottomColor: '#7B20CC' }}>
                    <SpeakerSimpleHigh weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <h3 className="sel-option-title">Téléphone de l'asker</h3>
                    <p className="sel-option-desc">
                      Le son vient uniquement du téléphone qui pose la question
                    </p>
                  </div>
                </motion.button>

                {/* All Mode */}
                <motion.button
                  className="sel-option"
                  onClick={() => onSelectMode('all')}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="sel-option-icon" style={{ background: '#06b6d4', borderBottomColor: '#0e7490' }}>
                    <Broadcast weight="fill" size={28} color="#fff" />
                  </div>
                  <div className="sel-option-content">
                    <h3 className="sel-option-title">Tous les téléphones</h3>
                    <p className="sel-option-desc">
                      Le son est joué sur tous les téléphones en même temps
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
