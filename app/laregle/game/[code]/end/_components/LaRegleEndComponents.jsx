'use client';

import { motion } from 'framer-motion';
import { Search, Theater, Eye, EyeOff, Shield } from "lucide-react";

/* ─── Result configurations (4 possible outcomes) ───── */

export const RESULTS = {
  enqueteur_win: {
    emoji: '🎉', title: 'TROUVÉ !', subtitle: 'Tu as percé le secret des civils',
    roleBadge: { icon: Search, label: 'Enquêteur', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', color: '#4ade80' },
    accent: '#4ade80', accentRgb: '34,197,94',
    outcomeLabel: 'Règle trouvée', outcomeIcon: Eye, glowRotate: -20,
  },
  enqueteur_lose: {
    emoji: '😤', title: 'RATÉ...', subtitle: 'La règle reste un mystère',
    roleBadge: { icon: Search, label: 'Enquêteur', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    accent: '#f87171', accentRgb: '239,68,68',
    outcomeLabel: '3 essais épuisés', outcomeIcon: EyeOff, glowRotate: 10,
  },
  civil_win: {
    emoji: '🎭', title: 'VICTOIRE !', subtitle: 'Les enquêteurs n\'ont rien vu',
    roleBadge: { icon: Theater, label: 'Civil', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', color: '#c084fc' },
    accent: '#c084fc', accentRgb: '168,85,247',
    outcomeLabel: 'Règle protégée', outcomeIcon: Shield, glowRotate: -10,
  },
  civil_lose: {
    emoji: '😢', title: 'GRILLÉ !', subtitle: 'Votre règle a été démasquée',
    roleBadge: { icon: Theater, label: 'Civil', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    accent: '#f87171', accentRgb: '239,68,68',
    outcomeLabel: 'Règle découverte', outcomeIcon: EyeOff, glowRotate: 15,
  },
};

/* ─── Animated Result Icon ───────────────────────────── */

export function ResultIcon({ emoji, accentRgb, glowRotate, size = 90 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: glowRotate }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.25 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -18, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(${accentRgb},0.55) 0%, transparent 65%)`,
          filter: 'blur(12px)',
        }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1.5px dashed rgba(${accentRgb},0.2)` }}
      />
      <div style={{
        fontSize: size * 0.72, textAlign: 'center', lineHeight: `${size}px`,
        position: 'relative', zIndex: 1,
        filter: `drop-shadow(0 0 18px rgba(${accentRgb},0.5))`,
      }}>
        {emoji}
      </div>
    </motion.div>
  );
}

/* ─── Attempts Dots ──────────────────────────────────── */

export function AttemptsDots({ used, total = 3, accentRgb }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: i < used ? 'rgba(239,68,68,0.25)' : `rgba(${accentRgb},0.9)`,
            border: i < used ? '1.5px solid rgba(239,68,68,0.5)' : `1.5px solid rgba(${accentRgb},0.4)`,
            boxShadow: i < used ? 'none' : `0 0 8px rgba(${accentRgb},0.6)`,
          }}
        />
      ))}
      <span style={{
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginLeft: '2px',
      }}>
        {used}/{total}
      </span>
    </div>
  );
}

/* ─── Difficulty Stars ───────────────────────────────── */

export function DifficultyStars({ level, color }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= level ? color : 'rgba(255,255,255,0.12)' }} />
      ))}
    </div>
  );
}
