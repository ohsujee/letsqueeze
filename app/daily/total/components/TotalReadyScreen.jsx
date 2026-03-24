'use client';

import { motion } from 'framer-motion';
import { Calculator, HashStraight, PlusMinus, Hourglass, ArrowRight, Trophy, Warning } from '@phosphor-icons/react';

export default function TotalReadyScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', gap: '24px',
      }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200 }}
        style={{
          width: 72, height: 72, borderRadius: '20px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 32px rgba(59,130,246,0.15)',
        }}
      >
        <Calculator size={36} weight="duotone" color="#3b82f6" />
      </motion.div>

      {/* Title */}
      <h2 style={{
        fontFamily: "var(--font-title, 'Bungee'), cursive",
        fontSize: '1.3rem', fontWeight: 400, color: '#fff', margin: 0,
        textShadow: '0 0 20px rgba(59,130,246,0.6), 0 0 4px rgba(59,130,246,0.3)',
        letterSpacing: '0.06em',
      }}>
        Total du jour
      </h2>

      {/* Rules card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        style={{
          width: '100%', maxWidth: 340,
          background: 'rgba(8,14,32,0.92)',
          border: '1px solid rgba(59,130,246,0.12)',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          {/* Rule items */}
          {[
            { icon: <HashStraight size={18} weight="duotone" color="#3b82f6" />, text: 'Utilise les 6 chiffres' },
            { icon: <PlusMinus size={18} weight="duotone" color="#3b82f6" />, text: '4 opérations : + − × ÷' },
            { icon: <ArrowRight size={18} weight="duotone" color="#3b82f6" />, text: 'Le calcul se fait étape par étape : chaque résultat sert de base au suivant' },
            { icon: <Hourglass size={18} weight="duotone" color="#3b82f6" />, text: '3 minutes · 3 essais' },
            { icon: <Trophy size={18} weight="duotone" color="#3b82f6" />, text: 'Chaque essai sauvegarde ton meilleur score' },
          ].map((rule, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span style={{ width: 24, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {rule.icon}
              </span>
              <span style={{
                fontSize: '0.82rem', fontWeight: 500, color: 'rgba(238,242,255,0.7)',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>
                {rule.text}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Warning */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          maxWidth: 340, width: '100%',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}
      >
        <Warning size={18} weight="fill" color="#f59e0b" style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: '0.75rem', color: 'rgba(245,158,11,0.8)',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          lineHeight: 1.4,
        }}>
          Si tu quittes l&apos;app en cours de partie, elle sera terminée.
        </span>
      </motion.div>

      {/* Start button */}
      <motion.button
        onClick={onStart}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        style={{
          width: '100%', maxWidth: 340, padding: '16px 24px',
          borderRadius: '14px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: '#fff', fontSize: '1rem', fontWeight: 700,
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          cursor: 'pointer', letterSpacing: '0.02em',
          boxShadow: '0 4px 20px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15)',
        }}
      >
        Découvrir le nombre
      </motion.button>
    </motion.div>
  );
}
