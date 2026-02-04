'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface MimeCardProps {
  word: string;
  category?: string;
  onReveal?: () => void;
  revealed?: boolean;
  disabled?: boolean;
}

// Couleurs MIME - alignées sur theme.css (--mime-primary, --mime-secondary)
const MIME_COLORS = {
  primary: '#00ff66',
  primaryRgb: '0, 255, 102',
};

export default function MimeCard({ word, category, onReveal, revealed = false, disabled = false }: MimeCardProps) {
  const controls = useAnimation();
  const maxDrag = -120;
  const revealThreshold = -60; // Seuil pour considérer comme révélé
  const hasTriggeredReveal = useRef(false);

  const handleDrag = (_event: any, info: { offset: { y: number } }) => {
    // Détecter quand le seuil de révélation est atteint via l'offset du drag
    if (info.offset.y <= revealThreshold && !hasTriggeredReveal.current && onReveal) {
      hasTriggeredReveal.current = true;
      onReveal();
    }
  };

  const handleDragEnd = () => {
    // Toujours refermer la carte après le drag (pour cacher le mot)
    controls.start({
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30 }
    });
  };

  // Réinitialiser quand le mot change
  useEffect(() => {
    hasTriggeredReveal.current = false;
    controls.start({ y: 0 });
  }, [word, controls]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: 280,
      height: 160,
      margin: '0 auto',
      opacity: disabled ? 0.6 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>

      {/* === CARTE DU MOT (derrière) === */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
        border: `2px solid ${MIME_COLORS.primary}`,
        boxShadow: `0 0 15px rgba(${MIME_COLORS.primaryRgb}, 0.25)`,
      }}>
        {/* Catégorie */}
        {category && (
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: MIME_COLORS.primary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 6,
            opacity: 0.8,
          }}>
            {category}
          </span>
        )}
        {/* Mot */}
        <span style={{
          fontFamily: "'Bungee', cursive",
          fontSize: 'clamp(1.25rem, 6vw, 1.75rem)',
          color: '#ffffff',
          textAlign: 'center',
          padding: '0 12px',
          textShadow: `0 0 8px rgba(${MIME_COLORS.primaryRgb}, 0.6)`,
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
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)',
          border: `2px solid rgba(${MIME_COLORS.primaryRgb}, 0.5)`,
          boxShadow: `0 4px 15px rgba(0, 0, 0, 0.6)`,
          cursor: disabled ? 'not-allowed' : 'grab',
          touchAction: 'none',
        }}
        drag={disabled ? false : 'y'}
        dragConstraints={{ top: maxDrag, bottom: 0 }}
        dragElastic={0.05}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileDrag={{ cursor: 'grabbing' }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: 12,
        }}>
          {/* Titre + Flèche sur la même ligne */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: "'Bungee', cursive",
              fontSize: 18,
              color: '#ffffff',
              textShadow: `0 0 6px rgba(${MIME_COLORS.primaryRgb}, 0.5)`,
            }}>
              Ton mot
            </span>
            <motion.div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `rgba(${MIME_COLORS.primaryRgb}, 0.2)`,
                border: `2px solid rgba(${MIME_COLORS.primaryRgb}, 0.7)`,
                borderRadius: '50%',
              }}
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: MIME_COLORS.primary,
              }}>
                ↑
              </span>
            </motion.div>
          </div>

          {/* Instruction */}
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.5)',
          }}>
            Glisse vers le haut
          </span>
        </div>
      </motion.div>
    </div>
  );
}
