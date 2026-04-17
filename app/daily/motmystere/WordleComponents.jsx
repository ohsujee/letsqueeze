'use client';

/**
 * Wordle UI Components — Grid, Keyboard, ResultBanner, StatsModal
 * + helpers (normalize, computeFeedback, computeScore)
 * Extrait de app/daily/motmystere/page.jsx
 */

import { motion } from 'framer-motion';
import { Backspace } from '@phosphor-icons/react';

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

  // Lettres confirmées (position correcte) → affichées en ghost sur les lignes vides
  const confirmed = {};
  feedbacks.forEach((fb, rowIdx) => {
    if (!fb) return;
    const guess = guesses[rowIdx];
    fb.forEach((state, colIdx) => {
      if (state === 'correct' && guess?.[colIdx]) {
        confirmed[colIdx] = guess[colIdx];
      }
    });
  });

  return (
    <div className="wordle-grid">
      {rows.map((_, rowIdx) => {
        const isCompleted = rowIdx < attempts;
        const isCurrent = rowIdx === attempts;
        const isFuture = rowIdx > attempts;
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
                const allFound = Object.keys(confirmed).length === WORD_LENGTH;
                const ghostLetter = (isCurrent && !letter && !allFound) ? confirmed[colIdx] : null;
                return (
                  <motion.div
                    key={colIdx}
                    className={`wordle-cell ${state} ${isCurrent && letter ? 'filled' : ''} ${ghostLetter ? 'ghost' : ''}`}
                    animate={
                      isCompleted
                        ? { rotateX: [0, -90, 0], transition: { delay: colIdx * 0.1, duration: 0.4 } }
                        : {}
                    }
                  >
                    {letter || ghostLetter || ''}
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

/* WordleResultBanner et WordleStatsModal supprimés — remplacés par DailyResultBanner et DailyStatsModal */
