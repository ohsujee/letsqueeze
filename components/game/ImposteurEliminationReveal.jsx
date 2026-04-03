"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const ACCENT = '#84cc16';

const ROLE_CONFIG = {
  civilian: { label: 'Civil', emoji: '👤', color: '#22c55e', slotLabel: 'Civil 👤' },
  undercover: { label: 'Imposteur', emoji: '🕵️', color: '#84cc16', slotLabel: 'Imposteur 🕵️' },
  mrwhite: { label: 'Mr. White', emoji: '👻', color: '#a78bfa', slotLabel: 'Mr. White 👻' },
};

// Phases: SUSPENSE -> NAME -> ROULETTE -> REVEAL -> ACTIONS
const PHASE_SUSPENSE = 'SUSPENSE';
const PHASE_NAME = 'NAME';
const PHASE_ROULETTE = 'ROULETTE';
const PHASE_REVEAL = 'REVEAL';
const PHASE_ACTIONS = 'ACTIONS';

export default function ImposteurEliminationReveal({
  eliminatedPlayer,
  role,
  word,
  mrWhiteEnabled,
  onContinue,
  isHost,
  isMrWhiteGuessing,
}) {
  const [phase, setPhase] = useState(PHASE_SUSPENSE);
  const [slotText, setSlotText] = useState('');
  const [showWord, setShowWord] = useState(false);
  const slotIntervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  const addTimeout = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Build slot options
  const slotOptions = useRef([]);
  useEffect(() => {
    const options = [ROLE_CONFIG.civilian.slotLabel, ROLE_CONFIG.undercover.slotLabel];
    if (mrWhiteEnabled) {
      options.push(ROLE_CONFIG.mrwhite.slotLabel);
    }
    slotOptions.current = options;
  }, [mrWhiteEnabled]);

  // Phase progression
  useEffect(() => {
    if (!eliminatedPlayer) return;

    // Phase 1: SUSPENSE -> NAME after 2s
    addTimeout(() => setPhase(PHASE_NAME), 2000);

    // Phase 2: NAME -> ROULETTE after 3.5s
    addTimeout(() => setPhase(PHASE_ROULETTE), 3500);

    // Phase 4: ROULETTE -> REVEAL after 6s
    addTimeout(() => setPhase(PHASE_REVEAL), 6000);

    // Phase 5: REVEAL -> ACTIONS after 8s
    addTimeout(() => setPhase(PHASE_ACTIONS), 8000);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [eliminatedPlayer?.uid, addTimeout]);

  // Slot machine cycling logic
  useEffect(() => {
    if (phase !== PHASE_ROULETTE) return;

    const options = slotOptions.current;
    if (!options.length) return;

    let idx = 0;
    let currentSpeed = 80;
    const startTime = Date.now();
    const realRole = role ? (ROLE_CONFIG[role]?.slotLabel || ROLE_CONFIG.civilian.slotLabel) : ROLE_CONFIG.civilian.slotLabel;

    const cycle = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= 2500) {
        // Stop on the real role
        setSlotText(realRole);
        return;
      }

      idx = (idx + 1) % options.length;
      setSlotText(options[idx]);

      // Determine next speed
      if (elapsed >= 1800) {
        currentSpeed = 500;
      } else if (elapsed >= 1000) {
        currentSpeed = 300;
      } else if (elapsed >= 600) {
        currentSpeed = 150;
      }

      slotIntervalRef.current = setTimeout(cycle, currentSpeed);
    };

    setSlotText(options[0]);
    slotIntervalRef.current = setTimeout(cycle, currentSpeed);

    return () => {
      if (slotIntervalRef.current) clearTimeout(slotIntervalRef.current);
    };
  }, [phase, role, mrWhiteEnabled]);

  // Haptic on REVEAL phase
  useEffect(() => {
    if (phase === PHASE_REVEAL) {
      try {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
        // Haptics not available
      }
      // Word is intentionally NOT revealed during the game
    }
  }, [phase]);

  if (!eliminatedPlayer) return null;

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.civilian;

  const wordDisplay = role === 'mrwhite' || !word ? 'Aucun mot' : word;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: '20px',
        paddingRight: '20px',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* PHASE 1: SUSPENSE */}
      <AnimatePresence>
        {phase === PHASE_SUSPENSE && (
          <motion.div
            key="suspense"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: 'clamp(1.2rem, 5vw, 1.6rem)',
                color: 'rgba(238,242,255,0.9)',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Le verdict est tombé...
            </motion.p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ACCENT,
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 2: NAME */}
      <AnimatePresence>
        {phase === PHASE_NAME && (
          <motion.div
            key="name"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: 'clamp(1.6rem, 7vw, 2.4rem)',
                color: '#fff',
              }}
            >
              {eliminatedPlayer.name}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
                color: 'rgba(238,242,255,0.6)',
                fontWeight: 600,
              }}
            >
              a été éliminé(e)
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 3: ROULETTE */}
      <AnimatePresence>
        {phase === PHASE_ROULETTE && (
          <motion.div
            key="roulette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: 'clamp(1rem, 4vw, 1.3rem)',
                color: 'rgba(238,242,255,0.8)',
                fontWeight: 600,
                margin: 0,
              }}
            >
              Son rôle est...
            </motion.p>

            {/* Slot machine box */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(132,204,22,0.1)',
                  '0 0 30px rgba(132,204,22,0.25)',
                  '0 0 20px rgba(132,204,22,0.1)',
                ],
              }}
              transition={{ duration: 0.3, repeat: Infinity }}
              style={{
                width: '260px',
                height: '72px',
                border: '2px solid rgba(238,242,255,0.25)',
                borderRadius: '16px',
                background: 'rgba(12,14,28,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <motion.span
                key={slotText}
                initial={{ y: 20, opacity: 0.3 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.06 }}
                style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: 'clamp(1.1rem, 4.5vw, 1.4rem)',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                {slotText}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 4: REVEAL */}
      <AnimatePresence>
        {(phase === PHASE_REVEAL || phase === PHASE_ACTIONS) && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Large emoji */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 12 }}
              style={{ fontSize: '4rem', lineHeight: 1 }}
            >
              {config.emoji}
            </motion.div>

            {/* Role name with bounce + glow */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: 'clamp(1.6rem, 7vw, 2.2rem)',
                color: config.color,
                textShadow: `0 0 30px ${config.color}80, 0 0 60px ${config.color}40`,
              }}
            >
              {config.label}
            </motion.div>

            {/* Eliminated player name reminder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: 'clamp(0.85rem, 3vw, 1rem)',
                color: 'rgba(238,242,255,0.5)',
                fontWeight: 600,
              }}
            >
              {eliminatedPlayer.name}
            </motion.div>

            {/* PHASE 5: ACTIONS — no word reveal */}
            <AnimatePresence>
              {phase === PHASE_ACTIONS && (
                <>
                  {role === 'mrwhite' && isMrWhiteGuessing ? null : (
                    isHost ? (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        onClick={onContinue}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          marginTop: '16px',
                          padding: '14px 36px',
                          borderRadius: '14px',
                          border: 'none',
                          background: `linear-gradient(135deg, ${ACCENT}, #a3e635)`,
                          color: '#000',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: `0 4px 24px ${ACCENT}44`,
                        }}
                      >
                        Continuer
                      </motion.button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{
                          marginTop: '16px',
                          fontSize: '0.8rem',
                          color: 'rgba(238,242,255,0.4)',
                          fontWeight: 600,
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                        }}
                      >
                        En attente de l'hôte...
                      </motion.div>
                    )
                  )}
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
