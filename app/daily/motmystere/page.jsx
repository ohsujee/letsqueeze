'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Trophy, BarChart2, X, Grid3X3, Delete } from 'lucide-react';
import { ref, get, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';

// ─── Constants ──────────────────────────────────────────────────────────────
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const AZERTY_ROWS = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', '⌫'],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function computeFeedback(guess, target) {
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

function computeScore(attempts, timeMs) {
  return Math.floor((7 - attempts) * 1000 + Math.max(0, 300000 - timeMs) / 100);
}

// ─── WordleGrid ───────────────────────────────────────────────────────────────
function WordleGrid({ guesses, feedbacks, currentGuess, attempts, shake }) {
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
function WordleKeyboard({ letterStates, onKey, onSubmit }) {
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
                {key === '⌫' ? <Delete size={18} /> : key}
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
function WordleResultBanner({ solved, attempts, timeMs, score, targetWord, stats, streak, onShowStats, onShowLeaderboard }) {
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
                : <>Le mot : <strong>{targetWord?.toUpperCase()}</strong></>
              }
            </p>
          </div>
        </div>
        {solved && (
          <div className="wres-score">
            <span className="wres-score-val">{score.toLocaleString('fr-FR')}</span>
            <span className="wres-score-lbl">pts</span>
          </div>
        )}
      </div>

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
          <BarChart2 size={15} /> Statistiques
        </button>
        <button className="wres-btn primary" onClick={onShowLeaderboard}>
          <Trophy size={15} /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats Modal ──────────────────────────────────────────────────────────────
function WordleStatsModal({ isOpen, onClose, stats, streak, currentAttempts, solved }) {
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
              <button className="wsm-close" onClick={onClose}><X size={16} /></button>
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

// ─── Leaderboard helpers ──────────────────────────────────────────────────────
const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const RANK_CLASS = ['gold', 'silver', 'bronze'];
const BAR_COLOR = [
  'linear-gradient(90deg,#FFD700,#FFA500)',
  'linear-gradient(90deg,#C0C0C0,#A8A8A8)',
  'linear-gradient(90deg,#CD7F32,#B8860B)',
  'linear-gradient(90deg,#10b981,#059669)',
];

// Renvoie les jours de la semaine jusqu'à aujourd'hui (pour le fetch)
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

// Renvoie toujours les 7 jours Lun→Dim (pour la frise)
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
const DAY_LABELS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

// Géométrie : 7 colonnes égales, centre de la colonne i = (i + 0.5) / 7 × 100%
// Ligne bg : left = center(col 0) = 7.143%, right = 7.143%
// Ligne verte : left = 7.143%, width = todayIdx/7 × 100%

function WeekProgressBar({ todayDate }) {
  const allDates = getFullWeekDates(todayDate);
  const todayIdx = allDates.indexOf(todayDate);
  // width de la ligne verte = distance entre centre col 0 et centre col todayIdx
  const fillPct = (todayIdx / 7) * 100;

  return (
    <div className="week-bar">
      {/* Rangée des pips */}
      <div className="week-bar-pips">
        {/* Ligne de fond : centre col 0 → centre col 6 */}
        <div className="week-bar-line-bg" />
        {/* Ligne verte : centre col 0 → centre col aujourd'hui */}
        {todayIdx > 0 && (
          <motion.div
            className="week-bar-line-filled"
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
                className={`week-bar-pip ${state}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 18 }}
              />
            </div>
          );
        })}
      </div>
      {/* Rangée des labels — même grille, alignement garanti */}
      <div className="week-bar-lbls">
        {allDates.map((date, i) => {
          const state = date < todayDate ? 'past' : date === todayDate ? 'today' : 'future';
          return <span key={date} className={`week-bar-lbl ${state}`}>{DAY_LABELS[i]}</span>;
        })}
      </div>
    </div>
  );
}

// ─── Single leaderboard row ───────────────────────────────────────────────────
function LbRow({ entry, rank, isMe, subLabel, maxScore, animDelay = 0 }) {
  const pct = Math.max(10, ((entry.score || 0) / maxScore) * 100);
  const rowClass = isMe ? 'me' : (RANK_CLASS[rank - 1] || '');
  return (
    <motion.div
      className={`wordle-lb-row ${rowClass}`}
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
          style={{ width: `${pct}%`, background: isMe ? '#10b981' : (BAR_COLOR[Math.min(rank - 1, 3)]) }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: animDelay + 0.08, duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

// ─── Leaderboard rows (shared) ────────────────────────────────────────────────
function LbRows({ entries, myUid, subLabel }) {
  const maxScore = Math.max(...entries.map((e) => e.score || 0), 1);
  const myEntry = myUid ? entries.find((e) => e.uid === myUid) : null;
  const myRank = myEntry ? entries.findIndex((e) => e.uid === myUid) + 1 : 0;
  const top100 = entries.slice(0, 100);

  if (entries.length === 0) {
    return (
      <div className="wordle-lb-empty">
        <span style={{ fontSize: '2rem' }}>🏆</span>
        <p>Personne encore — sois le premier !</p>
      </div>
    );
  }

  return (
    <>
      {/* Ma position épinglée */}
      {myEntry && (
        <div className="wordle-lb-my-pin">
          <p className="wordle-lb-my-pin-label">Ma position · #{myRank}</p>
          <LbRow entry={myEntry} rank={myRank} isMe={true} subLabel={subLabel} maxScore={maxScore} />
        </div>
      )}

      {/* Nombre de joueurs */}
      <p className="wordle-lb-count">{entries.length} joueur{entries.length > 1 ? 's' : ''}</p>

      {/* Classement top 100 */}
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
function WordleLeaderboard({ todayDate }) {
  const [lbTab, setLbTab] = useState('today');
  const [todayEntries, setTodayEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekFetched, setWeekFetched] = useState(false);
  const [myUid, setMyUid] = useState(auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMyUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // Aujourd'hui — temps réel
  useEffect(() => {
    if (!todayDate) return;
    const unsub = onValue(
      ref(db, `daily/wordle/${todayDate}/leaderboard`),
      (snap) => {
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort((a, b) => (b.score || 0) - (a.score || 0))
          : [];
        // Résoudre les pseudos actuels puis mettre à jour
        resolveNames(raw).then(setTodayEntries).catch(() => setTodayEntries(raw));
        setTodayLoading(false);
      },
      (err) => { console.warn('[LB today]', err.message); setTodayLoading(false); }
    );
    return () => unsub();
  }, [todayDate]);

  // Cette semaine — fetch à la demande
  useEffect(() => {
    if (lbTab !== 'week' || weekFetched || !todayDate) return;
    async function fetchWeek() {
      setWeekLoading(true);
      try {
        const dates = getWeekDates(todayDate);
        const snaps = await Promise.all(dates.map((d) => get(ref(db, `daily/wordle/${d}/leaderboard`))));
        const agg = {};
        snaps.forEach((snap) => {
          if (!snap.exists()) return;
          Object.entries(snap.val()).forEach(([uid, data]) => {
            if (!agg[uid]) agg[uid] = { uid, name: data.name, score: 0, days: 0 };
            agg[uid].score += data.score || 0;
            agg[uid].days += 1;
          });
        });
        const sorted = Object.values(agg).sort((a, b) => b.score - a.score);
        const resolved = await resolveNames(sorted);
        setWeekEntries(resolved);
      } catch (e) {
        console.warn('[LB week]', e.message);
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
      {/* Sub-tabs */}
      <div className="wordle-lb-tabs">
        <button
          className={`wordle-lb-tab ${lbTab === 'today' ? 'active' : ''}`}
          onClick={() => setLbTab('today')}
        >
          Aujourd&apos;hui
        </button>
        <button
          className={`wordle-lb-tab ${lbTab === 'week' ? 'active' : ''}`}
          onClick={() => setLbTab('week')}
        >
          Cette semaine
        </button>
      </div>

      {/* Week progress frise */}
      {lbTab === 'week' && todayDate && (
        <WeekProgressBar todayDate={todayDate} />
      )}

      {isLoading ? (
        <div className="wordle-lb-loading">
          <div className="wordle-spinner" />
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

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, resetToday, loaded } =
    useDailyGame('motmystere', { forceDate: serverDate });

  const [targetWord, setTargetWord] = useState(null);
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
  const [wordError, setWordError] = useState('');
  const { openManually: openHowToPlay } = useHowToPlay();
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState('game');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(null);

  // Auto-effacement du toast d'erreur après 1.5s
  useEffect(() => {
    if (!wordError) return;
    const t = setTimeout(() => setWordError(''), 1500);
    return () => clearTimeout(t);
  }, [wordError]);

  // 1. Charger le mot du jour depuis Firebase
  useEffect(() => {
    async function fetchWord() {
      try {
        const snap = await get(ref(db, `daily/wordle/${todayDate}/word`));
        if (snap.exists()) {
          setTargetWord(snap.val().toLowerCase());
        } else {
          // Fallback: mot déterministe par date
          const words = ['chien', 'magie', 'brave', 'solde', 'fleur', 'monde', 'arbre', 'poule', 'table', 'noire'];
          const dayIndex = Math.floor(new Date(todayDate).getTime() / 86400000);
          setTargetWord(words[dayIndex % words.length]);
        }
      } catch (e) {
        console.warn('[MotMystere] Firebase error, using fallback word:', e);
        const words = ['chien', 'magie', 'brave', 'solde', 'fleur'];
        const dayIndex = Math.floor(new Date(todayDate).getTime() / 86400000);
        setTargetWord(words[dayIndex % words.length]);
      }
    }
    if (todayDate) fetchWord();
  }, [todayDate]);

  // 2. Charger la liste de mots valides
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
      // Invalider si le mot Firebase a changé depuis la dernière sauvegarde
      if (targetWord && progress.targetWord !== targetWord) {
        resetToday();
        return;
      }
      setGuesses(progress.guesses || []);
      setFeedbacks((progress.guesses || []).map((g) => computeFeedback(g, targetWord || '')));
      updateLetterStates((progress.guesses || []).map((g) => computeFeedback(g, targetWord || '')), progress.guesses || []);
    } else if (todayState === 'completed' && progress && targetWord) {
      // Invalider si le mot a changé (inclut les anciens états sans targetWord)
      if (progress.targetWord !== targetWord) {
        resetToday();
        return;
      }
      const savedGuesses = progress.guesses || [];
      if (savedGuesses.length > 0) {
        const restoredFeedbacks = savedGuesses.map((g) => computeFeedback(g, targetWord));
        setGuesses(savedGuesses);
        setFeedbacks(restoredFeedbacks);
        updateLetterStates(restoredFeedbacks, savedGuesses);
      }
      setScore(progress.score || 0);
      setElapsedMs(progress.timeMs || 0);
      setSolved(progress.solved ?? savedGuesses.length > 0);
      setShowResult(true);
      setGameOver(true);
    } else if (todayState === 'unplayed') {
      startGame(targetWord);
      startTimeRef.current = Date.now();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, todayState, targetWord]);

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
    (key) => {
      if (gameOver || !targetWord) return;

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

        const fb = computeFeedback(currentGuess, targetWord);
        const newGuesses = [...guesses, currentGuess];
        const newFeedbacks = [...feedbacks, fb];
        const newAttempts = newGuesses.length;

        setGuesses(newGuesses);
        setFeedbacks(newFeedbacks);
        setCurrentGuess('');
        setWordError('');
        updateLetterStates(newFeedbacks, newGuesses);

        // Save progress
        saveProgress(newGuesses, newAttempts);

        const isWin = normalize(currentGuess) === normalize(targetWord);
        const isLoss = !isWin && newAttempts >= MAX_ATTEMPTS;

        if (isWin || isLoss) {
          const timeMs = Date.now() - (startTimeRef.current || Date.now());
          const finalScore = isWin ? computeScore(newAttempts, timeMs) : 0;
          setScore(finalScore);
          setElapsedMs(timeMs);
          setSolved(isWin);
          setGameOver(true);

          setTimeout(() => setShowResult(true), isWin ? 1200 : 600);

          completeGame({
            solved: isWin,
            attempts: newAttempts,
            timeMs,
            score: finalScore,
          });
        }

        return;
      }

      // Regular letter
      if (/^[A-Za-zÀ-ÿ]$/.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => g + key.toUpperCase());
        setWordError('');
      }
    },
    [gameOver, targetWord, currentGuess, guesses, feedbacks, validWords, saveProgress, completeGame]
  );

  // Physical keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace') handleKey('BACKSPACE');
      else if (e.key === 'Enter') handleKey('ENTER');
      else handleKey(e.key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!serverDate || !loaded || !targetWord) {
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
          <ArrowLeft size={20} />
        </button>
        <h1 className="wordle-title">Mot Mystère</h1>
        <div className="wordle-header-actions">
          <button className="wordle-help-btn" onClick={() => setShowStats(true)} title="Statistiques">
            <BarChart2 size={18} />
          </button>
          <button className="wordle-help-btn" onClick={openHowToPlay} title="Comment jouer">
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Tabs — l'erreur s'overlay en absolu, les tabs gardent la hauteur */}
      <div className="wordle-tabs">
        <div className="wordle-tabs-content">
          <button className={`wordle-tab ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
            <Grid3X3 size={14} /> Jeu
          </button>
          <button className={`wordle-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            <Trophy size={14} /> Classement
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
        <WordleLeaderboard todayDate={todayDate} />
      )}

      {/* Game tab */}
      {activeTab === 'game' && <main className="wordle-main">
        <p className="wordle-game-date">
          {new Date(todayDate + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {/* Content area */}
        <div className="wordle-content">
          {/* Board area — size container pour les container queries */}
          <div className="wordle-board-area">
            <WordleGrid
              guesses={guesses}
              feedbacks={feedbacks}
              currentGuess={currentGuess}
              attempts={guesses.length}
              shake={shake}
            />
          </div>
        </div>

        {/* Keyboard - pinned at bottom while playing */}
        {!gameOver && (
          <WordleKeyboard letterStates={letterStates} onKey={handleKey} onSubmit={() => handleKey('ENTER')} />
        )}

        {/* Result banner - replaces keyboard slot after game */}
        <AnimatePresence>
          {showResult && (
            <WordleResultBanner
              solved={solved}
              attempts={guesses.length}
              timeMs={elapsedMs}
              score={score}
              targetWord={targetWord}
              stats={stats}
              streak={streak}
              onShowStats={() => setShowStats(true)}
              onShowLeaderboard={() => setActiveTab('leaderboard')}
            />
          )}
        </AnimatePresence>
      </main>}
    </div>
  );
}
