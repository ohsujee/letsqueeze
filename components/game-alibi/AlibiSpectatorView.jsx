'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, CheckCircle, Clock, HelpCircle } from 'lucide-react';

/**
 * AlibiSpectatorView - Vue passive pour les groupes spectateurs
 *
 * Affiche l'interrogatoire en temps réel :
 * - Question posée
 * - Réponses des accusés (en temps réel)
 * - Verdict
 *
 * @param {Object} props
 * @param {Object} props.inspectorGroup - Groupe inspecteur { name, color }
 * @param {Object} props.accusedGroup - Groupe accusé { name, color }
 * @param {Object} props.question - Question actuelle { text, hint }
 * @param {Object} props.interrogation - État interrogation { state, responses, verdict }
 * @param {Object} props.progress - { current, total }
 * @param {number} props.timeLeft - Temps restant en secondes
 * @param {number} props.roundsUntilMyTurn - Nombre de rounds avant mon tour
 */
export default function AlibiSpectatorView({
  inspectorGroup,
  accusedGroup,
  question,
  interrogation,
  progress,
  timeLeft,
  roundsUntilMyTurn
}) {
  const questionState = interrogation?.state || 'waiting';
  const responses = interrogation?.responses || {};
  const verdict = interrogation?.verdict;

  // Accusés qui ont répondu
  const respondedCount = Object.keys(responses).length;
  const accusedPlayers = accusedGroup?.players || [];
  const totalAccused = accusedPlayers.length;

  // Timer urgence
  const isUrgent = timeLeft <= 10 && timeLeft > 5;
  const isCritical = timeLeft <= 5;

  return (
    <div className="spectator-view">
      {/* Header */}
      <header className="spectator-header">
        <div className="spectator-badge">
          <Eye size={16} />
          <span>Mode Spectateur</span>
        </div>
        {progress && (
          <div className="progress-indicator">
            Question {progress.current}/{progress.total}
          </div>
        )}
      </header>

      {/* Confrontation display */}
      <div className="confrontation">
        <div className="confrontation-group inspector">
          <div
            className="group-avatar"
            style={{ background: inspectorGroup?.color }}
          >
            🔍
          </div>
          <span className="group-name" style={{ color: inspectorGroup?.color }}>
            {inspectorGroup?.name}
          </span>
          <span className="group-role">Interroge</span>
        </div>

        <div className="confrontation-arrow">→</div>

        <div className="confrontation-group accused">
          <div
            className="group-avatar"
            style={{ background: accusedGroup?.color }}
          >
            🎭
          </div>
          <span className="group-name" style={{ color: accusedGroup?.color }}>
            {accusedGroup?.name}
          </span>
          <span className="group-role">Répond</span>
        </div>
      </div>

      {/* Question */}
      <div className="question-section">
        {questionState === 'waiting' ? (
          <div className="waiting-state">
            <HelpCircle size={32} className="waiting-icon" />
            <p>En attente de la question...</p>
          </div>
        ) : (
          <>
            <h2 className="question-text">{question?.text}</h2>
            {question?.hint && (
              <p className="question-hint">💡 {question.hint}</p>
            )}
          </>
        )}
      </div>

      {/* Timer (si en cours de réponse) */}
      {questionState === 'answering' && (
        <div className={`timer-display ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`}>
          <Clock size={18} />
          <span>{timeLeft}s</span>
        </div>
      )}

      {/* Réponses en temps réel */}
      {questionState === 'answering' && (
        <div className="responses-section">
          <div className="responses-header">
            <Users size={16} />
            <span>Réponses ({respondedCount}/{totalAccused})</span>
          </div>

          <div className="responses-list">
            <AnimatePresence>
              {Object.values(responses).map((response, index) => (
                <motion.div
                  key={response.uid}
                  className="response-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="response-author">
                    <CheckCircle size={14} className="check-icon" />
                    <span>{response.name}</span>
                  </div>
                  <p className="response-text">"{response.answer}"</p>
                </motion.div>
              ))}
            </AnimatePresence>

            {respondedCount === 0 && (
              <div className="no-responses">
                En attente des réponses...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verdict */}
      {questionState === 'verdict' && verdict && (
        <motion.div
          className={`verdict-display ${verdict}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span className="verdict-icon">
            {verdict === 'correct' ? '✓' : verdict === 'incorrect' ? '✗' : '⏱'}
          </span>
          <span className="verdict-text">
            {verdict === 'correct' ? 'VALIDÉ' : verdict === 'incorrect' ? 'REFUSÉ' : 'TEMPS ÉCOULÉ'}
          </span>
        </motion.div>
      )}

      {/* Info prochain tour */}
      {roundsUntilMyTurn !== undefined && roundsUntilMyTurn > 0 && (
        <div className="next-turn-info">
          <span>🎯 Votre tour dans {roundsUntilMyTurn} round{roundsUntilMyTurn > 1 ? 's' : ''}</span>
        </div>
      )}

      <style jsx>{`
        .spectator-view {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          padding: 16px;
          background: linear-gradient(180deg, #1a1410 0%, #0d0a08 100%);
        }

        .spectator-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .spectator-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(107, 114, 128, 0.2);
          border: 1px solid rgba(107, 114, 128, 0.4);
          border-radius: 20px;
          color: #9ca3af;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .progress-indicator {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .confrontation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
        }

        .confrontation-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .group-avatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          border-radius: 50%;
          box-shadow: 0 0 20px currentColor;
        }

        .group-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .group-role {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
        }

        .confrontation-arrow {
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.3);
        }

        .question-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }

        .waiting-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        :global(.waiting-icon) {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .question-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: white;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .question-hint {
          font-size: 0.85rem;
          color: rgba(245, 158, 11, 0.8);
          margin: 0;
        }

        .timer-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 16px;
          align-self: center;
        }

        .timer-display.urgent {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        .timer-display.critical {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          animation: blink 0.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .responses-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .responses-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
          margin-bottom: 12px;
        }

        .responses-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .response-item {
          padding: 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
        }

        .response-author {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        :global(.check-icon) {
          color: #22c55e;
        }

        .response-author span {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }

        .response-text {
          font-size: 0.9rem;
          color: white;
          margin: 0;
          font-style: italic;
        }

        .no-responses {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.85rem;
          padding: 20px;
        }

        .verdict-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 16px;
        }

        .verdict-display.correct {
          background: rgba(34, 197, 94, 0.15);
          border: 2px solid rgba(34, 197, 94, 0.4);
        }

        .verdict-display.incorrect {
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.4);
        }

        .verdict-display.timeout {
          background: rgba(245, 158, 11, 0.15);
          border: 2px solid rgba(245, 158, 11, 0.4);
        }

        .verdict-icon {
          font-size: 2rem;
        }

        .verdict-display.correct .verdict-icon { color: #22c55e; }
        .verdict-display.incorrect .verdict-icon { color: #ef4444; }
        .verdict-display.timeout .verdict-icon { color: #f59e0b; }

        .verdict-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
        }

        .verdict-display.correct .verdict-text { color: #22c55e; }
        .verdict-display.incorrect .verdict-text { color: #ef4444; }
        .verdict-display.timeout .verdict-text { color: #f59e0b; }

        .next-turn-info {
          text-align: center;
          padding: 12px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
          color: #a78bfa;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
