'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * AskerTransition - Modal de transition quand le poseur change
 *
 * Affiche brièvement "C'est au tour de X de poser la question"
 * dans une modal centrée, puis se ferme automatiquement.
 */
export default function AskerTransition({
  show,
  asker,
  isMe = false,
  onComplete,
  duration = 2000
}) {
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
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.1
              }}
              style={{
                '--accent-color': isMe ? '#22c55e' : (asker.teamColor || '#8b5cf6')
              }}
            >
              {isMe ? '🎤' : '🎯'}
            </motion.div>

            {/* Contenu texte */}
            <div className="asker-modal-content">
              {isMe ? (
                <>
                  <span className="asker-subtitle">C'est ton tour !</span>
                  <span className="asker-title asker-title-me">Tu poses la question</span>
                  <span className="asker-hint">Lis la question à voix haute</span>
                </>
              ) : (
                <>
                  <span className="asker-subtitle">C'est au tour de</span>
                  <span
                    className="asker-title"
                    style={{ '--name-color': asker.teamColor || '#a78bfa' }}
                  >
                    {asker.name}
                  </span>
                  <span className="asker-hint">Prépare-toi à buzzer !</span>
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
                '--progress-color': isMe ? '#22c55e' : (asker.teamColor || '#8b5cf6')
              }}
            />
          </motion.div>

          <style jsx>{`
            :global(.asker-transition-overlay) {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
              background: rgba(8, 8, 12, 0.95);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
            }

            :global(.asker-transition-modal) {
              position: relative;
              width: 100%;
              max-width: 320px;
              background: linear-gradient(180deg, rgba(30, 25, 45, 0.98) 0%, rgba(18, 15, 28, 0.98) 100%);
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 24px;
              padding: 32px 24px 24px;
              text-align: center;
              overflow: hidden;
              box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.6),
                0 0 80px rgba(139, 92, 246, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
            }

            .asker-modal-icon {
              width: 72px;
              height: 72px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 2.2rem;
              background: linear-gradient(135deg,
                color-mix(in srgb, var(--accent-color) 20%, transparent),
                color-mix(in srgb, var(--accent-color) 8%, transparent)
              );
              border: 2px solid color-mix(in srgb, var(--accent-color) 50%, transparent);
              border-radius: 50%;
              box-shadow:
                0 0 40px color-mix(in srgb, var(--accent-color) 30%, transparent),
                inset 0 0 20px color-mix(in srgb, var(--accent-color) 10%, transparent);
            }

            .asker-modal-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
              margin-bottom: 16px;
            }

            .asker-subtitle {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 0.9rem;
              font-weight: 500;
              color: rgba(255, 255, 255, 0.6);
              letter-spacing: 0.02em;
            }

            .asker-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 1.8rem;
              color: var(--name-color, #a78bfa);
              text-shadow: 0 0 30px color-mix(in srgb, var(--name-color, #a78bfa) 60%, transparent);
              line-height: 1.2;
              word-break: break-word;
            }

            .asker-title-me {
              color: #22c55e;
              text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
            }

            .asker-hint {
              font-family: var(--font-body, 'Inter'), sans-serif;
              font-size: 0.8rem;
              color: rgba(255, 255, 255, 0.4);
              margin-top: 4px;
            }

            .asker-team-badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              margin-bottom: 16px;
            }

            .team-dot {
              width: 10px;
              height: 10px;
              background: var(--team-color, #8b5cf6);
              border-radius: 50%;
              box-shadow: 0 0 10px var(--team-color, #8b5cf6);
            }

            .team-label {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 0.85rem;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.8);
            }

            :global(.asker-progress-bar) {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: var(--progress-color, #8b5cf6);
              transform-origin: left center;
              box-shadow: 0 0 10px var(--progress-color, #8b5cf6);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
