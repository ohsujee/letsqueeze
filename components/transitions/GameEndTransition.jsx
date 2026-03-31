"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TransitionIcon } from "./TransitionIcons";
import "./GameEndTransition.css";

const CONFIGS = {
  quiz: { gradient: ["rgba(139, 92, 246, 0.97)", "rgba(109, 40, 217, 0.97)"], glow: "rgba(139, 92, 246, 0.6)", accent: "#8b5cf6", accentGlow: "#a78bfa", title: "Calcul des scores", subtitle: "Préparez-vous pour le podium...", icon: "trophy" },
  deeztest: { gradient: ["rgba(162, 56, 255, 0.97)", "rgba(130, 30, 220, 0.97)"], glow: "rgba(162, 56, 255, 0.6)", accent: "#A238FF", accentGlow: "#c084fc", title: "Résultats en cours", subtitle: "Qui connaît le mieux la musique ?", icon: "music" },
  alibi: { gradient: ["rgba(245, 158, 11, 0.97)", "rgba(217, 119, 6, 0.97)"], glow: "rgba(245, 158, 11, 0.6)", accent: "#f59e0b", accentGlow: "#fbbf24", title: "Enquête Terminée", subtitle: "Découvrez les résultats...", icon: "folder" },
  laregle: { gradient: ["rgba(6, 182, 212, 0.97)", "rgba(8, 145, 178, 0.97)"], glow: "rgba(6, 182, 212, 0.6)", accent: "#06b6d4", accentGlow: "#22d3ee", title: "Règle Révélée", subtitle: "Découvrez les scores...", icon: "lightbulb" },
  mime: { gradient: ["rgba(0, 255, 102, 0.97)", "rgba(0, 204, 82, 0.97)"], glow: "rgba(0, 255, 102, 0.6)", accent: "#00ff66", accentGlow: "#4dff8d", title: "Partie Terminée", subtitle: "Qui est le meilleur mimeur ?", icon: "theater" },
  motmystere: { gradient: ["rgba(16, 185, 129, 0.97)", "rgba(5, 150, 105, 0.97)"], glow: "rgba(16, 185, 129, 0.6)", accent: "#10b981", accentGlow: "#34d399", title: "Voyons le classement !", subtitle: "Compare-toi aux autres joueurs du jour", icon: "trophy" },
  semantique: { gradient: ["rgba(249, 115, 22, 0.97)", "rgba(234, 88, 12, 0.97)"], glow: "rgba(249, 115, 22, 0.6)", accent: "#f97316", accentGlow: "#fb923c", title: "Voyons le classement !", subtitle: "Qui est le plus sémantique ?", icon: "trophy" },
  mindlink: { gradient: ["rgba(236, 72, 153, 0.97)", "rgba(219, 39, 119, 0.97)"], glow: "rgba(236, 72, 153, 0.6)", accent: "#ec4899", accentGlow: "#f472b6", title: "Partie Terminée", subtitle: "Découvrez les résultats…", icon: "brainEmoji" },
  total: { gradient: ["rgba(59, 130, 246, 0.97)", "rgba(37, 99, 235, 0.97)"], glow: "rgba(59, 130, 246, 0.6)", accent: "#3b82f6", accentGlow: "#60a5fa", title: "Voyons le classement !", subtitle: "Qui est le meilleur calculateur ?", icon: "trophy" },
};

export function GameEndTransition({ variant, onComplete, duration = 3500, title: titleOverride, subtitle: subtitleOverride }) {
  const [step, setStep] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), duration - 800);
    const t3 = setTimeout(() => { if (onCompleteRef.current) onCompleteRef.current(); }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration]);

  const base = CONFIGS[variant] || CONFIGS.quiz;
  const config = { ...base, title: titleOverride || base.title, subtitle: subtitleOverride || base.subtitle };

  return (
    <motion.div className="transition-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})` }}>
      <div className="transition-glow" style={{ background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 60%)` }} />
      <div className="transition-vignette" />
      <div className="transition-content">
        <TransitionIcon type={config.icon} color={config.accent} glowColor={config.accentGlow} step={step} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={step >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2, duration: 0.5 }}>
          <motion.h1 className="transition-title"
            animate={step === 1 ? { textShadow: [`0 0 20px ${config.glow}, 0 0 40px ${config.glow}`, `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`, `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}>
            {config.title}
          </motion.h1>
        </motion.div>

        <motion.p className="transition-subtitle" initial={{ opacity: 0, y: 20 }} animate={step >= 1 ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4, duration: 0.4 }}>
          {config.subtitle}
        </motion.p>

        <motion.div className="transition-progress" initial={{ scaleX: 0 }} animate={{ scaleX: step === 2 ? 1 : 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${config.accent}, white)`, boxShadow: `0 0 20px ${config.glow}` }} />
      </div>
    </motion.div>
  );
}
