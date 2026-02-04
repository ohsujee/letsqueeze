'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, CheckCircle, XCircle, Clock, TimerOff, ChevronRight } from 'lucide-react';

/**
 * AlibiSpectatorView - Vue passive pour les groupes spectateurs
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

  const respondedCount = Object.keys(responses).length;
  const accusedPlayers = accusedGroup?.players || [];
  const totalAccused = accusedPlayers.length;

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
            Q{progress.current}/{progress.total}
          </div>
        )}
      </header>

      {/* Confrontation display */}
      <div className="confrontation-card">
        <div className="card-glow" />
        <div className="confrontation-content">
          <div className="confrontation-group" style={{ '--group-color': inspectorGroup?.color }}>
            <div className="group-dot" style={{ background: inspectorGroup?.color }} />
            <div className="group-details">
              <span className="group-name">{inspectorGroup?.name}</span>
              <span className="group-role">Interroge</span>
            </div>
          </div>

          <div className="confrontation-arrow">
            <ChevronRight size={24} />
          </div>

          <div className="confrontation-group" style={{ '--group-color': accusedGroup?.color }}>
            <div className="group-dot" style={{ background: accusedGroup?.color }} />
            <div className="group-details">
              <span className="group-name">{accusedGroup?.name}</span>
              <span className="group-role">Répond</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="question-card">
        <div className="card-glow" />
        {questionState === 'waiting' ? (
          <div className="waiting-state">
            <div className="waiting-icon">
              <Clock size={32} />
            </div>
            <p className="waiting-text">En attente de la question...</p>
          </div>
        ) : (
          <>
            <div className="question-badge">Question {progress?.current || 1}</div>
            <h2 className="question-text">{question?.text}</h2>
            {question?.hint && (
              <p className="question-hint">{question.hint}</p>
            )}
          </>
        )}
      </div>

      {/* Réponses */}
      {questionState === 'answering' && (
        <div className="responses-card">
          <div className="card-glow" />
          <div className="responses-header">
            <Users size={16} />
            <span>Réponses ({respondedCount}/{totalAccused})</span>
            <span className={`timer-inline ${isUrgent ? 'urgent' : ''} ${isCritical ? 'critical' : ''}`}>
              <Clock size={14} />
              {timeLeft}s
            </span>
          </div>

          <div className="responses-list">
            {Object.values(responses).map((response, index) => (
              <div key={response.uid} className="response-item">
                <div className="response-header">
                  <CheckCircle size={14} className="check-icon" />
                  <span className="response-name">{response.name}</span>
                </div>
                <p className="response-text">"{response.answer}"</p>
              </div>
            ))}

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
        <div className={`verdict-card ${verdict}`}>
          <span className="verdict-icon">
            {verdict === 'correct' && <CheckCircle size={36} />}
            {verdict === 'incorrect' && <XCircle size={36} />}
            {verdict === 'timeout' && <TimerOff size={36} />}
          </span>
          <span className="verdict-text">
            {verdict === 'correct' ? 'VALIDÉ' : verdict === 'incorrect' ? 'REFUSÉ' : 'TEMPS ÉCOULÉ'}
          </span>
        </div>
      )}

      {/* Info prochain tour */}
      {roundsUntilMyTurn !== undefined && roundsUntilMyTurn > 0 && (
        <div className="next-turn-card">
          <span>Votre tour dans {roundsUntilMyTurn} round{roundsUntilMyTurn > 1 ? 's' : ''}</span>
        </div>
      )}

      <style jsx>{`
        .spectator-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
        }

        /* ===== HEADER ===== */
        .spectator-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .spectator-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 20px;
          color: #fbbf24;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .progress-indicator {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
        }

        /* ===== CARDS BASE ===== */
        .confrontation-card,
        .question-card {
          position: relative;
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .responses-card {
          position: relative;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 16px;
          padding: 16px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .card-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
          animation: glow-pulse 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        /* ===== CONFRONTATION ===== */
        .confrontation-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .confrontation-group {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: color-mix(in srgb, var(--group-color) 12%, transparent);
          border: 1px solid var(--group-color);
          border-radius: 12px;
        }

        .group-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .group-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .group-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--group-color);
        }

        .group-role {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .confrontation-arrow {
          color: rgba(245, 158, 11, 0.6);
          display: flex;
          align-items: center;
        }

        /* ===== QUESTION CARD ===== */
        .question-card {
          text-align: center;
        }

        .waiting-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 0;
        }

        .waiting-icon {
          color: #fbbf24;
          opacity: 0.7;
          animation: spin 3s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .waiting-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .question-badge {
          display: inline-block;
          background: rgba(245, 158, 11, 0.25);
          padding: 6px 14px;
          border-radius: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #fbbf24;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }

        .question-text {
          font-family: 'Bungee', cursive;
          font-size: 1.1rem;
          color: white;
          margin: 0 0 8px 0;
          line-height: 1.4;
          position: relative;
          z-index: 1;
        }

        .question-hint {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(165, 180, 252, 0.8);
          font-style: italic;
          margin: 0;
          position: relative;
          z-index: 1;
        }

        /* ===== TIMER INLINE ===== */
        .timer-inline {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
          padding: 4px 10px;
          background: rgba(245, 158, 11, 0.15);
          border-radius: 8px;
          font-family: 'Roboto Mono', monospace;
          font-size: 0.85rem;
          font-weight: 600;
          color: #fbbf24;
        }

        .timer-inline.urgent {
          background: rgba(245, 158, 11, 0.25);
          color: #f59e0b;
        }

        .timer-inline.critical {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          animation: pulse-critical 0.5s ease-in-out infinite;
        }

        @keyframes pulse-critical {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ===== RESPONSES ===== */
        .responses-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .responses-list {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .response-item {
          padding: 12px 14px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
        }

        .response-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .response-header :global(.check-icon) {
          color: #22c55e;
        }

        .response-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fbbf24;
        }

        .response-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-style: italic;
          line-height: 1.5;
        }

        .no-responses {
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          padding: 20px;
          animation: pulse-opacity 1.5s ease-in-out infinite;
        }

        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        /* ===== VERDICT ===== */
        .verdict-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px;
          border-radius: 16px;
        }

        .verdict-card.correct {
          background: rgba(34, 197, 94, 0.15);
          border: 2px solid rgba(34, 197, 94, 0.4);
        }

        .verdict-card.incorrect {
          background: rgba(239, 68, 68, 0.15);
          border: 2px solid rgba(239, 68, 68, 0.4);
        }

        .verdict-card.timeout {
          background: rgba(245, 158, 11, 0.15);
          border: 2px solid rgba(245, 158, 11, 0.4);
        }

        .verdict-icon {
          display: flex;
          align-items: center;
        }

        .verdict-card.correct .verdict-icon { color: #22c55e; }
        .verdict-card.incorrect .verdict-icon { color: #ef4444; }
        .verdict-card.timeout .verdict-icon { color: #f59e0b; }

        .verdict-text {
          font-family: 'Bungee', cursive;
          font-size: 1.2rem;
        }

        .verdict-card.correct .verdict-text { color: #22c55e; }
        .verdict-card.incorrect .verdict-text { color: #ef4444; }
        .verdict-card.timeout .verdict-text { color: #f59e0b; }

        /* ===== NEXT TURN ===== */
        .next-turn-card {
          flex-shrink: 0;
          text-align: center;
          padding: 14px 16px;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.35);
          border-radius: 12px;
          color: #a78bfa;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 400px) {
          .confrontation-content {
            flex-direction: column;
            gap: 10px;
          }

          .confrontation-arrow {
            transform: rotate(90deg);
          }

          .confrontation-group {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
