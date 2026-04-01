'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AlibiRoundTransition.css';

/**
 * AlibiRoundTransition - Modal de transition entre les rounds
 *
 * Affiche "Groupe X interroge Groupe Y" avec animation.
 * Personnalisé selon le rôle du joueur (inspecteur, accusé, spectateur).
 *
 * @param {Object} props
 * @param {boolean} props.show - Déclenche l'affichage
 * @param {Object} props.inspectorGroup - { id, name, color }
 * @param {Object} props.accusedGroup - { id, name, color }
 * @param {string} props.myRole - 'inspector' | 'accused' | 'spectator' | null
 * @param {Object} props.progress - { current, total } numéro du round
 * @param {Function} props.onComplete - Callback après fermeture
 * @param {number} props.duration - Durée d'affichage en ms (défaut: 3000)
 */
export default function AlibiRoundTransition({
  show,
  inspectorGroup,
  accusedGroup,
  myRole,
  progress,
  onComplete,
  duration = 3000
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (show && inspectorGroup && accusedGroup) {
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
  }, [show, inspectorGroup?.id, accusedGroup?.id, duration]);

  // Messages personnalisés selon le rôle
  const getRoleMessage = () => {
    switch (myRole) {
      case 'inspector':
        return {
          icon: '🔍',
          title: 'C\'est à vous d\'interroger !',
          subtitle: `Posez vos questions à ${accusedGroup?.name}`,
          hint: 'Débusquez les incohérences dans leur alibi'
        };
      case 'accused':
        return {
          icon: '🎭',
          title: 'Vous êtes interrogés !',
          subtitle: `${inspectorGroup?.name} va vous questionner`,
          hint: 'Répondez de manière cohérente avec votre alibi'
        };
      case 'spectator':
        return {
          icon: '👁️',
          title: 'Observez l\'interrogatoire',
          subtitle: `${inspectorGroup?.name} interroge ${accusedGroup?.name}`,
          hint: 'Votre tour viendra...'
        };
      default:
        return {
          icon: '⚖️',
          title: 'Nouvel interrogatoire',
          subtitle: `${inspectorGroup?.name} vs ${accusedGroup?.name}`,
          hint: ''
        };
    }
  };

  const roleMessage = getRoleMessage();
  const inspectorColor = inspectorGroup?.color || '#FF2D55';
  const accusedColor = accusedGroup?.color || '#00D4FF';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="alibi-round-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="alibi-round-modal"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {/* Progress indicator */}
            {progress && (
              <motion.div
                className="round-progress"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Question {progress.current} / {progress.total}
              </motion.div>
            )}

            {/* Icon */}
            <motion.div
              className="round-icon"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
                delay: 0.15
              }}
            >
              {roleMessage.icon}
            </motion.div>

            {/* Title */}
            <motion.h2
              className="round-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {roleMessage.title}
            </motion.h2>

            {/* VS Display */}
            <motion.div
              className="round-vs-container"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Inspector Group */}
              <div className="round-group inspector">
                <div
                  className="group-badge"
                  style={{
                    '--group-color': inspectorColor,
                    background: `linear-gradient(135deg, ${inspectorColor}30, ${inspectorColor}10)`,
                    borderColor: `${inspectorColor}60`
                  }}
                >
                  <span className="group-role-icon">🔍</span>
                  <span className="group-name" style={{ color: inspectorColor }}>
                    {inspectorGroup?.name}
                  </span>
                  <span className="group-role">Inspecteurs</span>
                </div>
              </div>

              {/* VS */}
              <div className="round-vs">
                <span>VS</span>
              </div>

              {/* Accused Group */}
              <div className="round-group accused">
                <div
                  className="group-badge"
                  style={{
                    '--group-color': accusedColor,
                    background: `linear-gradient(135deg, ${accusedColor}30, ${accusedColor}10)`,
                    borderColor: `${accusedColor}60`
                  }}
                >
                  <span className="group-role-icon">🎭</span>
                  <span className="group-name" style={{ color: accusedColor }}>
                    {accusedGroup?.name}
                  </span>
                  <span className="group-role">Accusés</span>
                </div>
              </div>
            </motion.div>

            {/* Hint */}
            {roleMessage.hint && (
              <motion.p
                className="round-hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {roleMessage.hint}
              </motion.p>
            )}

            {/* Progress bar */}
            <motion.div
              className="round-progress-bar"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
