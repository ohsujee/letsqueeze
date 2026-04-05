"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { darkenColor } from "@/lib/utils/colorUtils";

/**
 * Countdown flat cartoon 3, 2, 1, GO!
 * Fond solide couleur du jeu, chiffres blancs gros, particules blanches.
 */
export function GameLaunchCountdown({ gameColor = '#8b5cf6', onComplete }) {
  const [step, setStep] = useState(-1);
  const steps = ["3", "2", "1", "GO!"];
  const duration = 500;
  const darkerColor = darkenColor(gameColor, 40);

  useEffect(() => {
    const timers = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setStep(i);
        // Vibration à chaque chiffre — plus forte sur GO!
        navigator?.vibrate?.(i === 3 ? [100, 50, 100] : [40]);
      }, i * duration + 100));
    });
    timers.push(setTimeout(() => { if (onComplete) onComplete(); }, steps.length * duration + 300));
    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: gameColor,
      }}
    >
      {/* Countdown numbers */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="popLayout">
          {step >= 0 && (
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <span style={{
                fontFamily: "'Bungee', cursive",
                fontSize: step === 3 ? 'clamp(5rem, 25vw, 10rem)' : 'clamp(8rem, 40vw, 16rem)',
                fontWeight: 400,
                color: '#fff',
                display: 'block',
                lineHeight: 1,
              }}>
                {steps[step]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact ring */}
        {step >= 0 && (
          <motion.div
            key={`ring-${step}`}
            initial={{ scale: 0.3, opacity: 0.5 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '3px solid rgba(255, 255, 255, 0.4)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Flat particles — petits carrés blancs */}
      <FlatParticles step={step} />

      {/* Bottom bar — border de profondeur */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '6px',
        background: darkerColor,
      }} />
    </motion.div>
  );
}

function FlatParticles({ step }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (step < 0) return;
    const newParticles = [...Array(10)].map((_, i) => ({
      id: `${step}-${i}`,
      angle: (i / 10) * Math.PI * 2,
      distance: 100 + Math.random() * 100,
      size: 6 + Math.random() * 6,
      duration: 0.4 + Math.random() * 0.2,
      isSquare: Math.random() > 0.5,
    }));
    setParticles(newParticles);
  }, [step]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: 0,
            opacity: 0,
            rotate: p.isSquare ? 180 : 0,
          }}
          transition={{ duration: p.duration, ease: "easeOut" }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            background: '#fff',
            borderRadius: p.isSquare ? '2px' : '50%',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
