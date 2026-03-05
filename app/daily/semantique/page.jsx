'use client';

import { useState, useEffect, useCallback, useRef, Component } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, TextT, Trophy, ChartBar, Question, X, PaperPlaneTilt, Lightbulb } from '@phosphor-icons/react';
import { ref, get, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';

// ─── Normalisation accents (pour lookup Firebase) ────────────────────────────
function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Système de température ───────────────────────────────────────────────────
// score = rank/1000 (rank 1–1000, 1000 = mot cible)
// mots hors top 1000 → score = -0.05 (glacial)
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

// Sort 3 niveaux : score DESC → attempts ASC → timeMs ASC
function sortLeaderboard(a, b) {
  if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
  if ((a.attempts || 0) !== (b.attempts || 0)) return (a.attempts || 0) - (b.attempts || 0);
  return (a.timeMs || 0) - (b.timeMs || 0);
}

// Ranking olympique : même score + même attempts → même rang, le suivant saute
function assignRanks(entries) {
  const ranks = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) { ranks.push(1); continue; }
    const p = entries[i - 1], c = entries[i];
    if ((c.score || 0) === (p.score || 0) && (c.attempts || 0) === (p.attempts || 0))
      ranks.push(ranks[i - 1]);
    else
      ranks.push(i + 1);
  }
  return ranks;
}
const RANK_CLASS = ['gold', 'silver', 'bronze'];
const SEM_BAR_COLOR = [
  'linear-gradient(90deg,#FFD700,#FFA500)',
  'linear-gradient(90deg,#C0C0C0,#A8A8A8)',
  'linear-gradient(90deg,#CD7F32,#B8860B)',
  'linear-gradient(90deg,#f97316,#ea580c)',
];

// ─── Error Boundary pour le leaderboard ──────────────────────────────────────
class LeaderboardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="wordle-lb-empty">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p>Erreur de chargement du classement</p>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  if (!entries || entries.length === 0) {
    return (
      <div className="wordle-lb-empty">
        <span style={{ fontSize: '2rem' }}>🧠</span>
        <p>Personne encore — sois le premier !</p>
      </div>
    );
  }
  const maxScore = entries.reduce((max, e) => Math.max(max, e.score || 0), 1);
  const myEntry = myUid ? entries.find((e) => e.uid === myUid) : null;
  const ranks = assignRanks(entries);
  const myRank = myEntry ? ranks[entries.findIndex((e) => e.uid === myUid)] : 0;
  const top100 = entries.slice(0, 100);
  const top100Ranks = ranks.slice(0, 100);

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
            rank={top100Ranks[idx]}
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

// ─── Résolution des pseudos depuis Firebase profiles ─────────────────────────
async function resolveNames(entries) {
  if (!entries.length) return entries;
  const results = await Promise.all(
    entries.map(async (e) => {
      try {
        const snap = await get(ref(db, `users/${e.uid}/profile/pseudo`));
        const pseudo = snap.val();
        return pseudo ? { ...e, name: pseudo } : e;
      } catch {
        return e;
      }
    })
  );
  return results;
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
  const [yesterdayWord, setYesterdayWord] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMyUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!todayDate) return;
    const d = new Date(todayDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    const yesterday = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    fetch(`/api/daily/semantic-word?date=${yesterday}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.word) setYesterdayWord(data.word); })
      .catch(() => {});
  }, [todayDate]);

  useEffect(() => {
    if (!todayDate) return;
    const unsub = onValue(
      ref(db, `daily/semantic/${todayDate}/leaderboard`),
      (snap) => {
        try {
          const raw = snap.exists()
            ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
            : [];
          resolveNames(raw)
            .then(resolved => { if (mountedRef.current) setTodayEntries(resolved); })
            .catch(() => { if (mountedRef.current) setTodayEntries(raw); });
          if (mountedRef.current) setTodayLoading(false);
        } catch {
          if (mountedRef.current) setTodayLoading(false);
        }
      },
      () => { if (mountedRef.current) setTodayLoading(false); }
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
        const sorted = Object.values(agg).sort(sortLeaderboard);
        const resolved = await resolveNames(sorted);
        if (mountedRef.current) setWeekEntries(resolved);
      } catch (e) {
        console.warn('[SemLB week]', e.message);
      }
      if (mountedRef.current) {
        setWeekLoading(false);
        setWeekFetched(true);
      }
    }
    fetchWeek();
  }, [lbTab, todayDate, weekFetched]);

  const isLoading = lbTab === 'today' ? todayLoading : weekLoading;
  const entries = lbTab === 'today' ? todayEntries : weekEntries;

  return (
    <div className="wordle-lb">
      {yesterdayWord && (
        <div className="sem-yesterday-word">
          Le mot d&apos;hier était&nbsp;<strong>{yesterdayWord}</strong>
        </div>
      )}
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
              <button className="wsm-close" onClick={onClose}><X size={16} weight="fill" /></button>
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
          <ChartBar size={15} weight="fill" /> Statistiques
        </button>
        <button className="sres-btn primary" onClick={onShowLeaderboard}>
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── GuessRow ─────────────────────────────────────────────────────────────────
function GuessRow({ entry, isLatestRow = false, flash = false }) {
  const { emoji, cls, barCls } = getTemperature(entry.score);
  const inTop1000 = entry.rank != null && entry.rank > 0 && entry.rank <= 1000;
  const progressPercent = inTop1000 ? Math.round((entry.rank / 1000) * 100) : 0;
  const [animatedPercent, setAnimatedPercent] = useState(isLatestRow ? 0 : progressPercent);
  useEffect(() => {
    if (!isLatestRow) return;
    const t = setTimeout(() => setAnimatedPercent(progressPercent), 320);
    return () => clearTimeout(t);
  }, [isLatestRow, progressPercent]);

  return (
    <motion.div
      className={`semantic-guess-row ${entry.score >= 1 ? 'winner' : ''} ${isLatestRow ? 'latest-row' : ''} ${flash ? 'flash-duplicate' : ''}`}
      initial={isLatestRow ? { opacity: 0, y: -6 } : false}
      animate={flash ? { opacity: [1, 0.3, 1, 0.3, 1], transition: { duration: 0.6 } } : { opacity: 1, y: 0 }}
      transition={flash ? {} : { duration: 0.22 }}
    >
      <span className="semantic-guess-num">{entry.attemptIndex}</span>
      <span className="semantic-guess-word">{entry.word}</span>
      <span className={`semantic-guess-temp temp-${cls}`}>{formatCelsius(entry.score)}°</span>
      <span className="semantic-guess-emoji">{emoji}</span>
      {inTop1000 ? (
        <div className="semantic-progression">
          <span className="semantic-prog-rank">{entry.rank}</span>
          <div className="semantic-prog-bar-track">
            <div className={`semantic-prog-bar-fill ${barCls}${isLatestRow ? ' latest' : ''}`} style={{ width: `${animatedPercent}%` }} />
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
      const date = new Date(Date.now() + offset).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      setServerDate(date);
    }, () => setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })));
    return () => unsub();
  }, []);

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, loaded } =
    useDailyGame('semantique', { forceDate: serverDate });

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
  const startTimeRef = useRef(null);
  const freshCompletionRef = useRef(false);
  const transitionTimerRef = useRef(null);
  const inputZoneRef = useRef(null);
  const vvTimerRef = useRef(null);   // debounce vv.resize
  const focusTimerRef = useRef(null); // fallback après animation clavier

  // Positionner l'input zone au-dessus du clavier via visualViewport.
  // Problème : vv.resize fire parfois sur des valeurs intermédiaires de vv.height
  // (clavier en cours d'animation) → input zone mal positionnée.
  // Solution : debounce 80ms pour attendre que vv.height se stabilise.
  // vv.scroll en fallback pour les cas où vv.resize ne fire pas (iPad).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const applyPosition = () => {
      const el = inputZoneRef.current;
      if (!el) return;
      const kb = Math.max(0, window.innerHeight - vv.height);
      el.style.bottom = `${kb}px`;
      el.style.transform = '';
    };

    const debouncedApply = () => {
      clearTimeout(vvTimerRef.current);
      vvTimerRef.current = setTimeout(applyPosition, 80);
    };

    applyPosition(); // position initiale (clavier fermé, kb=0)
    vv.addEventListener('resize', debouncedApply); // clavier ouvre/ferme
    vv.addEventListener('scroll', debouncedApply); // fallback iOS pan

    return () => {
      clearTimeout(vvTimerRef.current);
      vv.removeEventListener('resize', debouncedApply);
      vv.removeEventListener('scroll', debouncedApply);
    };
  }, []);

  // Sécurité : restaurer body si le composant démonte clavier ouvert
  useEffect(() => {
    return () => {
      document.body.style.position = '';
      document.body.style.width = '';
      clearTimeout(focusTimerRef.current);
    };
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
        freshCompletionRef.current = true;
        setTimeout(() => setShowResult(true), 800);
        completeGame({ solved: true, attempts: newGuesses.length, timeMs, score: gameScore });
      }
    } catch {
      setError('Connexion impossible');
      setTimeout(() => setError(''), 2000);
    }

    setIsSubmitting(false);
    inputRef.current?.focus();
  }, [input, gameOver, guesses, todayDate, isSubmitting, saveProgress, completeGame]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const latestEntry = guesses.length > 0 ? guesses[guesses.length - 1] : null;
  const sortedPrevious = guesses.length > 1
    ? [...guesses.slice(0, -1)].sort((a, b) => b.score - a.score)
    : [];

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
        <main className="semantic-main">
          {/* Zone scrollable : date + résultat + guesses */}
          <div className="semantic-scroll-area" ref={scrollAreaRef} style={!showResult ? { paddingBottom: '80px' } : undefined}>
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
                  onShowLeaderboard={handleShowLeaderboard}
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
                {(flashEntry || latestEntry) && (
                  <div className="semantic-latest-wrap">
                    <GuessRow entry={flashEntry ?? latestEntry} isLatestRow flash={!!flashEntry} />
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

        </main>

          {/* Input zone — hors de semantic-main pour éviter que iOS scrolle la liste.
              position:fixed → la position visuelle est identique, mais iOS ne trouve
              plus semantic-scroll-area comme ancêtre scrollable. */}
          {!showResult && (
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
                  onTouchStart={() => {
                    // Verrouille body en position:fixed AVANT qu'iOS démarre son animation.
                    // Quand body est fixed, iOS peut changer le contentOffset de la WKScrollView
                    // mais le contenu ne bouge pas visuellement → header reste visible,
                    // pas de guerre window.scrollTo qui perturberait vv.resize.
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                    const scrollEl = scrollAreaRef.current;
                    if (!scrollEl) return;
                    scrollEl.style.overflowY = 'hidden';
                    scrollEl.scrollTop = 0;
                  }}
                  onFocus={() => {
                    // Backup si onTouchStart n'a pas fire (clavier externe, etc.)
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                    const scrollEl = scrollAreaRef.current;
                    if (scrollEl) {
                      scrollEl.style.overflowY = 'hidden';
                      scrollEl.scrollTop = 0;
                    }
                    // Fallback garanti : après l'animation clavier (~250ms iOS),
                    // on force la position correcte quelle que soit la valeur
                    // intermédiaire que vv.resize aurait pu fournir.
                    clearTimeout(focusTimerRef.current);
                    focusTimerRef.current = setTimeout(() => {
                      const vv = window.visualViewport;
                      const el = inputZoneRef.current;
                      if (!vv || !el) return;
                      const kb = Math.max(0, window.innerHeight - vv.height);
                      el.style.bottom = `${kb}px`;
                    }, 350);
                  }}
                  onBlur={() => {
                    document.body.style.position = '';
                    document.body.style.width = '';
                    if (window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
                    clearTimeout(focusTimerRef.current);
                    const scrollEl = scrollAreaRef.current;
                    if (scrollEl) scrollEl.style.overflowY = '';
                  }}
                  disabled={gameOver}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  className="semantic-submit-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSubmit}
                  disabled={!input.trim() || gameOver || isSubmitting}
                >
                  <PaperPlaneTilt size={15} weight="fill" /> Valider
                </button>
              </div>
            </div>
          )}
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
