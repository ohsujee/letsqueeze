'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * BuzzValidationModal - Modal de validation quand un joueur buzz
 *
 * Utilisable par Quiz, BlindTest, Mime, etc.
 *
 * @param {boolean} isOpen - Afficher la modal
 * @param {string} playerName - Nom du joueur qui a buzzé
 * @param {string} gameColor - Couleur du jeu (défaut: violet Quiz)
 * @param {string} answerLabel - Label de la réponse (ex: "Réponse attendue")
 * @param {string|ReactNode} answerValue - Valeur de la réponse à afficher
 * @param {number} points - Points en jeu (optionnel)
 * @param {function} onCorrect - Callback bonne réponse
 * @param {function} onWrong - Callback mauvaise réponse
 * @param {function} onCancel - Callback annuler (buzz accidentel)
 */
export default function BuzzValidationModal({
  isOpen = false,
  playerName = '',
  gameColor = '#8b5cf6',
  answerLabel,
  answerValue,
  points,
  onCorrect,
  onWrong,
  onCancel
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            style={overlayStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Container */}
          <div style={containerStyle}>
            <motion.div
              style={{
                ...cardStyle,
                borderColor: `${gameColor}66`,
                boxShadow: `0 0 60px ${gameColor}33, 0 25px 50px rgba(0, 0, 0, 0.5)`
              }}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {/* Bell Icon */}
              <div style={iconWrapperStyle}>
                <div style={{
                  ...iconCircleStyle,
                  background: `linear-gradient(135deg, ${gameColor} 0%, ${adjustColor(gameColor, -30)} 100%)`,
                  borderColor: `${gameColor}99`,
                  boxShadow: `0 0 30px ${gameColor}66`
                }}>
                  <svg viewBox="0 0 24 24" fill="none" style={bellIconStyle}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Points Badge (top-right) */}
              {points !== undefined && points !== null && (
                <div style={{
                  ...pointsBadgeStyle,
                  background: `linear-gradient(135deg, ${gameColor} 0%, ${adjustColor(gameColor, -30)} 100%)`,
                  boxShadow: `0 4px 15px ${gameColor}66`
                }}>
                  <span style={pointsValueStyle}>{points}</span>
                  <span style={pointsLabelStyle}>pts</span>
                </div>
              )}

              {/* Player Info */}
              <div style={playerSectionStyle}>
                <span style={{
                  ...playerNameStyle,
                  textShadow: `0 0 20px ${gameColor}99`
                }}>{playerName}</span>
                <span style={playerActionStyle}>a buzzé</span>
              </div>

              {/* Answer Section (optional) */}
              {answerValue && (
                <div style={{
                  ...answerSectionStyle,
                  background: `${gameColor}1F`,
                  borderColor: `${gameColor}4D`
                }}>
                  {answerLabel && (
                    <span style={answerLabelStyle}>{answerLabel}</span>
                  )}
                  <div style={{
                    ...answerValueStyle,
                    color: typeof answerValue === 'string' ? gameColor : 'inherit',
                    textShadow: typeof answerValue === 'string' ? `0 0 12px ${gameColor}80` : 'none'
                  }}>
                    {answerValue}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={actionsStyle}>
                <button style={btnWrongStyle} onClick={onWrong}>
                  <X size={22} />
                  <span>Faux</span>
                </button>
                <button style={{
                  ...btnBaseStyle,
                  background: `linear-gradient(135deg, ${gameColor}33, ${gameColor}1A)`,
                  borderColor: `${gameColor}66`,
                  color: gameColor,
                  boxShadow: `0 4px 15px ${gameColor}40`
                }} onClick={onCorrect}>
                  <Check size={22} />
                  <span>Correct</span>
                </button>
              </div>

              {/* Cancel Button */}
              {onCancel && (
                <button style={btnCancelStyle} onClick={onCancel}>
                  Annuler le buzz
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Styles
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.92)',
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

const cardStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '340px',
  background: 'linear-gradient(180deg, rgb(22, 18, 35) 0%, rgb(14, 12, 22) 100%)',
  border: '1px solid',
  borderRadius: '24px',
  padding: '50px 24px 24px 24px',
  marginTop: '30px',
};

const iconWrapperStyle = {
  position: 'absolute',
  top: '-30px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
};

const iconCircleStyle = {
  width: '60px',
  height: '60px',
  border: '3px solid',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bellIconStyle = {
  width: '28px',
  height: '28px',
  color: 'white',
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
};

const playerSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  marginBottom: '20px',
  paddingBottom: '16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const playerNameStyle = {
  fontFamily: "var(--font-title, 'Bungee'), cursive",
  fontSize: '1.6rem',
  color: '#ffffff',
  textAlign: 'center',
  wordBreak: 'break-word',
};

const playerActionStyle = {
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '0.9rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.5)',
};

const answerSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid',
  borderRadius: '14px',
  padding: '14px 18px',
  marginBottom: '20px',
};

const answerLabelStyle = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

const answerValueStyle = {
  fontWeight: 700,
  fontSize: '1.1rem',
  textAlign: 'center',
  lineHeight: 1.3,
};

const pointsBadgeStyle = {
  position: 'absolute',
  top: '-15px',
  right: '-8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '55px',
  padding: '8px 12px',
  borderRadius: '12px',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  transform: 'rotate(8deg)',
  zIndex: 20,
};

const pointsValueStyle = {
  fontFamily: "var(--font-title, 'Bungee'), cursive",
  fontSize: '1.3rem',
  color: 'white',
  lineHeight: 1,
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
};

const pointsLabelStyle = {
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '0.6rem',
  fontWeight: 700,
  color: 'rgba(255, 255, 255, 0.85)',
  textTransform: 'uppercase',
};

const actionsStyle = {
  display: 'flex',
  gap: '12px',
};

const btnBaseStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '14px 16px',
  borderRadius: '14px',
  border: '1px solid',
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const btnWrongStyle = {
  ...btnBaseStyle,
  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
  borderColor: 'rgba(239, 68, 68, 0.4)',
  color: '#f87171',
};

const btnCancelStyle = {
  width: '100%',
  marginTop: '12px',
  padding: '12px 16px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
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
