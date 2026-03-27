"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChatCircleDots, Scales, ArrowClockwise, Eye } from '@phosphor-icons/react';

export default function ImposteurDiscussionPhase({
  alivePlayers,
  amIAlive,
  players,
  myUid,
  myDiscussionChoice,
  discussionCounts,
  majority,
  onChoose,
  ACCENT = '#84cc16',
  ACCENT_LIGHT = '#a3e635',
}) {
  const voteReached = discussionCounts.vote >= majority;
  const continueReached = discussionCounts.continue >= majority;
  const majorityReached = voteReached || continueReached;

  const progressFraction = Math.max(discussionCounts.vote, discussionCounts.continue) / majority;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0',
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `rgba(132,204,22,0.08)`,
          border: `1.5px solid rgba(132,204,22,0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChatCircleDots size={26} weight="fill" color={ACCENT} />
        </div>
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
          color: '#ffffff',
          textShadow: '0 0 20px rgba(132,204,22,0.25)',
        }}>
          Discussion
        </div>
        <div style={{
          fontSize: '0.85rem', fontWeight: 600,
          color: 'rgba(238,242,255,0.5)',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>
          Débattez pour trouver l'imposteur !
        </div>
      </div>

      {/* ── Spectator badge ── */}
      {!amIAlive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center', padding: '10px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <Eye size={18} weight="bold" color="#f87171" />
          <span style={{
            fontSize: '0.8rem', fontWeight: 700, color: '#f87171',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            Tu observes en spectateur
          </span>
        </motion.div>
      )}

      {/* ── Two-column vote buttons ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
      }}>
        {/* Vote column */}
        <DiscussionChoice
          type="vote"
          icon={<Scales size={28} weight="bold" />}
          label="Passer au vote"
          count={discussionCounts.vote}
          total={alivePlayers.length}
          playerUids={discussionCounts.voteUids}
          players={players}
          isSelected={myDiscussionChoice === 'vote'}
          isDisabled={!amIAlive}
          accentColor={ACCENT}
          accentLight={ACCENT_LIGHT}
          onChoose={() => onChoose('vote')}
        />

        {/* Continue column */}
        <DiscussionChoice
          type="continue"
          icon={<ArrowClockwise size={28} weight="bold" />}
          label="Tour suivant"
          count={discussionCounts.continue}
          total={alivePlayers.length}
          playerUids={discussionCounts.contUids}
          players={players}
          isSelected={myDiscussionChoice === 'continue'}
          isDisabled={!amIAlive}
          accentColor="#60a5fa"
          accentLight="#93c5fd"
          onChoose={() => onChoose('continue')}
        />
      </div>

      {/* ── Progress bar ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '6px',
        padding: '0 4px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700,
            color: 'rgba(238,242,255,0.4)',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            Progression vers la majorité
          </span>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700,
            color: 'rgba(238,242,255,0.4)',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            {majority}/{alivePlayers.length}
          </span>
        </div>
        <div style={{
          width: '100%', height: 6, borderRadius: 3,
          background: 'rgba(238,242,255,0.06)',
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${Math.min(progressFraction, 1) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              height: '100%', borderRadius: 3,
              background: voteReached
                ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT_LIGHT})`
                : continueReached
                  ? 'linear-gradient(90deg, #60a5fa, #93c5fd)'
                  : `linear-gradient(90deg, rgba(238,242,255,0.2), rgba(238,242,255,0.3))`,
            }}
          />
        </div>
      </div>

      {/* ── Majority flash ── */}
      <AnimatePresence>
        {majorityReached && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              textAlign: 'center',
              padding: '12px',
              borderRadius: '14px',
              background: voteReached
                ? `rgba(132,204,22,0.1)`
                : 'rgba(59,130,246,0.1)',
              border: `1px solid ${voteReached ? 'rgba(132,204,22,0.2)' : 'rgba(59,130,246,0.2)'}`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
              style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.2rem',
                color: '#ffffff',
                textShadow: voteReached
                  ? '0 0 20px rgba(132,204,22,0.4)'
                  : '0 0 20px rgba(59,130,246,0.4)',
              }}
            >
              Majorité !
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Sub-component: single choice column ── */
function DiscussionChoice({
  type,
  icon,
  label,
  count,
  total,
  playerUids,
  players,
  isSelected,
  isDisabled,
  accentColor,
  accentLight,
  onChoose,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <motion.button
        onClick={() => !isDisabled && onChoose()}
        whileTap={!isDisabled ? { scale: 0.93 } : {}}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        disabled={isDisabled}
        style={{
          padding: '20px 12px', borderRadius: '16px',
          border: isSelected
            ? `2px solid ${accentColor}66`
            : '1.5px solid rgba(238,242,255,0.08)',
          background: isSelected
            ? `${accentColor}15`
            : 'rgba(8,12,24,0.8)',
          cursor: isDisabled ? 'default' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          transition: 'background 0.15s ease, border 0.15s ease',
          boxShadow: isSelected ? `0 0 24px ${accentColor}18` : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle glow on selected */}
        {isSelected && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 50% 80%, ${accentColor}10, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ color: isSelected ? accentColor : 'rgba(238,242,255,0.5)', position: 'relative' }}>
          {icon}
        </div>
        <span style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '0.78rem',
          color: isSelected ? '#ffffff' : 'rgba(238,242,255,0.7)',
          position: 'relative',
        }}>
          {label}
        </span>

        {/* Count badge */}
        <div style={{
          padding: '3px 12px', borderRadius: '20px',
          background: isSelected ? `${accentColor}25` : 'rgba(238,242,255,0.05)',
          border: `1px solid ${isSelected ? `${accentColor}30` : 'rgba(238,242,255,0.06)'}`,
          position: 'relative',
        }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 800,
            color: isSelected ? '#ffffff' : 'rgba(238,242,255,0.4)',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            {count}/{total}
          </span>
        </div>
      </motion.button>

      {/* Player heads */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center',
        minHeight: '32px',
      }}>
        <AnimatePresence>
          {playerUids.map(uid => {
            const p = players.find(pl => pl.uid === uid);
            return (
              <motion.div
                key={uid}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `${accentColor}20`,
                  border: `1.5px solid ${accentColor}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.65rem', color: '#ffffff',
                }}
                title={p?.name}
              >
                {p?.name?.charAt(0)?.toUpperCase() || '?'}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
