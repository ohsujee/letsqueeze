"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Mapping d'emojis pour chaque alibi
const ALIBI_EMOJIS = {
  "match-equipe-locale": "⚽",
  "terrain-basket": "🏀",
  "karting-competition": "🏎️",
  "paintball-equipes": "🎯",
  "comedie-club": "🎭",
  "escape-game": "🔐",
  "japan-expo": "🎌",
  "restaurant-italien": "🍝",
  "pub-karaoke": "🎤",
  "studio-enregistrement": "🎙️",
  "tournage-clip": "🎬",
  "session-teamspeak": "🎮",
  "salle-de-sport": "💪",
  "seance-cinema": "🎥",
  "visite-musee": "🖼️",
  "degustation-vins": "🍷",
  "marche-producteurs": "🥬",
  "studio-photo": "📸"
};

export default function AlibiSelectorModal({
  isOpen,
  onClose,
  alibiOptions,
  selectedAlibiId,
  onSelectAlibi,
  userIsPro
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Empêcher le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 99999,
          pointerEvents: 'none'
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'auto'
            }}
          />

          {/* Modal Container */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            pointerEvents: 'none'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: '100%',
                maxWidth: '900px',
                maxHeight: '85vh',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(30px)',
                border: '2px solid rgba(255, 109, 0, 0.3)',
                borderRadius: '2rem',
                padding: '2rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 109, 0, 0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto'
              }}
            >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 109, 0, 0.2)'
            }}>
              <motion.h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #FF6D00, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                🕵️ Choisir un Alibi
              </motion.h2>
              <button
                onClick={onClose}
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '2.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 200,
                  position: 'relative'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  marginTop: '-1px'
                }}>×</span>
              </button>
            </div>

            {/* Alibi Grid - Scrollable */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem',
              marginRight: '-0.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {alibiOptions.map((alibi, index) => {
                  const isSelected = selectedAlibiId === alibi.id;
                  const isLocked = !userIsPro && index >= 3;
                  const emoji = ALIBI_EMOJIS[alibi.id] || '🎭';

                  return (
                    <motion.div
                      key={alibi.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      whileHover={!isLocked ? { scale: 1.05, y: -5 } : {}}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => !isLocked && onSelectAlibi(alibi.id)}
                      style={{
                        position: 'relative',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255, 109, 0, 0.2), rgba(245, 158, 11, 0.1))'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected
                          ? '3px solid #FF6D00'
                          : '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1.25rem',
                        padding: '1.5rem',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        boxShadow: isSelected
                          ? '0 4px 20px rgba(255, 109, 0, 0.3)'
                          : '0 4px 12px rgba(0, 0, 0, 0.2)',
                        opacity: isLocked ? 0.6 : 1,
                        filter: isLocked ? 'grayscale(0.5)' : 'none'
                      }}
                    >
                      {/* Lock Badge */}
                      {isLocked && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.04 + 0.2, type: "spring" }}
                          style={{
                            position: 'absolute',
                            top: '0.75rem',
                            right: '0.75rem',
                            background: 'linear-gradient(135deg, #FFD700, #FF6D00)',
                            color: 'white',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '0.35rem 0.65rem',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(255, 109, 0, 0.4)'
                          }}
                        >
                          🔒 PRO
                        </motion.div>
                      )}

                      {/* Selected Badge */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            position: 'absolute',
                            top: '0.75rem',
                            left: '0.75rem',
                            background: '#FF6D00',
                            color: 'white',
                            fontSize: '1rem',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(255, 109, 0, 0.5)'
                          }}
                        >
                          ✓
                        </motion.div>
                      )}

                      {/* Emoji */}
                      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                        {emoji}
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: 'white',
                        minHeight: '3rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1.3
                      }}>
                        {alibi.title}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <motion.div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 109, 0, 0.2)',
                textAlign: 'center'
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className="btn btn-accent"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  minWidth: '200px',
                  height: '48px',
                  fontSize: '1rem',
                  fontWeight: 700
                }}
              >
                Confirmer
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
