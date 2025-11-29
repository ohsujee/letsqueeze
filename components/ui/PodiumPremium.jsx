"use client";
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGameAudio } from '@/lib/hooks/useGameAudio';
import { ParticleEffects } from '@/components/shared/ParticleEffects';

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

  const podiumHeights = [140, 200, 100];
  const medals = ['🥈', '🥇', '🥉'];
  const colors = [
    { primary: '#C0C0C0', secondary: '#E8E8E8', glow: 'rgba(192, 192, 192, 0.6)' },
    { primary: '#FFD700', secondary: '#FFA500', glow: 'rgba(255, 215, 0, 0.8)' },
    { primary: '#CD7F32', secondary: '#8B4513', glow: 'rgba(205, 127, 50, 0.6)' }
  ];
  const ranks = [2, 1, 3];

  return (
    <div style={{
      perspective: '1000px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: '1rem',
      padding: '2rem 0',
      position: 'relative'
    }}>
      {/* Spotlight sur le gagnant */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          background: `radial-gradient(circle, ${colors[1].glow} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {podiumOrder.map((player, i) => {
        if (!player) return null;

        const isWinner = ranks[i] === 1;
        const color = colors[i];

        return (
          <motion.div
            key={player.uid}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: isWinner ? 10 : 5,
              position: 'relative'
            }}
            initial={{ y: 300, opacity: 0, rotateX: -90 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{
              delay: ranks[i] === 1 ? 0.3 : ranks[i] === 2 ? 0 : 0.6,
              type: "spring",
              stiffness: 60,
              damping: 12
            }}
          >
            {/* Médaille flottante */}
            <motion.div
              style={{
                position: 'relative',
                marginBottom: '1.5rem'
              }}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Badge médaille moderne */}
              <motion.div
                style={{
                  position: 'relative',
                  width: isWinner ? '110px' : '90px',
                  height: isWinner ? '110px' : '90px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `0 10px 40px ${color.glow}, inset 0 2px 10px rgba(255,255,255,0.3)`,
                  overflow: 'hidden'
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {/* Effet shine */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                  }}
                  animate={{
                    rotate: [0, 360]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                {/* Initiale */}
                <span style={{
                  fontSize: isWinner ? '3rem' : '2.5rem',
                  fontWeight: 900,
                  color: 'white',
                  textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {(player.name || 'J').charAt(0).toUpperCase()}
                </span>
              </motion.div>

              {/* Emoji médaille */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: isWinner ? '3.5rem' : '2.5rem',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: ranks[i] === 1 ? 0.6 : ranks[i] === 2 ? 0.3 : 0.9,
                  type: "spring",
                  stiffness: 200
                }}
              >
                {medals[i]}
              </motion.div>
            </motion.div>

            {/* Nom du joueur */}
            <motion.div
              style={{
                fontSize: isWinner ? '1.5rem' : '1.25rem',
                fontWeight: 900,
                color: 'white',
                textAlign: 'center',
                marginBottom: '0.75rem',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: ranks[i] === 1 ? 0.8 : ranks[i] === 2 ? 0.5 : 1.1
              }}
            >
              {player.name || 'Joueur'}
            </motion.div>

            {/* Score avec effet néon */}
            <motion.div
              style={{
                fontSize: isWinner ? '2rem' : '1.5rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: color.primary,
                textShadow: `0 0 20px ${color.glow}, 0 0 40px ${color.glow}`,
                marginBottom: '1.5rem',
                padding: '0.5rem 1.5rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '9999px',
                border: `2px solid ${color.primary}`,
                backdropFilter: 'blur(10px)'
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: ranks[i] === 1 ? 1 : ranks[i] === 2 ? 0.7 : 1.3,
                type: "spring"
              }}
            >
              {player.score}
            </motion.div>

            {/* Piédestal moderne avec glassmorphisme */}
            <motion.div
              style={{
                width: isWinner ? '140px' : '120px',
                background: `linear-gradient(180deg, ${color.primary}40, ${color.secondary}20)`,
                borderRadius: '1rem 1rem 0 0',
                border: `2px solid ${color.primary}60`,
                borderBottom: 'none',
                boxShadow: `0 -10px 40px ${color.glow}, inset 0 2px 10px rgba(255,255,255,0.1)`,
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}
              initial={{ height: 0 }}
              animate={{ height: podiumHeights[i] }}
              transition={{
                delay: ranks[i] === 1 ? 0.5 : ranks[i] === 2 ? 0.2 : 0.8,
                duration: 1,
                ease: "easeOut"
              }}
            >
              {/* Rayures décoratives */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 20px,
                  ${color.primary}10 20px,
                  ${color.primary}10 40px
                )`,
                pointerEvents: 'none'
              }} />

              {/* Numéro de rang */}
              <span style={{
                fontSize: isWinner ? '4rem' : '3rem',
                fontWeight: 900,
                color: 'white',
                textShadow: `0 4px 20px ${color.glow}`,
                position: 'relative',
                zIndex: 1
              }}>
                {ranks[i]}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};
