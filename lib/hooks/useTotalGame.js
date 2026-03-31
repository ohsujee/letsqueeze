'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ref, onValue, get, set as fbSet } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { TIMER_SECONDS, MAX_SUBMISSIONS, evaluateTokens, computeScore } from '@/app/daily/total/components/helpers';

let puzzlesCache = null;

async function loadPuzzles() {
  if (puzzlesCache) return puzzlesCache;
  const res = await fetch('/data/total_puzzles.json');
  puzzlesCache = await res.json();
  return puzzlesCache;
}

function getPuzzleForDate(data, dateStr) {
  const start = new Date(data.startDate + 'T00:00:00');
  const current = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));
  if (diffDays < 0 || diffDays >= data.puzzles.length) return null;
  const entry = data.puzzles[diffDays];
  return { numbers: entry.n, target: entry.t };
}

function getRandomPuzzle(data) {
  const idx = Math.floor(Math.random() * data.puzzles.length);
  return { numbers: data.puzzles[idx].n, target: data.puzzles[idx].t };
}

/**
 * useTotalGame — All game state and logic for Daily Total.
 */
export function useTotalGame() {
  const [serverDate, setServerDate] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      const offset = snap.val() ?? 0;
      setServerDate(new Date(Date.now() + offset).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }));
    }, () => {
      setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }));
    });
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, loaded } =
    useDailyGame('total', { forceDate: serverDate });

  const [puzzlesData, setPuzzlesData] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => { loadPuzzles().then(setPuzzlesData).catch(console.error); }, []);

  useEffect(() => {
    if (!puzzlesData || !todayDate || devMode) return;
    const p = getPuzzleForDate(puzzlesData, todayDate);
    setPuzzle(p || getRandomPuzzle(puzzlesData));
    if (!p) setDevMode(true);
  }, [puzzlesData, todayDate, devMode]);

  // Game state
  const [tokens, setTokens] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [gamePhase, setGamePhase] = useState('ready');
  const [endReason, setEndReason] = useState(null);
  const [bestResult, setBestResult] = useState(null);
  const [bestDifference, setBestDifference] = useState(Infinity);
  const [bestScore, setBestScore] = useState(0);
  const [submissions, setSubmissions] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [score, setScore] = useState(0);
  const [flashResult, setFlashResult] = useState(null);
  const [activeTab, setActiveTab] = useState('game');

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const freshCompletionRef = useRef(false);
  const { triggerPostGameAd, triggered: adTriggered } = usePostGameAd();

  // Derived
  const usedIndices = useMemo(() => {
    const indices = new Set();
    if (!puzzle) return indices;
    const usedTracker = new Array(6).fill(false);
    for (const token of tokens) {
      if (typeof token === 'number') {
        for (let i = 0; i < puzzle.numbers.length; i++) {
          if (puzzle.numbers[i] === token && !usedTracker[i]) { usedTracker[i] = true; indices.add(i); break; }
        }
      }
    }
    return indices;
  }, [tokens, puzzle]);

  const liveResult = useMemo(() => evaluateTokens(tokens), [tokens]);
  const allUsed = usedIndices.size === 6;
  const submissionsLeft = MAX_SUBMISSIONS - submissions.length;
  const canValidate = allUsed && tokens.length >= 11 && typeof tokens[tokens.length - 1] === 'number' && submissionsLeft > 0;
  const expectingNumber = tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string';

  // Write leaderboard
  async function writeTotalLeaderboard(finalScore, attempts, solved, timeMs, difference) {
    const user = auth.currentUser;
    if (!user || !todayDate) return;
    try {
      let name = 'Joueur';
      try { const snap = await get(ref(db, `users/${user.uid}/profile/pseudo`)); if (snap.val()) name = snap.val(); } catch {}
      await fbSet(ref(db, `daily/total/${todayDate}/leaderboard/${user.uid}`), {
        name, score: finalScore || 0, attempts, solved, timeMs,
        difference: difference === Infinity ? null : difference, completedAt: Date.now(),
      });
    } catch (e) { console.warn('[Total] Leaderboard write error:', e); }
  }

  function handleTimeUp(finalBestResult, finalDiff, finalScore, reason = 'time') {
    clearInterval(timerRef.current);
    freshCompletionRef.current = true;
    setEndReason(reason);
    const timeMs = TIMER_SECONDS * 1000;
    setScore(finalScore || 0);
    completeGame({ solved: finalDiff === 0, attempts: submissions.length, timeMs, score: finalScore || 0, skipLeaderboard: true });
    writeTotalLeaderboard(finalScore || 0, submissions.length, finalDiff === 0, timeMs, finalDiff);
    setGamePhase('finished');
  }

  // Restore state
  useEffect(() => {
    if (!loaded || !puzzle || devMode) return;
    if (todayState === 'completed' && progress) {
      const data = progress.guesses?.[0] || {};
      setGamePhase('finished'); setScore(progress.score || 0);
      setBestResult(data.bestResult ?? null); setBestDifference(data.difference ?? Infinity);
      setShowResult(true);
    } else if (todayState === 'inprogress' && progress) {
      const data = progress.guesses?.[0] || {};
      setGamePhase('playing'); startTimeRef.current = data.startedAt || Date.now();
      setBestResult(data.bestResult ?? null); setBestDifference(data.difference ?? Infinity);
      setBestScore(data.bestScore ?? 0); setSubmissions(data.submissions ?? []);
      const elapsed = Math.floor((Date.now() - (data.startedAt || Date.now())) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) handleTimeUp(data.bestResult, data.difference ?? Infinity, data.bestScore ?? 0);
    }
  }, [loaded, todayState, puzzle]);

  // Timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    timerRef.current = setInterval(() => { setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; }); }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gamePhase]);

  useEffect(() => {
    if (timeLeft === 0 && gamePhase === 'playing') handleTimeUp(bestResult, bestDifference, bestScore);
  }, [timeLeft, gamePhase]);

  // Visibility change
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    function handleVisibility() { if (document.hidden) handleTimeUp(bestResult, bestDifference, bestScore, 'quit'); }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gamePhase, bestResult, bestDifference, bestScore]);

  // Transition on completion
  useEffect(() => {
    if (gamePhase !== 'finished' || !freshCompletionRef.current || showResult) return;
    const timer = setTimeout(() => setShowTransition(true), 300);
    return () => clearTimeout(timer);
  }, [gamePhase, showResult]);

  // Actions
  function handleStart() { startGame(); startTimeRef.current = Date.now(); setGamePhase('playing'); setTimeLeft(TIMER_SECONDS); }
  function handleTapNumber(value, index) { if (gamePhase !== 'playing' || !expectingNumber || usedIndices.has(index)) return; setTokens(p => [...p, value]); }
  function handleTapOperator(op) { if (gamePhase !== 'playing' || expectingNumber) return; setTokens(p => [...p, op]); }
  function handleBackspace() { if (gamePhase !== 'playing' || tokens.length === 0) return; setTokens(p => p.slice(0, -1)); }
  function handleClear() { if (gamePhase !== 'playing') return; setTokens([]); }

  function handleValidate() {
    if (!canValidate || gamePhase !== 'playing' || !puzzle) return;
    const rawResult = evaluateTokens(tokens);
    if (rawResult === null) return;
    const result = Math.round(rawResult * 100) / 100;
    const diff = Math.round(Math.abs(result - puzzle.target) * 100) / 100;
    const timeMs = Date.now() - (startTimeRef.current || Date.now());
    const calcScore = computeScore(diff, timeMs);

    const submission = { expression: tokens.map(t => typeof t === 'number' ? t : ` ${t} `).join(''), result, difference: diff, score: calcScore };
    const newSubmissions = [...submissions, submission];
    setSubmissions(newSubmissions);

    if (diff === 0) setFlashResult('exact');
    else if (diff <= 10) setFlashResult('close');
    else setFlashResult('far');
    setTimeout(() => setFlashResult(null), 1200);

    let newBestResult = bestResult, newBestDiff = bestDifference, newBestScore = bestScore;
    if (diff < bestDifference || (diff === bestDifference && calcScore > bestScore)) {
      newBestResult = result; newBestDiff = diff; newBestScore = calcScore;
      setBestResult(result); setBestDifference(diff); setBestScore(calcScore);
    }

    saveProgress([{ bestResult: newBestResult, difference: newBestDiff, bestScore: newBestScore, submissions: newSubmissions, startedAt: startTimeRef.current }], newSubmissions.length, []);

    if (diff === 0) {
      clearInterval(timerRef.current); freshCompletionRef.current = true; setEndReason('exact'); setScore(calcScore); setGamePhase('finished');
      completeGame({ solved: true, attempts: newSubmissions.length, timeMs, score: calcScore, skipLeaderboard: true });
      writeTotalLeaderboard(calcScore, newSubmissions.length, true, timeMs, 0);
    } else if (newSubmissions.length >= MAX_SUBMISSIONS) {
      clearInterval(timerRef.current); freshCompletionRef.current = true; setEndReason('attempts'); setScore(newBestScore);
      completeGame({ solved: newBestDiff === 0, attempts: newSubmissions.length, timeMs, score: newBestScore, skipLeaderboard: true });
      writeTotalLeaderboard(newBestScore, newSubmissions.length, newBestDiff === 0, timeMs, newBestDiff);
      setGamePhase('finished');
    } else {
      setTokens([]);
    }
  }

  const handleShowLeaderboard = useCallback(() => {
    if (freshCompletionRef.current && !adTriggered.current) triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
    else setActiveTab('leaderboard');
  }, [triggerPostGameAd, adTriggered]);

  function handleDevRestart() {
    if (!puzzlesData) return;
    clearInterval(timerRef.current); setDevMode(true); setPuzzle(getRandomPuzzle(puzzlesData));
    setTokens([]); setTimeLeft(TIMER_SECONDS); setGamePhase('ready'); setBestResult(null);
    setBestDifference(Infinity); setBestScore(0); setSubmissions([]); setShowResult(false);
    setShowTransition(false); setScore(0); setActiveTab('game'); setFlashResult(null);
    setEndReason(null); startTimeRef.current = null; freshCompletionRef.current = false;
  }

  function handleQuitGame() { handleTimeUp(bestResult, bestDifference, bestScore, 'quit'); }

  return {
    // State
    puzzle, loaded, devMode, gamePhase, timeLeft, tokens, usedIndices, liveResult,
    bestResult, bestDifference, bestScore, submissions, submissionsLeft,
    flashResult, canValidate, allUsed, score, endReason, showResult, showTransition,
    activeTab, stats, streak, todayDate, startTimeRef,
    // Actions
    handleStart, handleTapNumber, handleTapOperator, handleBackspace, handleClear,
    handleValidate, handleShowLeaderboard, handleDevRestart, handleQuitGame,
    setActiveTab, setShowResult, setShowTransition,
    // Ad
    adTriggered, triggerPostGameAd,
  };
}
