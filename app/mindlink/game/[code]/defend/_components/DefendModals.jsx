'use client';

import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#ec4899';

/**
 * WordGuessModal — Attacker proposed a word, defender must confirm/deny.
 */
export function WordGuessModal({ guessPending, wordGuess, players, onResponse }) {
  if (!guessPending) return null;

  const guesserName = players.find(p => p.uid === wordGuess.uid)?.name || '???';

  return (
    <AnimatePresence>
      <motion.div className="defend-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="defend-modal-card guess"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="defend-modal-label guess">Proposition de mot</div>
          <div className="defend-modal-text">
            <strong style={{ color: ACCENT }}>{guesserName}</strong> pense que le mot secret est :
          </div>
          <div className="defend-modal-guess-word">« {wordGuess.guess} »</div>
          <div className="defend-modal-hint">Le timer est en pause pendant cette proposition</div>
          <div className="defend-modal-btns">
            <motion.button className="defend-modal-btn wrong" whileTap={{ scale: 0.95 }} onClick={() => onResponse(false)}>
              Non, raté ! (-30s)
            </motion.button>
            <motion.button className="defend-modal-btn correct" whileTap={{ scale: 0.95 }} onClick={() => onResponse(true)}>
              Oui, c'est ça...
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * FoundConfirmModal — Defender confirms attackers found the word during oral play.
 */
export function FoundConfirmModal({ show, onClose, onConfirm }) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="defend-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="defend-modal-card confirm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="defend-modal-label confirm">Confirmation</div>
          <div className="defend-modal-confirm-text">
            Es-tu sûr ? Cette action <strong style={{ color: '#ef4444' }}>met fin à la manche</strong> et donne la victoire aux attaquants.
          </div>
          <div className="defend-modal-btns">
            <motion.button className="defend-modal-btn cancel" whileTap={{ scale: 0.95 }} onClick={onClose}>
              Annuler
            </motion.button>
            <motion.button className="defend-modal-btn danger" whileTap={{ scale: 0.95 }} onClick={() => { onClose(); onConfirm(); }}>
              Oui, confirmer
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
