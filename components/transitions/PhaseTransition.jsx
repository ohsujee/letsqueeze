"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Transition cinématique entre les phases du jeu
 * Style AAA avec animations spectaculaires
 */
export function PhaseTransition({
  isVisible,
  title,
  subtitle,
  icon = "🎬",
  onComplete,
  duration = 3000,
  theme = "default" // "default", "interrogation", "end"
}) {
  const [step, setStep] = useState(0); // 0: fade in, 1: show, 2: fade out

  useEffect(() => {
    if (!isVisible) return;

    // Step 0 → 1: Affichage principal
    const timer1 = setTimeout(() => setStep(1), 500);

    // Step 1 → 2: Début du fade out
    const timer2 = setTimeout(() => setStep(2), duration - 800);

    // Step 2 → Complete: Fin de la transition
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, duration, onComplete]);

  // Couleurs selon le thème
  const themes = {
    default: {
      gradient: ['rgba(99, 102, 241, 0.9)', 'rgba(59, 130, 246, 0.9)'],
      glow: 'rgba(99, 102, 241, 0.5)',
      accent: '#6366F1'
    },
    interrogation: {
      gradient: ['rgba(255, 109, 0, 0.9)', 'rgba(245, 158, 11, 0.9)'],
      glow: 'rgba(255, 109, 0, 0.5)',
      accent: '#FF6D00'
    },
    end: {
      gradient: ['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)'],
      glow: 'rgba(16, 185, 129, 0.5)',
      accent: '#10B981'
    }
  };

  const currentTheme = themes[theme] || themes.default;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${currentTheme.gradient[0]}, ${currentTheme.gradient[1]})`,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Vignette effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Scanlines (effet film) */}
        <motion.div
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            pointerEvents: 'none',
            opacity: 0.3
          }}
        />

        {/* Contenu principal */}
        <div style={{
          position: 'relative',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '800px'
        }}>
          {/* Icône avec effet de zoom */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={step >= 1 ? {
              scale: [1, 1.2, 1],
              rotate: 0
            } : {}}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              scale: { duration: 0.6 }
            }}
            style={{
              fontSize: '8rem',
              marginBottom: '1.5rem',
              filter: `drop-shadow(0 0 40px ${currentTheme.glow})`,
              lineHeight: 1
            }}
          >
            {icon}
          </motion.div>

          {/* Titre avec glitch effect */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={step >= 1 ? {
              opacity: 1,
              x: 0,
            } : {}}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.h1
              animate={step === 1 ? {
                textShadow: [
                  `0 0 20px ${currentTheme.glow}`,
                  `0 0 60px ${currentTheme.glow}`,
                  `0 0 20px ${currentTheme.glow}`
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '1rem',
                textTransform: 'uppercase',
                lineHeight: 1.1
              }}
            >
              {title}
            </motion.h1>
          </motion.div>

          {/* Sous-titre */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2rem'
              }}
            >
              {subtitle}
            </motion.p>
          )}

          {/* Barre de progression */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: step === 2 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height: '4px',
              background: `linear-gradient(90deg, ${currentTheme.accent}, white)`,
              borderRadius: '2px',
              transformOrigin: 'left',
              boxShadow: `0 0 20px ${currentTheme.glow}`
            }}
          />
        </div>

        {/* Particles flottants */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              x: Math.random() * window.innerWidth,
              y: window.innerHeight + 100
            }}
            animate={{
              opacity: [0, 0.6, 0],
              y: -100,
              x: Math.random() * window.innerWidth
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              background: 'white',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
