'use client';

/**
 * useDailyLeaderboard — logique partagée de classement daily.
 *
 * Gère : fetch Today live, fetch Day offset (one-shot cache), fetch Week (aggregate cache),
 *        auth UID, ranks olympiques, résolution des pseudos depuis les profils Firebase.
 *
 * Usage :
 *   const lb = useDailyLeaderboard({ firebaseNode: 'daily/semantic', todayDate, lbTab });
 *   lb.dayEntries, lb.dayLoading, lb.weekEntries, lb.weekLoading, lb.myUid,
 *   lb.dayOffset, lb.setDayOffset, lb.weekOffset, lb.setWeekOffset,
 *   lb.dayDirection, lb.weekDirection
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

// Sort 3 niveaux : score DESC → attempts ASC → timeMs ASC
export function sortLeaderboard(a, b) {
  if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
  if ((a.attempts || 0) !== (b.attempts || 0)) return (a.attempts || 0) - (b.attempts || 0);
  return (a.timeMs || 0) - (b.timeMs || 0);
}

// Ranking olympique : même score + même attempts → même rang, le suivant saute
export function assignRanks(entries) {
  const ranks = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) { ranks.push(1); continue; }
    const p = entries[i - 1], c = entries[i];
    if ((c.score || 0) === (p.score || 0) && (c.attempts || 0) === (p.attempts || 0)) {
      ranks.push(ranks[i - 1]);
    } else {
      ranks.push(i + 1);
    }
  }
  return ranks;
}

function getDateForOffset(todayStr, offset) {
  const d = new Date(todayStr + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function getDayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
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

export function getWeekLabel(todayStr, offset) {
  const today = new Date(todayStr + 'T12:00:00');
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function getFullWeekDates(todayStr) {
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

async function resolveProfiles(entries) {
  if (!entries.length) return entries;
  const results = await Promise.all(
    entries.map(async (e) => {
      try {
        const [pseudoSnap, avatarSnap] = await Promise.all([
          get(ref(db, `users/${e.uid}/profile/pseudo`)),
          get(ref(db, `users/${e.uid}/avatar`)),
        ]);
        const pseudo = pseudoSnap.val();
        const avatar = avatarSnap.val(); // { id, color } | null
        return {
          ...e,
          ...(pseudo ? { name: pseudo } : {}),
          ...(avatar ? { avatar } : {}),
        };
      } catch {
        return e;
      }
    })
  );
  return results;
}

export function useDailyLeaderboard({ firebaseNode, todayDate, lbTab }) {
  const [myUid, setMyUid] = useState(null);
  const [todayEntries, setTodayEntries] = useState([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);
  const [dayCache, setDayCache] = useState({});
  const [dayLoading, setDayLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekCache, setWeekCache] = useState({});
  const [weekLoading, setWeekLoading] = useState(false);

  const dayEntries = dayOffset === 0 ? todayEntries : (dayCache[dayOffset] || []);
  const dayAlreadyFetched = dayOffset === 0 || dayOffset in dayCache;
  const weekEntries = weekCache[weekOffset] || [];
  const weekAlreadyFetched = weekOffset in weekCache;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setMyUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // Today live
  useEffect(() => {
    if (!todayDate) return;
    let cancelled = false;
    const unsub = onValue(
      ref(db, `${firebaseNode}/${todayDate}/leaderboard`),
      (snap) => {
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        if (cancelled) return;
        setTodayEntries(raw);
        setTodayLoading(false);
        resolveProfiles(raw).then((resolved) => { if (!cancelled) setTodayEntries(resolved); }).catch(() => {});
      },
      (err) => { console.warn('[DailyLB today]', err.message); if (!cancelled) setTodayLoading(false); }
    );
    return () => { cancelled = true; unsub(); };
  }, [firebaseNode, todayDate]);

  // Day offset fetch
  useEffect(() => {
    if (lbTab !== 'today' || dayOffset === 0 || dayAlreadyFetched || !todayDate) return;
    let cancelled = false;
    async function fetchDay() {
      setDayLoading(true);
      try {
        const date = getDateForOffset(todayDate, dayOffset);
        const snap = await get(ref(db, `${firebaseNode}/${date}/leaderboard`));
        const raw = snap.exists()
          ? Object.entries(snap.val()).map(([uid, v]) => ({ uid, ...v })).sort(sortLeaderboard)
          : [];
        if (cancelled) return;
        setDayCache((prev) => ({ ...prev, [dayOffset]: raw }));
        resolveProfiles(raw)
          .then((resolved) => { if (!cancelled) setDayCache((prev) => ({ ...prev, [dayOffset]: resolved })); })
          .catch(() => {});
      } catch (e) {
        console.warn('[DailyLB day]', e.message);
        if (!cancelled) setDayCache((prev) => ({ ...prev, [dayOffset]: [] }));
      }
      if (!cancelled) setDayLoading(false);
    }
    fetchDay();
    return () => { cancelled = true; };
  }, [firebaseNode, lbTab, todayDate, dayOffset, dayAlreadyFetched]);

  // Week fetch + aggregate
  useEffect(() => {
    if (lbTab !== 'week' || weekAlreadyFetched || !todayDate) return;
    let cancelled = false;
    async function fetchWeek() {
      setWeekLoading(true);
      try {
        const dates = getWeekDatesForOffset(todayDate, weekOffset);
        const snaps = await Promise.all(dates.map((d) => get(ref(db, `${firebaseNode}/${d}/leaderboard`))));
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
        const resolved = await resolveProfiles(sorted);
        if (!cancelled) setWeekCache((prev) => ({ ...prev, [weekOffset]: resolved }));
      } catch (e) {
        console.warn('[DailyLB week]', e.message);
        if (!cancelled) setWeekCache((prev) => ({ ...prev, [weekOffset]: [] }));
      }
      if (!cancelled) setWeekLoading(false);
    }
    fetchWeek();
    return () => { cancelled = true; };
  }, [firebaseNode, lbTab, todayDate, weekOffset, weekAlreadyFetched]);

  const handleDayOffset = useCallback((fn) => {
    setDayOffset((prev) => typeof fn === 'function' ? fn(prev) : fn);
  }, []);

  const handleWeekOffset = useCallback((fn) => {
    setWeekOffset((prev) => typeof fn === 'function' ? fn(prev) : fn);
  }, []);

  const getDateOffset = useCallback((offset) => getDateForOffset(todayDate, offset), [todayDate]);

  return {
    myUid,
    dayEntries,
    dayLoading: dayOffset === 0 ? todayLoading : dayLoading,
    dayOffset,
    setDayOffset: handleDayOffset,
    weekEntries,
    weekLoading,
    weekOffset,
    setWeekOffset: handleWeekOffset,
    getDateForOffset: getDateOffset,
  };
}
