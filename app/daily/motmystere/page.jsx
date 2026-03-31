'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Question, Trophy, ChartBar, GridNine } from '@phosphor-icons/react';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { GameEndTransition } from '@/components/transitions';
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';
import WordleScoreUpdateModal from '@/components/ui/WordleScoreUpdateModal';
import { showRewardedAd } from '@/lib/admob';
import WordleLeaderboard from './WordleLeaderboard';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';
import {
  WORD_LENGTH, MAX_ATTEMPTS, normalize, computeFeedback, computeScore,
  WordleGrid, WordleKeyboard, WordleResultBanner, WordleStatsModal
} from './WordleComponents';

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MotMysterePage() {
  const router = useRouter();
  const [serverDate, setServerDate] = useState(null);

  // Fetch Firebase server time once to get the canonical date
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      const offset = snap.val() ?? 0;
      const serverTs = Date.now() + offset;
      const date = new Date(serverTs).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      setServerDate(date);
    }, () => {
      // Fallback to local date on error
      setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }));
    });
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, writeLeaderboard, resetToday, loaded } =
    useDailyGame('motmystere', { forceDate: serverDate });

  const [revealedWord, setRevealedWord] = useState(null);
  const [validWords, setValidWords] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(false);
  const [letterStates, setLetterStates] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [wordError, setWordError] = useState('');
  const checkingRef = useRef(false);
  const freshCompletionRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const { openManually: openHowToPlay } = useHowToPlay();
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const { triggerPostGameAd, triggered: adTriggered } = usePostGameAd();
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(null);

  // ─── Modale one-time nouveau système de score ─────────────────────────────
  const [showScoreUpdateModal, setShowScoreUpdateModal] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem('lq_wordle_score_v2_seen');
    if (!seen) setShowScoreUpdateModal(true);
  }, []);

  // ─── Anti-cheat / mode alternatif ────────────────────────────────────────
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [suspiciousCompleteParams, setSuspiciousCompleteParams] = useState(null);
  const [unranked, setUnranked] = useState(false);
  const [isLoadingAlt, setIsLoadingAlt] = useState(false);
  const [altMode, setAltMode] = useState(false);
  const [altToken, setAltToken] = useState(null);
  const [altGuesses, setAltGuesses] = useState([]);
  const [altFeedbacks, setAltFeedbacks] = useState([]);
  const [altCurrentGuess, setAltCurrentGuess] = useState('');
  const [altLetterStates, setAltLetterStates] = useState({});
  const [altGameOver, setAltGameOver] = useState(false);
  const [altSolved, setAltSolved] = useState(false);
  const [altScore, setAltScore] = useState(0);
  const [altRevealedWord, setAltRevealedWord] = useState(null);
  const [altElapsedMs, setAltElapsedMs] = useState(0);
  const [altShowResult, setAltShowResult] = useState(false);
  const altStartTimeRef = useRef(null);
  const altCheckingRef = useRef(false);

  // Auto-effacement du toast d'erreur après 1.5s
  useEffect(() => {
    if (!wordError) return;
    const t = setTimeout(() => setWordError(''), 1500);
    return () => clearTimeout(t);
  }, [wordError]);

  // Transition + pub + switch vers classement après une completion fraîche (pas une restauration)
  useEffect(() => {
    if (!showResult || !freshCompletionRef.current) return;
    transitionTimerRef.current = setTimeout(() => setShowTransition(true), 2000);
    return () => clearTimeout(transitionTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  // Premier clic sur "Classement" après completion → annule la transition auto, déclenche la pub
  const handleShowLeaderboard = useCallback(() => {
    if (freshCompletionRef.current && !adTriggered.current) {
      clearTimeout(transitionTimerRef.current);
      triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
    } else {
      setActiveTab('leaderboard');
    }
  }, [triggerPostGameAd, adTriggered]);

  // 1. Charger la liste de mots valides
  useEffect(() => {
    async function loadWords() {
      try {
        const res = await fetch('/data/wordle_words.txt');
        const text = await res.text();
        const set = new Set(
          text
            .split('\n')
            .map((w) => w.trim().toLowerCase())
            .filter((w) => w.length === WORD_LENGTH)
        );
        setValidWords(set);
      } catch (e) {
        console.warn('[MotMystere] Could not load word list:', e);
        setValidWords(new Set());
      }
    }
    loadWords();
  }, []);

  // 3. Restaurer l'état si la partie est en cours
  useEffect(() => {
    if (!loaded) return;
    if (todayState === 'inprogress' && progress) {
      const savedGuesses = progress.guesses || [];
      const savedFeedbacks = progress.feedbacks || [];
      setGuesses(savedGuesses);
      setFeedbacks(savedFeedbacks);
      updateLetterStates(savedFeedbacks, savedGuesses);
      // Restaurer le mode alternatif si une session alt était en cours
      const uid = auth.currentUser?.uid;
      if (uid && todayDate) {
        const altKey = `lq_mot_alt_${todayDate}_${uid}`;
        const stored = localStorage.getItem(altKey);
        if (stored) {
          try {
            const { token, guesses: altGs, feedbacks: altFbs, startTime, suspiciousParams } = JSON.parse(stored);
            setAltToken(token);
            setAltGuesses(altGs || []);
            setAltFeedbacks(altFbs || []);
            if (altGs?.length > 0 && altFbs?.length > 0) updateAltLetterStates(altFbs, altGs);
            altStartTimeRef.current = startTime;
            setSuspiciousCompleteParams(suspiciousParams);
            setGameOver(true);
            setAltMode(true);
          } catch {}
        } else if (savedGuesses.length === 1 && savedFeedbacks[0]?.every(f => f === 'correct')) {
          // Résultat suspect sans session alt en cours → re-montrer la modal
          const timeMs = Date.now() - (progress.startedAt || Date.now());
          const gameScore = computeScore(1, timeMs);
          setSuspiciousCompleteParams({ solved: true, attempts: 1, timeMs, score: gameScore });
          setGameOver(true);
          setGuesses([]); // masquer le guess suspect
          setFeedbacks([]);
          setTimeout(() => setShowSuspiciousModal(true), 500);
        }
      }
    } else if (todayState === 'completed' && progress) {
      const savedGuesses = progress.guesses || [];
      const savedFeedbacks = progress.feedbacks || [];
      if (savedGuesses.length > 0) {
        setGuesses(savedGuesses);
        setFeedbacks(savedFeedbacks);
        updateLetterStates(savedFeedbacks, savedGuesses);
      }
      setScore(progress.score || 0);
      setElapsedMs(progress.timeMs || 0);
      const wasSolved = progress.solved ?? savedGuesses.length > 0;
      setSolved(wasSolved);
      if (!wasSolved && progress.revealedWord) {
        setRevealedWord(progress.revealedWord);
      }
      const uid = auth.currentUser?.uid;
      if (uid && todayDate && localStorage.getItem(`lq_mot_unranked_${todayDate}_${uid}`)) {
        setUnranked(true);
      }
      setShowResult(true);
      setGameOver(true);
    } else if (todayState === 'unplayed') {
      startGame();
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState]);

  // Start timer on first load (unplayed)
  useEffect(() => {
    if (todayState === 'unplayed' && loaded) {
      startTimeRef.current = Date.now();
    } else if (todayState === 'inprogress' && loaded) {
      startTimeRef.current = startTimeRef.current || Date.now();
    }
  }, [todayState, loaded]);

  function updateLetterStates(allFeedbacks, allGuesses) {
    const priority = { correct: 3, present: 2, absent: 1 };
    const states = {};
    allGuesses.forEach((guess, gi) => {
      const fb = allFeedbacks[gi] || [];
      normalize(guess)
        .split('')
        .forEach((letter, li) => {
          const cur = states[letter];
          const next = fb[li];
          if (!cur || (priority[next] || 0) > (priority[cur] || 0)) {
            states[letter] = next;
          }
        });
    });
    setLetterStates(states);
  }

  // ─── Input handling ───────────────────────────────────────────────────────
  const handleKey = useCallback(
    async (key) => {
      if (gameOver || checkingRef.current) return;

      if (key === '⌫' || key === 'BACKSPACE') {
        setCurrentGuess((g) => g.slice(0, -1));
        setWordError('');
        return;
      }

      if (key === 'ENTER') {
        if (currentGuess.length < WORD_LENGTH) {
          setWordError('Mot trop court');
          setShake(true);
          setTimeout(() => setShake(false), 600);
          return;
        }

        const normalized = normalize(currentGuess);
        if (validWords && validWords.size > 0 && !validWords.has(currentGuess.toLowerCase()) && !validWords.has(normalized.toLowerCase())) {
          setWordError('Mot non reconnu');
          setShake(true);
          setTimeout(() => setShake(false), 600);
          return;
        }

        checkingRef.current = true;
        try {
          const newAttempts = guesses.length + 1;
          const res = await fetch('/api/daily/wordle/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess: currentGuess, date: todayDate, attemptNumber: newAttempts }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erreur API');

          const fb = data.feedback;
          const newGuesses = [...guesses, currentGuess];
          const newFeedbacks = [...feedbacks, fb];

          setGuesses(newGuesses);
          setFeedbacks(newFeedbacks);
          setCurrentGuess('');
          setWordError('');
          updateLetterStates(newFeedbacks, newGuesses);

          saveProgress(newGuesses, newAttempts, newFeedbacks);

          const isWin = data.isWin;
          const isLoss = !isWin && newAttempts >= MAX_ATTEMPTS;

          if (isWin || isLoss) {
            const timeMs = Date.now() - (startTimeRef.current || Date.now());
            const finalScore = isWin ? computeScore(newAttempts, timeMs) : 0;
            setScore(finalScore);
            setElapsedMs(timeMs);
            setSolved(isWin);
            setGameOver(true);

            if (isLoss && data.revealedWord) {
              setRevealedWord(data.revealedWord);
            }

            const suspicious = isWin && newAttempts === 1;

            if (suspicious) {
              setSuspiciousCompleteParams({ solved: true, attempts: newAttempts, timeMs, score: finalScore });
              setTimeout(() => setShowSuspiciousModal(true), 1200);
            } else {
              completeGame({
                solved: isWin,
                attempts: newAttempts,
                timeMs,
                score: finalScore,
                revealedWord: isLoss ? (data.revealedWord || null) : null,
              });
              freshCompletionRef.current = true;
              setTimeout(() => setShowResult(true), isWin ? 1200 : 600);
            }
          }
        } catch (err) {
          setWordError('Erreur réseau, réessaie');
          console.error('[MotMystere] Check API error:', err);
        } finally {
          checkingRef.current = false;
        }

        return;
      }

      // Regular letter
      if (/^[A-Za-zÀ-ÿ]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key.toUpperCase());
        setWordError('');
      }
    },
    [gameOver, todayDate, currentGuess, guesses, feedbacks, validWords, saveProgress, completeGame]
  );

  // ─── Logique mode alternatif ─────────────────────────────────────────────

  function updateAltLetterStates(allFeedbacks, allGuesses) {
    const priority = { correct: 3, present: 2, absent: 1 };
    const states = {};
    allGuesses.forEach((guess, gi) => {
      const fb = allFeedbacks[gi] || [];
      normalize(guess).split('').forEach((letter, li) => {
        const cur = states[letter];
        const next = fb[li];
        if (!cur || (priority[next] || 0) > (priority[cur] || 0)) states[letter] = next;
      });
    });
    setAltLetterStates(states);
  }

  const handlePlayAlternative = useCallback(async () => {
    setIsLoadingAlt(true);
    try {
      // Rewarded ad obligatoire avant de débloquer le mot alternatif
      const adResult = await showRewardedAd();
      if (!adResult.success && adResult.error === 'not_completed') {
        // L'utilisateur a fermé la pub sans la regarder → on bloque
        setIsLoadingAlt(false);
        return;
      }

      const uid = auth.currentUser?.uid;
      const res = await fetch(`/api/daily/wordle/alternative?date=${todayDate}${uid ? `&uid=${uid}` : ''}`);
      const { token } = await res.json();
      const startTime = Date.now();
      setAltToken(token);
      setAltMode(true);
      setShowSuspiciousModal(false);
      altStartTimeRef.current = startTime;
      if (uid && todayDate) {
        localStorage.setItem(`lq_mot_alt_${todayDate}_${uid}`, JSON.stringify({
          token, guesses: [], feedbacks: [], startTime, suspiciousParams: suspiciousCompleteParams,
        }));
      }
    } catch {
      setShowSuspiciousModal(false);
    }
    setIsLoadingAlt(false);
  }, [todayDate, suspiciousCompleteParams]);

  const handleAltKey = useCallback(async (key) => {
    if (altGameOver || altCheckingRef.current) return;

    if (key === '⌫' || key === 'BACKSPACE') {
      setAltCurrentGuess(g => g.slice(0, -1));
      return;
    }

    if (key === 'ENTER') {
      if (altCurrentGuess.length < WORD_LENGTH) return;

      const normalized = normalize(altCurrentGuess);
      if (validWords && validWords.size > 0 && !validWords.has(altCurrentGuess.toLowerCase()) && !validWords.has(normalized.toLowerCase())) {
        return;
      }

      altCheckingRef.current = true;
      try {
        const newAttempts = altGuesses.length + 1;
        const res = await fetch('/api/daily/wordle/alternative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guess: altCurrentGuess, token: altToken, attemptNumber: newAttempts }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur API');

        const fb = data.feedback;
        const newGuesses = [...altGuesses, altCurrentGuess];
        const newFeedbacks = [...altFeedbacks, fb];
        setAltGuesses(newGuesses);
        setAltFeedbacks(newFeedbacks);
        setAltCurrentGuess('');
        updateAltLetterStates(newFeedbacks, newGuesses);
        saveProgress(guesses, newGuesses.length);

        const uid = auth.currentUser?.uid;
        const altKey = uid && todayDate ? `lq_mot_alt_${todayDate}_${uid}` : null;
        if (altKey) {
          const stored = localStorage.getItem(altKey);
          if (stored) {
            try {
              localStorage.setItem(altKey, JSON.stringify({ ...JSON.parse(stored), guesses: newGuesses, feedbacks: newFeedbacks }));
            } catch {}
          }
        }

        if (data.isWin || data.isLoss) {
          const timeMs = Date.now() - (altStartTimeRef.current || Date.now());
          const finalScore = data.isWin ? computeScore(newAttempts, timeMs) : 0;
          setAltScore(finalScore);
          setAltElapsedMs(timeMs);
          setAltSolved(data.isWin);
          setAltGameOver(true);
          if (data.isLoss && data.revealedWord) setAltRevealedWord(data.revealedWord);
          setTimeout(() => setAltShowResult(true), data.isWin ? 1200 : 600);
          if (data.isWin) {
            writeLeaderboard({ score: finalScore, attempts: newAttempts, solved: true, timeMs });
          }
          if (suspiciousCompleteParams) completeGame({ ...suspiciousCompleteParams, skipLeaderboard: true });
          if (altKey) localStorage.removeItem(altKey);
        }
      } catch (err) {
        console.error('[MotMystere alt]', err);
      } finally {
        altCheckingRef.current = false;
      }
      return;
    }

    if (/^[A-Za-zÀ-ÿ]$/.test(key) && altCurrentGuess.length < WORD_LENGTH) {
      setAltCurrentGuess(g => g + key.toUpperCase());
    }
  }, [altGameOver, altCurrentGuess, altGuesses, altFeedbacks, altToken, validWords, writeLeaderboard, suspiciousCompleteParams, completeGame, todayDate, saveProgress, guesses, feedbacks]);

  // Physical keyboard (après handleAltKey pour éviter TDZ)
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const fn = altMode ? handleAltKey : handleKey;
      if (e.key === 'Backspace') fn('BACKSPACE');
      else if (e.key === 'Enter') fn('ENTER');
      else fn(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, handleAltKey, altMode]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!serverDate || !loaded) {
    return (
      <div className="wordle-page">
        <div className="wordle-loading">
          <div className="wordle-spinner" />
          <p>Chargement du mot du jour…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wordle-page">
      {/* Header */}
      <header className="wordle-header">
        <button className="wordle-back-btn" onClick={() => router.push('/home')}>
          <ArrowLeft size={20} weight="fill" />
        </button>
        <h1 className="wordle-title">Mot Mystère</h1>
        <div className="wordle-header-actions">
          <button className="wordle-help-btn" onClick={() => setShowStats(true)} title="Statistiques">
            <ChartBar size={18} weight="fill" />
          </button>
          <button className="wordle-help-btn" onClick={openHowToPlay} title="Comment jouer">
            <Question size={18} weight="fill" />
          </button>
        </div>
      </header>

      {/* Tabs — l'erreur s'overlay en absolu, les tabs gardent la hauteur */}
      <div className="wordle-tabs">
        <div className="wordle-tabs-content">
          <button className={`wordle-tab ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
            <GridNine size={14} weight="fill" /> Jeu
          </button>
          <button className={`wordle-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <Trophy size={14} weight="fill" /> Classement
          </button>
        </div>
        <AnimatePresence>
          {wordError && (
            <motion.div
              key={wordError}
              className="wordle-tabs-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {wordError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal anti-triche */}
      <SuspiciousResultModal
        isOpen={showSuspiciousModal}
        onAccept={() => {
          setShowSuspiciousModal(false);
          const uid = auth.currentUser?.uid;
          if (uid && todayDate) {
            localStorage.removeItem(`lq_mot_alt_${todayDate}_${uid}`);
            localStorage.setItem(`lq_mot_unranked_${todayDate}_${uid}`, '1');
          }
          if (suspiciousCompleteParams) completeGame({ ...suspiciousCompleteParams, skipLeaderboard: true });
          setUnranked(true);
          freshCompletionRef.current = true;
          setTimeout(() => setShowResult(true), 300);
        }}
        onPlayAlternative={handlePlayAlternative}
        isWatchingAd={isLoadingAlt}
      />

      {/* Modale one-time nouveau système de score */}
      <WordleScoreUpdateModal
        isOpen={showScoreUpdateModal}
        onClose={() => {
          localStorage.setItem('lq_wordle_score_v2_seen', '1');
          setShowScoreUpdateModal(false);
        }}
      />

      {/* Modals */}
      <WordleStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        streak={streak}
        currentAttempts={guesses.length}
        solved={solved}
      />

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <LeaderboardErrorBoundary>
          <WordleLeaderboard todayDate={todayDate} />
        </LeaderboardErrorBoundary>
      )}

      {/* Game tab */}
      {activeTab === 'game' && <main className="wordle-main">
        <p className="wordle-game-date">
          {new Date(todayDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {altMode && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>MOT ALTERNATIF</span>}
        </p>
        {/* Content area */}
        <div className="wordle-content">
          <div className="wordle-board-area">
            <WordleGrid
              guesses={altMode ? altGuesses : guesses}
              feedbacks={altMode ? altFeedbacks : feedbacks}
              currentGuess={altMode ? altCurrentGuess : currentGuess}
              attempts={altMode ? altGuesses.length : guesses.length}
              shake={shake}
            />
          </div>
        </div>

        {/* Keyboard */}
        {altMode ? (
          !altGameOver && (
            <WordleKeyboard letterStates={altLetterStates} onKey={handleAltKey} onSubmit={() => handleAltKey('ENTER')} />
          )
        ) : (
          !gameOver && (
            <WordleKeyboard letterStates={letterStates} onKey={handleKey} onSubmit={() => handleKey('ENTER')} />
          )
        )}

        {/* Result banner */}
        <AnimatePresence>
          {altMode ? (
            altShowResult && (
              <WordleResultBanner
                solved={altSolved}
                attempts={altGuesses.length}
                timeMs={altElapsedMs}
                score={altScore}
                revealedWord={altRevealedWord}
                stats={stats}
                streak={streak}
                onShowStats={() => setShowStats(true)}
                onShowLeaderboard={handleShowLeaderboard}
              />
            )
          ) : (
            showResult && (
              <WordleResultBanner
                solved={solved}
                attempts={guesses.length}
                timeMs={elapsedMs}
                score={score}
                revealedWord={revealedWord}
                stats={stats}
                streak={streak}
                onShowStats={() => setShowStats(true)}
                onShowLeaderboard={handleShowLeaderboard}
                unranked={unranked}
              />
            )
          )}
        </AnimatePresence>
      </main>}

      <AnimatePresence>
        {showTransition && (
          <GameEndTransition
            variant="motmystere"
            duration={1500}
            onComplete={() => {
              triggerPostGameAd(() => {
                setActiveTab('leaderboard');
                setShowTransition(false);
              }, { delay: 0 });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
