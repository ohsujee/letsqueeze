'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FitText } from '@/lib/hooks/useFitText';

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

      <style jsx>{`
        /* ===== QUESTION CARD ===== */
        :global(.question-card) {
          width: 100%;
          max-width: 500px;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 8px;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 12px 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        :global(.question-empty) {
          text-align: center;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
        }

        .points-badge {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
        }

        .points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
        }

        .points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .question-container {
          width: 100%;
          flex: 1;
          min-height: 0;
          overflow: auto;
        }

        .question-container ::-webkit-scrollbar {
          display: none;
        }

        :global(.question-text) {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-weight: 500;
          color: var(--text-primary, #ffffff);
        }

        .answer-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .answer-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .answer-value {
          font-weight: 700;
          font-size: 1rem;
          color: var(--success, #22c55e);
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
          text-align: right;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: var(--quiz-primary, #8b5cf6);
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
        }

        .loading-dots span:nth-child(1) { animation-delay: 0s; }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }

        /* ===== BUZZ MODAL ===== */
        :global(.buzz-overlay) {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 9998;
        }

        .buzz-modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        :global(.buzz-card) {
          position: relative;
          width: 100%;
          max-width: 340px;
          background: linear-gradient(180deg, rgb(22, 18, 35) 0%, rgb(14, 12, 22) 100%);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 24px;
          padding: 50px 24px 24px 24px;
          margin-top: 30px;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.7),
            0 0 80px rgba(139, 92, 246, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .buzz-icon-wrapper {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .buzz-icon-circle {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          border: 3px solid rgba(139, 92, 246, 0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 20px rgba(139, 92, 246, 0.5),
            0 0 30px rgba(139, 92, 246, 0.3);
          animation: bell-entrance 0.5s ease-out;
        }

        :global(.buzz-bell-icon) {
          width: 28px;
          height: 28px;
          color: white;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
        }

        @keyframes bell-entrance {
          0% { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(10deg); }
          70% { transform: scale(0.95) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .buzz-points-badge {
          position: absolute;
          top: -15px;
          right: -8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 55px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          box-shadow:
            0 4px 15px rgba(34, 197, 94, 0.5),
            0 0 20px rgba(34, 197, 94, 0.3);
          transform: rotate(8deg);
          z-index: 10;
        }

        .buzz-points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: white;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .buzz-points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .buzz-player-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .buzz-player-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.6rem;
          color: #ffffff;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
          text-align: center;
          word-break: break-word;
        }

        .buzz-player-action {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-answer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .buzz-answer-section .buzz-answer-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .buzz-answer-section .buzz-answer-value {
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
          text-align: center;
          line-height: 1.3;
        }

        .buzz-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .buzz-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn svg {
          width: 22px;
          height: 22px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .buzz-btn-wrong {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.2));
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }

        .buzz-btn-correct {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.2));
          border-color: rgba(34, 197, 94, 0.6);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
          transform: translateY(-2px);
        }

        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* ===== HOST ACTIONS FOOTER ===== */
        .host-actions-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 12px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
        }

        .host-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          color: var(--text-primary, #ffffff);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .action-btn svg {
          width: 20px;
          height: 20px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .action-btn span {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .action-btn:active {
          transform: translateY(0);
        }

        .action-reset {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08));
          border-color: rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }

        .action-reset:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.12));
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }

        .action-skip {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.08));
          border-color: rgba(245, 158, 11, 0.3);
          color: #fbbf24;
        }

        .action-skip:hover {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.12));
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
        }

        .action-end {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08));
          border-color: rgba(239, 68, 68, 0.3);
          color: #f87171;
        }

        .action-end:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.12));
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
        }

        .action-reveal {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
          border-color: rgba(139, 92, 246, 0.4);
          color: #a78bfa;
        }

        .action-reveal:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15));
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </>
  );
}
