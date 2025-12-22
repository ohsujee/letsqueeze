'use client';

import { motion } from 'framer-motion';

/**
 * GameLoader - Animation de chargement stylisée pour jeux
 *
 * Variantes:
 * - "dots" (défaut): 3 points qui rebondissent
 * - "pulse": Cercle pulsant
 * - "spinner": Anneau qui tourne
 * - "bars": Barres d'égaliseur
 */
export default function GameLoader({
  variant = 'dots',
  size = 'md',
  color = 'primary',
  text = null,
  className = ''
}) {
  const sizes = {
    sm: { dot: 8, gap: 6, text: '0.75rem' },
    md: { dot: 12, gap: 8, text: '0.875rem' },
    lg: { dot: 16, gap: 10, text: '1rem' },
    xl: { dot: 20, gap: 12, text: '1.125rem' }
  };

  const colors = {
    primary: '#8b5cf6',
    alibi: '#f59e0b',
    success: '#22c55e',
    danger: '#ef4444',
    white: '#ffffff'
  };

  const { dot: dotSize, gap, text: textSize } = sizes[size] || sizes.md;
  const currentColor = colors[color] || colors.primary;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  };

  const textStyle = {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    fontSize: textSize,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: 0
  };

  // Variante: Dots (points rebondissants)
  if (variant === 'dots') {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${gap}px` }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: dotSize,
                height: dotSize,
                backgroundColor: currentColor,
                borderRadius: '50%',
                boxShadow: `0 0 ${dotSize}px ${currentColor}66`
              }}
              animate={{
                y: [0, -dotSize * 1.5, 0],
                opacity: [0.5, 1, 0.5],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            style={textStyle}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Variante: Pulse (cercle pulsant)
  if (variant === 'pulse') {
    const pulseSize = dotSize * 4;
    return (
      <div className={className} style={containerStyle}>
        <div style={{
          width: pulseSize,
          height: pulseSize,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <motion.div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: `3px solid ${currentColor}`
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.8, 0, 0.8]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut'
            }}
          />
          <motion.div
            style={{
              width: '50%',
              height: '50%',
              backgroundColor: currentColor,
              borderRadius: '50%'
            }}
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                `0 0 20px ${currentColor}66`,
                `0 0 40px ${currentColor}99`,
                `0 0 20px ${currentColor}66`
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>
        {text && (
          <motion.p
            style={textStyle}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Variante: Spinner (anneau tournant)
  if (variant === 'spinner') {
    const spinnerSize = dotSize * 3;
    return (
      <div className={className} style={containerStyle}>
        <motion.div
          style={{
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: '50%',
            border: `3px solid ${currentColor}33`,
            borderTopColor: currentColor,
            boxShadow: `0 0 20px ${currentColor}4D`
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        {text && (
          <motion.p
            style={textStyle}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Variante: Bars (barres d'égaliseur)
  if (variant === 'bars') {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${gap / 2}px` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              style={{
                width: dotSize / 2,
                backgroundColor: currentColor,
                borderRadius: dotSize / 4,
                boxShadow: `0 0 ${dotSize / 2}px ${currentColor}66`
              }}
              animate={{
                height: [dotSize, dotSize * 2.5, dotSize],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            style={textStyle}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Fallback
  return null;
}

/**
 * FullScreenLoader - Loader en plein écran avec fond
 */
export function FullScreenLoader({
  text = 'Chargement...',
  variant = 'dots',
  color = 'primary'
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      zIndex: 9999
    }}>
      <GameLoader variant={variant} size="lg" color={color} text={text} />
    </div>
  );
}
