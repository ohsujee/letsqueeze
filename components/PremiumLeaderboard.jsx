"use client";
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useMemo } from 'react';
import { AnimatedScore } from './AnimatedScore';

export const PremiumLeaderboard = ({ players, serverNow }) => {
  const sorted = useMemo(() =>
    players.slice().sort((a, b) => (b.score || 0) - (a.score || 0)),
    [players]
  );

  const maxScore = Math.max(...sorted.map(p => p.score || 0), 1);

  return (
    <LayoutGroup>
      <motion.div className="space-y-2">
        <AnimatePresence>
          {sorted.map((player, index) => {
            const isBlocked = (player.blockedUntil || 0) > serverNow;

            return (
              <motion.div
                key={player.uid}
                layout
                initial={{ opacity: 0, x: -50 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: index === 0
                    ? 'rgba(255, 215, 0, 0.2)'
                    : index === 1
                    ? 'rgba(192, 192, 192, 0.15)'
                    : index === 2
                    ? 'rgba(205, 127, 50, 0.15)'
                    : 'rgba(30, 41, 59, 0.8)'
                }}
                exit={{ opacity: 0, x: 50 }}
                transition={{
                  layout: { duration: 0.5, ease: "easeInOut" },
                  backgroundColor: { duration: 0.3 }
                }}
                className="card p-4 relative overflow-hidden"
                style={{
                  filter: isBlocked ? 'grayscale(0.5)' : 'none',
                  opacity: isBlocked ? 0.7 : 1
                }}
              >
                {/* Rang avec médaille */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rank-badge text-2xl font-black" style={{ minWidth: '50px' }}>
                      {index === 0 && <span className="medal">🥇</span>}
                      {index === 1 && <span className="medal">🥈</span>}
                      {index === 2 && <span className="medal">🥉</span>}
                      {index > 2 && <span className="rank-number">#{index + 1}</span>}
                    </div>

                    {/* Nom */}
                    <div className="player-name font-bold text-lg">{player.name}</div>

                    {/* Badge bloqué */}
                    {isBlocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold"
                      >
                        ⏸ Bloqué
                      </motion.div>
                    )}
                  </div>

                  {/* Score animé */}
                  <AnimatedScore value={player.score || 0} label="" />
                </div>

                {/* Barre de progression */}
                <motion.div
                  className="mt-3 h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(100, 116, 139, 0.3)' }}
                >
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    style={{
                      height: '100%',
                      width: `${((player.score || 0) / maxScore) * 100}%`,
                      transformOrigin: 'left',
                      background: index === 0
                        ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                        : index === 1
                        ? 'linear-gradient(90deg, #C0C0C0, #A8A8A8)'
                        : index === 2
                        ? 'linear-gradient(90deg, #CD7F32, #B8860B)'
                        : 'linear-gradient(90deg, #3B82F6, #06B6D4)'
                    }}
                  />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
};
