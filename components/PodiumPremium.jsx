"use client";
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGameAudio } from '@/hooks/useGameAudio';
import { ParticleEffects } from './ParticleEffects';
import { AnimatedScore } from './AnimatedScore';

export const PodiumPremium = ({ topPlayers }) => {
  const audio = useGameAudio();

  useEffect(() => {
    // Musique de victoire
    audio.playMusic('victory/end-celebration', 0.4);

    // Feu d'artifice
    ParticleEffects.starRain();
    setTimeout(() => ParticleEffects.fireworks(), 2000);

    return () => audio.stopMusic();
  }, [audio]);

  // Ordre podium: 2nd, 1st, 3rd
  const podiumOrder = [
    topPlayers[1], // 2ème à gauche
    topPlayers[0], // 1er au centre (plus haut)
    topPlayers[2]  // 3ème à droite
  ];

  const podiumHeights = [180, 240, 140];
  const medals = ['🥈', '🥇', '🥉'];
  const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const ranks = ['2', '1', '3'];

  return (
    <div className="flex items-end justify-center gap-6 pb-10">
      {podiumOrder.map((player, i) => player && (
        <motion.div
          key={player.uid}
          className="flex flex-col items-center"
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: i * 0.5,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
          {/* Avatar avec aura */}
          <motion.div
            className="relative mb-4"
            animate={{
              boxShadow: [
                `0 0 30px ${colors[i]}`,
                `0 0 60px ${colors[i]}`,
                `0 0 30px ${colors[i]}`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
              style={{
                background: `linear-gradient(135deg, ${colors[i]}, ${colors[i]}dd)`,
                border: '4px solid white',
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>

            {/* Médaille overlay */}
            <motion.div
              className="absolute -top-2 -right-2 text-5xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.5 + 0.3, type: "spring" }}
            >
              {medals[i]}
            </motion.div>
          </motion.div>

          {/* Nom */}
          <motion.div
            className="font-black text-xl text-center mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.5 + 0.5 }}
          >
            {player.name}
          </motion.div>

          {/* Score avec compteur */}
          <AnimatedScore
            value={player.score}
            label=""
            className="mb-4"
          />

          {/* Piédestal */}
          <motion.div
            className="relative flex flex-col items-center justify-end"
            style={{
              width: '120px',
              background: `linear-gradient(135deg, ${colors[i]}, ${colors[i]}dd)`,
              borderRadius: '12px 12px 0 0',
              border: '3px solid white',
              borderBottom: 'none',
              boxShadow: `0 -10px 30px ${colors[i]}80`
            }}
            initial={{ height: 0 }}
            animate={{ height: podiumHeights[i] }}
            transition={{
              delay: i * 0.5 + 0.2,
              duration: 0.8,
              ease: "easeOut"
            }}
          >
            <div
              className="text-6xl font-black mb-4"
              style={{
                color: 'white',
                textShadow: '2px 2px 8px rgba(0,0,0,0.5)'
              }}
            >
              {ranks[i]}
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};
