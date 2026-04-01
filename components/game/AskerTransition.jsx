'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AskerTransition.css';

/**
 * AskerTransition - Modal de transition quand le poseur/mimeur change
 *
 * Affiche brièvement "C'est au tour de X" dans une modal centrée,
 * puis se ferme automatiquement.
 *
 * @param {string} game - 'quiz' | 'blindtest' | 'mime' (défaut: 'quiz')
 * @param {string} themeColor - Couleur custom (override la couleur du jeu)
 */

const GAME_PRESETS = {
  quiz: {
    emojiMe: '🎤',
    emojiOther: '🎯',
    titleMe: 'Tu poses la question',
    hintMe: 'Lis la question à voix haute',
    hintOther: 'Prépare-toi à buzzer !',
    defaultColor: '#8b5cf6',
  },
  blindtest: {
    emojiMe: '🎵',
    emojiOther: '🎧',
    titleMe: 'Tu lances la musique',
    hintMe: 'Lance le morceau !',
    hintOther: 'Prépare-toi à buzzer !',
    defaultColor: '#A238FF',
  },
  mime: {
    emojiMe: '🎭',
    emojiOther: '👀',
    titleMe: 'C\'est ton tour de mimer',
    hintMe: 'Prépare-toi à mimer',
    hintOther: 'Prépare-toi à deviner !',
    defaultColor: '#00ff66',
  },
};

export default function AskerTransition({
  show,
  asker,
  isMe = false,
  onComplete,
  duration = 2000,
  game = 'quiz',
  themeColor,
}) {
  const preset = GAME_PRESETS[game] || GAME_PRESETS.quiz;
  const accentColor = themeColor || asker?.teamColor || preset.defaultColor;
  const [visible, setVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const timerRef = useRef(null);
  const askerRef = useRef(asker);

  // Keep refs up to date without triggering effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Keep asker ref updated for rendering
  useEffect(() => {
    if (asker) {
      askerRef.current = asker;
    }
  }, [asker]);

  // Use asker?.uid as stable dependency instead of the whole object
  const askerUid = asker?.uid;

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (show && askerUid) {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onCompleteRef.current?.();
        timerRef.current = null;
      }, duration);
    } else if (!show) {
      setVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [show, askerUid, duration]);

  return (
    <AnimatePresence>
      {visible && asker && (
        <motion.div
          className="asker-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="asker-transition-modal"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {/* Icône animée */}
            <motion.div
              className="asker-modal-icon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20
              }}
              style={{
                '--accent-color': accentColor
              }}
            >
              {isMe ? preset.emojiMe : preset.emojiOther}
            </motion.div>

            {/* Contenu texte */}
            <div className="asker-modal-content">
              {isMe ? (
                <>
                  <span className="asker-subtitle">C'est ton tour !</span>
                  <span className="asker-title" style={{ '--name-color': accentColor }}>{preset.titleMe}</span>
                  <span className="asker-hint">{preset.hintMe}</span>
                </>
              ) : (
                <>
                  <span className="asker-subtitle">C'est au tour de</span>
                  <span
                    className="asker-title"
                    style={{ '--name-color': accentColor }}
                  >
                    {asker.name}
                  </span>
                  <span className="asker-hint">{preset.hintOther}</span>
                </>
              )}
            </div>

            {/* Badge équipe si mode équipes */}
            {asker.teamName && (
              <motion.div
                className="asker-team-badge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ '--team-color': asker.teamColor }}
              >
                <span className="team-dot" />
                <span className="team-label">{asker.teamName}</span>
              </motion.div>
            )}

            {/* Barre de progression */}
            <motion.div
              className="asker-progress-bar"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: "linear" }}
              style={{
                '--progress-color': accentColor
              }}
            />
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
