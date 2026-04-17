'use client';

/**
 * useSemanticGame — state + handlers de gameplay pour Sémantique V2.
 *
 * Gère : guesses, input, submit (normal + alt), anti-cheat (suspicious/alt),
 *        midnight switch, restore localStorage, post-game ad flow.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { computeFinalScore } from '@/components/daily/dailyHelpers';

const API = {
  score: (date, word) => `/api/daily/semantic-v2-score?date=${date}&word=${encodeURIComponent(word)}`,
  alternative: (date, uid) => `/api/daily/semantic-v2-alternative?date=${date}${uid ? `&uid=${uid}` : ''}`,
  altScore: '/api/daily/semantic-v2-alternative-score',
};

const ERROR_MESSAGES = { 404: 'Mot non reconnu', 422: 'Essaie au singulier' };
const ERROR_DURATIONS = { 404: 2000, 422: 2500 };

/** Fetch + parse un score depuis l'API. Throw une Error avec .userMessage si statut HTTP connu. */
async function fetchGuessScore(url, fetchOptions = {}) {
  const res = await fetch(url, fetchOptions);
  if (ERROR_MESSAGES[res.status]) {
    const err = new Error(ERROR_MESSAGES[res.status]);
    err.userMessage = ERROR_MESSAGES[res.status];
    err.duration = ERROR_DURATIONS[res.status];
    throw err;
  }
  if (!res.ok) {
    const err = new Error('Erreur serveur');
    err.userMessage = 'Erreur serveur';
    err.duration = 2000;
    throw err;
  }
  return res.json();
}

export function useSemanticGame({ daily, serverDate, postGameAd }) {
  const { todayState, todayDate, progress, startGame, saveProgress, completeGame, writeLeaderboard, loaded } = daily;
  const { triggerPostGameAd, triggered: adTriggered } = postGameAd;

  // ─── State principal ────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetWord, setTargetWord] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);
  const [flashEntry, setFlashEntry] = useState(null);

  const inputRef = useRef(null);
  const startTimeRef = useRef(null);
  const freshCompletionRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const guessesRef = useRef([]);
  const gameOverRef = useRef(false);

  // ─── Anti-cheat / alt mode ──────────────────────────────────────────────
  const [showScoreUpdateModal, setShowScoreUpdateModal] = useState(false);
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [suspiciousCompleteParams, setSuspiciousCompleteParams] = useState(null);
  const [unranked, setUnranked] = useState(false);
  const [isLoadingAlt, setIsLoadingAlt] = useState(false);
  const [altMode, setAltMode] = useState(false);
  const [altToken, setAltToken] = useState(null);
  const [altGuesses, setAltGuesses] = useState([]);
  const [altGameOver, setAltGameOver] = useState(false);
  const [altFinalScore, setAltFinalScore] = useState(0);
  const [altShowResult, setAltShowResult] = useState(false);
  const altStartTimeRef = useRef(null);

  // ─── Midnight guard ─────────────────────────────────────────────────────
  const [showMidnightModal, setShowMidnightModal] = useState(false);
  const previousDateRef = useRef(null);

  // Sync refs
  useEffect(() => { guessesRef.current = guesses; }, [guesses]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // Capture l'ancienne date AVANT de la mettre à jour
  useEffect(() => {
    if (!serverDate) return;
    if (previousDateRef.current === null) {
      previousDateRef.current = serverDate;
    }

    const nowParis = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const midnightParis = new Date(nowParis);
    midnightParis.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnightParis.getTime() - nowParis.getTime();

    if (msUntilMidnight < 1000 || msUntilMidnight > 86400000) return;

    const timer = setTimeout(() => {
      if (guessesRef.current.length > 0 && !gameOverRef.current) {
        saveProgress(guessesRef.current, guessesRef.current.length);
      }
      previousDateRef.current = serverDate; // capture avant le reset
      setShowMidnightModal(true);
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDate]);

  // ─── Transition auto après victoire fraîche ─────────────────────────────
  useEffect(() => {
    if (!showResult || !freshCompletionRef.current) return;
    transitionTimerRef.current = setTimeout(() => setShowTransition(true), 2000);
    return () => clearTimeout(transitionTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  // ─── Modale one-time système de score ───────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const seen = localStorage.getItem('lq_sem_score_v2_seen');
    if (!seen) setShowScoreUpdateModal(true);
  }, [loaded]);

  // ─── Restore depuis localStorage / Firebase ─────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    if (todayState === 'inprogress' && progress?.guesses?.length > 0) {
      setGuesses(progress.guesses);
      startTimeRef.current = startTimeRef.current || Date.now();
      const uid = auth.currentUser?.uid;
      if (uid && todayDate) {
        const altKey = `lq_sem_alt_${todayDate}_${uid}`;
        const stored = localStorage.getItem(altKey);
        if (stored) {
          try {
            const { token, guesses: altGs, startTime, suspiciousParams } = JSON.parse(stored);
            setAltToken(token);
            setAltGuesses(altGs || []);
            altStartTimeRef.current = startTime;
            setSuspiciousCompleteParams(suspiciousParams);
            setGameOver(true);
            setAltMode(true);
          } catch {}
        } else if (progress.guesses.length === 1 && progress.guesses[0].score >= 1) {
          const gameScore = computeFinalScore(1);
          setSuspiciousCompleteParams({ solved: true, attempts: 1, timeMs: 0, score: gameScore });
          setGameOver(true);
          setGuesses([]);
          setTimeout(() => setShowSuspiciousModal(true), 500);
        }
      }
    } else if (todayState === 'completed') {
      if (progress?.guesses) setGuesses(progress.guesses);
      setFinalScore(progress?.score || 0);
      setGameOver(true);
      const saved = typeof window !== 'undefined'
        ? localStorage.getItem(`lq_sem_target_${todayDate}`)
        : null;
      if (saved) setTargetWord(saved);
      const uid = auth.currentUser?.uid;
      if (uid && todayDate && localStorage.getItem(`lq_sem_unranked_${todayDate}_${uid}`)) {
        setUnranked(true);
      }
      setShowResult(true);
    } else if (todayState === 'unplayed') {
      startGame();
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState]);

  // ─── Helpers internes ───────────────────────────────────────────────────

  /** Flash un doublon existant et retourne true. Retourne false si pas de doublon. */
  const flashDuplicate = useCallback((raw, collection) => {
    const existing = collection.find((g) => g.word === raw);
    if (existing) {
      setFlashEntry(existing);
      setTimeout(() => setFlashEntry(null), 1800);
      setInput('');
      return true;
    }
    return false;
  }, []);

  /** Affiche une erreur temporaire + reset isSubmitting */
  const showTempError = useCallback((msg, duration = 2000) => {
    setError(msg);
    setTimeout(() => setError(''), duration);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || gameOver || !todayDate || isSubmitting) return;

    const raw = input.trim().toLowerCase();
    if (flashDuplicate(raw, guesses)) return;

    setIsSubmitting(true);
    setInput('');

    try {
      const { rank, similarity, solved } = await fetchGuessScore(API.score(todayDate, raw));
      const score = (rank != null && rank > 0 && rank < 1000)
        ? (20 + (rank / 999) * 30) / 100
        : (similarity ?? 0);
      const entry = { word: raw, score, rank, attemptIndex: guesses.length + 1 };
      const newGuesses = [...guesses, entry];

      setGuesses(newGuesses);
      setError('');
      saveProgress(newGuesses, newGuesses.length);

      if (solved) {
        const timeMs = Date.now() - (startTimeRef.current || Date.now());
        const gameScore = computeFinalScore(newGuesses.length);
        setFinalScore(gameScore);
        setTargetWord(raw);
        localStorage.setItem(`lq_sem_target_${todayDate}`, raw);
        setGameOver(true);

        if (newGuesses.length === 1) {
          setSuspiciousCompleteParams({ solved: true, attempts: 1, timeMs, score: gameScore });
          setTimeout(() => setShowSuspiciousModal(true), 800);
        } else {
          completeGame({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
          freshCompletionRef.current = true;
          setTimeout(() => setShowResult(true), 800);
        }
      }
    } catch (err) {
      showTempError(err.userMessage || 'Connexion impossible', err.duration || 2000);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [input, gameOver, guesses, todayDate, isSubmitting, saveProgress, completeGame, flashDuplicate, showTempError]);

  const handlePlayAlternative = useCallback(async () => {
    setIsLoadingAlt(true);
    try {
      const uid = auth.currentUser?.uid;
      const res = await fetch(API.alternative(todayDate, uid));
      const { token } = await res.json();
      const startTime = Date.now();
      setAltToken(token);
      setAltMode(true);
      setShowSuspiciousModal(false);
      altStartTimeRef.current = startTime;
      if (uid && todayDate) {
        localStorage.setItem(`lq_sem_alt_${todayDate}_${uid}`, JSON.stringify({
          token, guesses: [], startTime, suspiciousParams: suspiciousCompleteParams,
        }));
      }
    } catch {
      setShowSuspiciousModal(false);
    }
    setIsLoadingAlt(false);
  }, [todayDate, suspiciousCompleteParams]);

  const handleAltSubmit = useCallback(async () => {
    if (!input.trim() || altGameOver || !todayDate || isSubmitting) return;

    const raw = input.trim().toLowerCase();
    if (flashDuplicate(raw, altGuesses)) return;

    setIsSubmitting(true);
    setInput('');

    try {
      const { rank, similarity, solved } = await fetchGuessScore(API.altScore, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayDate, word: raw, token: altToken }),
      });
      const score = (rank != null && rank > 0 && rank < 1000)
        ? (20 + (rank / 999) * 30) / 100
        : (similarity ?? 0);
      const entry = { word: raw, score, rank, attemptIndex: altGuesses.length + 1 };
      const newGuesses = [...altGuesses, entry];

      setAltGuesses(newGuesses);
      setError('');
      saveProgress(newGuesses, newGuesses.length); // P0 fix: was saveProgress(guesses, ...)

      const uid = auth.currentUser?.uid;
      const altKey = uid && todayDate ? `lq_sem_alt_${todayDate}_${uid}` : null;
      if (altKey) {
        const stored = localStorage.getItem(altKey);
        if (stored) {
          try {
            localStorage.setItem(altKey, JSON.stringify({ ...JSON.parse(stored), guesses: newGuesses }));
          } catch {}
        }
      }

      if (solved) {
        const timeMs = Date.now() - (altStartTimeRef.current || Date.now());
        const gameScore = computeFinalScore(newGuesses.length);
        setAltFinalScore(gameScore);
        setTargetWord(raw);
        setAltGameOver(true);
        setTimeout(() => setAltShowResult(true), 800);
        writeLeaderboard({ score: gameScore, attempts: newGuesses.length, solved: true, timeMs });
        if (suspiciousCompleteParams) completeGame({ ...suspiciousCompleteParams, skipLeaderboard: true });
        if (altKey) localStorage.removeItem(altKey);
      }
    } catch (err) {
      showTempError(err.userMessage || 'Connexion impossible', err.duration || 2000);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [input, altGameOver, altGuesses, todayDate, isSubmitting, altToken, writeLeaderboard, suspiciousCompleteParams, completeGame, saveProgress, flashDuplicate, showTempError]);

  const handleAcceptSuspicious = useCallback(() => {
    setShowSuspiciousModal(false);
    const uid = auth.currentUser?.uid;
    if (uid && todayDate) {
      localStorage.removeItem(`lq_sem_alt_${todayDate}_${uid}`);
      localStorage.setItem(`lq_sem_unranked_${todayDate}_${uid}`, '1');
    }
    if (suspiciousCompleteParams) completeGame({ ...suspiciousCompleteParams, skipLeaderboard: true });
    setUnranked(true);
    freshCompletionRef.current = true;
    setTimeout(() => setShowResult(true), 300);
  }, [todayDate, suspiciousCompleteParams, completeGame]);

  const handleShowLeaderboard = useCallback(() => {
    if (freshCompletionRef.current && !adTriggered.current) {
      clearTimeout(transitionTimerRef.current);
      triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
    } else {
      setActiveTab('leaderboard');
    }
  }, [triggerPostGameAd, adTriggered]);

  const handleCloseScoreUpdate = useCallback(() => {
    localStorage.setItem('lq_sem_score_v2_seen', '1');
    setShowScoreUpdateModal(false);
  }, []);

  const handleMidnightReset = useCallback(() => {
    setGuesses([]); setInput(''); setGameOver(false);
    setShowResult(false); setShowTransition(false); setFinalScore(0);
    setError(''); setActiveTab('game'); setTargetWord(null);
    setShowScoreUpdateModal(false); setShowSuspiciousModal(false);
    setSuspiciousCompleteParams(null); setAltMode(false);
    setAltToken(null); setAltGuesses([]); setAltGameOver(false);
    setAltFinalScore(0); setAltShowResult(false); setUnranked(false);
    setFlashEntry(null); setShowMidnightModal(false);
    startTimeRef.current = null;
    freshCompletionRef.current = false;
    altStartTimeRef.current = null;
  }, []);

  // ─── Dérivés (seules valeurs exposées à la page) ────────────────────────
  const activeGuesses = altMode ? altGuesses : guesses;
  const showingResult = altMode ? altShowResult : showResult;
  const submitDisabled = altMode ? altGameOver : gameOver;
  const scoreToShow = altMode ? altFinalScore : finalScore;

  return {
    inputRef,
    input, setInput,
    activeGuesses,
    submitDisabled,
    showingResult,
    showTransition, setShowTransition,
    scoreToShow,
    targetWord,
    error,
    activeTab, setActiveTab,
    showStats, setShowStats,
    flashEntry,
    isSubmitting,
    altMode,
    unranked,
    showScoreUpdateModal, handleCloseScoreUpdate,
    showSuspiciousModal,
    showMidnightModal, previousDate: previousDateRef.current,
    isLoadingAlt,
    submit: altMode ? handleAltSubmit : handleSubmit,
    handleShowLeaderboard,
    handlePlayAlternative,
    handleAcceptSuspicious,
    handleMidnightReset,
  };
}
