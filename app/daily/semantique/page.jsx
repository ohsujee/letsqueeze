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
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';
import ScoreUpdateModal from '@/components/ui/ScoreUpdateModal';

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
  return Math.max(100, Math.round(5000 / (1 + 0.05 * (attempts - 1))));
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

function getDateForOffset(todayStr, offset) {
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function getDayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getWeekDatesForOffset(todayStr, offset) {
  const today = new Date(todayStr + 'T12:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (offset < 0 || d <= today) dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function getWeekLabel(todayStr, offset) {
  const today = new Date(todayStr + 'T12:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
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
function WeekProgressBar({ todayDate, weekOffset = 0 }) {
  const allDates = getFullWeekDates(todayDate);
  const isPastWeek = weekOffset < 0;
  const todayIdx = isPastWeek ? 6 : allDates.indexOf(todayDate);
  const scaleX = todayIdx > 0 ? todayIdx / 6 : 0;

  return (
    <div className="week-bar">
      <div className="week-bar-pips">
        <div className="week-bar-line-bg" />
        {todayIdx > 0 && (
          <motion.div
            className="week-bar-line-filled sem"
            initial={{ scaleX: 0 }}
            animate={{ scaleX }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          />
        )}
        {allDates.map((date, i) => {
          const state = isPastWeek ? 'past' : (date < todayDate ? 'past' : date === todayDate ? 'today' : 'future');
          return (
            <div key={date} className="week-bar-cell">
              <motion.div
                className={`week-bar-pip ${state} sem`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: 'easeOut' }}
              />
            </div>
          );
        })}
      </div>
      <div className="week-bar-lbls">
        {allDates.map((date, i) => {
          const state = isPastWeek ? 'past' : (date < todayDate ? 'past' : date === todayDate ? 'today' : 'future');
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
      layout
      className={`sem-lb-row ${rowClass}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animDelay, duration: 0.22, layout: { duration: 0.25, ease: 'easeOut' } }}
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
  const [todayLoading, setTodayLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);
  const [dayDirection, setDayDirection] = useState(0);
  const [dayCache, setDayCache] = useState({});
  const [dayLoading, setDayLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDirection, setWeekDirection] = useState(0);
  const [weekCache, setWeekCache] = useState({});
  const [weekLoading, setWeekLoading] = useState(false);
  const [myUid, setMyUid] = useState(null);

  const dayEntries = dayOffset === 0 ? todayEntries : (dayCache[dayOffset] || []);
  const dayAlreadyFetched = dayOffset === 0 || dayOffset in dayCache;
  const weekEntries = weekCache[weekOffset] || [];
  const weekAlreadyFetched = weekOffset in weekCache;
  const [yesterdayWord, setYesterdayWord] = useState(null);

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
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        setTodayEntries(raw);
        setTodayLoading(false);
        resolveNames(raw).then(setTodayEntries).catch(() => {});
      },
      (err) => { console.warn('[SemLB today]', err.message); setTodayLoading(false); }
    );
    return () => unsub();
  }, [todayDate]);

  // Jour passé — fetch one-shot, mis en cache par offset
  useEffect(() => {
    if (lbTab !== 'today' || dayOffset === 0 || dayAlreadyFetched || !todayDate) return;
    async function fetchDay() {
      setDayLoading(true);
      try {
        const date = getDateForOffset(todayDate, dayOffset);
        const snap = await get(ref(db, `daily/semantic/${date}/leaderboard`));
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        setDayCache(prev => ({ ...prev, [dayOffset]: raw }));
        resolveNames(raw)
          .then(resolved => setDayCache(prev => ({ ...prev, [dayOffset]: resolved })))
          .catch(() => {});
      } catch (e) {
        console.warn('[SemLB day]', e.message);
        setDayCache(prev => ({ ...prev, [dayOffset]: [] }));
      }
      setDayLoading(false);
    }
    fetchDay();
  }, [lbTab, todayDate, dayOffset, dayAlreadyFetched]);

  useEffect(() => {
    if (lbTab !== 'week' || weekAlreadyFetched || !todayDate) return;
    async function fetchWeek() {
      setWeekLoading(true);
      try {
        const dates = getWeekDatesForOffset(todayDate, weekOffset);
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
        setWeekCache(prev => ({ ...prev, [weekOffset]: resolved }));
      } catch (e) {
        console.warn('[SemLB week]', e.message);
        setWeekCache(prev => ({ ...prev, [weekOffset]: [] }));
      }
      setWeekLoading(false);
    }
    fetchWeek();
  }, [lbTab, todayDate, weekOffset, weekAlreadyFetched]);

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

      {/* Contenu aujourd'hui */}
      {lbTab === 'today' && (
        <>
          {todayDate && (
            <div className="lb-week-nav">
              <button
                className="lb-week-nav-btn"
                onClick={() => { setDayDirection(-1); setDayOffset(o => o - 1); }}
                disabled={dayOffset <= -7}
              >‹</button>
              <span className="lb-week-nav-label">
                {dayOffset === 0 ? 'Aujourd\'hui' : getDayLabel(getDateForOffset(todayDate, dayOffset))}
              </span>
              <button
                className="lb-week-nav-btn"
                onClick={() => { setDayDirection(1); setDayOffset(o => o + 1); }}
                disabled={dayOffset >= 0}
              >›</button>
            </div>
          )}
          <AnimatePresence mode="wait" custom={dayDirection}>
            <motion.div
              key={dayOffset}
              custom={dayDirection}
              variants={{
                enter: (dir) => ({ x: dir * 50, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir) => ({ x: dir * -50, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {(dayOffset === 0 ? todayLoading : dayLoading) ? (
                <div className="wordle-lb-loading">
                  <div className="sem-spinner" />
                  <p>Chargement…</p>
                </div>
              ) : (
                <LbRows
                  entries={dayEntries}
                  myUid={myUid}
                  subLabel={(e) => `${e.attempts} essai${e.attempts > 1 ? 's' : ''}`}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Contenu semaine avec animation directionnelle */}
      {lbTab === 'week' && (
        <>
          {/* Navigation semaine */}
          {todayDate && (
            <div className="lb-week-nav">
              <button
                className="lb-week-nav-btn"
                onClick={() => { setWeekDirection(-1); setWeekOffset(o => o - 1); }}
                disabled={weekOffset <= -4}
              >‹</button>
              <span className="lb-week-nav-label">
                {weekOffset === 0 ? 'Cette semaine' : getWeekLabel(todayDate, weekOffset)}
              </span>
              <button
                className="lb-week-nav-btn"
                onClick={() => { setWeekDirection(1); setWeekOffset(o => o + 1); }}
                disabled={weekOffset >= 0}
              >›</button>
            </div>
          )}

          {/* Frise — remonte fraîchement à chaque semaine */}
          {todayDate && (
            <AnimatePresence mode="wait">
              <motion.div
                key={weekOffset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <WeekProgressBar todayDate={todayDate} weekOffset={weekOffset} />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Classement avec slide directionnel */}
          <AnimatePresence mode="wait" custom={weekDirection}>
            <motion.div
              key={weekOffset}
              custom={weekDirection}
              variants={{
                enter: (dir) => ({ x: dir * 50, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir) => ({ x: dir * -50, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {weekLoading ? (
                <div className="wordle-lb-loading">
                  <div className="sem-spinner" />
                  <p>Chargement…</p>
                </div>
              ) : (
                <LbRows
                  entries={weekEntries}
                  myUid={myUid}
                  subLabel={(e) => `${e.days} jour${e.days > 1 ? 's' : ''} joué${e.days > 1 ? 's' : ''}`}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
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
function SemanticResultBanner({ attempts, score, stats, streak, targetWord, onShowStats, onShowLeaderboard, unranked = false }) {
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
        {unranked ? (
          <div className="sres-score" style={{ textAlign: 'right' }}>
            <span className="sres-score-val" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Non classé</span>
          </div>
        ) : (
          <div className="sres-score">
            <span className="sres-score-val">{score.toLocaleString('fr-FR')}</span>
            <span className="sres-score-lbl">pts</span>
          </div>
        )}
      </div>

      {unranked && (
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
          Tu n&apos;es pas dans le classement pour cette partie.
        </p>
      )}

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
        <button className="sres-btn primary" onClick={onShowLeaderboard} disabled={unranked} style={unranked ? { opacity: 0.4, cursor: 'default' } : {}}>
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

  const { todayState, todayDate, streak, stats, progress, startGame, saveProgress, completeGame, writeLeaderboard, loaded } =
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
  const nativeKbActiveRef = useRef(false); // true quand iOS natif gère le clavier

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

  // Positionnement de l'input zone au-dessus du clavier.
  //
  // iOS natif (Capacitor) : ViewController.swift envoie 'native-keyboard-show/hide'
  //   via UIKeyboardWillShowNotification → hauteur finale exacte, avant animation.
  //   isScrollEnabled=false empêche le document de scroller → header toujours visible.
  //
  // Android / web : fallback visualViewport resize (Android redimensionne le WebView).
  useEffect(() => {
    const applyKb = (kb) => {
      const el = inputZoneRef.current;
      if (!el) return;
      el.style.bottom = `${Math.max(0, kb)}px`;
      el.style.transform = '';
    };

    // iOS natif
    const onNativeShow = (e) => { nativeKbActiveRef.current = true; applyKb(e.detail.height); };
    const onNativeHide = () => { nativeKbActiveRef.current = false; applyKb(0); };
    window.addEventListener('native-keyboard-show', onNativeShow);
    window.addEventListener('native-keyboard-hide', onNativeHide);

    // Fallback Android/web
    const vv = window.visualViewport;
    const onVvResize = vv ? () => {
      if (nativeKbActiveRef.current) return; // iOS natif a déjà la bonne valeur
      applyKb(window.innerHeight - vv.height);
    } : null;
    if (vv && onVvResize) vv.addEventListener('resize', onVvResize);

    return () => {
      window.removeEventListener('native-keyboard-show', onNativeShow);
      window.removeEventListener('native-keyboard-hide', onNativeHide);
      if (vv && onVvResize) vv.removeEventListener('resize', onVvResize);
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
        <main className="semantic-main">
          {/* Zone scrollable : date + résultat + guesses */}
          <div className="semantic-scroll-area" ref={scrollAreaRef} style={!showResult ? { paddingBottom: '80px' } : undefined}>
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

        </main>

          {/* Input zone — hors de semantic-main pour éviter que iOS scrolle la liste.
              position:fixed → la position visuelle est identique, mais iOS ne trouve
              plus semantic-scroll-area comme ancêtre scrollable. */}
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
