"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#e11d48';
const ACCENT_LIGHT = '#f43f5e';

const ROLE_CONFIG = {
  civilian: {
    label: 'Civil',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.3)',
    emoji: '🙂',
  },
  undercover: {
    label: 'Imposteur',
    color: ACCENT_LIGHT,
    bg: 'rgba(225,29,72,0.12)',
    border: 'rgba(225,29,72,0.3)',
    emoji: '🕵️',
  },
  mrwhite: {
    label: 'Mr. White',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.3)',
    emoji: '👻',
  },
};

/**
 * Tap-and-hold card to reveal your secret role and word.
 * Pattern from La Règle hold-to-reveal.
 */
export default function ImposteurRoleCard({ role, word, onSeen }) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.civilian;

  const handlePressStart = useCallback(() => {
    setIsRevealing(true);
    if (!hasSeen) {
      setHasSeen(true);
      onSeen?.();
    }
  }, [hasSeen, onSeen]);

  const handlePressEnd = useCallback(() => {
    setIsRevealing(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={{
        position: 'relative',
        background: 'rgba(12,14,28,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1.5px solid ${isRevealing ? config.border : 'rgba(238,242,255,0.12)'}`,
        borderRadius: '18px',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        boxShadow: isRevealing
          ? `0 0 50px ${config.color}25, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 8px 32px rgba(0,0,0,0.5)',
        transition: 'border-color 0.2s ease, box-shadow 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Glow overlay when revealing */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 50% 30%, ${config.color}15, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Hidden state */}
      <AnimatePresence mode="wait">
        {!isRevealing ? (
          <motion.div
            key="hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div style={{
              fontSize: '2.5rem', marginBottom: '16px',
              filter: 'grayscale(0.5)',
            }}>❓</div>
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.1rem',
              color: 'rgba(238,242,255,0.5)',
              marginBottom: '8px',
            }}>
              Ton rôle secret
            </div>
            <div style={{
              fontSize: '0.78rem',
              color: 'rgba(238,242,255,0.3)',
              fontWeight: 600,
            }}>
              {hasSeen ? 'Appuie pour revoir' : 'Maintiens appuyé pour révéler'}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Role badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 14px', borderRadius: '20px',
              background: config.bg,
              border: `1px solid ${config.border}`,
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '1rem' }}>{config.emoji}</span>
              <span style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: '0.82rem', fontWeight: 700,
                color: config.color,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>{config.label}</span>
            </div>

            {/* Word */}
            {role === 'mrwhite' ? (
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.3rem',
                color: config.color,
                textShadow: `0 0 20px ${config.color}55`,
                marginBottom: '8px',
              }}>
                ???
              </div>
            ) : (
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: 'clamp(1.2rem, 5vw, 1.8rem)',
                color: '#ffffff',
                textShadow: `0 0 20px ${config.color}55`,
                marginBottom: '8px',
                wordBreak: 'break-word',
              }}>
                {word}
              </div>
            )}

            {/* Role description */}
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(238,242,255,0.45)',
              fontWeight: 600,
              maxWidth: '260px',
              margin: '0 auto',
              lineHeight: 1.4,
            }}>
              {role === 'civilian' && 'Tu as le même mot que les autres civils. Trouve les imposteurs !'}
              {role === 'undercover' && 'Ton mot est différent. Bluff sans te faire griller !'}
              {role === 'mrwhite' && 'Tu n\'as pas de mot. Bluff et essaie de deviner celui des civils !'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
