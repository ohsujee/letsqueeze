"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

/**
 * Particles explosifs - composant séparé pour éviter glitches SSR
 */
function ExplosiveParticles({ count = 30, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return [...Array(count)].map((_, i) => ({
      id: i,
      startX: cx,
      startY: cy,
      endX: cx + (Math.random() - 0.5) * 800,
      endY: cy + (Math.random() - 0.5) * 800,
      scale: Math.random() * 2 + 1,
      duration: 2 + Math.random(),
      delay: Math.random() * 0.5
    }));
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: p.startX, y: p.startY, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: p.endX,
            y: p.endY,
            scale: [0, p.scale, 0]
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: color,
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: `0 0 10px ${color}`
          }}
        />
      ))}
    </>
  );
}

/**
 * Transition fullscreen spectaculaire pour les verdicts Alibi
 * Styles AAA cinématiques pour Validé/Refusé/Temps écoulé
 */
export function VerdictTransition({
  isVisible,
  verdict, // "correct" | "incorrect" | "timeout"
  onComplete,
  duration = 3500,
  showButton = false,
  onButtonClick
}) {
  const [step, setStep] = useState(0); // 0: fade in, 1: show, 2: fade out

  useEffect(() => {
    if (!isVisible) return;

    // Step 0 → 1: Affichage principal
    const timer1 = setTimeout(() => setStep(1), 500);

    // Si pas de bouton, auto-close après duration
    if (!showButton) {
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
    }

    return () => {
      clearTimeout(timer1);
    };
  }, [isVisible, duration, onComplete, showButton]);

  // Configurations selon le verdict
  const configs = {
    correct: {
      gradient: ['rgba(16, 185, 129, 0.95)', 'rgba(5, 150, 105, 0.95)'],
      glow: 'rgba(16, 185, 129, 0.6)',
      accent: '#10B981',
      icon: '🎉',
      title: 'VALIDÉ !',
      subtitle: 'Les suspects sont convaincants !',
      particleColor: '#10B981'
    },
    incorrect: {
      gradient: ['rgba(239, 68, 68, 0.95)', 'rgba(220, 38, 38, 0.95)'],
      glow: 'rgba(239, 68, 68, 0.6)',
      accent: '#EF4444',
      icon: '💥',
      title: 'REFUSÉ !',
      subtitle: 'Les inspecteurs détectent l\'incohérence !',
      particleColor: '#EF4444'
    },
    timeout: {
      gradient: ['rgba(251, 191, 36, 0.95)', 'rgba(245, 158, 11, 0.95)'],
      glow: 'rgba(245, 158, 11, 0.6)',
      accent: '#F59E0B',
      icon: '⏰',
      title: 'TEMPS ÉCOULÉ !',
      subtitle: 'Les suspects n\'ont pas répondu à temps !',
      particleColor: '#F59E0B'
    }
  };

  const config = configs[verdict] || configs.timeout;

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
          background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
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

        {/* Flash effect sur le background */}
        <motion.div
          animate={{
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: 0.8,
            times: [0, 0.3, 1],
            repeat: 2
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: config.accent,
            pointerEvents: 'none'
          }}
        />

        {/* Contenu principal */}
        <div style={{
          position: 'relative',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '800px'
        }}>
          {/* Icône géante avec animation */}
          <motion.div
            initial={{ scale: 0, rotate: verdict === "correct" ? -180 : 0 }}
            animate={step >= 1 ? {
              scale: [1, 1.3, 1],
              rotate: verdict === "correct" ? [0, 360] : [0, -10, 10, 0]
            } : {}}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              scale: { duration: 0.8, repeat: showButton ? Infinity : 0, repeatDelay: 0.5 },
              rotate: { duration: verdict === "correct" ? 1 : 0.6 }
            }}
            style={{
              fontSize: '10rem',
              marginBottom: '1.5rem',
              filter: `drop-shadow(0 0 60px ${config.glow})`,
              lineHeight: 1
            }}
          >
            {config.icon}
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
                  `0 0 20px ${config.glow}`,
                  `0 0 80px ${config.glow}`,
                  `0 0 20px ${config.glow}`
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                fontSize: 'clamp(3rem, 10vw, 6rem)',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                lineHeight: 1
              }}
            >
              {config.title}
            </motion.h1>
          </motion.div>

          {/* Sous-titre */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '2rem',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            {config.subtitle}
          </motion.p>

          {/* Bouton (si demandé) */}
          {showButton && onButtonClick && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onButtonClick}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: config.accent,
                border: 'none',
                borderRadius: '1rem',
                padding: '1.25rem 3rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 30px ${config.glow}`,
                marginTop: '1rem'
              }}
            >
              Continuer
            </motion.button>
          )}

          {/* Barre de progression (si pas de bouton) */}
          {!showButton && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: step === 2 ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                height: '4px',
                background: `linear-gradient(90deg, ${config.accent}, white)`,
                borderRadius: '2px',
                transformOrigin: 'left',
                boxShadow: `0 0 20px ${config.glow}`
              }}
            />
          )}
        </div>

        {/* Particles explosifs */}
        <ExplosiveParticles count={30} color={config.particleColor} />
      </motion.div>
    </AnimatePresence>
  );
}
