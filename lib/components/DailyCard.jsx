'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Share2, Flame } from 'lucide-react';
import { useDailyGame } from '@/lib/hooks/useDailyGame';

export default function DailyCard({ game }) {
  const router = useRouter();
  const { todayState, streak, progress, loaded } = useDailyGame(game.id);

  const handleClick = () => {
    router.push(game.route);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const text = `Je joue à ${game.name} chaque jour sur Gigglz ! 🎮`;
    if (navigator.share) {
      navigator.share({ title: `Gigglz - ${game.name}`, text, url: window.location.origin + game.route }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <motion.div
      className={`daily-game-card ${loaded ? todayState : 'loading'}`}
      data-game-id={game.id}
      onClick={handleClick}
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

      {/* Top-left: Streak badge */}
      {loaded && streak.count > 1 && (
        <div className="daily-streak-pill">
          <Flame size={11} />
          {streak.count}
        </div>
      )}

      {/* Top-right: state indicator */}
      {loaded && todayState === 'inprogress' && progress && (
        <div className="daily-progress-pill">
          {progress.attempts}/{game.id === 'motmystere' ? 6 : '∞'}
        </div>
      )}
      {loaded && todayState === 'completed' && (
        <motion.div
          className="daily-done-pill"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onClick={handleShare}
        >
          <CheckCircle2 size={13} />
          Fait !
        </motion.div>
      )}

      {/* Center: Game title */}
      <div className="daily-card-title-wrap">
        <p className="daily-card-game-name" style={{ textShadow: `0 0 20px ${game.glowColor}, 0 0 40px ${game.glowColor}` }}>
          {game.name.toUpperCase()}
        </p>
      </div>

    </motion.div>
  );
}
