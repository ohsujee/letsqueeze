'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * TimeUpModal - Modal universelle quand le temps est écoulé
 *
 * Utilisable par Quiz, BlindTest, Mime, etc.
 *
 * @param {boolean} isOpen - Afficher la modal
 * @param {string} gameColor - Couleur du jeu (défaut: violet Quiz)
 * @param {string} title - Titre principal (défaut: "Temps écoulé !")
 * @param {string} subtitle - Sous-titre optionnel
 * @param {string|ReactNode} answer - La réponse à révéler (optionnel)
 * @param {string} answerLabel - Label pour la réponse (défaut: "La réponse était")
 */
export default function TimeUpModal({
  isOpen = false,
  gameColor = '#8b5cf6',
  title = 'Temps écoulé !',
  subtitle,
  answer,
  answerLabel = 'La réponse était'
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            style={backdropStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Modal container */}
          <div style={containerStyle}>
            <motion.div
              style={modalStyle}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
            >
              {/* Timer icon animé */}
              <motion.div
                style={iconContainerStyle}
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{
                  duration: 0.5,
                  ease: 'easeInOut'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" style={timerIconStyle}>
                  <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 9v4l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </motion.div>

              {/* Titre */}
              <motion.h2
                style={titleStyle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h2>

              {/* Sous-titre */}
              {subtitle && (
                <motion.p
                  style={subtitleStyle}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {subtitle}
                </motion.p>
              )}

              {/* Réponse (si fournie) */}
              {answer && (
                <motion.div
                  style={{
                    ...answerContainerStyle,
                    borderColor: `${gameColor}40`,
                    background: `${gameColor}15`
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span style={answerLabelStyle}>{answerLabel}</span>
                  <span style={{
                    ...answerValueStyle,
                    color: gameColor,
                    textShadow: `0 0 20px ${gameColor}66`
                  }}>
                    {answer}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Styles
const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  zIndex: 9998,
};

const containerStyle = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  padding: '20px',
};

const modalStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '32px 40px',
  background: 'linear-gradient(180deg, rgba(30, 25, 45, 0.98) 0%, rgba(18, 15, 28, 0.98) 100%)',
  borderRadius: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  maxWidth: '320px',
  width: '100%',
};

const iconContainerStyle = {
  width: '70px',
  height: '70px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const timerIconStyle = {
  width: '60px',
  height: '60px',
  color: '#ef4444',
  filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.5))',
};

const titleStyle = {
  fontFamily: "var(--font-title, 'Bungee'), cursive",
  fontSize: '1.8rem',
  fontWeight: 400,
  color: '#ef4444',
  textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
  margin: 0,
  textAlign: 'center',
};

const subtitleStyle = {
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '0.95rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.6)',
  margin: 0,
  textAlign: 'center',
};

const answerContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '16px 24px',
  borderRadius: '16px',
  border: '1px solid',
  marginTop: '8px',
  width: '100%',
};

const answerLabelStyle = {
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const answerValueStyle = {
  fontFamily: "var(--font-title, 'Bungee'), cursive",
  fontSize: '1.4rem',
  textAlign: 'center',
  lineHeight: 1.2,
};
