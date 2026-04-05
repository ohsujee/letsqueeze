'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, Target, MusicNote, MaskHappy } from '@phosphor-icons/react';
import { darkenColor } from '@/lib/utils/colorUtils';
import './AskerTransition.css';

/**
 * AskerTransition — Fullscreen flat transition quand le poseur/mimeur change
 * Fond coloré du jeu, icône Phosphor, texte gros blanc.
 */

const GAME_PRESETS = {
  quiz: {
    IconMe: Microphone, IconOther: Target,
    titleMe: 'Tu poses la question', hintMe: 'Lis la question à voix haute',
    hintOther: 'Prépare-toi à buzzer !', defaultColor: '#8b5cf6',
  },
  blindtest: {
    IconMe: MusicNote, IconOther: MusicNote,
    titleMe: 'Tu lances la musique', hintMe: 'Lance le morceau !',
    hintOther: 'Prépare-toi à buzzer !', defaultColor: '#A238FF',
  },
  mime: {
    IconMe: MaskHappy, IconOther: MaskHappy,
    titleMe: "C'est ton tour de mimer", hintMe: 'Prépare-toi à mimer',
    hintOther: 'Prépare-toi à deviner !', defaultColor: '#00ff66',
  },
};

export default function AskerTransition({
  show, asker, isMe = false, onComplete, duration = 2000,
  game = 'quiz', themeColor,
}) {
  const preset = GAME_PRESETS[game] || GAME_PRESETS.quiz;
  const hasTeam = !!asker?.teamColor;
  const bgColor = hasTeam ? asker.teamColor : (themeColor || preset.defaultColor);
  const darkerColor = darkenColor(bgColor, 40);
  const [visible, setVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const timerRef = useRef(null);
  const askerRef = useRef(asker);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { if (asker) askerRef.current = asker; }, [asker]);

  const askerUid = asker?.uid;

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (show && askerUid) {
      setVisible(true);
      // Vibration plus forte si c'est mon tour
      if (isMe) {
        navigator?.vibrate?.([100, 50, 100, 50, 100]);
      } else {
        navigator?.vibrate?.([50]);
      }
      timerRef.current = setTimeout(() => {
        setVisible(false);
        onCompleteRef.current?.();
        timerRef.current = null;
      }, duration);
    } else if (!show) {
      setVisible(false);
    }
    return () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [show, askerUid, duration]);

  const Icon = isMe ? preset.IconMe : preset.IconOther;

  return (
    <AnimatePresence>
      {visible && asker && (
        <motion.div
          className="asker-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: bgColor }}
        >
          {/* Texte */}
          <motion.div
            className="asker-modal-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            {isMe ? (
              <>
                <span className="asker-subtitle">C'est ton tour !</span>
                <span className="asker-title">{preset.titleMe}</span>
                <span className="asker-hint">{preset.hintMe}</span>
              </>
            ) : (
              <>
                <span className="asker-subtitle">C'est au tour de</span>
                <span className="asker-title">{asker.name}</span>
                <span className="asker-hint">de poser la question</span>
              </>
            )}
          </motion.div>

          {/* Badge équipe */}
          {asker.teamName && (
            <motion.div
              className="asker-team-badge"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <span className="team-label">{asker.teamName}</span>
            </motion.div>
          )}

          {/* Barre de progression */}
          <motion.div
            className="asker-progress-bar"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />

          {/* Depth bar */}
          <div className="asker-depth-bar" style={{ background: darkerColor }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
