'use client';

/**
 * Wordle UI Components — Grid, Keyboard, ResultBanner, StatsModal
 * + helpers (normalize, computeFeedback, computeScore)
 * Extrait de app/daily/motmystere/page.jsx
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChartBar, Trophy, Backspace } from '@phosphor-icons/react';

// ─── Constants ──────────────────────────────────────────────────────────────
export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;
const AZERTY_ROWS = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', '⌫'],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function computeFeedback(guess, target) {
  const g = normalize(guess).split('');
  const t = normalize(target).split('');
  const result = Array(WORD_LENGTH).fill('absent');
  const targetUsed = Array(WORD_LENGTH).fill(false);

  // Pass 1: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === t[i]) {
      result[i] = 'correct';
      targetUsed[i] = true;
    }
  }
  // Pass 2: present but wrong position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const found = t.findIndex((c, j) => !targetUsed[j] && c === g[i]);
    if (found !== -1) {
      result[i] = 'present';
      targetUsed[found] = true;
    }
  }
  return result;
}

export function computeScore(attempts, timeMs) {
  const attemptBase = (7 - attempts) * 1000;
  const timeBonus = Math.round(999 * Math.exp(-timeMs / 173287));
  return attemptBase + timeBonus;
}

// ─── WordleGrid ───────────────────────────────────────────────────────────────
export function WordleGrid({ guesses, feedbacks, currentGuess, attempts, shake }) {
  const rows = Array(MAX_ATTEMPTS).fill(null);

  return (
    <div className="wordle-grid">
      {rows.map((_, rowIdx) => {
        const isCompleted = rowIdx < attempts;
        const isCurrent = rowIdx === attempts;
        const guess = isCompleted
          ? guesses[rowIdx]
          : isCurrent
          ? currentGuess
          : '';
        const feedback = isCompleted ? feedbacks[rowIdx] : null;

        return (
          <motion.div
            key={rowIdx}
            className="wordle-row"
            animate={isCurrent && shake ? { x: [-8, 8, -6, 6, -3, 0] } : {}}
            transition={{ duration: 0.35 }}
          >
            {Array(WORD_LENGTH)
              .fill(null)
              .map((_, colIdx) => {
                const letter = guess?.[colIdx] || '';
                const state = feedback?.[colIdx] || '';
                return (
                  <motion.div
                    key={colIdx}
                    className={`wordle-cell ${state} ${isCurrent && letter ? 'filled' : ''}`}
                    animate={
                      isCompleted
                        ? { rotateX: [0, -90, 0], transition: { delay: colIdx * 0.1, duration: 0.4 } }
                        : {}
                    }
                  >
                    {letter}
                  </motion.div>
                );
              })}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── WordleKeyboard ───────────────────────────────────────────────────────────
export function WordleKeyboard({ letterStates, onKey, onSubmit }) {
  return (
    <div className="wordle-keyboard">
      <button className="wordle-submit-btn" onClick={onSubmit}>
        Valider
      </button>
      {AZERTY_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="wordle-keyboard-row">
          {row.map((key) => {
            const state = letterStates[key] || '';
            const extraClass = key === '⌫' ? 'action-delete' : '';
            return (
              <button
                key={key}
                className={`wordle-key ${state} ${extraClass}`.trim()}
                onClick={() => onKey(key)}
              >
                {key === '⌫' ? <Backspace size={24} weight="fill" /> : key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}

// ─── Result (slot clavier) ───────────────────────────────────────────────────
export function WordleResultBanner({ solved, attempts, timeMs, score, revealedWord, stats, streak, onShowStats, onShowLeaderboard, unranked = false }) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);

  return (
    <motion.div
      className={`wordle-result ${solved ? 'win' : 'lose'}`}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="wres-glow" />

      {/* Hero : verdict + score */}
      <div className="wres-hero">
        <div className="wres-hero-left">
          <span className="wres-emoji">{solved ? '🎉' : '😢'}</span>
          <div>
            <p className="wres-verdict">{solved ? 'Bravo !' : 'Raté…'}</p>
            <p className="wres-sub">
              {solved
                ? `${attempts} essai${attempts > 1 ? 's' : ''} · ${timeStr}`
                : <>Le mot : <strong>{revealedWord?.toUpperCase()}</strong></>
              }
            </p>
          </div>
        </div>
        {solved && (
          unranked ? (
            <div className="wres-score" style={{ textAlign: 'right' }}>
              <span className="wres-score-val" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Non classé</span>
            </div>
          ) : (
            <div className="wres-score">
              <span className="wres-score-val">{score.toLocaleString('fr-FR')}</span>
              <span className="wres-score-lbl">pts</span>
            </div>
          )
        )}
      </div>

      {unranked && (
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
          Tu n&apos;es pas dans le classement pour cette partie.
        </p>
      )}

      {/* Stats en ligne */}
      <div className="wres-stats-row">
        <span className="wres-stat-chip">
          <strong>{stats.played}</strong> partie{stats.played > 1 ? 's' : ''}
        </span>
        <span className="wres-stat-dot" />
        <span className="wres-stat-chip">
          <strong>{winPct}%</strong> victoires
        </span>
        <span className="wres-stat-dot" />
        <span className="wres-stat-chip">
          <strong>{streak.count}{flames}</strong> {streak.count > 1 ? 'jours de suite' : 'jour'}
        </span>
      </div>

      {/* CTAs */}
      <div className="wres-actions">
        <button className="wres-btn secondary" onClick={onShowStats}>
          <ChartBar size={15} weight="fill" /> Statistiques
        </button>
        <button className="wres-btn primary" onClick={onShowLeaderboard} disabled={unranked} style={unranked ? { opacity: 0.4, cursor: 'default' } : {}}>
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
export function WordleStatsModal({ isOpen, onClose, stats, streak, currentAttempts, solved }) {
  if (!isOpen) return null;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const max = Math.max(...stats.distribution, 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="wordle-stats-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="wordle-stats-modal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wsm-header">
              <h3 className="wsm-title">Mes statistiques</h3>
              <button className="wsm-close" onClick={onClose}><X size={16} weight="fill" /></button>
            </div>

            <div className="wsm-stats-row">
              <div className="wsm-stat"><span className="wsm-stat-val">{stats.played}</span><span className="wsm-stat-lbl">Parties</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{winPct}%</span><span className="wsm-stat-lbl">Victoires</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{streak.count}</span><span className="wsm-stat-lbl">{streak.count > 1 ? 'Jours 🔥' : 'Jour 🔥'}</span></div>
            </div>

            <p className="wsm-dist-title">Distribution des essais</p>
            <div className="wsm-distribution">
              {stats.distribution.map((count, i) => (
                <div key={i} className="wsm-dist-row">
                  <span className="wsm-dist-label">{i + 1}</span>
                  <div
                    className={`wsm-dist-bar ${solved && currentAttempts === i + 1 ? 'highlight' : ''}`}
                    style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                  >
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
