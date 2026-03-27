"use client";

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { EyeSlash, Eye, LockSimple, HandTap } from '@phosphor-icons/react';

const ACCENT = '#84cc16';
const ACCENT_LIGHT = '#a3e635';
const CARD_HEIGHT = 200; // Fixed height so card never shifts layout

export default function ImposteurRoleCard({ word }) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasSeen, setHasSeen] = useState(false);

  const isMrWhite = !word;

  const handlePressStart = useCallback((e) => {
    e.preventDefault();
    setIsRevealing(true);
    if (!hasSeen) setHasSeen(true);
  }, [hasSeen]);

  const handlePressEnd = useCallback(() => {
    setIsRevealing(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 }}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        height: CARD_HEIGHT,
        background: isRevealing
          ? isMrWhite
            ? 'linear-gradient(165deg, rgba(167,139,250,0.06) 0%, rgba(12,14,28,0.97) 40%)'
            : 'linear-gradient(165deg, rgba(132,204,22,0.04) 0%, rgba(12,14,28,0.97) 40%)'
          : 'rgba(12,14,28,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1.5px solid ${isRevealing
          ? isMrWhite ? 'rgba(167,139,250,0.35)' : 'rgba(132,204,22,0.3)'
          : 'rgba(238,242,255,0.1)'}`,
        borderRadius: '20px',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        boxShadow: isRevealing
          ? isMrWhite
            ? '0 0 40px rgba(167,139,250,0.12), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 0 40px rgba(132,204,22,0.12), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 8px 32px rgba(0,0,0,0.4)',
        transition: 'border-color 0.2s ease, box-shadow 0.25s ease, background 0.2s ease',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Hidden content */}
      <motion.div
        animate={{
          opacity: isRevealing ? 0 : 1,
          scale: isRevealing ? 0.92 : 1,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          pointerEvents: isRevealing ? 'none' : 'auto',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <EyeSlash size={44} weight="duotone" color="rgba(238,242,255,0.5)" />
        </div>
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1rem', color: '#ffffff',
          marginBottom: '8px',
        }}>
          Ton mot secret
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          fontSize: '0.8rem', color: 'rgba(238,242,255,0.55)',
          fontWeight: 600,
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>
          <HandTap size={18} weight="duotone" color="rgba(238,242,255,0.55)" />
          Maintiens appuyé pour révéler
        </div>
      </motion.div>

      {/* Revealed content */}
      <motion.div
        animate={{
          opacity: isRevealing ? 1 : 0,
          scale: isRevealing ? 1 : 0.92,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
          pointerEvents: isRevealing ? 'auto' : 'none',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <Eye
            size={36} weight="duotone"
            color={isMrWhite ? '#a78bfa' : ACCENT_LIGHT}
            style={{ filter: `drop-shadow(0 0 8px ${isMrWhite ? 'rgba(167,139,250,0.3)' : 'rgba(132,204,22,0.3)'})` }}
          />
        </div>

        {isMrWhite ? (
          <>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 14px', borderRadius: '20px',
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.2)',
              marginBottom: '10px',
            }}>
              <LockSimple size={13} weight="bold" color="#a78bfa" />
              <span style={{
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>Mr. White</span>
            </div>

            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.2rem', color: '#a78bfa',
              textShadow: '0 0 16px rgba(167,139,250,0.3)',
              marginBottom: '8px',
            }}>
              Pas de mot
            </div>

            <div style={{
              fontSize: '0.72rem', color: 'rgba(238,242,255,0.45)',
              fontWeight: 500, lineHeight: 1.4, maxWidth: '230px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textAlign: 'center',
            }}>
              Bluff en écoutant les autres !
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: 'clamp(1.3rem, 6vw, 1.8rem)',
              color: '#ffffff',
              textShadow: '0 0 16px rgba(132,204,22,0.25), 0 2px 4px rgba(0,0,0,0.4)',
              marginBottom: '8px',
              wordBreak: 'break-word',
              lineHeight: 1.2,
              textAlign: 'center',
            }}>
              {word}
            </div>

            <div style={{
              fontSize: '0.72rem', color: 'rgba(238,242,255,0.45)',
              fontWeight: 500, lineHeight: 1.4, maxWidth: '230px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textAlign: 'center',
            }}>
              Es-tu un civil ou l'imposteur ?
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
