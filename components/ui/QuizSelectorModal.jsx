"use client";
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

  if (!isOpen) return null;

  const modalContent = (
    <div className="quiz-modal-wrapper open">
      {/* Backdrop - CSS animation */}
      <div
        className="quiz-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal - CSS animation */}
      <div className="quiz-modal">
        {/* Handle */}
        <div className="quiz-modal-handle" />

        {/* Header */}
        <div className="quiz-modal-header">
          <h2 className="quiz-modal-title">Choisir un Quiz</h2>
          <button className="quiz-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Quiz List - No individual animations */}
        <div className="quiz-modal-list">
          {quizOptions.map((quiz, index) => {
            const isSelected = selectedQuizId === quiz.id;
            const isLocked = !userIsPro && index >= 3;

            return (
              <button
                key={quiz.id}
                className={`quiz-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => handleSelect(quiz.id, isLocked)}
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
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
