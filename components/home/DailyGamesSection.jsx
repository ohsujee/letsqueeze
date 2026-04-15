'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { DAILY_GAMES } from '@/lib/config/dailyGames';
import DailyCard from '@/lib/components/DailyCard';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { isSuperFounder } from '@/lib/admin';

// Hooks appelés pour chaque jeu (nombre fixe pour respecter les règles des hooks)
function useDailyProgress() {
  const s0 = useDailyGame(DAILY_GAMES[0]?.id);
  const s1 = useDailyGame(DAILY_GAMES[1]?.id);
  const s2 = useDailyGame(DAILY_GAMES[2]?.id);
  const s3 = useDailyGame(DAILY_GAMES[3]?.id);
  const s4 = useDailyGame(DAILY_GAMES[4]?.id);
  const states = [s0, s1, s2, s3, s4].slice(0, DAILY_GAMES.length);
  const loaded = states.every((s) => s.loaded);
  return { states, loaded };
}

export default function DailyGamesSection({ user }) {
  const { states, loaded } = useDailyProgress();

  const userIsSuperFounder = isSuperFounder(user);

  // Filtrer les jeux visibles (memoized)
  const visibleIndices = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    return DAILY_GAMES
      .map((_, i) => i)
      .filter((i) => {
        const g = DAILY_GAMES[i];
        if (g.superFoundersOnly && !userIsSuperFounder) return false;
        if (g.availableFrom && todayStr < g.availableFrom && !userIsSuperFounder) return false;
        return true;
      });
  }, [userIsSuperFounder]);

  // Sort: non-completed first, completed at the end
  const sortedIndices = useMemo(() => {
    return [...visibleIndices].sort((a, b) => {
      const aDone = states[a]?.todayState === 'completed' ? 1 : 0;
      const bDone = states[b]?.todayState === 'completed' ? 1 : 0;
      return aDone - bDone;
    });
  }, [visibleIndices, states]);

  const completed = sortedIndices.filter((i) => states[i]?.todayState === 'completed').length;
  const total = sortedIndices.length;
  const allDone = loaded && completed === total;

  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const cardRef = useRef(null);
  const bounceTimer = useRef(null);
  const [scrollDir, setScrollDir] = useState('right');
  const isAutoScrolling = useRef(false);

  // Bounce effect quand on atteint un bout du scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastSl = el.scrollLeft;
    let peakVelocity = 0;
    let wasAtStart = el.scrollLeft <= 0;
    let wasAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;

    const bounce = (direction, speed) => {
      const grid = gridRef.current;
      const card = cardRef.current;
      if (!grid || !card) return;

      const gridPx = Math.min(speed * 1.2, 14);
      const cardPx = Math.min(speed * 0.5, 7);

      grid.style.transition = 'none';
      grid.style.transform = `translateX(${direction * gridPx}px)`;
      card.style.transition = 'none';
      card.style.transform = `translateX(${direction * cardPx}px)`;

      clearTimeout(bounceTimer.current);
      bounceTimer.current = setTimeout(() => {
        grid.style.transition = 'transform 0.45s cubic-bezier(0.25, 1.5, 0.5, 1)';
        grid.style.transform = 'translateX(0)';
        card.style.transition = 'transform 0.55s cubic-bezier(0.25, 1.3, 0.5, 1)';
        card.style.transform = 'translateX(0)';
      }, 16);
    };

    const handleScroll = () => {
      const sl = el.scrollLeft;
      const v = Math.abs(sl - lastSl);
      if (v > peakVelocity) peakVelocity = v;
      lastSl = sl;

      const atStart = sl <= 0;
      const atEnd = sl >= el.scrollWidth - el.clientWidth - 1;

      // Vient d'arriver au bout gauche
      if (atStart && !wasAtStart && peakVelocity > 1) {
        bounce(1, peakVelocity);
        peakVelocity = 0;
      }
      // Vient d'arriver au bout droit
      if (atEnd && !wasAtEnd && peakVelocity > 1) {
        bounce(-1, peakVelocity);
        peakVelocity = 0;
      }

      // Reset peak si on est en milieu de scroll
      if (!atStart && !atEnd) peakVelocity = 0;

      wasAtStart = atStart;
      wasAtEnd = atEnd;

      // Only update direction on manual scroll (not programmatic)
      if (!isAutoScrolling.current) {
        if (atEnd) setScrollDir('left');
        else if (atStart) setScrollDir('right');
      }

      // Detect when auto-scroll finished (velocity near zero at edges)
      if (isAutoScrolling.current && (atEnd || atStart) && v < 2) {
        isAutoScrolling.current = false;
      }
    };

    // Check initial state
    if (el.scrollWidth <= el.clientWidth) {
      setScrollDir(null);
    } else {
      setScrollDir('right');
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(bounceTimer.current);
    };
  }, []);

  return (
    <div className="daily-section-outer" ref={scrollRef}>
      <motion.div
        className="daily-section-card"
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header sticky — reste en place pendant le scroll */}
        <div className="daily-section-header">
          <span className="daily-section-icon">📅</span>
          <h2 className="daily-section-title">Défis du jour</h2>
          {loaded && (
            <span className={`daily-section-counter ${allDone ? 'done' : ''}`}>
              {completed}/{total}
            </span>
          )}
          {scrollDir && (
            <motion.button
              className="daily-scroll-arrow"
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                isAutoScrolling.current = true;
                if (scrollDir === 'right') {
                  setScrollDir('left');
                  el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
                } else {
                  setScrollDir('right');
                  el.scrollTo({ left: 0, behavior: 'smooth' });
                }
              }}
              animate={{ rotate: scrollDir === 'left' ? 180 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4 1.5L8.5 6L4 10.5"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          )}
        </div>

        {/* Cards */}
        <div className="daily-games-grid" ref={gridRef}>
          {sortedIndices.map((i) => (
            <DailyCard key={DAILY_GAMES[i].id} game={DAILY_GAMES[i]} />
          ))}
        </div>

      </motion.div>
    </div>
  );
}
