'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * MyTurnModal - Modal universelle quand c'est ton tour de répondre
 *
 * Utilisable par Quiz, BlindTest, Mime, etc.
 *
 * @param {boolean} isOpen - Afficher la modal
 * @param {string} gameColor - Couleur du jeu (défaut: violet Quiz)
 * @param {string} title - Titre principal (défaut: "À TOI !")
 * @param {string} subtitle - Sous-titre (défaut: "Donne ta réponse à voix haute")
 * @param {string} icon - Emoji ou null pour l'icône micro par défaut
 */
export default function MyTurnModal({
  isOpen = false,
  gameColor = '#8b5cf6',
  title = 'À TOI !',
  subtitle = 'Donne ta réponse à voix haute',
  icon = null
}) {
  // Couleur plus foncée pour le dégradé
  const colorDark = adjustColor(gameColor, -40);

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
              {/* Icône animée */}
              <motion.div
                style={{
                  ...iconContainerStyle,
                  background: `linear-gradient(135deg, ${gameColor} 0%, ${colorDark} 100%)`,
                  boxShadow: `0 0 40px ${gameColor}80, 0 8px 32px rgba(0, 0, 0, 0.3)`
                }}
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                {icon ? (
                  <span style={emojiStyle}>{icon}</span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" style={micIconStyle}>
                    <path
                      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                      fill="currentColor"
                    />
                    <path
                      d="M19 10v2a7 7 0 0 1-14 0v-2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="12" y1="19" x2="12" y2="23"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="8" y1="23" x2="16" y2="23"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </motion.div>

              {/* Titre */}
              <motion.h2
                style={{
                  ...titleStyle,
                  color: gameColor,
                  textShadow: `0 0 30px ${gameColor}99`
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h2>

              {/* Sous-titre */}
              <motion.p
                style={subtitleStyle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>

              {/* Indicateur de pulsation */}
              <motion.div
                style={{
                  ...pulseIndicatorStyle,
                  background: `linear-gradient(90deg, transparent, ${gameColor}40, transparent)`
                }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
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
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '3px solid rgba(255, 255, 255, 0.2)',
};

const micIconStyle = {
  width: '36px',
  height: '36px',
  color: 'white',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
};

const emojiStyle = {
  fontSize: '36px',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
};

const titleStyle = {
  fontFamily: "var(--font-title, 'Bungee'), cursive",
  fontSize: '2.2rem',
  fontWeight: 400,
  margin: 0,
  letterSpacing: '0.02em',
};

const subtitleStyle = {
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '1rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.7)',
  margin: 0,
  textAlign: 'center',
  lineHeight: 1.4,
};

const pulseIndicatorStyle = {
  width: '60px',
  height: '3px',
  borderRadius: '2px',
  marginTop: '8px',
};

/**
 * Ajuste une couleur hex
 */
function adjustColor(color, amount) {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
