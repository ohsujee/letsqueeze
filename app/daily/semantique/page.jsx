'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, Trophy, BarChart2, HelpCircle, X, Send } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import HowToPlayModal from '@/components/ui/HowToPlayModal';

// ─── Système de température ───────────────────────────────────────────────────
function toCelsius(score) {
  if (score >= 1) return 100;
  return Math.round(score * 100 * 100) / 100;
}

function formatCelsius(score) {
  const deg = toCelsius(score);
  return deg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTemperature(score) {
  const deg = toCelsius(score);
  if (deg >= 100) return { emoji: '🎯', cls: 'trouve',  barCls: 'bar-trouve'  };
  if (deg >= 50)  return { emoji: '😱', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 40)  return { emoji: '🔥', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 20)  return { emoji: '😎', cls: 'chaud',   barCls: 'bar-chaud'   };
  if (deg >= 0)   return { emoji: '🥶', cls: 'froid',   barCls: 'bar-froid'   };
  return               { emoji: '🧊', cls: 'glacial', barCls: 'bar-glacial' };
}

function computeFinalScore(attempts) {
  return Math.max(100, Math.floor(5000 / attempts));
}

function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────
const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const RANK_CLASS = ['gold', 'silver', 'bronze'];
const SEM_BAR_COLOR = [
  'linear-gradient(90deg,#FFD700,#FFA500)',
  'linear-gradient(90deg,#C0C0C0,#A8A8A8)',
  'linear-gradient(90deg,#CD7F32,#B8860B)',
  'linear-gradient(90deg,#f97316,#ea580c)',
];

const DAY_LABELS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

function getWeekDates(todayStr) {
  const today = new Date(todayStr + 'T12:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (d <= today) dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getFullWeekDates(todayStr) {
  const today = new Date(todayStr + 'T12:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

// ─── Frise hebdomadaire ───────────────────────────────────────────────────────
function WeekProgressBar({ todayDate }) {
  const allDates = getFullWeekDates(todayDate);
  const todayIdx = allDates.indexOf(todayDate);
  const fillPct = (todayIdx / 7) * 100;

  return (
    <div className="week-bar">
      <div className="week-bar-pips">
        <div className="week-bar-line-bg" />
        {todayIdx > 0 && (
          <motion.div
            className="week-bar-line-filled sem"
            initial={{ width: '0%' }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.15 }}
          />
        )}
        {allDates.map((date, i) => {
          const state = date < todayDate ? 'past' : date === todayDate ? 'today' : 'future';
          return (
            <div key={date} className="week-bar-cell">
              <motion.div
                className={`week-bar-pip ${state} sem`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 18 }}
              />
            </div>
          );
        })}
      </div>
      <div className="week-bar-lbls">
        {allDates.map((date, i) => {
          const state = date < todayDate ? 'past' : date === todayDate ? 'today' : 'future';
          return <span key={date} className={`week-bar-lbl ${state} sem`}>{DAY_LABELS[i]}</span>;
        })}
      </div>
    </div>
  );
}

// ─── Single leaderboard row ───────────────────────────────────────────────────
function LbRow({ entry, rank, isMe, subLabel, maxScore, animDelay = 0 }) {
  const pct = Math.max(10, ((entry.score || 0) / maxScore) * 100);
  const rowClass = isMe ? 'me-sem' : (RANK_CLASS[rank - 1] || '');
  return (
    <motion.div
      className={`sem-lb-row ${rowClass}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animDelay, duration: 0.22 }}
    >
      <div className="wordle-lb-row-top">
        {rank <= 3
          ? <span className="wordle-lb-rank">{RANK_MEDAL[rank - 1]}</span>
          : <span className="wordle-lb-rank num">#{rank}</span>
        }
        <span className="wordle-lb-name">{entry.name}{isMe ? ' · moi' : ''}</span>
        <div className="wordle-lb-right">
          <span className="wordle-lb-score">{(entry.score || 0).toLocaleString('fr-FR')} pts</span>
          <span className="wordle-lb-attempts">{subLabel(entry)}</span>
        </div>
      </div>
      <div className="wordle-lb-bar-track">
        <motion.div
          className="wordle-lb-bar-fill"
          style={{ width: `${pct}%`, background: isMe ? '#f97316' : (SEM_BAR_COLOR[Math.min(rank - 1, 3)]) }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: animDelay + 0.08, duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

function LbRows({ entries, myUid, subLabel }) {
  const maxScore = Math.max(...entries.map((e) => e.score || 0), 1);
  const myEntry = myUid ? entries.find((e) => e.uid === myUid) : null;
  const myRank = myEntry ? entries.findIndex((e) => e.uid === myUid) + 1 : 0;
  const top100 = entries.slice(0, 100);

  if (entries.length === 0) {
    return (
      <div className="wordle-lb-empty">
        <span style={{ fontSize: '2rem' }}>🧠</span>
        <p>Personne encore — sois le premier !</p>
      </div>
    );
  }

  return (
    <>
      {myEntry && (
        <div className="wordle-lb-my-pin sem">
          <p className="sem-lb-my-pin-label">Ma position · #{myRank}</p>
          <LbRow entry={myEntry} rank={myRank} isMe={true} subLabel={subLabel} maxScore={maxScore} />
        </div>
      )}
      <p className="wordle-lb-count">{entries.length} joueur{entries.length > 1 ? 's' : ''}</p>
      <div className="wordle-lb-list">
        {top100.map((entry, idx) => (
          <LbRow
            key={entry.uid}
            entry={entry}
            rank={idx + 1}
            isMe={entry.uid === myUid}
            subLabel={subLabel}
            maxScore={maxScore}
            animDelay={idx * 0.03}
          />
        ))}
      </div>
    </>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function SemanticLeaderboard({ todayDate }) {
  const [lbTab, setLbTab] = useState('today');
  const [todayEntries, setTodayEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekFetched, setWeekFetched] = useState(false);
  const [myUid, setMyUid] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMyUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!todayDate) return;
    const unsub = onValue(
      ref(db, `daily/semantic/${todayDate}/leaderboard`),
      (snap) => {
        setTodayEntries(
          snap.exists()
            ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => (b.score || 0) - (a.score || 0))
            : []
        );
        setTodayLoading(false);
      },
      () => setTodayLoading(false)
    );
    return () => unsub();
  }, [todayDate]);

  useEffect(() => {
    if (lbTab !== 'week' || weekFetched || !todayDate) return;
    async function fetchWeek() {
      setWeekLoading(true);
      try {
        const dates = getWeekDates(todayDate);
        const snaps = await Promise.all(dates.map((d) => get(ref(db, `daily/semantic/${d}/leaderboard`))));
        const agg = {};
        snaps.forEach((snap) => {
          if (!snap.exists()) return;
          Object.entries(snap.val()).forEach(([uid, data]) => {
            if (!agg[uid]) agg[uid] = { uid, name: data.name, score: 0, days: 0 };
            agg[uid].score += data.score || 0;
            agg[uid].days += 1;
          });
        });
        setWeekEntries(Object.values(agg).sort((a, b) => b.score - a.score));
      } catch (e) {
        console.warn('[SemLB week]', e.message);
      }
      setWeekLoading(false);
      setWeekFetched(true);
    }
    fetchWeek();
  }, [lbTab, todayDate, weekFetched]);

  const isLoading = lbTab === 'today' ? todayLoading : weekLoading;
  const entries = lbTab === 'today' ? todayEntries : weekEntries;

  return (
    <div className="wordle-lb">
      <div className="sem-lb-tabs">
        <button className={`sem-lb-tab ${lbTab === 'today' ? 'active' : ''}`} onClick={() => setLbTab('today')}>
          Aujourd&apos;hui
        </button>
        <button className={`sem-lb-tab ${lbTab === 'week' ? 'active' : ''}`} onClick={() => setLbTab('week')}>
          Cette semaine
        </button>
      </div>

      {lbTab === 'week' && todayDate && <WeekProgressBar todayDate={todayDate} />}

      {isLoading ? (
        <div className="wordle-lb-loading">
          <div className="sem-spinner" />
          <p>Chargement…</p>
        </div>
      ) : (
        <LbRows
          entries={entries}
          myUid={myUid}
          subLabel={lbTab === 'today'
            ? (e) => `${e.attempts} essai${e.attempts > 1 ? 's' : ''}`
            : (e) => `${e.days} jour${e.days > 1 ? 's' : ''} joué${e.days > 1 ? 's' : ''}`
          }
        />
      )}
    </div>
  );
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
function SemanticStatsModal({ isOpen, onClose, stats, streak }) {
  if (!isOpen) return null;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="wordle-stats-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="wordle-stats-modal"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wsm-header">
              <h3 className="wsm-title" style={{ color: '#f97316' }}>Mes statistiques</h3>
              <button className="wsm-close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="wsm-stats-row">
              <div className="wsm-stat"><span className="wsm-stat-val">{stats.played}</span><span className="wsm-stat-lbl">Parties</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{winPct}%</span><span className="wsm-stat-lbl">Victoires</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{streak.count}</span><span className="wsm-stat-lbl">{streak.count > 1 ? 'Jours 🔥' : 'Jour 🔥'}</span></div>
            </div>
            <p className="wsm-dist-title" style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              Jouez chaque jour pour maintenir votre série !
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Result Banner ────────────────────────────────────────────────────────────
function SemanticResultBanner({ attempts, score, stats, streak, targetWord, onShowStats, onShowLeaderboard }) {
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);

  return (
    <motion.div
      className="sres-banner"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sres-glow" />

      <div className="sres-hero">
        <div className="sres-hero-left">
          <span className="sres-emoji">🎯</span>
          <div>
            <p className="sres-verdict">Trouvé !</p>
            <p className="sres-sub">
              Le mot était <strong>{targetWord?.toUpperCase()}</strong> · {attempts} essai{attempts > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="sres-score">
          <span className="sres-score-val">{score.toLocaleString('fr-FR')}</span>
          <span className="sres-score-lbl">pts</span>
        </div>
      </div>

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

      <div className="wres-actions">
        <button className="sres-btn secondary" onClick={onShowStats}>
          <BarChart2 size={15} /> Statistiques
        </button>
        <button className="sres-btn primary" onClick={onShowLeaderboard}>
          <Trophy size={15} /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── GuessRow ─────────────────────────────────────────────────────────────────
function GuessRow({ entry, isLatestRow = false }) {
  const { emoji, cls, barCls } = getTemperature(entry.score);
  const inTop1000 = entry.rank > 0 && entry.rank <= 1000;
  const progressPercent = inTop1000 ? Math.round((entry.rank / 1000) * 100) : 0;

  return (
    <motion.div
      className={`semantic-guess-row ${entry.score >= 1 ? 'winner' : ''} ${isLatestRow ? 'latest-row' : ''}`}
      initial={isLatestRow ? { opacity: 0, y: -6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <span className="semantic-guess-num">{entry.attemptIndex}</span>
      <span className="semantic-guess-word">{entry.word}</span>
      <span className={`semantic-guess-temp temp-${cls}`}>{formatCelsius(entry.score)}°</span>
      <span className="semantic-guess-emoji">{emoji}</span>
      {inTop1000 ? (
        <div className="semantic-progression">
          <span className="semantic-prog-rank">{entry.rank}</span>
          <div className="semantic-prog-bar-track">
            <div className={`semantic-prog-bar-fill ${barCls}`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : (
        <div className="semantic-progression" />
      )}
    </motion.div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SemantiquePage() {
  const router = useRouter();
  const [serverDate, setServerDate] = useState(null);

  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, (snap) => {
      const offset = snap.val() ?? 0;
      const date = new Date(Date.now() + offset).toISOString().split('T')[0];
      setServerDate(date);
    }, () => setServerDate(new Date().toISOString().split('T')[0]));
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, loaded } =
    useDailyGame('semantique', { forceDate: serverDate });

  const [targetWord, setTargetWord] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);

  // Restaurer l'état depuis localStorage
  useEffect(() => {
    if (!loaded) return;
    if (todayState === 'inprogress' && progress?.guesses?.length > 0) {
      setGuesses(progress.guesses);
      startTimeRef.current = startTimeRef.current || Date.now();
    } else if (todayState === 'completed') {
      if (progress?.guesses) setGuesses(progress.guesses);
      setFinalScore(progress?.score || 0);
      setGameOver(true);
      setShowResult(true);
      // Restaurer le mot cible si sauvegardé
      const saved = typeof window !== 'undefined'
        ? localStorage.getItem(`lq_sem_target_${todayDate}`)
        : null;
      if (saved) setTargetWord(saved);
    } else if (todayState === 'unplayed') {
      startGame();
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState]);

  // Appel API pour chaque essai — le mot cible reste côté serveur
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || gameOver || isSubmitting || !todayDate) return;

    const raw = input.trim().toLowerCase();
    const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (guesses.some(g => g.word === raw || g.word === normalized)) {
      setError('Mot déjà essayé');
      setTimeout(() => setError(''), 1500);
      setInput('');
      return;
    }

    setIsSubmitting(true);
    setInput('');

    try {
      const res = await fetch('/api/daily/semantic-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayDate, guess: normalized }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }

      const { score, rank, solved, targetWord: tw } = await res.json();
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
        if (tw) {
          setTargetWord(tw);
          localStorage.setItem(`lq_sem_target_${todayDate}`, tw);
        }
        setGameOver(true);
        setTimeout(() => setShowResult(true), 800);
        completeGame({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
      }
    } catch (err) {
      console.error('[Sémantique]', err);
      setError(err.message || 'Service indisponible, réessayez');
      setTimeout(() => setError(''), 3000);
      // Remettre le mot dans l'input en cas d'erreur
      setInput(raw);
    } finally {
      setIsSubmitting(false);
    }
  }, [input, gameOver, isSubmitting, guesses, todayDate, saveProgress, completeGame]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const latestEntry = guesses.length > 0 ? guesses[guesses.length - 1] : null;
  const sortedPrevious = guesses.length > 1
    ? [...guesses.slice(0, -1)].sort((a, b) => b.score - a.score)
    : [];

  // Loading — on attend juste serverDate + useDailyGame (pas de fetch neighbors)
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
          <ArrowLeft size={20} />
        </button>
        <h1 className="semantic-title">Sémantique</h1>
        <div className="wordle-header-actions">
          <button className="sem-help-btn" onClick={() => setShowStats(true)} title="Statistiques">
            <BarChart2 size={18} />
          </button>
          <button className="sem-help-btn" onClick={() => setShowHelp(true)} title="Comment jouer">
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="sem-tabs">
        <button className={`sem-tab ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
          <Brain size={14} /> Jeu
        </button>
        <button className={`sem-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={14} /> Classement
        </button>
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHelp} onClose={() => setShowHelp(false)} gameType="semantique" />
      <SemanticStatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} streak={streak} />

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && <SemanticLeaderboard todayDate={todayDate} />}

      {/* Game tab */}
      {activeTab === 'game' && (
        <main className="semantic-main">
          {/* Zone scrollable : date + résultat + guesses */}
          <div className="semantic-scroll-area">
            <p className="semantic-game-date">
              {new Date(todayDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {/* Result banner */}
            <AnimatePresence>
              {showResult && (
                <SemanticResultBanner
                  attempts={guesses.length}
                  score={finalScore}
                  stats={stats}
                  streak={streak}
                  targetWord={targetWord}
                  onShowStats={() => setShowStats(true)}
                  onShowLeaderboard={() => setActiveTab('leaderboard')}
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
            {guesses.length > 0 && (
              <div className="semantic-table-wrap">
                <div className="semantic-table-header">
                  <span className="semantic-col-num">N°</span>
                  <span className="semantic-col-word">Mot</span>
                  <span className="semantic-col-temp">°C 🌡️</span>
                  <span className="semantic-col-emoji" />
                  <span className="semantic-col-prog">‰o Progression</span>
                </div>
                {latestEntry && (
                  <div className="semantic-latest-wrap">
                    <GuessRow entry={latestEntry} isLatestRow />
                  </div>
                )}
                {sortedPrevious.length > 0 && <div className="semantic-list-divider" />}
                <div className="semantic-guesses">
                  {sortedPrevious.map((entry) => (
                    <GuessRow key={`${entry.word}-${entry.attemptIndex}`} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input zone — collée en bas */}
          {!showResult && (
            <div className="semantic-input-zone">
              <AnimatePresence>
                {error && (
                  <motion.div className="semantic-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className={`semantic-input-bar${isSubmitting ? ' submitting' : ''}`}>
                <Brain className="semantic-input-icon" size={18} />
                <input
                  ref={inputRef}
                  className="semantic-input"
                  type="text"
                  placeholder="Entrez un mot…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={gameOver || isSubmitting}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  className="semantic-submit-btn"
                  onClick={handleSubmit}
                  disabled={!input.trim() || gameOver || isSubmitting}
                >
                  {isSubmitting
                    ? <span className="sem-btn-spinner" />
                    : <><Send size={15} /> Valider</>
                  }
                </button>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
