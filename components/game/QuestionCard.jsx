'use client';

import { motion } from 'framer-motion';
import { FitText } from '@/lib/hooks/useFitText';
import { Flag } from '@phosphor-icons/react';

/**
 * QuestionCard - Carte de question partagée entre Host et Asker (Party Mode)
 *
 * Affiche les points, la question et la réponse.
 * Utilisé dans: host/page.jsx, play/page.jsx (asker view)
 */
export default function QuestionCard({
  question,
  answer,
  points,
  questionIndex,
  isEmpty = false,
  onReport
}) {
  if (isEmpty || !question) {
    return (
      <div className="host-question-card question-empty">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div>Plus de questions</div>
      </div>
    );
  }

  return (
    <motion.div
      className="host-question-card"
      key={questionIndex}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Points en jeu */}
      <div className="points-badge">
        <span className="points-value">{points}</span>
        <span className="points-label">points</span>
      </div>

      {/* Question */}
      <div className="question-container">
        <FitText minFontSize={14} maxFontSize={20} className="question-text">
          {question}
        </FitText>
      </div>

      {/* Réponse */}
      <div className="answer-box">
        <span className="answer-value">{answer}</span>
      </div>

      {/* Signalement */}
      {onReport && (
        <button className="question-report-link" onClick={onReport}>
          <Flag size={11} weight="fill" />
          Signaler un problème avec la question
        </button>
      )}
    </motion.div>
  );
}
