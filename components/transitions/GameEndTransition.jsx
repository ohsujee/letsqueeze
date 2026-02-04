"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Transition de fin de partie avant l'affichage des résultats
 * Affiche une animation fullscreen avec icône, titre et barre de progression
 */
export function GameEndTransition({ variant, onComplete, duration = 3500 }) {
  const [step, setStep] = useState(0);
  // Use ref to avoid resetting timers when onComplete prop changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 400);
    const timer2 = setTimeout(() => setStep(2), duration - 800);
    const timer3 = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [duration]); // onComplete removed from deps - using ref instead

  // Configuration par jeu
  const configs = {
    "quiz": {
      gradient: ["rgba(139, 92, 246, 0.97)", "rgba(109, 40, 217, 0.97)"],
      glow: "rgba(139, 92, 246, 0.6)",
      accent: "#8b5cf6",
      accentGlow: "#a78bfa",
      title: "Calcul des scores",
      subtitle: "Préparez-vous pour le podium...",
      icon: "trophy",
      particleColor: "#a78bfa"
    },
    "deeztest": {
      gradient: ["rgba(162, 56, 255, 0.97)", "rgba(130, 30, 220, 0.97)"],
      glow: "rgba(162, 56, 255, 0.6)",
      accent: "#A238FF",
      accentGlow: "#c084fc",
      title: "Résultats en cours",
      subtitle: "Qui connaît le mieux la musique ?",
      icon: "music",
      particleColor: "#c084fc"
    },
    "alibi": {
      gradient: ["rgba(245, 158, 11, 0.97)", "rgba(217, 119, 6, 0.97)"],
      glow: "rgba(245, 158, 11, 0.6)",
      accent: "#f59e0b",
      accentGlow: "#fbbf24",
      title: "Enquête Terminée",
      subtitle: "Découvrez les résultats...",
      icon: "folder",
      particleColor: "#fbbf24"
    },
    "laregle": {
      gradient: ["rgba(6, 182, 212, 0.97)", "rgba(8, 145, 178, 0.97)"],
      glow: "rgba(6, 182, 212, 0.6)",
      accent: "#06b6d4",
      accentGlow: "#22d3ee",
      title: "Règle Révélée",
      subtitle: "Découvrez les scores...",
      icon: "lightbulb",
      particleColor: "#22d3ee"
    },
    "mime": {
      gradient: ["rgba(0, 255, 102, 0.97)", "rgba(0, 204, 82, 0.97)"],
      glow: "rgba(0, 255, 102, 0.6)",
      accent: "#00ff66",
      accentGlow: "#4dff8d",
      title: "Partie Terminée",
      subtitle: "Qui est le meilleur mimeur ?",
      icon: "theater",
      particleColor: "#4dff8d"
    }
  };

  const config = configs[variant] || configs.quiz;

  return (
    <motion.div
      className="transition-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
      }}
    >
      {/* Radial glow */}
      <div
        className="transition-glow"
        style={{
          background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 60%)`
        }}
      />

      {/* Vignette */}
      <div className="transition-vignette" />

      {/* Scanlines */}
      <motion.div
        className="transition-scanlines"
        animate={{ y: ["-100%", "100%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Flash subtil */}
      <motion.div
        className="transition-flash"
        animate={{ opacity: [0, 0.12, 0] }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ background: config.accentGlow }}
      />

      {/* Contenu principal */}
      <div className="transition-content">
        {/* Icône animée */}
        <TransitionIcon
          type={config.icon}
          color={config.accent}
          glowColor={config.accentGlow}
          step={step}
        />

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.h1
            className="transition-title"
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

        {/* Sous-titre */}
        <motion.p
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {config.subtitle}
        </motion.p>

        {/* Barre de progression */}
        <motion.div
          className="transition-progress"
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
      <FloatingParticles count={20} color={config.particleColor} />

      <style jsx global>{`
        .transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .transition-glow {
          position: absolute;
          inset: 0;
          opacity: 0.7;
          pointer-events: none;
        }

        .transition-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
          pointer-events: none;
        }

        .transition-scanlines {
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
        }

        .transition-flash {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .transition-content {
          position: relative;
          text-align: center;
          padding: 2rem;
          max-width: 600px;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .transition-title {
          font-family: 'Bungee', cursive !important;
          font-size: clamp(1.8rem, 8vw, 3rem) !important;
          font-weight: 400 !important;
          color: white !important;
          letter-spacing: 0.02em !important;
          margin: 0 0 1rem 0 !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
        }

        .transition-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: clamp(1rem, 4vw, 1.5rem) !important;
          font-weight: 500 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          margin: 0 0 2rem 0 !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
          line-height: 1.4 !important;
        }

        .transition-progress {
          height: 4px;
          width: 200px;
          border-radius: 2px;
          transform-origin: left;
          margin-top: 1rem;
        }
      `}</style>
    </motion.div>
  );
}

// ============================================
// ICÔNES DE TRANSITION
// ============================================

function TransitionIcon({ type, color, glowColor, step }) {
  const size = 120;

  const icons = {
    trophy: <TrophyIcon size={size} color={color} glowColor={glowColor} />,
    music: <MusicIcon size={size} color={color} glowColor={glowColor} />,
    folder: <FolderIcon size={size} color={color} glowColor={glowColor} />,
    lightbulb: <LightbulbIcon size={size} color={color} glowColor={glowColor} />,
    theater: <TheaterIcon size={size} color={color} glowColor={glowColor} />,
  };

  return (
    <motion.div
      className="transition-icon"
      initial={{ scale: 0, rotate: -10 }}
      animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      style={{ marginBottom: "1.5rem" }}
    >
      {icons[type] || icons.trophy}
    </motion.div>
  );
}

function TrophyIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M12 17V14M12 14C14.5 14 16 12 16 9V4H8V9C8 12 9.5 14 12 14Z"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.path
          d="M16 5H18C19 5 20 6 20 7C20 9 18 10 16 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        />
        <motion.path
          d="M8 5H6C5 5 4 6 4 7C4 9 6 10 8 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        />
        <motion.path
          d="M9 21H15M12 17V21"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        />
        <motion.path
          d="M12 7L12.5 8.5H14L12.75 9.5L13.25 11L12 10L10.75 11L11.25 9.5L10 8.5H11.5L12 7Z"
          fill={glowColor}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, type: "spring" }}
        />
      </svg>
    </div>
  );
}

function MusicIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M7 19V8M17 17V6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        <motion.path
          d="M7 8L17 6M7 11L17 9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
        <motion.ellipse
          cx="5"
          cy="19"
          rx="3"
          ry="2.5"
          fill="white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transform="rotate(-20 5 19)"
          transition={{ delay: 0.7, type: "spring" }}
        />
        <motion.ellipse
          cx="15"
          cy="17"
          rx="3"
          ry="2.5"
          fill="white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transform="rotate(-20 15 17)"
          transition={{ delay: 0.8, type: "spring" }}
        />
      </svg>
    </div>
  );
}

function FolderIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M3 6C3 5 4 4 5 4H9L11 6H19C20 6 21 7 21 8V18C21 19 20 20 19 20H5C4 20 3 19 3 18V6Z"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        />
        <motion.line
          x1="7" y1="11" x2="17" y2="11"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        />
        <motion.line
          x1="7" y1="14" x2="14" y2="14"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        />
        <motion.line
          x1="7" y1="17" x2="11" y2="17"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        />
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
    </div>
  );
}

function LightbulbIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -15,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
          filter: "blur(20px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M12 2C8.5 2 6 5 6 8C6 10.5 7.5 12.5 9 14V17H15V14C16.5 12.5 18 10.5 18 8C18 5 15.5 2 12 2Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        />
        <motion.rect
          x="9"
          y="17"
          width="6"
          height="2"
          rx="1"
          fill="white"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5 }}
        />
        <motion.rect
          x="9"
          y="20"
          width="6"
          height="2"
          rx="1"
          fill="white"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6 }}
        />
      </svg>
    </div>
  );
}

function TheaterIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Theatre masks - Happy mask (left) */}
        <motion.path
          d="M7 8C5.5 8 4 9.5 4 11.5C4 14.5 6 16 8 16C10 16 11 14 11 12V6C11 6 9 6 7 8Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
        />
        {/* Happy eyes */}
        <motion.circle cx="6.5" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
        <motion.circle cx="9" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} />
        {/* Happy smile */}
        <motion.path
          d="M6 12.5C6.5 13.5 7.5 14 8 13.5"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        />
        {/* Sad mask (right) */}
        <motion.path
          d="M17 8C18.5 8 20 9.5 20 11.5C20 14.5 18 16 16 16C14 16 13 14 13 12V6C13 6 15 6 17 8Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          initial={{ scale: 0, rotate: 20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
        />
        {/* Sad eyes */}
        <motion.circle cx="15" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        <motion.circle cx="17.5" cy="10" r="0.8" fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
        {/* Sad frown */}
        <motion.path
          d="M15 14C15.5 13 16.5 12.5 17 13"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        />
        {/* Ribbon at top */}
        <motion.path
          d="M8 4C10 3 14 3 16 4"
          stroke={glowColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        />
        {/* Ribbon tails */}
        <motion.path
          d="M8 4L6 6M16 4L18 6"
          stroke={glowColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
        />
      </svg>
    </div>
  );
}

// ============================================
// PARTICULES FLOTTANTES
// ============================================

function FloatingParticles({ count = 15, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    const w = 800;
    const h = 600;
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
            position: "absolute",
            width: p.size,
            height: p.size,
            background: color,
            borderRadius: "50%",
            pointerEvents: "none",
            boxShadow: `0 0 ${p.size * 2}px ${color}`
          }}
        />
      ))}
    </>
  );
}
