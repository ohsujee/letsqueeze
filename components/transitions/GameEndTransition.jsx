"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy, MusicNote, Detective, Lightbulb, MaskHappy, Brain, Calculator, ChartBar } from '@phosphor-icons/react';
import { darkenColor } from "@/lib/utils/colorUtils";
import "./GameEndTransition.css";

const CONFIGS = {
  quiz:       { accent: '#8b5cf6', title: "Calcul des scores",   subtitle: "Préparez-vous pour le podium...", Icon: Trophy },
  deeztest:   { accent: '#A238FF', title: "Résultats en cours",  subtitle: "Qui connaît le mieux la musique ?", Icon: MusicNote },
  alibi:      { accent: '#f59e0b', title: "Enquête Terminée",    subtitle: "Découvrez les résultats...", Icon: Detective },
  laregle:    { accent: '#06b6d4', title: "Règle Révélée",       subtitle: "Découvrez les scores...", Icon: Lightbulb },
  mime:       { accent: '#34d399', title: "Partie Terminée",     subtitle: "Qui est le meilleur mimeur ?", Icon: MaskHappy },
  motmystere: { accent: '#10b981', title: "Voyons le classement !", subtitle: "Compare-toi aux autres joueurs", Icon: ChartBar },
  semantique: { accent: '#f97316', title: "Voyons le classement !", subtitle: "Qui est le plus sémantique ?", Icon: ChartBar },
  mindlink:   { accent: '#ec4899', title: "Partie Terminée",     subtitle: "Découvrez les résultats…", Icon: Brain },
  total:      { accent: '#3b82f6', title: "Voyons le classement !", subtitle: "Qui est le meilleur calculateur ?", Icon: Calculator },
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
  const darkerColor = darkenColor(config.accent, 40);

  return (
    <motion.div
      className="transition-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: config.accent }}
    >
      <div className="transition-content">
        {/* Icon */}
        <motion.div
          className="transition-icon"
          initial={{ scale: 0, rotate: -15 }}
          animate={step >= 0 ? { scale: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <config.Icon size={48} weight="fill" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="transition-title"
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {config.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {config.subtitle}
        </motion.p>

        {/* Progress bar */}
        <motion.div
          className="transition-progress"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step === 2 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ background: '#fff' }}
        />
      </div>

      {/* Bottom depth bar */}
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
