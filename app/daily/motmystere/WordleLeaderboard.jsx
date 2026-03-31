'use client';

/**
 * WordleLeaderboard — Classement Mot Mystère (aujourd'hui + semaine)
 * Extrait de app/daily/motmystere/page.jsx
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

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
export default function WordleLeaderboard({ todayDate }) {
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
