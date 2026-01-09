"use client";
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGameAudio } from '@/lib/hooks/useGameAudio';

export const JuicyButton = ({ children, onClick, className = "", disabled = false, ...props }) => {
  const [particles, setParticles] = useState([]);
  const audio = useGameAudio();

  const handleClick = (e) => {
    if (disabled) return;

    // Son
    audio.play('ui/button-click');

    // Particules
    const rect = e.currentTarget.getBoundingClientRect();
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      angle: (i * 45) * Math.PI / 180
    }));
    setParticles(p => [...p, ...newParticles]);

    // Vibration
    if (navigator.vibrate) navigator.vibrate(10);

    onClick?.(e);
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onHoverStart={() => !disabled && audio.play('ui/button-hover', { volume: 0.3 })}
      onClick={handleClick}
      disabled={disabled}
      className={`btn ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
      {...props}
    >
      {children}

      {/* Particules click */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
          animate={{
            x: p.x + Math.cos(p.angle) * 50,
            y: p.y + Math.sin(p.angle) * 50,
            scale: 0,
            opacity: 0
          }}
          transition={{ duration: 0.6 }}
          onAnimationComplete={() => {
            setParticles(ps => ps.filter(x => x.id !== p.id));
          }}
          className="particle"
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--quiz-glow, #a78bfa)',
            boxShadow: '0 0 8px var(--quiz-primary, #8b5cf6)',
            pointerEvents: 'none'
          }}
        />
      ))}
    </motion.button>
  );
};
