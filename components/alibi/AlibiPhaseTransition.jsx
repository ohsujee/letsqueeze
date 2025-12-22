"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';

/**
 * Icône Loupe animée - simple et élégante
 */
function SearchIcon({ size = 100 }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          inset: -25,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
          filter: 'blur(15px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Fond du verre - pour le contraste */}
        <motion.circle
          cx="10"
          cy="10"
          r="6.5"
          fill="rgba(255,255,255,0.15)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3, type: "spring" }}
        />
        {/* Cercle de la loupe - trait épais blanc */}
        <motion.circle
          cx="10"
          cy="10"
          r="6.5"
          stroke="white"
          strokeWidth="3"
          fill="none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
        />
        {/* Reflet sur le verre */}
        <motion.path
          d="M6.5 7.5C7.5 6.5 9 6 10.5 6.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        />
        {/* Manche - épais et visible */}
        <motion.line
          x1="15"
          y1="15"
          x2="21"
          y2="21"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * Icône Dossier/Résultats animée
 */
function ResultsIcon({ size = 100, color = "#10b981", glowColor = "#34d399" }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(15px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Dossier */}
        <motion.path
          d="M3 6C3 5 4 4 5 4H9L11 6H19C20 6 21 7 21 8V18C21 19 20 20 19 20H5C4 20 3 19 3 18V6Z"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        />
        {/* Lignes de texte */}
        <motion.line x1="7" y1="11" x2="17" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.3 }} />
        <motion.line x1="7" y1="14" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.3 }} />
        <motion.line x1="7" y1="17" x2="11" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 0.3 }} />
        {/* Checkmark */}
        <motion.path
          d="M14 15L16 17L20 13"
          stroke={glowColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * Particles flottantes
 */
function Particles({ count = 15, color = "#fbbf24" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    return [...Array(count)].map((_, i) => ({
      id: i,
      startX: Math.random() * w,
      endX: Math.random() * w,
      duration: 4 + Math.random() * 3,
      delay: Math.random() * 2,
      startY: h + 50,
      size: 3 + Math.random() * 4
    }));
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: p.startX, y: p.startY }}
          animate={{ opacity: [0, 0.8, 0], y: -100, x: p.endX }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            background: color,
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: `0 0 ${p.size * 2}px ${color}`
          }}
        />
      ))}
    </>
  );
}

/**
 * Transition Alibi - Style Guide Compliant
 * Fonts: Bungee (title), Inter (subtitle)
 * Colors: Alibi amber theme
 */
export function AlibiPhaseTransition({
  isVisible,
  title,
  subtitle,
  type = "interrogation", // "interrogation" | "end"
  onComplete,
  duration = 3500
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStep(0);
      return;
    }

    const timer1 = setTimeout(() => setStep(1), 400);
    const timer2 = setTimeout(() => setStep(2), duration - 800);
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, duration, onComplete]);

  const themes = {
    interrogation: {
      gradient: ['rgba(245, 158, 11, 0.97)', 'rgba(217, 119, 6, 0.97)'],
      glow: 'rgba(251, 191, 36, 0.6)',
      accent: '#f59e0b',
      accentGlow: '#fbbf24',
      Icon: SearchIcon
    },
    end: {
      gradient: ['rgba(16, 185, 129, 0.97)', 'rgba(5, 150, 105, 0.97)'],
      glow: 'rgba(52, 211, 153, 0.6)',
      accent: '#10b981',
      accentGlow: '#34d399',
      Icon: ResultsIcon
    }
  };

  const config = themes[type] || themes.interrogation;
  const IconComponent = config.Icon;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="alibi-phase-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
        }}
      >
        {/* Radial glow */}
        <div
          className="alibi-phase-glow"
          style={{
            background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 60%)`
          }}
        />

        {/* Vignette */}
        <div className="alibi-phase-vignette" />

        {/* Scanlines */}
        <motion.div
          className="alibi-phase-scanlines"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />

        {/* Flash subtil */}
        <motion.div
          className="alibi-phase-flash"
          animate={{ opacity: [0, 0.1, 0] }}
          transition={{ duration: 1, ease: "easeInOut" }}
          style={{ background: config.accentGlow }}
        />

        {/* Contenu principal */}
        <div className="alibi-phase-content">
          {/* Icône animée */}
          <div className="alibi-phase-icon">
            <IconComponent
              size={120}
              color={config.accent}
              glowColor={config.accentGlow}
            />
          </div>

          {/* Titre - Bungee */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.h1
              className="alibi-phase-title"
              animate={step === 1 ? {
                textShadow: [
                  `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`,
                  `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
                  `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {title}
            </motion.h1>
          </motion.div>

          {/* Sous-titre - Inter */}
          {subtitle && (
            <motion.p
              className="alibi-phase-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}

          {/* Barre de progression */}
          <motion.div
            className="alibi-phase-progress"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: step === 2 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              background: `linear-gradient(90deg, ${config.accent}, white)`,
              boxShadow: `0 0 20px ${config.glow}`
            }}
          />
        </div>

        {/* Particles */}
        <Particles count={20} color={config.accentGlow} />

        {/* Styles */}
        <style jsx global>{`
          .alibi-phase-overlay {
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

          .alibi-phase-glow {
            position: absolute;
            inset: 0;
            opacity: 0.7;
            pointer-events: none;
          }

          .alibi-phase-vignette {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
            pointer-events: none;
          }

          .alibi-phase-scanlines {
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
            opacity: 0.4;
          }

          .alibi-phase-flash {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .alibi-phase-content {
            position: relative;
            text-align: center;
            padding: 2rem;
            max-width: 600px;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .alibi-phase-icon {
            margin-bottom: 1.5rem;
          }

          .alibi-phase-title {
            font-family: 'Bungee', cursive !important;
            font-size: clamp(2rem, 8vw, 4rem) !important;
            font-weight: 400 !important;
            color: white !important;
            letter-spacing: 0.02em !important;
            margin: 0 0 1rem 0 !important;
            text-transform: uppercase !important;
            line-height: 1.1 !important;
          }

          .alibi-phase-subtitle {
            font-family: 'Inter', sans-serif !important;
            font-size: clamp(1rem, 4vw, 1.5rem) !important;
            font-weight: 500 !important;
            color: rgba(255, 255, 255, 0.9) !important;
            margin: 0 0 2rem 0 !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
            line-height: 1.4 !important;
          }

          .alibi-phase-progress {
            height: 4px;
            width: 200px;
            border-radius: 2px;
            transform-origin: left;
            margin-top: 1rem;
          }

          @media (max-width: 480px) {
            .alibi-phase-title {
              font-size: 2rem !important;
            }

            .alibi-phase-subtitle {
              font-size: 1rem !important;
            }

            .alibi-phase-icon {
              transform: scale(0.8);
            }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
