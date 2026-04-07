'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, StarFour } from '@phosphor-icons/react';
import FlameIcon from '@/components/icons/FlameIcon';
import { useDailyGame } from '@/lib/hooks/useDailyGame';

export default function DailyCard({ game }) {
  const router = useRouter();
  const { todayState, streak, progress, loaded } = useDailyGame(game.id);

  const handleClick = () => {
    router.push(game.route);
  };


  return (
    <motion.div
      className={`daily-game-card ${loaded ? todayState : 'loading'}`}
      data-game-id={game.id}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{ cursor: 'pointer' }}
    >
      {/* Background: image or gradient fallback */}
      <div className="daily-card-bg" style={!game.image ? { background: game.gradient } : {}}>
        {game.image && (
          <img src={game.image} alt="" className="daily-card-bg-img" draggable={false} />
        )}
      </div>

      {/* Overlay */}
      <div className="daily-card-overlay" />

      {/* Top-left: Streak flame with count inside */}
      {loaded && streak.count >= 1 && streak.lastPlayedDate && (() => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        return streak.lastPlayedDate === today || streak.lastPlayedDate === yesterday;
      })() && (
        <div className="daily-streak-sticker">
          <FlameIcon size={36} count={streak.count} />
        </div>
      )}

      {/* New badge */}
      {game.isNew && (
        <div className="daily-new-pill">
          <StarFour weight="fill" size={10} />
          NOUVEAU
        </div>
      )}

      {/* Center: Game title */}
      <div className="daily-card-title-wrap">
        <p className="daily-card-game-name" style={{ textShadow: `0 0 20px ${game.glowColor}, 0 0 40px ${game.glowColor}` }}>
          {game.name.toUpperCase()}
        </p>
      </div>

      {/* Top banner: terminé */}
      {loaded && todayState === 'completed' && (
        <div className="daily-status-banner daily-status-banner--done">
          <CheckCircle weight="fill" size={13} />
          Terminé
        </div>
      )}

    </motion.div>
  );
}
