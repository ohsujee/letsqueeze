"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Lock } from 'lucide-react';

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

  const handleSelect = (quizId, isLocked) => {
    if (isLocked) return;
    onSelectQuiz(quizId);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="quiz-modal-wrapper">
          {/* Backdrop */}
          <motion.div
            className="quiz-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="quiz-modal"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Handle */}
            <div className="quiz-modal-handle" />

            {/* Header */}
            <div className="quiz-modal-header">
              <h2 className="quiz-modal-title">Choisir un Quiz</h2>
              <button className="quiz-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {/* Quiz List */}
            <div className="quiz-modal-list">
              {quizOptions.map((quiz, index) => {
                const isSelected = selectedQuizId === quiz.id;
                const isLocked = !userIsPro && index >= 3;

                return (
                  <motion.button
                    key={quiz.id}
                    className={`quiz-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => handleSelect(quiz.id, isLocked)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                  >
                    <span className="quiz-item-emoji">{quiz.emoji || '📝'}</span>
                    <div className="quiz-item-info">
                      <span className="quiz-item-title">{quiz.title}</span>
                      <span className="quiz-item-meta">
                        {quiz.description || quiz.category} • {quiz.questionCount} questions
                      </span>
                    </div>
                    <div className="quiz-item-status">
                      {isLocked ? (
                        <span className="quiz-item-lock">
                          <Lock size={14} />
                          PRO
                        </span>
                      ) : isSelected ? (
                        <span className="quiz-item-check">
                          <Check size={18} />
                        </span>
                      ) : null}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
