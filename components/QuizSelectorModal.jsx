"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function QuizSelectorModal({
  isOpen,
  onClose,
  quizOptions,
  selectedQuizId,
  onSelectQuiz,
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
                border: '2px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '2rem',
                padding: '2rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
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
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <motion.h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #60A5FA, #6366F1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: 0
                }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                📚 Choisir un Quiz
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

            {/* Quiz Grid - Scrollable */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem',
              marginRight: '-0.5rem'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1rem'
              }}>
                {quizOptions.map((quiz, index) => {
                  const isSelected = selectedQuizId === quiz.id;
                  const isLocked = !userIsPro && index >= 3;

                  return (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={!isLocked ? { scale: 1.05, y: -5 } : {}}
                      whileTap={!isLocked ? { scale: 0.98 } : {}}
                      onClick={() => !isLocked && onSelectQuiz(quiz.id)}
                      style={{
                        position: 'relative',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected
                          ? '3px solid #10B981'
                          : '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1.25rem',
                        padding: '1.5rem',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                        opacity: isLocked ? 0.6 : 1,
                        filter: isLocked ? 'grayscale(0.5)' : 'none'
                      }}
                    >
                      {/* Lock Badge */}
                      {isLocked && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.05 + 0.2, type: "spring" }}
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
                            background: '#10B981',
                            color: 'white',
                            fontSize: '1rem',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)'
                          }}
                        >
                          ✓
                        </motion.div>
                      )}

                      {/* Emoji */}
                      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                        {quiz.emoji || '📝'}
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '0.75rem',
                        minHeight: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {quiz.title}
                      </div>

                      {/* Meta */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.35rem 0.65rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          {quiz.difficulty}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.5)'
                        }}>
                          {quiz.questionCount} Q
                        </span>
                      </div>

                      {/* Description */}
                      {quiz.description && (
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'rgba(255, 255, 255, 0.5)',
                          lineHeight: 1.4,
                          paddingTop: '0.75rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {quiz.description}
                        </div>
                      )}
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
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className="btn btn-primary"
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
