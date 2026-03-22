'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDots } from '@phosphor-icons/react';
import { onAuthStateChanged } from 'firebase/auth';
import { DAILY_GAMES } from '@/lib/config/dailyGames';
import DailyCard from '@/lib/components/DailyCard';
import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { isSuperFounder } from '@/lib/admin';
import { auth } from '@/lib/firebase';

// Hooks appelés pour chaque jeu (nombre fixe pour respecter les règles des hooks)
function useDailyProgress() {
  const s0 = useDailyGame(DAILY_GAMES[0]?.id);
  const s1 = useDailyGame(DAILY_GAMES[1]?.id);
  const s2 = useDailyGame(DAILY_GAMES[2]?.id);
  const states = [s0, s1, s2].slice(0, DAILY_GAMES.length);
  const loaded = states.every((s) => s.loaded);
  return { states, loaded };
}

export default function DailyGamesSection() {
  const { states, loaded } = useDailyProgress();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const userIsSuperFounder = isSuperFounder(user);

  // Date actuelle en Europe/Paris
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

  // Filtrer les jeux visibles
  const visibleIndices = DAILY_GAMES
    .map((g, i) => i)
    .filter((i) => {
      const g = DAILY_GAMES[i];
      if (g.superFoundersOnly && !userIsSuperFounder) return false;
      if (g.availableFrom && todayStr < g.availableFrom && !userIsSuperFounder) return false;
      return true;
    });

  const completed = visibleIndices.filter((i) => states[i]?.todayState === 'completed').length;
  const total = visibleIndices.length;
  const allDone = loaded && completed === total;

  return (
    <motion.section
      className="daily-games-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h2 className="section-title">
        <CalendarDots weight="fill" size={22} style={{ color: '#f97316' }} />
        Défis Quotidiens
        {loaded && (
          <span className={`daily-progress-counter ${allDone ? 'done' : ''}`}>
            {completed} / {total}
          </span>
        )}
      </h2>
      <div className="daily-games-grid">
        {visibleIndices.map((i) => (
          <DailyCard key={DAILY_GAMES[i].id} game={DAILY_GAMES[i]} />
        ))}
      </div>
    </motion.section>
  );
}
