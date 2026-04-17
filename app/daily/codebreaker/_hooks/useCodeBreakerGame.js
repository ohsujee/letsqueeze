'use client';

/**
 * useCodeBreakerGame — logique Mastermind pour Code Breaker daily.
 *
 * Code secret : 4 couleurs parmi 6, doublons autorisés.
 * Seedé depuis la date (même code pour tout le monde chaque jour).
 * 10 tentatives max. Save/restore progression.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
/** Score = base tentatives + bonus temps (même logique que Mot Mystère). */
export function computeScore(attempts, timeMs) {
  const attemptBase = (MAX_ATTEMPTS + 1 - attempts) * 500; // 10→500, 1→5000
  const timeBonus = Math.round(999 * Math.exp(-timeMs / 173287));
  return attemptBase + timeBonus;
}

export const CODE_LENGTH = 4;
export const MAX_ATTEMPTS = 10;
export const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#e5e7eb', '#a855f7'];
export const COLOR_NAMES = ['Rouge', 'Bleu', 'Jaune', 'Vert', 'Blanc', 'Violet'];

/** Génère un code secret déterministe depuis une date. */
function generateCode(dateStr) {
  let hash = 0;
  const seed = `codebreaker_${dateStr}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const code = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    hash = ((hash << 5) - hash + i * 7 + 13) | 0;
    code.push(Math.abs(hash) % COLORS.length);
  }
  return code;
}

/** Calcule les indices (bien placé / mal placé). */
export function computeHints(guess, secret) {
  const secretRemaining = [];
  const guessRemaining = [];
  let black = 0;

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      black++;
    } else {
      secretRemaining.push(secret[i]);
      guessRemaining.push(guess[i]);
    }
  }

  let white = 0;
  const used = new Array(secretRemaining.length).fill(false);
  for (const g of guessRemaining) {
    const found = secretRemaining.findIndex((s, j) => !used[j] && s === g);
    if (found !== -1) {
      white++;
      used[found] = true;
    }
  }

  return { black, white };
}

export function useCodeBreakerGame({ todayDate, daily }) {
  const { todayState, progress, startGame, saveProgress, completeGame, loaded } = daily;

  const secret = useMemo(() => todayDate ? generateCode(todayDate) : [0, 0, 0, 0], [todayDate]);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState(Array(CODE_LENGTH).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [freshGameOver, setFreshGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [lastSubmitIndex, setLastSubmitIndex] = useState(-1);
  const startTimeRef = useRef(Date.now());

  // ─── Restore progression ────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (todayState === 'completed' && progress?.guesses?.length > 0) {
      setGuesses(progress.guesses);
      setScore(progress.score || 0);
      setSolved(progress.guesses[progress.guesses.length - 1]?.hints?.black === CODE_LENGTH);
      setGameOver(true);
      setShowResult(true);
    } else if (todayState === 'inprogress' && progress?.guesses?.length > 0) {
      setGuesses(progress.guesses);
      startTimeRef.current = Date.now();
    } else if (todayState === 'unplayed') {
      startGame();
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState]);

  const isFull = currentGuess.every((c) => c !== null);

  const selectColor = useCallback((colorIndex) => {
    if (gameOver) return;
    setCurrentGuess((prev) => {
      const next = [...prev];
      next[selectedSlot] = colorIndex;
      return next;
    });
    setSelectedSlot((prev) => {
      // Avancer au prochain slot vide ou rester
      for (let i = 1; i <= CODE_LENGTH; i++) {
        const next = (prev + i) % CODE_LENGTH;
        if (currentGuess[next] === null && next !== prev) return next;
      }
      return Math.min(prev + 1, CODE_LENGTH - 1);
    });
  }, [gameOver, selectedSlot, currentGuess]);

  const tapSlot = useCallback((index) => {
    if (gameOver) return;
    setSelectedSlot(index);
  }, [gameOver]);

  const clearGuess = useCallback(() => {
    if (gameOver) return;
    setCurrentGuess(Array(CODE_LENGTH).fill(null));
    setSelectedSlot(0);
  }, [gameOver]);

  const submitGuess = useCallback(() => {
    if (!isFull || gameOver) return;

    try { navigator.vibrate?.(40); } catch {}

    const hints = computeHints(currentGuess, secret);
    const newGuess = { colors: [...currentGuess], hints };
    const newGuesses = [...guesses, newGuess];

    setGuesses(newGuesses);
    setCurrentGuess(Array(CODE_LENGTH).fill(null));
    setSelectedSlot(0);
    setLastSubmitIndex(newGuesses.length - 1);

    saveProgress(newGuesses, newGuesses.length);

    if (hints.black === CODE_LENGTH) {
      const timeMs = Date.now() - startTimeRef.current;
      const gameScore = computeScore(newGuesses.length, timeMs);
      setScore(gameScore);
      setSolved(true);
      setGameOver(true);
      setFreshGameOver(true);
      try { navigator.vibrate?.([100, 50, 100, 50, 150]); } catch {}
      completeGame({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
      setTimeout(() => setShowResult(true), 1200);
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      const timeMs = Date.now() - startTimeRef.current;
      setGameOver(true);
      setFreshGameOver(true);
      try { navigator.vibrate?.([200, 100, 200]); } catch {}
      completeGame({ solved: false, attempts: newGuesses.length, timeMs, score: 0 });
      setTimeout(() => setShowResult(true), 1200);
    }
  }, [isFull, gameOver, currentGuess, secret, guesses, saveProgress, completeGame]);

  return {
    secret,
    guesses,
    currentGuess,
    selectedSlot,
    gameOver,
    freshGameOver,
    solved,
    showResult,
    score,
    isFull,
    lastSubmitIndex,
    selectColor,
    tapSlot,
    clearGuess,
    submitGuess,
    setShowResult,
  };
}
