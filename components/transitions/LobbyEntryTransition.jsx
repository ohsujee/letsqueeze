"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Transition d'entrée dans le lobby
 * Affiche une animation de porte qui s'ouvre avec le nom du joueur
 */
export function LobbyEntryTransition({ gameColor, playerName, onComplete, duration = 2500 }) {
  const [step, setStep] = useState(0);

  // Générer une version plus claire pour le glow
  const glowColor = gameColor + "99";
  const accentGlow = gameColor + "cc";

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 300);
    const timer2 = setTimeout(() => setStep(2), duration - 600);
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [duration, onComplete]);

  return (
    <motion.div
      className="transition-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${gameColor}f7, ${gameColor}dd)`
      }}
    >
      {/* Radial glow */}
      <div
        className="transition-glow"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)`
        }}
      />

      {/* Vignette */}
      <div className="transition-vignette" />

      {/* Lumière qui vient de la porte */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.4, 0.2], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, white 0%, ${accentGlow} 30%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none"
        }}
      />

      {/* Contenu principal */}
      <div className="transition-content">
        {/* Icône porte animée */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          style={{ marginBottom: "1.5rem" }}
        >
          <DoorIcon size={120} color={gameColor} glowColor={accentGlow} step={step} />
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.h1
            className="transition-title"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2.5rem)" }}
            animate={step === 1 ? {
              textShadow: [
                `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
                `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
                `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`
              ]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Vous entrez dans le lobby
          </motion.h1>
        </motion.div>

        {/* Sous-titre avec nom du joueur */}
        <motion.p
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {playerName}, préparez-vous...
        </motion.p>

        {/* Barre de progression */}
        <motion.div
          className="transition-progress"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step === 2 ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: `linear-gradient(90deg, ${gameColor}, white)`,
            boxShadow: `0 0 20px ${glowColor}`
          }}
        />
      </div>

      {/* Particules qui convergent vers le centre (effet d'aspiration) */}
      <ConvergingParticles count={15} color={accentGlow} />

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
          font-size: clamp(1.5rem, 6vw, 2.5rem) !important;
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

// Icône de porte qui s'ouvre - avec vraie transformation CSS 3D
function DoorIcon({ size, color, glowColor, step }) {
  const doorWidth = size * 0.6;
  const doorHeight = size * 0.85;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
          filter: "blur(25px)"
        }}
      />

      {/* Container avec perspective */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: "500px",
        }}
      >
        {/* Cadre de porte (chambranle) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute",
            width: doorWidth + 10,
            height: doorHeight + 10,
            border: "4px solid white",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.1)",
          }}
        />

        {/* Lumière intérieure (derrière la porte) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            position: "absolute",
            width: doorWidth,
            height: doorHeight,
            background: "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, white 100%)",
            borderRadius: "2px",
          }}
        />

        {/* Porte qui s'ouvre avec rotateY */}
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: -65 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: doorWidth,
            height: doorHeight,
            background: color,
            border: "3px solid white",
            borderRadius: "3px",
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "12px",
          }}
        >
          {/* Poignée */}
          <div
            style={{
              width: 8,
              height: 8,
              background: "white",
              borderRadius: "50%",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// Particules qui convergent vers le centre
function ConvergingParticles({ count = 15, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    return [...Array(count)].map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const distance = 300 + Math.random() * 200;
      return {
        id: i,
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        duration: 1.5 + Math.random() * 1,
        delay: Math.random() * 0.8,
        size: 3 + Math.random() * 4
      };
    });
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: p.startX, y: p.startY }}
          animate={{
            opacity: [0, 0.9, 0],
            x: 0,
            y: 0,
            scale: [1, 0.5, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn"
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
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
