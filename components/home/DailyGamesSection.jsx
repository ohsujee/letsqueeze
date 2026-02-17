'use client';

import { motion } from 'framer-motion';
import { Sun } from 'lucide-react';
import { DAILY_GAMES } from '@/lib/config/dailyGames';
import DailyCard from '@/lib/components/DailyCard';

export default function DailyGamesSection() {
  return (
    <motion.section
      className="daily-games-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <h2 className="section-title">
        <Sun className="title-icon" size={24} style={{ color: '#f97316' }} />
        Défis Quotidiens
      </h2>
      <div className="daily-games-grid">
        {DAILY_GAMES.map((game) => (
          <DailyCard key={game.id} game={game} />
        ))}
      </div>
    </motion.section>
  );
}
