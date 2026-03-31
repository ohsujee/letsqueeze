'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FitText } from '@/lib/hooks/useFitText';
import './QuestionHostCard.css';

/**
 * QuestionHostCard - Carte question avec réponse et boutons de validation
 *
 * Utilisé par:
 * - La page host (mode Game Master classique)
 * - La page play (mode Party, quand le joueur est le asker)
 *
 * @param {Object} props
 * @param {Object} props.question - Question actuelle { question, answer, difficulty }
 * @param {number} props.questionIndex - Index de la question actuelle
 * @param {number} props.pointsEnJeu - Points actuellement en jeu
 * @param {Object} props.state - État de la room (lockUid, revealed, etc.)
 * @param {Array} props.players - Liste des joueurs
 * @param {Function} props.onRevealToggle - Callback pour révéler/masquer la question
 * @param {Function} props.onValidate - Callback pour valider une bonne réponse
 * @param {Function} props.onWrong - Callback pour une mauvaise réponse
 * @param {Function} props.onSkip - Callback pour passer la question
 * @param {Function} props.onResetBuzzers - Callback pour reset les buzzers
 * @param {Function} props.onEnd - Callback pour terminer la partie
 * @param {boolean} props.compact - Mode compact pour mobile (optionnel)
 */
export default function QuestionHostCard({
  question,
  questionIndex,
  pointsEnJeu,
  state,
  players,
  onRevealToggle,
  onValidate,
  onWrong,
  onSkip,
  onResetBuzzers,
  onEnd,
  compact = false
}) {
  const lockedName = state?.lockUid
    ? (players.find(p => p.uid === state.lockUid)?.name || 'Joueur')
    : null;

  return (
    <>
      {/* Question Card */}
      {question ? (
        <motion.div
          className="question-card"
          key={questionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Points en jeu */}
          <div className="points-badge">
            <span className="points-value">{pointsEnJeu}</span>
            <span className="points-label">points</span>
          </div>

          {/* Question */}
          <div className="question-container">
            <FitText minFontSize={14} maxFontSize={20} className="question-text">
              {question.question}
            </FitText>
          </div>

          {/* Réponse pour l'animateur */}
          <div className="answer-box">
            <span className="answer-label">Réponse</span>
            <span className="answer-value">{question.answer}</span>
          </div>
        </motion.div>
      ) : (
        <div className="question-card question-empty">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div>Plus de questions</div>
        </div>
      )}

      {/* Pop-up de validation qui apparaît quand quelqu'un buzz */}
      <AnimatePresence>
        {state?.lockUid && (
          <>
            <motion.div
              className="buzz-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="buzz-modal-container">
              <motion.div
                className="buzz-card"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* Icône cloche qui dépasse en haut */}
                <div className="buzz-icon-wrapper">
                  <div className="buzz-icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" className="buzz-bell-icon">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Badge points qui dépasse en haut à droite */}
                <div className="buzz-points-badge">
                  <span className="buzz-points-value">{pointsEnJeu}</span>
                  <span className="buzz-points-label">pts</span>
                </div>

                {/* Nom du joueur centré */}
                <div className="buzz-player-section">
                  <span className="buzz-player-name">{lockedName}</span>
                  <span className="buzz-player-action">a buzzé</span>
                </div>

                {/* Réponse sur 2 lignes */}
                {question && (
                  <div className="buzz-answer-section">
                    <span className="buzz-answer-label">Réponse attendue</span>
                    <span className="buzz-answer-value">{question.answer}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="buzz-actions">
                  <button className="buzz-btn buzz-btn-wrong" onClick={onWrong}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={onValidate}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Correct
                  </button>
                </div>

                {/* Annuler - plus visible */}
                <button className="buzz-cancel" onClick={onResetBuzzers}>
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Footer avec actions */}
      <footer className="host-actions-footer">
        <div className="host-actions">
          <button className="action-btn action-reveal" onClick={onRevealToggle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {state?.revealed ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              )}
            </svg>
            <span>{state?.revealed ? "Masquer" : "Révéler"}</span>
          </button>
          <button className="action-btn action-reset" onClick={onResetBuzzers}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            <span>Reset</span>
          </button>
          <button className="action-btn action-skip" onClick={onSkip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
            <span>Passer</span>
          </button>
          <button className="action-btn action-end" onClick={onEnd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span>Fin</span>
          </button>
        </div>
      </footer>

    </>
  );
}
/* END OF FILE */
