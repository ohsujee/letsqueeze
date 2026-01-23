"use client";
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGameAudio } from '@/lib/hooks/useGameAudio';
import { ParticleEffects } from '@/components/shared/ParticleEffects';

export const PodiumPremium = ({ topPlayers, disableAnimations = false }) => {
  const audio = useGameAudio();

  useEffect(() => {
    // Son de victoire (joue une seule fois)
    audio.play('victory/end-celebration', { volume: 0.4 });

    // Skip particles if animations disabled, or defer them
    if (disableAnimations) return;

    // Defer particle effects to avoid competing with initial animations
    const particleTimer = setTimeout(() => {
      ParticleEffects.starRain();
    }, 800); // Wait for podium animations to settle

    const fireworksTimer = setTimeout(() => {
      ParticleEffects.fireworks();
    }, 3000); // Start fireworks after starRain

    return () => {
      clearTimeout(particleTimer);
      clearTimeout(fireworksTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run once on mount only

  // Ordre podium: 2nd, 1st, 3rd
  const podiumOrder = [
    topPlayers[1], // 2ème à gauche
    topPlayers[0], // 1er au centre (plus haut)
    topPlayers[2]  // 3ème à droite
  ];

  const podiumHeights = [140, 200, 100];
  const medals = ['🥈', '🥇', '🥉'];
  const defaultColors = [
    { primary: '#C0C0C0', secondary: '#E8E8E8', glow: 'rgba(192, 192, 192, 0.3)' },
    { primary: '#FFD700', secondary: '#FFA500', glow: 'rgba(255, 215, 0, 0.4)' },
    { primary: '#CD7F32', secondary: '#8B4513', glow: 'rgba(205, 127, 50, 0.3)' }
  ];
  const ranks = [2, 1, 3];

  // Helper to create color variants from a base team color
  const getTeamColorVariants = (baseColor) => {
    // Parse the color to create lighter/darker variants
    return {
      primary: baseColor,
      secondary: baseColor,
      glow: `${baseColor}66` // 40% opacity
    };
  };

  return (
    <div style={{
      perspective: '1000px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: '1rem',
      padding: '0.5rem 0 0 0',
      position: 'relative'
    }}>

      {podiumOrder.map((player, i) => {
        if (!player) return <span key={`empty-${i}`} />;

        const isWinner = ranks[i] === 1;
        // Use team color if available (team mode), otherwise use medal colors
        const isTeam = !!player.color;
        const color = isTeam ? getTeamColorVariants(player.color) : defaultColors[i];
        // For teams, extract the team name without prefix for display
        const displayName = isTeam
          ? (player.name || '').replace(/^(Équipe |Team )/i, '') || 'Équipe'
          : player.name || 'Joueur';
        const initial = displayName.charAt(0).toUpperCase();

        return (
          <motion.div
            key={player.uid || player.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: isWinner ? 10 : 5,
              position: 'relative'
            }}
            initial={disableAnimations ? false : { y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={disableAnimations ? { duration: 0 } : {
              delay: ranks[i] === 1 ? 0.5 : ranks[i] === 2 ? 0 : 1.0,
              duration: 0.6,
              ease: "easeOut"
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
                  boxShadow: `0 4px 15px ${color.glow}, inset 0 2px 8px rgba(255,255,255,0.2)`,
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
                  {initial}
                </span>
              </motion.div>

              {/* Emoji médaille */}
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: isWinner ? '3.5rem' : '2.5rem',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                }}
              >
                {medals[i]}
              </div>
            </motion.div>

            {/* Nom du joueur ou de l'équipe */}
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: isTeam ? color.primary : 'white',
                textAlign: 'center',
                marginBottom: '0.75rem',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textShadow: isTeam ? `0 0 10px ${color.glow}` : 'none'
              }}
            >
              {isTeam ? `Team ${displayName}` : displayName}
            </div>

            {/* Score */}
            <div
              style={{
                fontSize: isWinner ? '2rem' : '1.5rem',
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                color: color.primary,
                textShadow: `0 0 10px ${color.glow}`,
                marginBottom: '1.5rem',
                padding: '0.5rem 1.5rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '9999px',
                border: `2px solid ${color.primary}`,
                backdropFilter: 'blur(10px)'
              }}
            >
              {player.score}
            </div>

            {/* Piédestal moderne avec glassmorphisme */}
            <motion.div
              style={{
                width: isWinner ? '140px' : '120px',
                background: `linear-gradient(180deg, ${color.primary}40, ${color.secondary}20)`,
                borderRadius: '1rem 1rem 0 0',
                borderTop: `2px solid ${color.primary}60`,
                borderLeft: `2px solid ${color.primary}60`,
                borderRight: `2px solid ${color.primary}60`,
                borderBottom: 'none',
                boxShadow: `0 -4px 15px ${color.glow}, inset 0 1px 5px rgba(255,255,255,0.1)`,
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}
              initial={disableAnimations ? false : { height: 0 }}
              animate={{ height: podiumHeights[i] }}
              transition={disableAnimations ? { duration: 0 } : {
                delay: ranks[i] === 1 ? 0.7 : ranks[i] === 2 ? 0.2 : 1.2,
                duration: 0.8,
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
                textShadow: `0 2px 8px ${color.glow}`,
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
