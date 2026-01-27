"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

/**
 * Icône VALIDÉ - Checkmark animé avec glow pulsant
 */
function ValidIcon({ size = 120, color = "#22c55e", glowColor = "#4ade80" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      {/* Glow pulsant derrière */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(10px)'
        }}
      />

      {/* Cercle principal */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${glowColor})`,
          boxShadow: `
            0 0 40px ${glowColor},
            0 0 80px ${color},
            inset 0 -4px 20px rgba(0,0,0,0.3),
            inset 0 4px 20px rgba(255,255,255,0.3)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Checkmark SVG animé */}
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          <motion.path
            d="M4 12.5L9.5 18L20 6"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/**
 * Icône REFUSÉ - X animé avec effet d'explosion
 */
function RefuseIcon({ size = 120, color = "#ef4444", glowColor = "#f87171" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      {/* Shockwave effect */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{
          scale: [0.5, 2.5],
          opacity: [0.8, 0]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "easeOut"
        }}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`
        }}
      />

      {/* Cercle principal avec cracks */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, #b91c1c)`,
          boxShadow: `
            0 0 40px ${glowColor},
            0 0 80px ${color},
            inset 0 -4px 20px rgba(0,0,0,0.4),
            inset 0 4px 20px rgba(255,255,255,0.2)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* X animé */}
        <svg
          width={size * 0.45}
          height={size * 0.45}
          viewBox="0 0 24 24"
          fill="none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          <motion.path
            d="M6 6L18 18"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          />
          <motion.path
            d="M18 6L6 18"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          />
        </svg>
      </motion.div>

      {/* Éclats qui partent */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`shard-${i}`}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1
          }}
          animate={{
            x: Math.cos((i * 30 * Math.PI) / 180) * size * 0.8,
            y: Math.sin((i * 30 * Math.PI) / 180) * size * 0.8,
            scale: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.8,
            delay: 0.3,
            repeat: Infinity,
            repeatDelay: 2
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 6,
            height: 16,
            marginLeft: -3,
            marginTop: -8,
            background: glowColor,
            borderRadius: 3,
            transform: `rotate(${i * 30}deg)`,
            boxShadow: `0 0 10px ${glowColor}`
          }}
        />
      ))}
    </div>
  );
}

/**
 * Icône TIMEOUT - Sablier animé élégant
 */
function TimeoutIcon({ size = 120, color = "#f59e0b", glowColor = "#fbbf24" }) {
  return (
    <div className="verdict-icon-container" style={{ width: size, height: size }}>
      {/* Glow pulsant doux */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.6, 0.4]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(10px)'
        }}
      />

      {/* Cercle principal */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, #d97706)`,
          boxShadow: `
            0 0 40px ${glowColor},
            0 0 80px ${color},
            inset 0 -4px 20px rgba(0,0,0,0.3),
            inset 0 4px 20px rgba(255,255,255,0.3)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Sablier SVG animé */}
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          {/* Cadre du sablier - haut */}
          <motion.path
            d="M5 3H19"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
          />
          {/* Cadre du sablier - bas */}
          <motion.path
            d="M5 21H19"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
          {/* Corps du sablier - gauche */}
          <motion.path
            d="M6 3V6C6 8 8 10 12 12C8 14 6 16 6 18V21"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          {/* Corps du sablier - droite */}
          <motion.path
            d="M18 3V6C18 8 16 10 12 12C16 14 18 16 18 18V21"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />

          {/* Sable en haut - forme triangulaire qui diminue */}
          <motion.path
            d="M8 5L12 9L16 5"
            fill="white"
            fillOpacity="0.9"
            initial={{ opacity: 1, scaleY: 1 }}
            animate={{
              opacity: [0.9, 0.3, 0.9],
              scaleY: [1, 0.3, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ transformOrigin: '12px 5px' }}
          />

          {/* Filet de sable qui coule - plusieurs grains */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={`grain-${i}`}
              cx="12"
              r="0.8"
              fill="white"
              initial={{ cy: 11, opacity: 0 }}
              animate={{
                cy: [11, 14, 17],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.25,
                repeat: Infinity,
                ease: "easeIn"
              }}
            />
          ))}

          {/* Sable en bas - forme triangulaire qui augmente */}
          <motion.path
            d="M8 19L12 15L16 19"
            fill="white"
            fillOpacity="0.9"
            initial={{ opacity: 0.3, scaleY: 0.3 }}
            animate={{
              opacity: [0.3, 0.9, 0.3],
              scaleY: [0.3, 1, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ transformOrigin: '12px 19px' }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/**
 * Particles explosifs
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
          className="verdict-particle"
          initial={{ opacity: 0, x: p.startX, y: p.startY, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: p.endX,
            y: p.endY,
            scale: [0, p.scale, 0]
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      ))}
    </>
  );
}

/**
 * Transition fullscreen spectaculaire pour les verdicts Alibi
 * Style Guide Compliant - Fonts: Bungee, Space Grotesk
 */
export function VerdictTransition({
  isVisible,
  verdict, // "correct" | "incorrect" | "timeout"
  onComplete,
  duration = 3500,
  showButton = false,
  onButtonClick
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStep(0);
      return;
    }

    const timer1 = setTimeout(() => setStep(1), 500);

    if (!showButton) {
      const timer2 = setTimeout(() => setStep(2), duration - 800);
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

  // Configurations selon le verdict (Style Guide colors)
  const configs = {
    correct: {
      gradient: ['rgba(34, 197, 94, 0.97)', 'rgba(22, 163, 74, 0.97)'],
      glow: 'rgba(34, 197, 94, 0.6)',
      accent: '#22c55e',
      accentGlow: '#4ade80',
      IconComponent: ValidIcon,
      title: 'VALIDÉ !',
      subtitle: 'Les suspects sont convaincants !',
      particleColor: '#4ade80'
    },
    incorrect: {
      gradient: ['rgba(239, 68, 68, 0.97)', 'rgba(185, 28, 28, 0.97)'],
      glow: 'rgba(239, 68, 68, 0.6)',
      accent: '#ef4444',
      accentGlow: '#f87171',
      IconComponent: RefuseIcon,
      title: 'REFUSÉ !',
      subtitle: 'Les inspecteurs détectent l\'incohérence !',
      particleColor: '#f87171'
    },
    timeout: {
      gradient: ['rgba(245, 158, 11, 0.97)', 'rgba(217, 119, 6, 0.97)'],
      glow: 'rgba(245, 158, 11, 0.6)',
      accent: '#f59e0b',
      accentGlow: '#fbbf24',
      IconComponent: TimeoutIcon,
      title: 'TEMPS ÉCOULÉ !',
      subtitle: 'Les suspects n\'ont pas répondu à temps !',
      particleColor: '#fbbf24'
    }
  };

  const config = configs[verdict] || configs.timeout;
  const IconComponent = config.IconComponent;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="verdict-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
        }}
      >
        {/* Radial glow effect */}
        <div
          className="verdict-glow-bg"
          style={{
            background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 70%)`
          }}
        />

        {/* Vignette effect */}
        <div className="verdict-vignette" />

        {/* Scanlines */}
        <motion.div
          className="verdict-scanlines"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Flash effect - adouci */}
        <motion.div
          className="verdict-flash"
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 0.8, times: [0, 0.4, 1], ease: "easeInOut" }}
          style={{ background: config.accentGlow }}
        />

        {/* Contenu principal */}
        <div className="verdict-content">
          {/* Icône animée custom */}
          <motion.div
            className="verdict-icon-main"
            initial={{ scale: 0, rotate: verdict === "correct" ? -180 : 0 }}
            animate={step >= 1 ? {
              scale: 1,
              rotate: 0
            } : { scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
          >
            <IconComponent
              size={140}
              color={config.accent}
              glowColor={config.accentGlow}
            />
          </motion.div>

          {/* Titre - Bungee font */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <motion.h1
              className="verdict-title"
              animate={step === 1 ? {
                textShadow: [
                  `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`,
                  `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
                  `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {config.title}
            </motion.h1>
          </motion.div>

          {/* Sous-titre - Inter font */}
          <motion.p
            className="verdict-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {config.subtitle}
          </motion.p>

          {/* Bouton - Space Grotesk font */}
          {showButton && onButtonClick && (
            <motion.button
              className="verdict-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onButtonClick}
              style={{
                color: config.accent,
                boxShadow: `0 4px 30px ${config.glow}, 0 0 60px ${config.glow}`
              }}
            >
              Question suivante
            </motion.button>
          )}

          {/* Barre de progression */}
          {!showButton && (
            <motion.div
              className="verdict-progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: step === 2 ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{
                background: `linear-gradient(90deg, ${config.accent}, white)`,
                boxShadow: `0 0 20px ${config.glow}`
              }}
            />
          )}
        </div>

        {/* Particles explosifs */}
        <ExplosiveParticles count={50} color={config.particleColor} />

        {/* Styles */}
        <style jsx global>{`
          .verdict-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 9999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
          }

          .verdict-glow-bg {
            position: absolute;
            inset: 0;
            opacity: 0.6;
            pointer-events: none;
          }

          .verdict-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
            pointer-events: none;
          }

          .verdict-scanlines {
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.02) 2px,
              rgba(255, 255, 255, 0.02) 4px
            );
            pointer-events: none;
            opacity: 0.5;
          }

          .verdict-flash {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .verdict-content {
            position: relative;
            text-align: center;
            padding: 2rem;
            max-width: 800px;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .verdict-icon-main {
            margin-bottom: 1.5rem;
          }

          .verdict-icon-container {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .verdict-title {
            font-family: 'Bungee', cursive !important;
            font-size: clamp(2.5rem, 10vw, 5rem) !important;
            font-weight: 400 !important;
            color: white !important;
            letter-spacing: 0.02em !important;
            margin: 0 0 1rem 0 !important;
            text-transform: uppercase !important;
            line-height: 1.1 !important;
          }

          .verdict-subtitle {
            font-family: 'Inter', sans-serif !important;
            font-size: clamp(1rem, 4vw, 1.5rem) !important;
            font-weight: 500 !important;
            color: rgba(255, 255, 255, 0.95) !important;
            margin: 0 0 2rem 0 !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4) !important;
            line-height: 1.4 !important;
          }

          .verdict-btn {
            background: rgba(255, 255, 255, 0.97) !important;
            border: none !important;
            border-radius: 12px !important;
            padding: 1rem 2.5rem !important;
            font-family: 'Space Grotesk', sans-serif !important;
            font-size: 1.125rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }

          .verdict-progress {
            height: 4px;
            width: 200px;
            border-radius: 2px;
            transform-origin: left;
            margin-top: 1.5rem;
          }

          .verdict-particle {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            pointer-events: none;
          }

          /* Responsive */
          @media (max-width: 480px) {
            .verdict-icon-main {
              transform: scale(0.7);
            }

            .verdict-title {
              font-size: 2rem !important;
            }

            .verdict-subtitle {
              font-size: 1rem !important;
            }

            .verdict-btn {
              padding: 0.875rem 2rem !important;
              font-size: 1rem !important;
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
