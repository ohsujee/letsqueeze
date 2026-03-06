'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Question, Trophy, ChartBar, X, GridNine, Backspace } from '@phosphor-icons/react';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { GameEndTransition } from '@/components/transitions';
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';

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
                {key === '⌫' ? <Backspace size={24} weight="fill" /> : key}
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
function WordleResultBanner({ solved, attempts, timeMs, score, revealedWord, stats, streak, onShowStats, onShowLeaderboard, unranked = false }) {
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
                : <>Le mot : <strong>{revealedWord?.toUpperCase()}</strong></>
              }
            </p>
          </div>
        </div>
        {solved && (
          unranked ? (
            <div className="wres-score" style={{ textAlign: 'right' }}>
              <span className="wres-score-val" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Non classé</span>
            </div>
          ) : (
            <div className="wres-score">
              <span className="wres-score-val">{score.toLocaleString('fr-FR')}</span>
              <span className="wres-score-lbl">pts</span>
            </div>
          )
        )}
      </div>

      {unranked && (
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
          Tu n&apos;es pas dans le classement pour cette partie.
        </p>
      )}

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
          <ChartBar size={15} weight="fill" /> Statistiques
        </button>
        <button className="wres-btn primary" onClick={onShowLeaderboard} disabled={unranked} style={unranked ? { opacity: 0.4, cursor: 'default' } : {}}>
          <Trophy size={15} weight="fill" /> Classement
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
              <button className="wsm-close" onClick={onClose}><X size={16} weight="fill" /></button>
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
const BAR_COLOR = [
  'linear-gradient(90deg,#FFD700,#FFA500)',
  'linear-gradient(90deg,#C0C0C0,#A8A8A8)',
  'linear-gradient(90deg,#CD7F32,#B8860B)',
  'linear-gradient(90deg,#10b981,#059669)',
];

// Renvoie les jours de la semaine pour un offset donné (0 = semaine en cours, -1 = semaine passée…)
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

// Date absolue pour un offset en jours (0 = aujourd'hui, -1 = hier…)
function getDateForOffset(todayStr, offset) {
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// Label "lundi 3 mars 2026"
function getDayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Label "3 mars – 9 mars" pour une semaine donnée
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

function WeekProgressBar({ todayDate, weekOffset = 0 }) {
  const allDates = getFullWeekDates(todayDate);
  const isPastWeek = weekOffset < 0;
  const todayIdx = isPastWeek ? 6 : allDates.indexOf(todayDate);
  // scaleX : rapport sur 6 intervalles entre les 7 pips
  const scaleX = todayIdx > 0 ? todayIdx / 6 : 0;

  return (
    <div className="week-bar">
      <div className="week-bar-pips">
        <div className="week-bar-line-bg" />
        {todayIdx > 0 && (
          <motion.div
            className="week-bar-line-filled"
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
                className={`week-bar-pip ${state}`}
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
function WordleLeaderboard({ todayDate }) {
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

  // Aujourd'hui — temps réel
  useEffect(() => {
    if (!todayDate) return;
    const unsub = onValue(
      ref(db, `daily/wordle/${todayDate}/leaderboard`),
      (snap) => {
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        // Afficher immédiatement avec les noms stockés, puis silencieusement résoudre les pseudos
        setTodayEntries(raw);
        setTodayLoading(false);
        resolveNames(raw).then(setTodayEntries).catch(() => {});
      },
      (err) => { console.warn('[LB today]', err.message); setTodayLoading(false); }
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
        const snap = await get(ref(db, `daily/wordle/${date}/leaderboard`));
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

  // Semaine — fetch à la demande, mis en cache par offset
  useEffect(() => {
    if (lbTab !== 'week' || weekAlreadyFetched || !todayDate) return;
    async function fetchWeek() {
      setWeekLoading(true);
      try {
        const dates = getWeekDatesForOffset(todayDate, weekOffset);
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

      {/* Navigation semaine */}
      {lbTab === 'week' && todayDate && (
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
                enter: (dir) => ({ x: dir * -50, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir) => ({ x: dir * 50, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {(dayOffset === 0 ? todayLoading : dayLoading) ? (
                <div className="wordle-lb-loading">
                  <div className="wordle-spinner" />
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
          <AnimatePresence mode="wait" custom={weekDirection}>
            <motion.div
              key={weekOffset}
              custom={weekDirection}
              variants={{
                enter: (dir) => ({ x: dir * -50, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir) => ({ x: dir * 50, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {weekLoading ? (
                <div className="wordle-lb-loading">
                  <div className="wordle-spinner" />
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
  }, [altGameOver, altCurrentGuess, altGuesses, altFeedbacks, altToken, validWords, writeLeaderboard, suspiciousCompleteParams, completeGame, todayDate]);

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
