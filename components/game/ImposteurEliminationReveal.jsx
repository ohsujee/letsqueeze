"use client";

import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#e11d48';

const ROLE_CONFIG = {
  civilian: { label: 'Civil', color: '#3b82f6', emoji: '🙂' },
  undercover: { label: 'Imposteur', color: '#e11d48', emoji: '🕵️' },
  mrwhite: { label: 'Mr. White', color: '#a78bfa', emoji: '👻' },
};

/**
 * Dramatic elimination reveal — shows eliminated player's role with animation.
 */
export default function ImposteurEliminationReveal({
  eliminatedPlayer,
  eliminatedRole,
  isMrWhiteGuessing,
  onContinue,
  isHost,
}) {
  if (!eliminatedPlayer || !eliminatedRole) return null;

  const config = ROLE_CONFIG[eliminatedRole.role] || ROLE_CONFIG.civilian;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '24px', padding: '32px 20px', textAlign: 'center',
      }}
    >
      {/* Eliminated player card */}
      <motion.div
        initial={{ scale: 0.8, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
        style={{
          background: 'rgba(12,14,28,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${config.color}40`,
          borderRadius: '22px',
          padding: '32px 28px',
          boxShadow: `0 0 50px ${config.color}20, 0 8px 32px rgba(0,0,0,0.5)`,
          width: '100%', maxWidth: '320px',
        }}
      >
        {/* Emoji */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          style={{ fontSize: '3rem', marginBottom: '12px' }}
        >
          {config.emoji}
        </motion.div>

        {/* Name */}
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
          color: '#fff',
          marginBottom: '8px',
        }}>
          {eliminatedPlayer.name}
        </div>

        {/* ÉLIMINÉ label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          style={{
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#ef4444',
            marginBottom: '16px',
          }}
        >
          ÉLIMINÉ
        </motion.div>

        {/* Role badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', borderRadius: '20px',
            background: `${config.color}18`,
            border: `1px solid ${config.color}40`,
          }}
        >
          <span style={{ fontSize: '1rem' }}>{config.emoji}</span>
          <span style={{
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            fontSize: '0.85rem', fontWeight: 700,
            color: config.color,
            letterSpacing: '0.05em',
          }}>{config.label}</span>
        </motion.div>

        {/* Word reveal (not for Mr. White) */}
        {eliminatedRole.word && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            style={{
              marginTop: '16px',
              fontSize: '0.78rem',
              color: 'rgba(238,242,255,0.4)',
              fontWeight: 600,
            }}
          >
            Son mot : <span style={{ color: config.color }}>{eliminatedRole.word}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Mr. White guessing indicator */}
      {isMrWhiteGuessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{
            fontSize: '0.85rem', fontWeight: 700,
            color: '#a78bfa',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          👻 Mr. White tente de deviner le mot...
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ display: 'flex', gap: '2px' }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Continue button (host, after reveal animation + no Mr. White guessing) */}
      {isHost && !isMrWhiteGuessing && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          onClick={onContinue}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 32px',
            borderRadius: '14px',
            border: 'none',
            background: `linear-gradient(135deg, ${ACCENT}, #f43f5e)`,
            color: '#fff',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${ACCENT}44`,
          }}
        >
          Continuer
        </motion.button>
      )}
    </motion.div>
  );
}
