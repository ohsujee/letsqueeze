"use client";
import { motion } from 'framer-motion';
import { useState } from 'react';

export const BuzzerPremium = ({ onBuzz, disabled, state = 'inactive', label = "BUZZ!" }) => {
  const [ripples, setRipples] = useState([]);

  const handleBuzz = (e) => {
    if (disabled) return;

    // Créer effet ripple à la position du clic
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setRipples([...ripples, { x, y, id: Date.now() }]);

    // Vibration haptique (mobile)
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }

    onBuzz();
  };

  const getBackgroundStyle = () => {
    switch(state) {
      case 'active':
        return 'radial-gradient(circle at 50% 50%, #EF4444, #DC2626, #B91C1C)';
      case 'success':
        return 'radial-gradient(circle at 50% 50%, #10B981, #059669, #047857)';
      case 'blocked':
        return 'radial-gradient(circle at 50% 50%, #F59E0B, #D97706, #B45309)';
      default:
        return 'radial-gradient(circle at 50% 50%, #64748B, #475569, #334155)';
    }
  };

  return (
    <motion.button
      className="buzzer-premium"
      onClick={handleBuzz}
      disabled={disabled || state === 'inactive'}

      // Animation au clic
      whileTap={!disabled && state !== 'inactive' ? { scale: 0.9 } : {}}

      // Pulsation quand actif
      animate={state === 'active' ? {
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 20px rgba(239, 68, 68, 0.5)',
          '0 0 40px rgba(239, 68, 68, 0.8)',
          '0 0 20px rgba(239, 68, 68, 0.5)',
        ]
      } : {}}
      transition={{
        repeat: state === 'active' ? Infinity : 0,
        duration: 1.5,
        ease: "easeInOut"
      }}

      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '400px',
        height: '120px',
        borderRadius: '60px',
        border: '6px solid rgba(255, 255, 255, 0.3)',
        fontSize: '2.5rem',
        fontWeight: 900,
        letterSpacing: '0.2em',
        cursor: disabled || state === 'inactive' ? 'not-allowed' : 'pointer',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2), inset 0 -2px 10px rgba(0, 0, 0, 0.3)',
        background: getBackgroundStyle(),
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)`
      }}
    >
      {/* Cercles concentriques animés */}
      {state === 'active' && (
        <>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="buzzer-ring"
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{
                scale: 3,
                opacity: 0,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                inset: 0,
                border: '4px solid white',
                borderRadius: '50%',
              }}
            />
          ))}
        </>
      )}

      {/* Ripples au clic */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          onAnimationComplete={() => {
            setRipples(r => r.filter(x => x.id !== ripple.id));
          }}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {/* Shine effect traversant */}
      {state === 'active' && (
        <motion.div
          className="buzzer-shine"
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: "linear",
            repeatDelay: 2
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Texte avec effet glow */}
      <motion.span
        className="buzzer-text"
        animate={state === 'active' ? {
          textShadow: [
            '0 0 10px #fff',
            '0 0 20px #fff, 0 0 30px #fff',
            '0 0 10px #fff',
          ]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{
          position: 'relative',
          zIndex: 10,
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        {label}
      </motion.span>
    </motion.button>
  );
};
