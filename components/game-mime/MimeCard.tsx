'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { HandPointing } from '@phosphor-icons/react';

interface MimeCardProps {
  word: string;
  category?: string;
  onReveal?: () => void;
  revealed?: boolean;
  disabled?: boolean;
}

export default function MimeCard({ word, category, onReveal, revealed = false, disabled = false }: MimeCardProps) {
  const [isHolding, setIsHolding] = useState(false);
  const hasTriggeredRevealRef = useRef(false);

  const startHold = (e: React.SyntheticEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsHolding(true);
    if (!hasTriggeredRevealRef.current && onReveal) {
      hasTriggeredRevealRef.current = true;
      onReveal();
    }
  };

  const cancelHold = () => {
    setIsHolding(false);
  };

  // Reset quand le mot change
  useEffect(() => {
    hasTriggeredRevealRef.current = false;
    setIsHolding(false);
  }, [word]);

  // Window listeners — reset fiable même si on relâche en dehors de la card
  useEffect(() => {
    if (!isHolding) return;
    const handleUp = () => cancelHold();
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [isHolding]);

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

      {/* === CARTE DU MOT (derrière, visible uniquement pendant le hold) === */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'var(--game-color, #059669)',
        borderBottom: '4px solid var(--game-dark, #065f46)',
      }}>
        {category && (
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            {category}
          </span>
        )}
        <span style={{
          fontFamily: "'Bungee', cursive",
          fontSize: 'clamp(1.25rem, 6vw, 1.75rem)',
          color: '#fff',
          textAlign: 'center',
          padding: '0 12px',
          lineHeight: 1.2,
        }}>
          {word}
        </span>
      </div>

      {/* === CARTE COVER (devant, slide up pour révéler / slide down pour masquer) === */}
      <motion.div
        onMouseDown={startHold}
        onTouchStart={startHold}
        animate={{
          y: isHolding ? '-105%' : '0%',
          rotate: isHolding ? -3 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 28,
          mass: 0.8,
        }}
        style={{
          position: 'absolute',
          inset: -3,
          zIndex: 10,
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          borderBottom: '4px solid #0e0e1a',
          cursor: disabled ? 'not-allowed' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'hidden',
          transformOrigin: 'bottom center',
          boxShadow: isHolding
            ? '0 14px 28px rgba(0, 0, 0, 0.4)'
            : '0 0 0 rgba(0, 0, 0, 0)',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: 12,
        }}>
          {/* Icône doigt animée — tap gesture */}
          <motion.div
            animate={{ y: [0, -4, 0], scale: [1, 0.92, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <HandPointing size={28} weight="fill" />
          </motion.div>

          <span style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 16,
            color: '#fff',
            lineHeight: 1,
          }}>
            Ton mot
          </span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
          }}>
            Reste appuyé pour révéler
          </span>
        </div>
      </motion.div>
    </div>
  );
}
