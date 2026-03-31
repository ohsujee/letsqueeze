"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ValidIcon, RefuseIcon, TimeoutIcon, ExplosiveParticles } from './VerdictIcons';
import './VerdictTransition.css';

const CONFIGS = {
  correct: {
    gradient: ['rgba(34, 197, 94, 0.97)', 'rgba(22, 163, 74, 0.97)'],
    glow: 'rgba(34, 197, 94, 0.6)',
    accent: '#22c55e', accentGlow: '#4ade80',
    IconComponent: ValidIcon,
    title: 'VALIDÉ !', subtitle: 'Les suspects sont convaincants !',
    particleColor: '#4ade80'
  },
  incorrect: {
    gradient: ['rgba(239, 68, 68, 0.97)', 'rgba(185, 28, 28, 0.97)'],
    glow: 'rgba(239, 68, 68, 0.6)',
    accent: '#ef4444', accentGlow: '#f87171',
    IconComponent: RefuseIcon,
    title: 'REFUSÉ !', subtitle: 'Les inspecteurs détectent l\'incohérence !',
    particleColor: '#f87171'
  },
  timeout: {
    gradient: ['rgba(245, 158, 11, 0.97)', 'rgba(217, 119, 6, 0.97)'],
    glow: 'rgba(245, 158, 11, 0.6)',
    accent: '#f59e0b', accentGlow: '#fbbf24',
    IconComponent: TimeoutIcon,
    title: 'TEMPS ÉCOULÉ !', subtitle: 'Les suspects n\'ont pas répondu à temps !',
    particleColor: '#fbbf24'
  }
};

/**
 * VerdictTransition — Fullscreen animated transition for Alibi verdicts
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
    if (!isVisible) { setStep(0); return; }
    const timer1 = setTimeout(() => setStep(1), 500);
    if (!showButton) {
      const timer2 = setTimeout(() => setStep(2), duration - 800);
      const timer3 = setTimeout(() => { if (onComplete) onComplete(); }, duration);
      return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
    }
    return () => { clearTimeout(timer1); };
  }, [isVisible, duration, onComplete, showButton]);

  const config = CONFIGS[verdict] || CONFIGS.timeout;
  const IconComponent = config.IconComponent;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="verdict-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})` }}
      >
        <div className="verdict-glow-bg" style={{ background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 70%)` }} />
        <div className="verdict-vignette" />
        <motion.div className="verdict-scanlines" animate={{ y: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="verdict-flash" animate={{ opacity: [0, 0.15, 0] }} transition={{ duration: 0.8, times: [0, 0.4, 1], ease: "easeInOut" }} style={{ background: config.accentGlow }} />

        <div className="verdict-content">
          <motion.div
            className="verdict-icon-main"
            initial={{ scale: 0, rotate: verdict === "correct" ? -180 : 0 }}
            animate={step >= 1 ? { scale: 1, rotate: 0 } : { scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <IconComponent size={140} color={config.accent} glowColor={config.accentGlow} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={step >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.4 }}>
            <motion.h1
              className="verdict-title"
              animate={step === 1 ? { textShadow: [`0 0 20px ${config.glow}, 0 0 40px ${config.glow}`, `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`, `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {config.title}
            </motion.h1>
          </motion.div>

          <motion.p className="verdict-subtitle" initial={{ opacity: 0, y: 20 }} animate={step >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5, duration: 0.4 }}>
            {config.subtitle}
          </motion.p>

          {showButton && onButtonClick && (
            <motion.button
              className="verdict-btn"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onButtonClick}
              style={{ color: config.accent, boxShadow: `0 4px 30px ${config.glow}, 0 0 60px ${config.glow}` }}
            >
              Question suivante
            </motion.button>
          )}

          {!showButton && (
            <motion.div
              className="verdict-progress"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: step === 2 ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ background: `linear-gradient(90deg, ${config.accent}, white)`, boxShadow: `0 0 20px ${config.glow}` }}
            />
          )}
        </div>

        <ExplosiveParticles count={50} color={config.particleColor} />
      </motion.div>
    </AnimatePresence>
  );
}
