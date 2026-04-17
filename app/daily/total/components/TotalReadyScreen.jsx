'use client';

import { motion } from 'framer-motion';
import { Calculator, HashStraight, PlusMinus, Hourglass, ArrowRight, Trophy, Warning } from '@phosphor-icons/react';

const RULES = [
  { icon: <HashStraight size={18} weight="fill" />, text: 'Utilise les 6 chiffres' },
  { icon: <PlusMinus size={18} weight="fill" />, text: '4 opérations : + − × ÷' },
  { icon: <ArrowRight size={18} weight="fill" />, text: 'Le calcul se fait étape par étape : chaque résultat sert de base au suivant' },
  { icon: <Hourglass size={18} weight="fill" />, text: '3 minutes · 3 essais' },
  { icon: <Trophy size={18} weight="fill" />, text: 'Chaque essai sauvegarde ton meilleur score' },
];

export default function TotalReadyScreen({ onStart }) {
  return (
    <motion.div
      className="total-ready-flat"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="total-ready-icon"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
      >
        <Calculator size={36} weight="fill" />
      </motion.div>

      <h2 className="total-ready-title">Total du jour</h2>

      <motion.div
        className="total-ready-rules"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        {RULES.map((rule, i) => (
          <div key={i} className="total-ready-rule">
            <span className="total-ready-rule-icon">{rule.icon}</span>
            <span className="total-ready-rule-text">{rule.text}</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="total-ready-warning"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <Warning size={18} weight="fill" />
        <span>Si tu quittes l&apos;app en cours de partie, elle sera terminée.</span>
      </motion.div>

      <motion.button
        className="total-ready-start"
        onClick={onStart}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        Découvrir le nombre
      </motion.button>
    </motion.div>
  );
}
