'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChartBar, X, ArrowsClockwise, Question, GridNine, Trophy } from '@phosphor-icons/react';
import { ref, onValue, get, set as fbSet } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';

import { TIMER_SECONDS, MAX_SUBMISSIONS, evaluateTokens, computeScore, formatResult } from './components/helpers';
import TotalResultBanner from './components/TotalResultBanner';
import TotalStatsModal from './components/TotalStatsModal';
import TotalLeaderboard from './components/TotalLeaderboard';
import TotalReadyScreen from './components/TotalReadyScreen';
import TotalPlayingScreen from './components/TotalPlayingScreen';
import TotalSubmissionsRecap from './components/TotalSubmissionsRecap';

// ─── Puzzle Loading ─────────────────────────────────────────────────────────
const PUZZLE_START_DATE = '2026-04-01';
let puzzlesCache = null;

async function loadPuzzles() {
  if (puzzlesCache) return puzzlesCache;
  const res = await fetch('/data/total_puzzles.json');
  const data = await res.json();
  puzzlesCache = data;
  return data;
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
  const entry = data.puzzles[idx];
  return { numbers: entry.n, target: entry.t };
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function DailyTotalPage() {
  const router = useRouter();
  const { openManually: openHowToPlay } = useHowToPlay();
  const [serverDate, setServerDate] = useState(null);

  // Fetch Firebase server time
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      const offset = snap.val() ?? 0;
      const serverTs = Date.now() + offset;
      const date = new Date(serverTs).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      setServerDate(date);
    }, () => {
      setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }));
    });
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, loaded } =
    useDailyGame('total', { forceDate: serverDate });

  // Puzzle data
  const [puzzlesData, setPuzzlesData] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [devMode, setDevMode] = useState(false);

  // Load puzzles JSON once
  useEffect(() => {
    loadPuzzles().then(setPuzzlesData).catch(console.error);
  }, []);

  // Set puzzle for today's date (or random in dev mode)
  useEffect(() => {
    if (!puzzlesData || !todayDate || devMode) return;
    const p = getPuzzleForDate(puzzlesData, todayDate);
    // Fallback: if date is out of range (dev/testing), use a random puzzle
    setPuzzle(p || getRandomPuzzle(puzzlesData));
    if (!p) setDevMode(true);
  }, [puzzlesData, todayDate, devMode]);

  // Game state
  const [tokens, setTokens] = useState([]);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [gamePhase, setGamePhase] = useState('ready'); // ready | playing | finished
  const [endReason, setEndReason] = useState(null); // 'exact' | 'attempts' | 'time' | 'quit'
  const [bestResult, setBestResult] = useState(null);
  const [bestDifference, setBestDifference] = useState(Infinity);
  const [bestScore, setBestScore] = useState(0);
  const [bestTimeMs, setBestTimeMs] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [score, setScore] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [flashResult, setFlashResult] = useState(null); // 'exact' | 'close' | 'far' | null

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const freshCompletionRef = useRef(false);
  const { triggerPostGameAd, triggered: adTriggered } = usePostGameAd();

  // Which number indices are used in current expression
  const usedIndices = useMemo(() => {
    const indices = new Set();
    if (!puzzle) return indices;
    const available = [...puzzle.numbers];
    const usedTracker = new Array(6).fill(false);

    for (const token of tokens) {
      if (typeof token === 'number') {
        // Find first unused matching number
        for (let i = 0; i < available.length; i++) {
          if (available[i] === token && !usedTracker[i]) {
            usedTracker[i] = true;
            indices.add(i);
            break;
          }
        }
      }
    }
    return indices;
  }, [tokens, puzzle]);

  // Live evaluation
  const liveResult = useMemo(() => {
    return evaluateTokens(tokens);
  }, [tokens]);

  // Can validate? All 6 numbers must be used, ends with number
  const allUsed = usedIndices.size === 6;
  const submissionsLeft = MAX_SUBMISSIONS - submissions.length;
  const canValidate = allUsed && tokens.length >= 11 && typeof tokens[tokens.length - 1] === 'number' && submissionsLeft > 0;

  // Expecting number or operator?
  const expectingNumber = tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string';

  // ─── Restore state ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !puzzle || devMode) return;

    if (todayState === 'completed' && progress) {
      const data = progress.guesses?.[0] || {};
      setGamePhase('finished');
      setScore(progress.score || 0);
      setBestResult(data.bestResult ?? null);
      setBestDifference(data.difference ?? Infinity);
      setShowResult(true);
    } else if (todayState === 'inprogress' && progress) {
      const data = progress.guesses?.[0] || {};
      setGamePhase('playing');
      startTimeRef.current = data.startedAt || Date.now();
      setBestResult(data.bestResult ?? null);
      setBestDifference(data.difference ?? Infinity);
      setBestScore(data.bestScore ?? 0);
      setBestTimeMs(data.bestTimeMs ?? null);
      setSubmissions(data.submissions ?? []);
      // Calculate remaining time
      const elapsed = Math.floor((Date.now() - (data.startedAt || Date.now())) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeUp(data.bestResult, data.difference ?? Infinity, data.bestScore ?? 0, 'time', data.bestTimeMs ?? null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState, puzzle]);

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gamePhase]);

  // Time up handler
  useEffect(() => {
    if (timeLeft === 0 && gamePhase === 'playing') {
      handleTimeUp(bestResult, bestDifference, bestScore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, gamePhase]);

  function handleTimeUp(finalBestResult, finalDiff, finalScore, reason = 'time', finalBestTimeMs = null) {
    clearInterval(timerRef.current);
    freshCompletionRef.current = true;
    setEndReason(reason);
    // Use the time of the best submission, not total game time
    const usedTimeMs = finalBestTimeMs || bestTimeMs || TIMER_SECONDS * 1000;
    const recalcScore = computeScore(finalDiff === Infinity ? 0 : finalDiff, usedTimeMs);
    const finalScoreVal = finalDiff === Infinity ? 0 : recalcScore;
    setScore(finalScoreVal);

    const isSolved = finalDiff === 0;
    completeGame({
      solved: isSolved,
      attempts: submissions.length,
      timeMs: usedTimeMs,
      score: finalScoreVal,
      skipLeaderboard: true,
    });

    writeTotalLeaderboard(finalScoreVal, submissions.length, isSolved, usedTimeMs, finalDiff);

    setGamePhase('finished');
  }

  // ─── Write leaderboard with custom fields ────────────────────────────────
  async function writeTotalLeaderboard(finalScore, attempts, solved, timeMs, difference) {
    const user = auth.currentUser;
    if (!user || !todayDate) return;
    try {
      let name = 'Joueur';
      try {
        const snap = await get(ref(db, `users/${user.uid}/profile/pseudo`));
        if (snap.val()) name = snap.val();
      } catch {}
      await fbSet(ref(db, `daily/total/${todayDate}/leaderboard/${user.uid}`), {
        name,
        score: finalScore || 0,
        attempts,
        solved,
        timeMs,
        difference: difference === Infinity ? null : difference,
        completedAt: Date.now(),
      });
    } catch (e) {
      console.warn('[Total] Leaderboard write error:', e);
    }
  }

  // ─── Start game ─────────────────────────────────────────────────────────
  function handleStart() {
    startGame();
    startTimeRef.current = Date.now();
    setGamePhase('playing');
    setTimeLeft(TIMER_SECONDS);
  }

  // ─── Tap number ─────────────────────────────────────────────────────────
  function handleTapNumber(value, index) {
    if (gamePhase !== 'playing' || !expectingNumber) return;
    if (usedIndices.has(index)) return;

    setTokens((prev) => [...prev, value]);
  }

  // ─── Tap operator ───────────────────────────────────────────────────────
  function handleTapOperator(op) {
    if (gamePhase !== 'playing' || expectingNumber) return;
    setTokens((prev) => [...prev, op]);
  }

  // ─── Backspace ──────────────────────────────────────────────────────────
  function handleBackspace() {
    if (gamePhase !== 'playing' || tokens.length === 0) return;
    setTokens((prev) => prev.slice(0, -1));
  }

  // ─── Clear ──────────────────────────────────────────────────────────────
  function handleClear() {
    if (gamePhase !== 'playing') return;
    setTokens([]);
  }

  // ─── Validate ─────────────────────────────────────────────────────────
  function handleValidate() {
    if (!canValidate || gamePhase !== 'playing' || !puzzle) return;

    const rawResult = evaluateTokens(tokens);
    if (rawResult === null) return;
    const result = Math.round(rawResult * 100) / 100;

    const diff = Math.round(Math.abs(result - puzzle.target) * 100) / 100;
    const timeMs = Date.now() - (startTimeRef.current || Date.now());
    const calcScore = computeScore(diff, timeMs);

    const submission = {
      expression: tokens.map((t) => (typeof t === 'number' ? t : ` ${t} `)).join(''),
      result,
      difference: diff,
      score: calcScore,
    };

    const newSubmissions = [...submissions, submission];
    setSubmissions(newSubmissions);

    // Flash feedback
    if (diff === 0) {
      setFlashResult('exact');
    } else if (diff <= 10) {
      setFlashResult('close');
    } else {
      setFlashResult('far');
    }
    setTimeout(() => setFlashResult(null), 1200);

    // Update best
    let newBestResult = bestResult;
    let newBestDiff = bestDifference;
    let newBestScore = bestScore;

    if (diff < bestDifference || (diff === bestDifference && calcScore > bestScore)) {
      newBestResult = result;
      newBestDiff = diff;
      newBestScore = calcScore;
      setBestResult(result);
      setBestDifference(diff);
      setBestScore(calcScore);
      setBestTimeMs(timeMs);
    }

    // Save progress (store custom data in guesses[0])
    const currentBestTimeMs = (diff < bestDifference || (diff === bestDifference && calcScore > bestScore)) ? timeMs : bestTimeMs;
    saveProgress(
      [{ bestResult: newBestResult, difference: newBestDiff, bestScore: newBestScore, bestTimeMs: currentBestTimeMs, submissions: newSubmissions, startedAt: startTimeRef.current }],
      newSubmissions.length,
      []
    );

    // Exact match → game over
    if (diff === 0) {
      clearInterval(timerRef.current);
      freshCompletionRef.current = true;
      setEndReason('exact');
      setScore(calcScore);
      setGamePhase('finished');

      completeGame({
        solved: true,
        attempts: newSubmissions.length,
        timeMs,
        score: calcScore,
        skipLeaderboard: true,
      });
      writeTotalLeaderboard(calcScore, newSubmissions.length, true, timeMs, 0);
    } else if (newSubmissions.length >= MAX_SUBMISSIONS) {
      // All attempts used → game over with best result
      clearInterval(timerRef.current);
      freshCompletionRef.current = true;
      setEndReason('attempts');
      // Use bestTimeMs (time of the best submission, not the last one)
      const usedTimeMs = diff < bestDifference ? timeMs : (bestTimeMs || timeMs);
      const finalScore = computeScore(newBestDiff, usedTimeMs);
      setScore(finalScore);

      const isSolved = newBestDiff === 0;
      completeGame({
        solved: isSolved,
        attempts: newSubmissions.length,
        timeMs: usedTimeMs,
        score: finalScore,
        skipLeaderboard: true,
      });
      writeTotalLeaderboard(finalScore, newSubmissions.length, isSolved, usedTimeMs, newBestDiff);
      setGamePhase('finished');
    } else {
      // Clear expression for next attempt
      setTokens([]);
    }
  }

  // ─── Show leaderboard handler ───────────────────────────────────────────
  const handleShowLeaderboard = useCallback(() => {
    if (freshCompletionRef.current && !adTriggered.current) {
      triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
    } else {
      setActiveTab('leaderboard');
    }
  }, [triggerPostGameAd, adTriggered]);

  // Transition immediately on completion (before result banner)
  useEffect(() => {
    if (gamePhase !== 'finished' || !freshCompletionRef.current || showResult) return;
    const timer = setTimeout(() => setShowTransition(true), 300);
    return () => clearTimeout(timer);
  }, [gamePhase, showResult]);

  // ─── Visibility change: leaving app = game over ────────────────────────
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    function handleVisibility() {
      if (document.hidden) {
        handleTimeUp(bestResult, bestDifference, bestScore, 'quit');
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePhase, bestResult, bestDifference, bestScore]);

  // ─── Dev restart ──────────────────────────────────────────────────────
  function handleDevRestart() {
    if (!puzzlesData) return;
    clearInterval(timerRef.current);
    setDevMode(true);
    setPuzzle(getRandomPuzzle(puzzlesData));
    setTokens([]);
    setTimeLeft(TIMER_SECONDS);
    setGamePhase('ready');
    setBestResult(null);
    setBestDifference(Infinity);
    setBestScore(0);
    setBestTimeMs(null);
    setSubmissions([]);
    setShowResult(false);
    setShowTransition(false);
    setScore(0);
    setActiveTab('game');
    setFlashResult(null);
    setEndReason(null);
    startTimeRef.current = null;
    freshCompletionRef.current = false;
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (!loaded || !puzzle) {
    return (
      <div className="total-page">
        <div className="wordle-loading">
          <div className="total-spinner" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="total-page" style={{ background: '#04060f', position: 'relative', overflow: 'hidden' }}>
      {/* ── Background layers ── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.04) 0%, transparent 70%)',
        }} />
      </div>

      {/* Header */}
      <header className="wordle-header" style={{ position: 'relative', zIndex: 1 }}>
        <button className="wordle-back-btn" onClick={() => {
          if (gamePhase === 'playing') {
            setShowQuitConfirm(true);
          } else {
            router.push('/home');
          }
        }}>
          <ArrowLeft size={20} weight="fill" />
        </button>
        <h1 className="total-title">Total</h1>
        <div className="wordle-header-actions">
          {devMode && (
            <button className="wordle-help-btn" onClick={handleDevRestart} title="Restart (dev)" style={{
              background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6',
            }}>
              <ArrowsClockwise size={18} weight="fill" />
            </button>
          )}
          <button className="wordle-help-btn" onClick={() => setShowStats(true)} title="Statistiques" style={{
            background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6',
          }}>
            <ChartBar size={18} weight="fill" />
          </button>
          <button className="wordle-help-btn" onClick={openHowToPlay} title="Comment jouer" style={{
            background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6',
          }}>
            <Question size={18} weight="fill" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      {gamePhase === 'finished' && (
        <div className="wordle-tabs total-tabs">
          <div className="wordle-tabs-content">
            <button className={`wordle-tab ${activeTab === 'game' ? 'active total-tab-active' : ''}`} onClick={() => setActiveTab('game')}>
              <GridNine size={14} weight="fill" /> Jeu
            </button>
            <button className={`wordle-tab ${activeTab === 'leaderboard' ? 'active total-tab-active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={14} weight="fill" /> Classement
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="total-content" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab === 'game' ? (
          <>
            {/* ─── Ready Phase ─── */}
            {gamePhase === 'ready' && (
              <TotalReadyScreen onStart={handleStart} />
            )}

            {/* ─── Playing Phase ─── */}
            {gamePhase === 'playing' && (
              <TotalPlayingScreen
                puzzle={puzzle}
                timeLeft={timeLeft}
                tokens={tokens}
                usedIndices={usedIndices}
                liveResult={liveResult}
                bestResult={bestResult}
                bestDifference={bestDifference}
                submissions={submissions}
                flashResult={flashResult}
                canValidate={canValidate}
                allUsed={allUsed}
                onTapNumber={handleTapNumber}
                onTapOperator={handleTapOperator}
                onBackspace={handleBackspace}
                onClear={handleClear}
                onValidate={handleValidate}
                onFinishEarly={() => setShowFinishConfirm(true)}
              />
            )}

            {/* ─── Finished Phase ─── */}
            {gamePhase === 'finished' && showResult && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TotalResultBanner
                  exact={bestDifference === 0}
                  difference={bestDifference === Infinity ? null : bestDifference}
                  bestResult={bestResult}
                  target={puzzle.target}
                  timeMs={bestDifference === 0 ? (Date.now() - (startTimeRef.current || Date.now())) : TIMER_SECONDS * 1000}
                  score={score}
                  stats={stats}
                  streak={streak}
                  endReason={endReason}
                  onShowStats={() => setShowStats(true)}
                  onShowLeaderboard={handleShowLeaderboard}
                />
                <TotalSubmissionsRecap submissions={submissions} />
              </div>
            )}
          </>
        ) : (
          // Leaderboard tab
          <TotalLeaderboard todayDate={todayDate} />
        )}
      </div>

      {/* Stats modal */}
      <TotalStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        streak={streak}
      />

      {/* Quit confirmation modal */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div
            className="wordle-stats-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuitConfirm(false)}
          >
            <motion.div
              className="wordle-stats-modal"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 320 }}
            >
              <div className="wsm-header">
                <h3 className="wsm-title" style={{ color: '#f59e0b' }}>Quitter la partie ?</h3>
                <button className="wsm-close" onClick={() => setShowQuitConfirm(false)}><X size={16} weight="fill" /></button>
              </div>
              <p style={{
                fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
                margin: '0 0 16px', textAlign: 'center',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>
                Ta partie sera terminée avec ton meilleur résultat actuel. Tu ne pourras pas recommencer aujourd&apos;hui.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Continuer
                </button>
                <button
                  onClick={() => {
                    setShowQuitConfirm(false);
                    handleTimeUp(bestResult, bestDifference, bestScore, 'quit');
                    setTimeout(() => router.push('/home'), 200);
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Quitter
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish early confirmation modal */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div
            className="wordle-stats-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFinishConfirm(false)}
          >
            <motion.div
              className="wordle-stats-modal"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 320 }}
            >
              <div className="wsm-header">
                <h3 className="wsm-title" style={{ color: '#3b82f6' }}>Terminer la partie ?</h3>
                <button className="wsm-close" onClick={() => setShowFinishConfirm(false)}><X size={16} weight="fill" /></button>
              </div>
              <p style={{
                fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5,
                margin: '0 0 16px', textAlign: 'center',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>
                Ton meilleur résultat ({formatResult(bestResult)}, écart : {formatResult(bestDifference)}) sera utilisé pour te classer. Il te reste {submissionsLeft} essai{submissionsLeft > 1 ? 's' : ''}.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowFinishConfirm(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Continuer
                </button>
                <button
                  onClick={() => {
                    setShowFinishConfirm(false);
                    handleTimeUp(bestResult, bestDifference, bestScore, 'quit');
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
                    color: '#3b82f6', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Terminer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-game transition */}
      {showTransition && (
        <GameEndTransition
          variant="total"
          title="Voyons le classement !"
          subtitle="Qui est le meilleur calculateur ?"
          onComplete={() => {
            setShowTransition(false);
            setShowResult(true);
            if (!adTriggered.current) {
              triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
            } else {
              setActiveTab('leaderboard');
            }
          }}
        />
      )}
    </div>
  );
}
