'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TextT, Trophy, ChartBar, Question, PaperPlaneTilt, Lightbulb } from '@phosphor-icons/react';
import { ref, get, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';
import ScoreUpdateModal from '@/components/ui/ScoreUpdateModal';
import MidnightModal from '@/components/ui/MidnightModal';
import SemanticLeaderboard from './SemanticLeaderboard';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';
import './semantique.css';
import {
  stripAccents, toCelsius, formatCelsius, getTemperature,
  computeFinalScore, getStreakFlames,
  SemanticStatsModal, SemanticResultBanner, GuessRow
} from './SemanticComponents';
// ─── Page principale ──────────────────────────────────────────────────────────
export default function SemantiquePage() {
  const router = useRouter();
  const [serverDate, setServerDate] = useState(null);

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      const offset = snap.val() ?? 0;
      const date = new Date(Date.now() + offset).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      setServerDate(date);
    }, () => setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })));
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, writeLeaderboard, loaded } =
    useDailyGame('semantique', { forceDate: serverDate });

  const [showMidnightModal, setShowMidnightModal] = useState(false);
  const previousDateRef = useRef(serverDate);
  const guessesRef = useRef([]);
  const gameOverRef = useRef(false);

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
  const { triggerPostGameAd, triggered: adTriggered } = usePostGameAd();
  const { openManually: openHowToPlay } = useHowToPlay();
  const [flashEntry, setFlashEntry] = useState(null);
  const inputRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const semanticMainRef = useRef(null);
  const startTimeRef = useRef(null);
  const freshCompletionRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const inputZoneRef = useRef(null);
  const nativeKbActiveRef = useRef(false); // true quand iOS natif gère le clavier

  // iOS natif (Capacitor) : ViewController.swift envoie 'native-keyboard-show/hide'
  //   via UIKeyboardWillShowNotification → hauteur finale exacte, avant animation.
  //   isScrollEnabled=false empêche le document de scroller → header toujours visible.
  //
  // Sur iPad, keyboardWillShow peut se déclencher deux fois : une fois avec la bonne
  //   hauteur, une fois avec height=0 (keyboard frame en transition). On ignore height=0.
  //   visualViewport sert de filet de sécurité et corrige la position si besoin.
  //
  // Android / web : fallback visualViewport resize (Android redimensionne le WebView).
  useEffect(() => {
    // Hauteur de base stable — capturée avant toute ouverture clavier.
    // Sur iOS natif, window.innerHeight peut changer pendant l'animation
    // (additionalSafeAreaInsets animé en Swift) → on utilise cette ref stable.
    const baseHeightRef = { current: window.innerHeight };

    const applyKb = (kb) => {
      const mainEl = semanticMainRef.current;
      if (!mainEl) return;
      if (kb > 0) {
        const topOffset = mainEl.getBoundingClientRect().top;
        // Utiliser baseHeight (stable) au lieu de window.innerHeight (instable pendant animation)
        mainEl.style.height = `${baseHeightRef.current - kb - topOffset}px`;
        mainEl.style.flex = 'none';
        const inputEl = inputZoneRef.current;
        if (inputEl) inputEl.style.paddingBottom = '12px';
      } else {
        mainEl.style.height = '';
        mainEl.style.flex = '';
        const inputEl = inputZoneRef.current;
        if (inputEl) inputEl.style.paddingBottom = '';
        // Mettre à jour la hauteur de base quand le clavier se ferme
        baseHeightRef.current = window.innerHeight;
      }
    };

    // iOS natif — ignore les events avec height=0 (quirk iPad : double notification)
    const onNativeShow = (e) => {
      nativeKbActiveRef.current = true;
      window.scrollTo(0, 0);
      if (e.detail.height > 0) {
        applyKb(e.detail.height);
        setTimeout(() => {
          const scrollEl = scrollAreaRef.current;
          if (scrollEl) scrollEl.style.overflowY = '';
        }, 350);
      }
    };
    const onNativeHide = () => { nativeKbActiveRef.current = false; applyKb(0); };
    window.addEventListener('native-keyboard-show', onNativeShow);
    window.addEventListener('native-keyboard-hide', onNativeHide);

    // visualViewport : source principale sur Android/web UNIQUEMENT.
    // Sur iOS natif, on a les events native-keyboard-show/hide qui sont fiables.
    // Le visualViewport.resize y fire 5-10 fois pendant l'animation du clavier
    // avec des valeurs instables → on le coupe entièrement quand le natif gère.
    const vv = window.visualViewport;
    const onVvResize = vv ? () => {
      // Skip si iOS natif gère déjà (évite les recalculs parasites)
      if (nativeKbActiveRef.current) return;
      const kbHeight = window.innerHeight - vv.height;
      if (kbHeight > 0) applyKb(kbHeight);
      else applyKb(0);
    } : null;
    if (vv && onVvResize) vv.addEventListener('resize', onVvResize);

    return () => {
      window.removeEventListener('native-keyboard-show', onNativeShow);
      window.removeEventListener('native-keyboard-hide', onNativeHide);
      if (vv && onVvResize) vv.removeEventListener('resize', onVvResize);
    };
  }, []);

  // ─── Anti-cheat / mode alternatif ────────────────────────────────────────
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

  // ─── Midnight guard : sync refs + timer ──────────────────────────────────
  useEffect(() => { guessesRef.current = guesses; }, [guesses]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    if (!serverDate) return;
    previousDateRef.current = serverDate;

    // Calculer les ms jusqu'à minuit Paris
    const nowParis = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const midnightParis = new Date(nowParis);
    midnightParis.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnightParis.getTime() - nowParis.getTime();

    if (msUntilMidnight < 1000 || msUntilMidnight > 86400000) return;

    const timer = setTimeout(() => {
      // Sauvegarder la progression en cours avant le switch
      if (guessesRef.current.length > 0 && !gameOverRef.current) {
        saveProgress(guessesRef.current, guessesRef.current.length);
      }
      setShowMidnightModal(true);
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverDate]);

  const handleMidnightReset = useCallback(() => {
    const freshDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

    setGuesses([]);
    setInput('');
    setGameOver(false);
    setShowResult(false);
    setShowTransition(false);
    setFinalScore(0);
    setError('');
    setActiveTab('game');
    setTargetWord(null);
    setShowScoreUpdateModal(false);
    setShowSuspiciousModal(false);
    setSuspiciousCompleteParams(null);
    setAltMode(false);
    setAltToken(null);
    setAltGuesses([]);
    setAltGameOver(false);
    setAltFinalScore(0);
    setAltShowResult(false);
    setUnranked(false);
    setFlashEntry(null);
    startTimeRef.current = null;
    freshCompletionRef.current = false;
    altStartTimeRef.current = null;

    setServerDate(freshDate);
    setShowMidnightModal(false);
  }, []);

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

  // One-time score update modal
  useEffect(() => {
    if (!loaded) return;
    const seen = localStorage.getItem('lq_sem_score_v2_seen');
    if (!seen) setShowScoreUpdateModal(true);
  }, [loaded]);

  // Restaurer l'état depuis localStorage
  useEffect(() => {
    if (!loaded) return;
    if (todayState === 'inprogress' && progress?.guesses?.length > 0) {
      setGuesses(progress.guesses);
      startTimeRef.current = startTimeRef.current || Date.now();
      // Restaurer le mode alternatif si une session alt était en cours
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
          // Résultat suspect sans session alt en cours → re-montrer la modal
          const gameScore = computeFinalScore(1);
          setSuspiciousCompleteParams({ solved: true, attempts: 1, timeMs: 0, score: gameScore });
          setGameOver(true);
          setGuesses([]); // masquer le guess suspect
          setTimeout(() => setShowSuspiciousModal(true), 500);
        }
      }
    } else if (todayState === 'completed') {
      if (progress?.guesses) setGuesses(progress.guesses);
      setFinalScore(progress?.score || 0);
      setGameOver(true);
      // Restaurer le mot cible si sauvegardé
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

  // Scoring on-demand via VPS
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || gameOver || !todayDate || isSubmitting) return;

    const raw = input.trim().toLowerCase();
    const normalized = stripAccents(raw);

    // Vérifier doublon → flash l'entrée existante (comparaison exacte, accents préservés)
    const existing = guesses.find(g => g.word === raw);
    if (existing) {
      setFlashEntry(existing);
      setTimeout(() => setFlashEntry(null), 1800);
      setInput('');
      return;
    }

    setIsSubmitting(true);
    setInput('');

    try {
      const res = await fetch(`/api/daily/semantic-score?date=${todayDate}&word=${encodeURIComponent(raw)}`);

      if (res.status === 404) {
        setError('Mot non reconnu');
        setTimeout(() => setError(''), 2000);
        setIsSubmitting(false);
        return;
      }
      if (res.status === 422) {
        setError('Essaie au singulier');
        setTimeout(() => setError(''), 2500);
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError('Erreur serveur');
        setTimeout(() => setError(''), 2000);
        setIsSubmitting(false);
        return;
      }

      const { rank, similarity, solved } = await res.json();
      const score = similarity ?? (rank != null ? rank / 1000 : 0);
      const newAttemptIndex = guesses.length + 1;
      const entry = { word: raw, score, rank, attemptIndex: newAttemptIndex };
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

        const suspicious = newGuesses.length === 1;

        if (suspicious) {
          setSuspiciousCompleteParams({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
          setTimeout(() => setShowSuspiciousModal(true), 800);
        } else {
          completeGame({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
          freshCompletionRef.current = true;
          setTimeout(() => setShowResult(true), 800);
        }
      }
    } catch {
      setError('Connexion impossible');
      setTimeout(() => setError(''), 2000);
    }

    setIsSubmitting(false);
    inputRef.current?.focus();
  }, [input, gameOver, guesses, todayDate, isSubmitting, saveProgress, completeGame]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') altMode ? handleAltSubmit() : handleSubmit(); };

  // ─── Handlers mode alternatif ─────────────────────────────────────────────

  const handlePlayAlternative = useCallback(async () => {
    setIsLoadingAlt(true);
    try {
      const uid = auth.currentUser?.uid;
      const res = await fetch(`/api/daily/semantic-alternative?date=${todayDate}${uid ? `&uid=${uid}` : ''}`);
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
    const existing = altGuesses.find(g => g.word === raw);
    if (existing) {
      setFlashEntry(existing);
      setTimeout(() => setFlashEntry(null), 1800);
      setInput('');
      return;
    }

    setIsSubmitting(true);
    setInput('');

    try {
      const res = await fetch('/api/daily/semantic-alternative-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayDate, word: raw, token: altToken }),
      });

      if (res.status === 404) {
        setError('Mot non reconnu');
        setTimeout(() => setError(''), 2000);
        setIsSubmitting(false);
        return;
      }
      if (res.status === 422) {
        setError('Essaie au singulier');
        setTimeout(() => setError(''), 2500);
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError('Erreur serveur');
        setTimeout(() => setError(''), 2000);
        setIsSubmitting(false);
        return;
      }

      const { rank, similarity, solved } = await res.json();
      const score = similarity ?? (rank != null ? rank / 1000 : 0);
      const newAttemptIndex = altGuesses.length + 1;
      const entry = { word: raw, score, rank, attemptIndex: newAttemptIndex };
      const newGuesses = [...altGuesses, entry];

      setAltGuesses(newGuesses);
      setError('');
      saveProgress(guesses, newGuesses.length);

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
    } catch {
      setError('Connexion impossible');
      setTimeout(() => setError(''), 2000);
    }

    setIsSubmitting(false);
    inputRef.current?.focus();
  }, [input, altGameOver, altGuesses, todayDate, isSubmitting, altToken, writeLeaderboard, suspiciousCompleteParams, completeGame, saveProgress, guesses]);


  if (!serverDate || !loaded) {
    return (
      <div className="semantic-page">
        <div className="wordle-loading">
          <div className="sem-spinner" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="semantic-page">
      {/* Header */}
      <header className="wordle-header">
        <button className="wordle-back-btn" onClick={() => router.push('/home')}>
          <ArrowLeft size={20} weight="fill" />
        </button>
        <h1 className="semantic-title">Sémantique</h1>
        <div className="wordle-header-actions">
          <button className="sem-help-btn" onClick={() => setShowStats(true)} title="Statistiques">
            <ChartBar size={18} weight="fill" />
          </button>
          <button className="sem-help-btn" onClick={openHowToPlay} title="Comment jouer">
            <Question size={18} weight="fill" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sem-tabs">
        <button className={`sem-tab ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
          <Lightbulb size={14} weight="fill" /> Jeu
        </button>
        <button className={`sem-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={14} weight="fill" /> Classement
        </button>
      </div>

      {/* Modal minuit — changement de mot */}
      <MidnightModal
        isOpen={showMidnightModal}
        previousDate={previousDateRef.current}
        newDate={new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })}
        onPlayNewWord={handleMidnightReset}
      />

      {/* Modal nouveau système de points (one-time) */}
      <ScoreUpdateModal
        isOpen={showScoreUpdateModal}
        onClose={() => {
          localStorage.setItem('lq_sem_score_v2_seen', '1');
          setShowScoreUpdateModal(false);
        }}
      />

      {/* Modal anti-triche */}
      <SuspiciousResultModal
        isOpen={showSuspiciousModal}
        onAccept={() => {
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
        }}
        onPlayAlternative={handlePlayAlternative}
        isWatchingAd={isLoadingAlt}
      />

      {/* Modals */}
      <SemanticStatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} streak={streak} />

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <LeaderboardErrorBoundary>
          <SemanticLeaderboard todayDate={todayDate} />
        </LeaderboardErrorBoundary>
      )}

      {/* Game tab */}
      {activeTab === 'game' && (
        <>
        <main className="semantic-main" ref={semanticMainRef}>
          {/* Zone scrollable : date + résultat + guesses */}
          <div className="semantic-scroll-area" ref={scrollAreaRef}>
            <p className="semantic-game-date">
              {new Date(todayDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {/* Result banner */}
            <AnimatePresence>
              {(altMode ? altShowResult : showResult) && (
                <SemanticResultBanner
                  attempts={altMode ? altGuesses.length : guesses.length}
                  score={altMode ? altFinalScore : finalScore}
                  stats={stats}
                  streak={streak}
                  targetWord={targetWord}
                  onShowStats={() => setShowStats(true)}
                  onShowLeaderboard={handleShowLeaderboard}
                  unranked={!altMode && unranked}
                />
              )}
            </AnimatePresence>

            {/* Empty hint */}
            {guesses.length === 0 && !showResult && (
              <div className="semantic-empty-hint">
                <span>🧠</span>
                <p>Quel est le mot du jour ?</p>
              </div>
            )}

            {/* Table des guesses */}
            {(altMode ? altGuesses : guesses).length > 0 && (
              <div className="semantic-table-wrap">
                <div className="semantic-table-header">
                  <span className="semantic-col-num">N°</span>
                  <span className="semantic-col-word">Mot</span>
                  <span className="semantic-col-temp">°C 🌡️</span>
                  <span className="semantic-col-emoji" />
                  <span className="semantic-col-prog">‰o Progression</span>
                </div>
                {(() => {
                  const activeGuesses = altMode ? altGuesses : guesses;
                  const latest = activeGuesses.length > 0 ? activeGuesses[activeGuesses.length - 1] : null;
                  const previous = activeGuesses.length > 1 ? [...activeGuesses.slice(0, -1)].sort((a, b) => b.score - a.score) : [];
                  return (
                    <>
                      {(flashEntry || latest) && (
                        <div className="semantic-latest-wrap">
                          <GuessRow entry={flashEntry ?? latest} isLatestRow flash={!!flashEntry} />
                        </div>
                      )}
                      {previous.length > 0 && <div className="semantic-list-divider" />}
                      <div className="semantic-guesses">
                        {previous.map((entry) => (
                          <GuessRow key={`${entry.word}-${entry.attemptIndex}`} entry={entry} />
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Input zone — dans semantic-main, dernier enfant flex.
              applyKb réduit la hauteur de main → layout naturel sans position:fixed. */}
          {!(altMode ? altShowResult : showResult) && (
            <div ref={inputZoneRef} className="semantic-input-zone">
              <AnimatePresence>
                {error && (
                  <motion.div className="semantic-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="semantic-input-bar">
                <TextT className="semantic-input-icon" size={18} weight="fill" />
                <input
                  ref={inputRef}
                  className="semantic-input"
                  type="text"
                  placeholder="Entrez un mot…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    // Garde la liste en haut (empêche iOS de scroller semantic-scroll-area)
                    const scrollEl = scrollAreaRef.current;
                    if (!scrollEl) return;
                    scrollEl.style.overflowY = 'hidden';
                    scrollEl.scrollTop = 0;
                    // Filet de sécurité : poll visualViewport au cas où native-keyboard-show
                    // a renvoyé height=0 (bug iPad double-notification keyboardWillShow)
                    const vv = window.visualViewport;
                    if (vv) {
                      [150, 300, 500].forEach(delay => {
                        setTimeout(() => {
                          const kbHeight = window.innerHeight - vv.height;
                          const mainEl = semanticMainRef.current;
                          if (!mainEl || kbHeight <= 50) return;
                          const topOffset = mainEl.getBoundingClientRect().top;
                          const expectedH = window.innerHeight - kbHeight - topOffset;
                          const currentH = mainEl.style.height ? parseFloat(mainEl.style.height) : 0;
                          if (!currentH || currentH > expectedH + 10) {
                            mainEl.style.height = `${expectedH}px`;
                            mainEl.style.flex = 'none';
                          }
                        }, delay);
                      });
                    }
                  }}
                  onBlur={() => {
                    const scrollEl = scrollAreaRef.current;
                    if (scrollEl) scrollEl.style.overflowY = '';
                  }}
                  disabled={altMode ? altGameOver : gameOver}
                  autoComplete="off"
                />
                <button
                  className="semantic-submit-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={altMode ? handleAltSubmit : handleSubmit}
                  disabled={!input.trim() || (altMode ? altGameOver : gameOver) || isSubmitting}
                >
                  <PaperPlaneTilt size={15} weight="fill" /> Valider
                </button>
              </div>
            </div>
          )}
        </main>
        </>
      )}

      <AnimatePresence>
        {showTransition && (
          <GameEndTransition
            variant="semantique"
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
