'use client';

import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Composant pour afficher un score avec animation de compteur
 */
function AnimatedScore({ score }) {
  const [displayScore, setDisplayScore] = useState(score);
  const springScore = useSpring(score, {
    stiffness: 80,
    damping: 15
  });

  useEffect(() => {
    springScore.set(score);
  }, [score, springScore]);

  useEffect(() => {
    const unsubscribe = springScore.on('change', (latest) => {
      setDisplayScore(Math.round(latest));
    });
    return unsubscribe;
  }, [springScore]);

  return <span className="font-bold">{displayScore}</span>;
}

/**
 * Badge de position avec animation
 */
function PositionBadge({ position, previousPosition }) {
  const didImprove = previousPosition && position < previousPosition;
  const didWorsen = previousPosition && position > previousPosition;

  return (
    <motion.span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
      style={{
        background: position === 1 ? '#F59E0B' : position === 2 ? '#94A3B8' : position === 3 ? '#CD7F32' : '#64748B',
        color: 'white'
      }}
      animate={didImprove ? {
        scale: [1, 1.3, 1],
        rotate: [0, 10, -10, 0]
      } : didWorsen ? {
        scale: [1, 0.9, 1]
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {position}
      {didImprove && (
        <motion.span
          className="absolute -top-1 -right-1 text-green-500"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.3 }}
        >
          ↑
        </motion.span>
      )}
      {didWorsen && (
        <motion.span
          className="absolute -top-1 -right-1 text-red-500"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 0.3 }}
        >
          ↓
        </motion.span>
      )}
    </motion.span>
  );
}

/**
 * Item de leaderboard animé
 */
export function LeaderboardItem({ player, position, previousPosition, serverNow }) {
  const isBlocked = (player.blockedUntil || 0) > serverNow;
  const blockedSeconds = Math.ceil(((player.blockedUntil || 0) - serverNow) / 1000);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        layout: { duration: 0.5, ease: "easeInOut" },
        opacity: { duration: 0.3 }
      }}
      className="card flex justify-between items-center"
      style={{
        background: position === 1 ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.1))' :
                   position === 2 ? 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(203,213,225,0.1))' :
                   position === 3 ? 'linear-gradient(135deg, rgba(205,127,50,0.1), rgba(180,100,30,0.1))' :
                   'transparent'
      }}
    >
      <div className="flex items-center gap-3">
        <PositionBadge position={position} previousPosition={previousPosition} />
        <span className="font-medium">{player.name}</span>
        {isBlocked && (
          <motion.span
            className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            ⏳ {blockedSeconds}s
          </motion.span>
        )}
      </div>
      <motion.div
        className="text-xl"
        animate={
          player.score !== player.previousScore ? {
            scale: [1, 1.3, 1],
            color: ['#FFFFFF', '#10B981', '#FFFFFF']
          } : {}
        }
        transition={{ duration: 0.5 }}
      >
        <AnimatedScore score={player.score || 0} />
      </motion.div>
    </motion.li>
  );
}

/**
 * Liste de leaderboard complète avec animations
 */
export default function AnimatedLeaderboard({ players, serverNow }) {
  const [previousPositions, setPreviousPositions] = useState({});

  useEffect(() => {
    const newPositions = {};
    players.forEach((player, index) => {
      newPositions[player.uid] = index + 1;
    });

    // Garder trace des positions précédentes pour l'animation
    setTimeout(() => {
      setPreviousPositions(prev => ({ ...prev, ...newPositions }));
    }, 100);
  }, [players]);

  return (
    <div className="card">
      <b>Scores joueurs</b>
      <motion.ul className="mt-2 space-y-1">
        <AnimatePresence>
          {players.map((player, index) => (
            <LeaderboardItem
              key={player.uid}
              player={player}
              position={index + 1}
              previousPosition={previousPositions[player.uid]}
              serverNow={serverNow}
            />
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

/**
 * Leaderboard d'équipes animé
 */
export function TeamLeaderboard({ teams }) {
  return (
    <div className="card">
      <b>Scores des équipes</b>
      <motion.ul className="mt-2 grid grid-cols-2 gap-2">
        <AnimatePresence>
          {teams.map(team => (
            <motion.li
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="card flex justify-between items-center"
            >
              <motion.span
                className="font-bold px-2 py-1 rounded"
                style={{ backgroundColor: team.color, color: 'white' }}
                whileHover={{ scale: 1.05 }}
              >
                {team.name}
              </motion.span>
              <motion.b
                animate={
                  team.score !== team.previousScore ? {
                    scale: [1, 1.3, 1],
                    color: ['#FFFFFF', '#10B981', '#FFFFFF']
                  } : {}
                }
                transition={{ duration: 0.5 }}
              >
                <AnimatedScore score={team.score || 0} />
              </motion.b>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
