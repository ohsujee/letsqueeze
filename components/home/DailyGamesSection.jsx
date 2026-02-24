'use client';

import { motion } from 'framer-motion';
import { CalendarDots } from '@phosphor-icons/react';
import { DAILY_GAMES } from '@/lib/config/dailyGames';
import DailyCard from '@/lib/components/DailyCard';
import { useDailyGame } from '@/lib/hooks/useDailyGame';

// Appel du hook pour chaque jeu (2 jeux fixes)
function useDailyProgress() {
  const s0 = useDailyGame(DAILY_GAMES[0]?.id);
  const s1 = useDailyGame(DAILY_GAMES[1]?.id);
  const states = [s0, s1].slice(0, DAILY_GAMES.length);
  const loaded = states.every((s) => s.loaded);
  const completed = states.filter((s) => s.todayState === 'completed').length;
  return { completed, total: DAILY_GAMES.length, loaded };
}

export default function DailyGamesSection() {
  const { completed, total, loaded } = useDailyProgress();
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
        {DAILY_GAMES.map((game) => (
          <DailyCard key={game.id} game={game} />
        ))}
      </div>
    </motion.section>
  );
}
