"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Countdown de lancement 3, 2, 1, GO!
 * Affiche une animation fullscreen avant le début de la partie
 */
export function GameLaunchCountdown({ gameColor, onComplete }) {
  const [step, setStep] = useState(-1); // -1=rien, 0=3, 1=2, 2=1, 3=GO

  const steps = ["3", "2", "1", "GO!"];
  const duration = 500; // Durée égale pour chaque chiffre

  useEffect(() => {
    const timers = [];

    // Affiche chaque chiffre avec timing égal
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setStep(i);
      }, i * duration + 100)); // +100ms délai initial
    });

    // Fin de l'animation
    timers.push(setTimeout(() => {
      if (onComplete) onComplete();
    }, steps.length * duration + 300));

    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  const glowColor = `${gameColor}99`;

  return (
    <motion.div
      className="countdown-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${gameColor}f5, ${gameColor}dd)`,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)`,
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Countdown numbers */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="popLayout">
          {step >= 0 && (
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: [0.5, 1.15, 1],
                opacity: 1,
              }}
              exit={{
                scale: 1.8,
                opacity: 0,
              }}
              transition={{
                duration: 0.15,
                ease: "easeOut",
              }}
              style={{
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: step === 3 ? 'clamp(5rem, 25vw, 10rem)' : 'clamp(8rem, 40vw, 16rem)',
                  fontWeight: 400,
                  color: 'white',
                  textShadow: `
                    0 0 20px ${glowColor},
                    0 0 40px ${glowColor},
                    0 0 80px ${gameColor},
                    0 4px 0 rgba(0,0,0,0.3)
                  `,
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {steps[step]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact ring - centré, un par chiffre */}
        {step >= 0 && (
          <motion.div
            key={`ring-${step}`}
            initial={{ scale: 0.3, opacity: 0.4 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: `2px solid rgba(255, 255, 255, 0.6)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Particles burst on each number */}
      <CountdownParticles color={gameColor} step={step} />

      <style jsx global>{`
        .countdown-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
}

// Particules qui explosent à chaque chiffre
function CountdownParticles({ color, step }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (step < 0) return; // Pas de particules avant le countdown

    // Génère de nouvelles particules à chaque changement de step
    const newParticles = [...Array(12)].map((_, i) => ({
      id: `${step}-${i}`,
      angle: (i / 12) * Math.PI * 2,
      distance: 150 + Math.random() * 100,
      size: 4 + Math.random() * 6,
      duration: 0.4 + Math.random() * 0.2,
    }));
    setParticles(newParticles);
  }, [step]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: p.duration,
            ease: "easeOut",
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            background: 'white',
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
