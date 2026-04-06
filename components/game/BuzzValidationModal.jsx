'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckFat, X, BellRinging } from '@phosphor-icons/react';

/**
 * BuzzValidationModal - Modal flat cartoon quand un joueur buzz
 * Réutilisable par Quiz, BlindTest, Mime, etc.
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
  // Vibrer quand la modal s'ouvre (quelqu'un a buzzé)
  useEffect(() => {
    if (isOpen) {
      navigator?.vibrate?.([80, 40, 80]);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgb(8, 8, 15, 0.92)',
              zIndex: 9998,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px',
          }}>
            <motion.div
              style={{
                width: '100%',
                maxWidth: '340px',
                background: '#2d1f5e',
                border: 'none',
                borderBottom: '4px solid #1e1445',
                borderRadius: 18,
                padding: '24px',
                textAlign: 'center',
              }}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Bell icon */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                background: '#7c3aed',
                borderBottom: '4px solid #5b21b6',
                borderRadius: 16,
                marginBottom: 16,
              }}>
                <BellRinging size={28} weight="fill" color="#fff" />
              </div>

              {/* Player name — max 16 chars, adapte la taille */}
              <div style={{
                fontFamily: "'Bungee', cursive",
                fontSize: playerName.length > 12 ? '1.4rem' : '1.8rem',
                color: '#fff',
                marginBottom: 4,
                wordBreak: 'break-word',
                lineHeight: 1.1,
              }}>
                {playerName}
              </div>

              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#c4b5fd',
                marginBottom: 20,
              }}>
                a buzzé
              </div>

              {/* Answer */}
              {answerValue && (
                <div style={{
                  background: '#16a34a',
                  borderBottom: '3px solid #15803d',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 20,
                }}>
                  {answerLabel && (
                    <div style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#bbf7d0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      marginBottom: 6,
                    }}>
                      {answerLabel}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#fff',
                    lineHeight: 1.3,
                  }}>
                    {answerValue}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <button
                  onClick={onWrong}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 64,
                    background: '#ef4444',
                    border: 'none',
                    borderBottom: '5px solid #b91c1c',
                    borderRadius: 14,
                    color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <X size={24} />
                  Faux
                </button>
                <button
                  onClick={onCorrect}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 64,
                    background: '#16a34a',
                    border: 'none',
                    borderBottom: '5px solid #15803d',
                    borderRadius: 14,
                    color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <CheckFat size={24} weight="fill" />
                  Correct
                </button>
              </div>

              {/* Cancel */}
              {onCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    width: '100%',
                    minHeight: 42,
                    background: '#3d2d70',
                    border: 'none',
                    borderBottom: '3px solid #2a1e55',
                    borderRadius: 12,
                    color: '#c4b5fd',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
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
