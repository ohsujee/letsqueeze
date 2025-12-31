'use client';

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface MimeCardProps {
  word: string;
}

// Neon Green CLAIR et BRILLANT
const NEON = '#00ff66';
const NEON_RGB = '0, 255, 102';

export default function MimeCard({ word }: MimeCardProps) {
  const y = useMotionValue(0);
  const controls = useAnimation();
  const maxDrag = -180;

  const coverY = useTransform(y, [maxDrag, 0], [maxDrag, 0]);

  const handleDragEnd = () => {
    controls.start({
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30 }
    });
  };

  useEffect(() => {
    y.set(0);
  }, [word, y]);

  return (
    <div style={{
      position: 'relative',
      width: 300,
      height: 320,
    }}>

      {/* === CARTE DU MOT (derrière) === */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        borderRadius: 24,
        display: 'flex',
        alignItems: 'flex-end', // Aligné en BAS pour être visible quand cover monte
        justifyContent: 'center',
        paddingBottom: 50, // Centré dans la zone visible (180px / 2 - marge)
        background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
        border: `3px solid ${NEON}`,
        boxShadow: `0 0 50px rgba(${NEON_RGB}, 0.6), 0 0 100px rgba(${NEON_RGB}, 0.3), inset 0 0 50px rgba(${NEON_RGB}, 0.15)`,
      }}>
        <span style={{
          fontFamily: "'Bungee', cursive",
          fontSize: 'clamp(1.75rem, 8vw, 2.75rem)',
          color: '#ffffff',
          textAlign: 'center',
          padding: 24,
          textShadow: `0 0 10px rgba(${NEON_RGB}, 1), 0 0 25px rgba(${NEON_RGB}, 0.9), 0 0 50px rgba(${NEON_RGB}, 0.6)`,
          lineHeight: 1.2,
        }}>
          {word}
        </span>
      </div>

      {/* === CARTE COVER (devant, superposée, draggable) === */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)',
          border: `3px solid rgba(${NEON_RGB}, 0.7)`,
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(${NEON_RGB}, 0.3)`,
          cursor: 'grab',
          touchAction: 'none',
          y: coverY,
        }}
        drag="y"
        dragConstraints={{ top: maxDrag, bottom: 0 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileDrag={{ cursor: 'grabbing' }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: 20,
        }}>
          {/* Emoji */}
          <motion.span
            style={{ fontSize: 52, filter: `drop-shadow(0 0 20px rgba(${NEON_RGB}, 0.8))` }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🎭
          </motion.span>

          {/* Titre */}
          <span style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 24,
            color: '#ffffff',
            textShadow: `0 0 12px rgba(${NEON_RGB}, 1), 0 0 25px rgba(${NEON_RGB}, 0.6)`,
          }}>
            Ton mot
          </span>

          {/* Instruction */}
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            Glisse vers le haut pour voir
          </span>

          {/* Flèche */}
          <motion.div
            style={{
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `rgba(${NEON_RGB}, 0.2)`,
              border: `2px solid rgba(${NEON_RGB}, 0.7)`,
              borderRadius: '50%',
              marginTop: 4,
            }}
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <span style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: NEON,
              textShadow: `0 0 8px rgba(${NEON_RGB}, 1)`,
            }}>
              ↑
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
