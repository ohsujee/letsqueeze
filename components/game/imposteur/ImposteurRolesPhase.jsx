"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Eye, HourglassSimple } from '@phosphor-icons/react';
import ImposteurRoleCard from '@/components/game/ImposteurRoleCard';

export default function ImposteurRolesPhase({
  myRole,
  me,
  players,
  allPlayersSeen,
  markRoleSeen,
  ACCENT = '#84cc16',
  ACCENT_LIGHT = '#a3e635',
}) {
  const seenCount = players.filter(p => p.hasSeenRole).length;
  const hasSeenRole = me?.hasSeenRole;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '24px', padding: '24px 0',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.25rem',
          color: '#ffffff',
          textShadow: '0 0 20px rgba(132,204,22,0.25)',
          marginBottom: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}>
          <Eye size={22} weight="bold" style={{ color: ACCENT }} />
          Découvre ton mot
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: 'rgba(238,242,255,0.55)',
          fontWeight: 500,
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          lineHeight: 1.4,
        }}>
          Ne montre ton écran à personne !
        </div>
      </div>

      {/* Role card + action */}
      {myRole && !hasSeenRole && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            width: '100%',
          }}
        >
          <ImposteurRoleCard word={myRole.word} />

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={markRoleSeen}
            style={{
              padding: '14px 36px',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
              border: 'none',
              borderRadius: '14px',
              color: '#000',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              boxShadow: `0 4px 24px ${ACCENT}44`,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <Check size={18} weight="bold" />
            Prêt
          </motion.button>
        </motion.div>
      )}

      {myRole && hasSeenRole && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            width: '100%',
          }}
        >
          <ImposteurRoleCard word={myRole.word} />

          <div style={{
            padding: '10px 20px',
            borderRadius: '12px',
            background: `${ACCENT}0d`,
            border: `1px solid ${ACCENT}25`,
            display: 'flex', alignItems: 'center', gap: '10px',
            justifyContent: 'center',
          }}>
            <motion.div
              animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ACCENT,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: '0.8rem', fontWeight: 600, color: '#ffffff',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              Prêt — en attente des autres
            </span>
          </div>
        </motion.div>
      )}

      {/* Ready status grid */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        padding: '14px 20px',
        borderRadius: '16px',
        background: 'rgba(8,12,24,0.8)',
        border: '1px solid rgba(238,242,255,0.06)',
        width: '100%',
        maxWidth: '340px',
      }}>
        <div style={{
          display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <AnimatePresence>
            {players.map(p => (
              <motion.div
                key={p.uid}
                initial={false}
                animate={{
                  background: p.hasSeenRole ? `${ACCENT}30` : 'rgba(238,242,255,0.04)',
                  borderColor: p.hasSeenRole ? ACCENT : 'rgba(238,242,255,0.1)',
                }}
                transition={{ duration: 0.35 }}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  border: '2px solid',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 800,
                  color: p.hasSeenRole ? '#ffffff' : 'rgba(238,242,255,0.3)',
                }}
              >
                {p.hasSeenRole
                  ? <Check size={14} weight="bold" />
                  : p.name?.[0]?.toUpperCase()
                }
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textAlign: 'center',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          color: allPlayersSeen ? '#ffffff' : 'rgba(238,242,255,0.4)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {allPlayersSeen ? (
            <>
              <Check size={14} weight="bold" style={{ color: ACCENT }} />
              Tout le monde est prêt !
            </>
          ) : (
            <>
              <HourglassSimple size={14} weight="bold" style={{ color: 'rgba(238,242,255,0.35)' }} />
              {seenCount}/{players.length} ont vu leur mot
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
