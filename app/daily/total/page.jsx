'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, ChartBar, X, Timer, ArrowCounterClockwise, ArrowsClockwise, Calculator, Warning, HashStraight, PlusMinus, Hourglass, ArrowRight, Backspace, Question, GridNine } from '@phosphor-icons/react';
import { ref, onValue, get, set as fbSet } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';

// ─── Constants ──────────────────────────────────────────────────────────────
const TIMER_SECONDS = 180; // 3 minutes
const OPERATORS = ['+', '−', '×', '÷'];
const PUZZLE_START_DATE = '2026-04-01'; // First day of puzzles

// ─── Puzzle Loading ─────────────────────────────────────────────────────────
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

// ─── Expression Evaluator (left-to-right, like a basic calculator) ──────────
function evaluateTokens(tokens) {
  if (tokens.length === 0) return null;
  if (tokens.length === 1 && typeof tokens[0] === 'number') return tokens[0];
  if (tokens.length < 1) return null;

  // Evaluate up to the last number (ignore trailing operator)
  let result = tokens[0];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const b = tokens[i + 1];
    if (b === undefined) break; // trailing operator, stop here

    switch (op) {
      case '+': result = result + b; break;
      case '−': result = result - b; break;
      case '×': result = result * b; break;
      case '÷':
        if (b === 0) return null;
        result = result / b;
        break;
      default: return null;
    }
  }

  return Number.isFinite(result) ? result : null;
}

// ─── Scoring ────────────────────────────────────────────────────────────────
function computeScore(difference, timeMs) {
  const precision = Math.max(500, 5000 - Math.round(difference * 60));
  const timeBonus = Math.round(999 * Math.exp(-timeMs / 120000));
  return precision + timeBonus;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}

function formatResult(val) {
  if (val === null) return '—';
  if (Number.isInteger(val)) return val.toString();
  return Math.round(val * 100) / 100 + '';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Result Banner ──────────────────────────────────────────────────────────
function TotalResultBanner({ exact, difference, bestResult, target, timeMs, score, stats, streak, endReason, onShowStats, onShowLeaderboard }) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);

  const verdictMap = {
    exact: { icon: <Trophy size={28} weight="fill" color="#10b981" />, title: 'Compte exact !' },
    attempts: { icon: <HashStraight size={28} weight="fill" color="#f59e0b" />, title: 'Plus d\'essais !' },
    time: { icon: <Timer size={28} weight="fill" color="#ef4444" />, title: 'Temps écoulé !' },
    quit: { icon: <ArrowLeft size={28} weight="fill" color="#ef4444" />, title: 'Partie abandonnée' },
  };
  const verdict = verdictMap[endReason] || verdictMap.time;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(8,14,32,0.92)',
        border: `1px solid ${exact ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.12)'}`,
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}
    >
      {/* Verdict */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{verdict.icon}</div>
        <p style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.1rem', color: '#fff', margin: 0,
        }}>{verdict.title}</p>
        {exact ? (
          <p style={{
            fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', margin: '6px 0 0',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>En {timeStr}</p>
        ) : bestResult !== null ? (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8,
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 2,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>Résultat</span>
              <span style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem', color: '#fff',
              }}>{formatResult(bestResult)}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 2,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>Écart</span>
              <span style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem',
                color: difference <= 5 ? '#10b981' : difference <= 10 ? '#f59e0b' : '#ef4444',
              }}>±{formatResult(difference)}</span>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', margin: '6px 0 0',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>Aucune soumission</p>
        )}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.8rem', lineHeight: 1,
          color: '#3b82f6',
          textShadow: '0 0 20px rgba(59,130,246,0.5)',
        }}>{score.toLocaleString('fr-FR')}</span>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: 'rgba(59,130,246,0.6)',
          marginLeft: 6, textTransform: 'uppercase',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>pts</span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        width: '100%',
      }}>
        {[
          { value: stats.played, label: `partie${stats.played > 1 ? 's' : ''}` },
          { value: `${winPct}%`, label: 'exacts' },
          { value: `${streak.count}${flames}`, label: streak.count > 1 ? 'jours' : 'jour' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <span style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.1rem', color: '#fff', display: 'block',
            }}>{s.value}</span>
            <span style={{
              fontSize: '0.65rem', color: 'rgba(238,242,255,0.35)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div style={{ width: '60%', height: 1, background: 'rgba(238,242,255,0.06)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={onShowStats}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <ChartBar size={15} weight="fill" /> Stats
        </button>
        <button
          onClick={onShowLeaderboard}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#3b82f6', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stats Modal ────────────────────────────────────────────────────────────
function TotalStatsModal({ isOpen, onClose, stats, streak }) {
  if (!isOpen) return null;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

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
              <h3 className="wsm-title" style={{ color: '#3b82f6' }}>Mes statistiques</h3>
              <button className="wsm-close" onClick={onClose}><X size={16} weight="fill" /></button>
            </div>

            <div className="wsm-stats-row">
              <div className="wsm-stat"><span className="wsm-stat-val">{stats.played}</span><span className="wsm-stat-lbl">Parties</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{winPct}%</span><span className="wsm-stat-lbl">Exacts</span></div>
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

// ─── Leaderboard helpers ────────────────────────────────────────────────────
const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const RANK_CLASS = ['gold', 'silver', 'bronze'];
const BAR_COLOR = [
  'linear-gradient(90deg,#FFD700,#FFA500)',
  'linear-gradient(90deg,#C0C0C0,#A8A8A8)',
  'linear-gradient(90deg,#CD7F32,#B8860B)',
  'linear-gradient(90deg,#3b82f6,#2563eb)',
];

function sortLeaderboard(a, b) {
  if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
  return (a.timeMs || 0) - (b.timeMs || 0);
}

function assignRanks(entries) {
  const ranks = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) { ranks.push(1); continue; }
    const p = entries[i - 1], c = entries[i];
    if ((c.score || 0) === (p.score || 0)) ranks.push(ranks[i - 1]);
    else ranks.push(i + 1);
  }
  return ranks;
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

const DAY_LABELS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

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
            className="week-bar-line-filled total"
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
                className={`week-bar-pip ${state} total`}
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
          return <span key={date} className={`week-bar-lbl ${state} total`}>{DAY_LABELS[i]}</span>;
        })}
      </div>
    </div>
  );
}

function LbRow({ entry, rank, isMe, subLabel, maxScore, animDelay = 0 }) {
  const pct = Math.max(10, ((entry.score || 0) / maxScore) * 100);
  const rowClass = isMe ? 'me' : (RANK_CLASS[rank - 1] || '');
  return (
    <motion.div
      layout
      className={`wordle-lb-row ${rowClass}`}
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
          style={{ width: `${pct}%`, background: isMe ? '#3b82f6' : (BAR_COLOR[Math.min(rank - 1, 3)]) }}
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
  const ranks = assignRanks(entries);
  const myRank = myEntry ? ranks[entries.findIndex((e) => e.uid === myUid)] : 0;
  const top100 = entries.slice(0, 100);
  const top100Ranks = ranks.slice(0, 100);

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
      {myEntry && (
        <div className="wordle-lb-my-pin">
          <p className="wordle-lb-my-pin-label">Ma position · #{myRank}</p>
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

const TOTAL_SUB_LABEL = (e) => e.solved ? '🎯 Exact' : `Écart: ${e.difference ?? '?'}`;
const TOTAL_WEEK_SUB_LABEL = (e) => `${e.days} jour${e.days > 1 ? 's' : ''} joué${e.days > 1 ? 's' : ''}`;

// ─── Leaderboard ────────────────────────────────────────────────────────────
function TotalLeaderboard({ todayDate }) {
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
  const [myUid, setMyUid] = useState(auth.currentUser?.uid ?? null);

  const dayEntries = dayOffset === 0 ? todayEntries : (dayCache[dayOffset] || []);
  const dayAlreadyFetched = dayOffset === 0 || dayOffset in dayCache;
  const weekEntries = weekCache[weekOffset] || [];
  const weekAlreadyFetched = weekOffset in weekCache;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMyUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!todayDate) return;
    const unsub = onValue(
      ref(db, `daily/total/${todayDate}/leaderboard`),
      (snap) => {
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        setTodayEntries(raw);
        setTodayLoading(false);
        resolveNames(raw).then(setTodayEntries).catch(() => {});
      },
      (err) => { console.warn('[LB today]', err.message); setTodayLoading(false); }
    );
    return () => unsub();
  }, [todayDate]);

  useEffect(() => {
    if (lbTab !== 'today' || dayOffset === 0 || dayAlreadyFetched || !todayDate) return;
    async function fetchDay() {
      setDayLoading(true);
      try {
        const date = getDateForOffset(todayDate, dayOffset);
        const snap = await get(ref(db, `daily/total/${date}/leaderboard`));
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        setDayCache(prev => ({ ...prev, [dayOffset]: raw }));
        resolveNames(raw)
          .then(resolved => setDayCache(prev => ({ ...prev, [dayOffset]: resolved })))
          .catch(() => {});
      } catch (e) {
        console.warn('[LB day]', e.message);
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
        const snaps = await Promise.all(dates.map((d) => get(ref(db, `daily/total/${d}/leaderboard`))));
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
        console.warn('[LB week]', e.message);
        setWeekCache(prev => ({ ...prev, [weekOffset]: [] }));
      }
      setWeekLoading(false);
    }
    fetchWeek();
  }, [lbTab, todayDate, weekOffset, weekAlreadyFetched]);

  return (
    <div className="wordle-lb total-lb">
      <div className="wordle-lb-tabs">
        <button className={`wordle-lb-tab ${lbTab === 'today' ? 'active' : ''}`} onClick={() => setLbTab('today')}>
          Aujourd&apos;hui
        </button>
        <button className={`wordle-lb-tab ${lbTab === 'week' ? 'active' : ''}`} onClick={() => setLbTab('week')}>
          Cette semaine
        </button>
      </div>

      {lbTab === 'week' && todayDate && (
        <div className="lb-week-nav">
          <button className="lb-week-nav-btn" onClick={() => { setWeekDirection(-1); setWeekOffset(o => o - 1); }} disabled={weekOffset <= -4}>‹</button>
          <span className="lb-week-nav-label">{weekOffset === 0 ? 'Cette semaine' : getWeekLabel(todayDate, weekOffset)}</span>
          <button className="lb-week-nav-btn" onClick={() => { setWeekDirection(1); setWeekOffset(o => o + 1); }} disabled={weekOffset >= 0}>›</button>
        </div>
      )}

      {lbTab === 'today' && (
        <>
          {todayDate && (
            <div className="lb-week-nav">
              <button className="lb-week-nav-btn" onClick={() => { setDayDirection(-1); setDayOffset(o => o - 1); }} disabled={dayOffset <= -7}>‹</button>
              <span className="lb-week-nav-label">{dayOffset === 0 ? 'Aujourd\'hui' : getDayLabel(getDateForOffset(todayDate, dayOffset))}</span>
              <button className="lb-week-nav-btn" onClick={() => { setDayDirection(1); setDayOffset(o => o + 1); }} disabled={dayOffset >= 0}>›</button>
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
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {(dayOffset === 0 ? todayLoading : dayLoading) ? (
                <div className="wordle-lb-loading"><div className="total-spinner" /><p>Chargement…</p></div>
              ) : (
                <LbRows entries={dayEntries} myUid={myUid} subLabel={TOTAL_SUB_LABEL} />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {lbTab === 'week' && (
        <>
          {todayDate && (
            <AnimatePresence mode="wait">
              <motion.div key={weekOffset} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <WeekProgressBar todayDate={todayDate} weekOffset={weekOffset} />
              </motion.div>
            </AnimatePresence>
          )}
          <AnimatePresence mode="wait" custom={weekDirection}>
            <motion.div
              key={weekOffset}
              custom={weekDirection}
              variants={{
                enter: (dir) => ({ x: dir * 50, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir) => ({ x: dir * -50, opacity: 0 }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {weekLoading ? (
                <div className="wordle-lb-loading"><div className="total-spinner" /><p>Chargement…</p></div>
              ) : (
                <LbRows entries={weekEntries} myUid={myUid} subLabel={TOTAL_WEEK_SUB_LABEL} />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
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
  const MAX_SUBMISSIONS = 3;
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
      setSubmissions(data.submissions ?? []);
      // Calculate remaining time
      const elapsed = Math.floor((Date.now() - (data.startedAt || Date.now())) / 1000);
      const remaining = Math.max(0, TIMER_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeUp(data.bestResult, data.difference ?? Infinity, data.bestScore ?? 0);
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

  function handleTimeUp(finalBestResult, finalDiff, finalScore, reason = 'time') {
    clearInterval(timerRef.current);
    freshCompletionRef.current = true;
    setEndReason(reason);
    const timeMs = TIMER_SECONDS * 1000;
    const finalScoreVal = finalScore || 0;
    setScore(finalScoreVal);

    const isSolved = finalDiff === 0;
    completeGame({
      solved: isSolved,
      attempts: submissions.length,
      timeMs,
      score: finalScoreVal,
      skipLeaderboard: true,
    });

    // Write leaderboard with difference field
    writeTotalLeaderboard(finalScoreVal, submissions.length, isSolved, timeMs, finalDiff);

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
    }

    // Save progress (store custom data in guesses[0])
    saveProgress(
      [{ bestResult: newBestResult, difference: newBestDiff, bestScore: newBestScore, submissions: newSubmissions, startedAt: startTimeRef.current }],
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
      setScore(newBestScore);

      const isSolved = newBestDiff === 0;
      completeGame({
        solved: isSolved,
        attempts: newSubmissions.length,
        timeMs,
        score: newBestScore,
        skipLeaderboard: true,
      });
      writeTotalLeaderboard(newBestScore, newSubmissions.length, isSolved, timeMs, newBestDiff);
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

  // ─── Timer bar percentage ───────────────────────────────────────────────
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerUrgent = timeLeft <= 30;
  const timerCritical = timeLeft <= 10;

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
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '24px 20px', gap: '24px',
                }}
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
                  style={{
                    width: 72, height: 72, borderRadius: '20px',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 32px rgba(59,130,246,0.15)',
                  }}
                >
                  <Calculator size={36} weight="duotone" color="#3b82f6" />
                </motion.div>

                {/* Title */}
                <h2 style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '1.3rem', fontWeight: 400, color: '#fff', margin: 0,
                  textShadow: '0 0 20px rgba(59,130,246,0.6), 0 0 4px rgba(59,130,246,0.3)',
                  letterSpacing: '0.06em',
                }}>
                  Total du jour
                </h2>

                {/* Rules card */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  style={{
                    width: '100%', maxWidth: 340,
                    background: 'rgba(8,14,32,0.92)',
                    border: '1px solid rgba(59,130,246,0.12)',
                    borderRadius: '16px',
                    padding: '18px 20px',
                    boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '14px',
                  }}>
                    {/* Rule items */}
                    {[
                      { icon: <HashStraight size={18} weight="duotone" color="#3b82f6" />, text: 'Utilise les 6 chiffres' },
                      { icon: <PlusMinus size={18} weight="duotone" color="#3b82f6" />, text: '4 opérations : + − × ÷' },
                      { icon: <ArrowRight size={18} weight="duotone" color="#3b82f6" />, text: 'Le calcul se fait étape par étape : chaque résultat sert de base au suivant' },
                      { icon: <Hourglass size={18} weight="duotone" color="#3b82f6" />, text: '3 minutes · 3 essais' },
                      { icon: <Trophy size={18} weight="duotone" color="#3b82f6" />, text: 'Chaque essai sauvegarde ton meilleur score' },
                    ].map((rule, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}>
                        <span style={{ width: 24, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {rule.icon}
                        </span>
                        <span style={{
                          fontSize: '0.82rem', fontWeight: 500, color: 'rgba(238,242,255,0.7)',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                        }}>
                          {rule.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Warning */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    maxWidth: 340, width: '100%',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                  }}
                >
                  <Warning size={18} weight="fill" color="#f59e0b" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.75rem', color: 'rgba(245,158,11,0.8)',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    lineHeight: 1.4,
                  }}>
                    Si tu quittes l'app en cours de partie, elle sera terminée.
                  </span>
                </motion.div>

                {/* Start button */}
                <motion.button
                  onClick={handleStart}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.35 }}
                  style={{
                    width: '100%', maxWidth: 340, padding: '16px 24px',
                    borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff', fontSize: '1rem', fontWeight: 700,
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    cursor: 'pointer', letterSpacing: '0.02em',
                    boxShadow: '0 4px 20px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15)',
                  }}
                >
                  Découvrir le nombre
                </motion.button>
              </motion.div>
            )}

            {/* ─── Playing Phase ─── */}
            {gamePhase === 'playing' && (
              <div className="total-game" style={{ paddingTop: 8 }}>
                {/* Timer bar */}
                <div style={{
                  position: 'relative', width: '100%', height: 32,
                  borderRadius: 10,
                  background: 'rgba(8,14,32,0.92)',
                  border: `1px solid ${timerCritical ? 'rgba(239,68,68,0.25)' : timerUrgent ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.12)'}`,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                  <motion.div
                    style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      borderRadius: 10,
                      background: timerCritical
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : timerUrgent
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                      opacity: 0.85,
                      boxShadow: timerCritical
                        ? '0 0 16px rgba(239,68,68,0.5)'
                        : timerUrgent
                          ? '0 0 14px rgba(245,158,11,0.4)'
                          : '0 0 10px rgba(59,130,246,0.35)',
                    }}
                    initial={{ width: '100%' }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                  <div style={{
                    position: 'relative', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', gap: '6px',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    fontSize: '0.82rem', fontWeight: 700,
                    color: timerCritical ? '#ef4444' : timerUrgent ? '#f59e0b' : 'rgba(238,242,255,0.8)',
                    textShadow: timerCritical
                      ? '0 0 10px rgba(239,68,68,0.6)'
                      : timerUrgent
                        ? '0 0 10px rgba(245,158,11,0.5)'
                        : 'none',
                  }}>
                    <Timer size={14} weight="fill" />
                    {formatTime(timeLeft)}
                  </div>
                </div>

                {/* Target + live result below */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 0', flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)',
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    marginBottom: 4,
                  }}>CIBLE</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                    style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '2.4rem', color: '#fff', lineHeight: 1,
                      textShadow: '0 0 24px rgba(59,130,246,0.6), 0 0 6px rgba(59,130,246,0.3)',
                    }}
                  >{puzzle.target}</motion.span>

                  {/* Live result — always takes space */}
                  <div style={{
                    marginTop: 6, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}>
                    {liveResult !== null ? (
                      <span style={{
                        fontFamily: "var(--font-title, 'Bungee'), cursive",
                        fontSize: '1.5rem', lineHeight: 1,
                        color: liveResult === puzzle.target ? '#10b981'
                          : Math.abs(liveResult - puzzle.target) <= 10 ? '#f59e0b'
                          : 'rgba(238,242,255,0.4)',
                        textShadow: liveResult === puzzle.target ? '0 0 16px rgba(16,185,129,0.5)' : 'none',
                        transition: 'color 0.15s ease',
                      }}>
                        = {formatResult(liveResult)}
                        {liveResult === puzzle.target ? ' 🎯' : ''}
                      </span>
                    ) : bestResult !== null && bestDifference > 0 ? (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        color: 'rgba(59,130,246,0.5)',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}>
                        ✓ Sauvegardé : {formatResult(bestResult)} (écart : {formatResult(bestDifference)})
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Expression zone — fixed height for 2 rows */}
                <div className={`total-expression-zone ${flashResult || ''}`}>
                  <div className="total-expression-tokens">
                    {tokens.length === 0 ? (
                      <span className="total-expression-placeholder">Choisis un chiffre…</span>
                    ) : (
                      <>
                        {tokens.map((token, i) => (
                          <span
                            key={i}
                            className={`total-token ${typeof token === 'number' ? 'number' : 'operator'}`}
                          >
                            {token}
                          </span>
                        ))}
                        {expectingNumber && (
                          <span className="total-token-cursor">_</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Number buttons */}
                <div className="total-numbers-grid">
                  {puzzle.numbers.map((num, i) => (
                    <motion.button
                      key={i}
                      className={`total-number-btn ${usedIndices.has(i) ? 'used' : ''} ${!expectingNumber ? 'disabled' : ''}`}
                      onClick={() => handleTapNumber(num, i)}
                      disabled={usedIndices.has(i) || !expectingNumber}
                      whileTap={!usedIndices.has(i) && expectingNumber ? { scale: 0.9 } : {}}
                    >
                      {num}
                    </motion.button>
                  ))}
                </div>

                {/* Operator buttons */}
                <div className="total-operators-row">
                  {OPERATORS.map((op) => (
                    <motion.button
                      key={op}
                      className={`total-operator-btn ${expectingNumber ? 'disabled' : ''}`}
                      onClick={() => handleTapOperator(op)}
                      disabled={expectingNumber}
                      whileTap={!expectingNumber ? { scale: 0.9 } : {}}
                    >
                      {op}
                    </motion.button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="total-actions-row">
                  <button className="total-action-btn clear" onClick={handleClear} disabled={tokens.length === 0}>
                    <ArrowCounterClockwise size={18} weight="bold" />
                  </button>
                  <button className="total-action-btn backspace" onClick={handleBackspace} disabled={tokens.length === 0}>
                    <Backspace size={20} weight="bold" />
                  </button>
                  <motion.button
                    className={`total-validate-btn ${canValidate ? 'active' : ''}`}
                    onClick={handleValidate}
                    disabled={!canValidate}
                    whileTap={canValidate ? { scale: 0.95 } : {}}
                  >
                    {submissionsLeft <= 0 ? 'Plus d\'essais' : allUsed ? `Valider (${submissionsLeft})` : `${usedIndices.size}/6 chiffres`}
                  </motion.button>
                </div>

                {/* Submissions history — fills remaining space */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 2px',
                }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>Essais</span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: submissionsLeft <= 0 ? '#ef4444' : 'rgba(59,130,246,0.6)',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>{submissions.length}/{MAX_SUBMISSIONS}</span>
                </div>
                <div className="total-submissions">
                  {submissions.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(238,242,255,0.12)', fontSize: '0.75rem',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}>
                      Tes essais apparaîtront ici
                    </div>
                  ) : (
                    submissions.slice().reverse().map((sub, i) => (
                      <div key={i} className={`total-submission ${sub.difference === 0 ? 'exact' : sub.difference <= 10 ? 'close' : ''}`}>
                        <span className="total-sub-expr">{sub.expression}</span>
                        <span className="total-sub-eq">= {formatResult(sub.result)}</span>
                        <span className="total-sub-diff">
                          {sub.difference === 0 ? '🎯' : `±${formatResult(sub.difference)}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Finish early button */}
                {submissions.length > 0 && submissions.length < MAX_SUBMISSIONS && (
                  <button
                    onClick={() => setShowFinishConfirm(true)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'rgba(238,242,255,0.3)', fontSize: '0.72rem', fontWeight: 600,
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      cursor: 'pointer', padding: '8px 0',
                      textDecoration: 'underline', textUnderlineOffset: '3px',
                    }}
                  >
                    Terminer la partie
                  </button>
                )}
              </div>
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

                {/* Recap des essais */}
                {submissions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.35 }}
                    style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}
                  >
                    <p style={{
                      fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}>
                      Tes essais · {submissions.length}/{MAX_SUBMISSIONS}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {submissions.map((sub, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 10,
                            background: sub.difference === 0
                              ? 'rgba(16,185,129,0.1)'
                              : sub.difference <= 10
                                ? 'rgba(245,158,11,0.06)'
                                : 'rgba(255,255,255,0.04)',
                            border: sub.difference === 0
                              ? '1px solid rgba(16,185,129,0.2)'
                              : sub.difference <= 10
                                ? '1px solid rgba(245,158,11,0.15)'
                                : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            minWidth: 18,
                          }}>#{i + 1}</span>
                          <span style={{
                            flex: 1, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          }}>{sub.expression}</span>
                          <span style={{
                            fontSize: '0.85rem', fontWeight: 700,
                            color: sub.difference === 0 ? '#10b981' : sub.difference <= 10 ? '#f59e0b' : '#fff',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          }}>= {formatResult(sub.result)}</span>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600,
                            color: sub.difference === 0 ? '#10b981' : 'rgba(238,242,255,0.4)',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            minWidth: 40, textAlign: 'right',
                          }}>
                            {sub.difference === 0 ? '🎯' : `±${formatResult(sub.difference)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
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
