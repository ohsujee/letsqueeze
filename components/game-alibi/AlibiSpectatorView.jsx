'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, CheckCircle, XCircle, Clock, TimerOff, ChevronRight } from 'lucide-react';
import './AlibiSpectatorView.css';

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

    </div>
  );
}
