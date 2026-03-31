'use client';

/**
 * SemanticLeaderboard — Classement Sémantique (aujourd'hui + semaine)
 * Extrait de app/daily/semantique/page.jsx
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

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

// LeaderboardErrorBoundary moved to components/shared/LeaderboardErrorBoundary.jsx

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
export default function SemanticLeaderboard({ todayDate }) {
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
