"use client";

import { motion } from 'framer-motion';
import { Trophy, UserCircle, Detective, Ghost } from '@phosphor-icons/react';

const ROLE_CONFIG = {
  civilian: {
    label: 'Civil',
    color: '#3b82f6',
    Icon: UserCircle,
  },
  undercover: {
    label: 'Imposteur',
    color: '#84cc16',
    Icon: Detective,
  },
  mrwhite: {
    label: 'Mr. White',
    color: '#a78bfa',
    Icon: Ghost,
  },
};

const WIN_REASONS = {
  all_eliminated: 'Tous les imposteurs ont été démasqués !',
  outnumbered: 'Les imposteurs sont en supériorité numérique !',
  mr_white_guess: 'Mr. White a deviné le mot des civils !',
};

export default function ImposteurRoundEndPhase({
  state,
  settings,
  players,
  revealedRoles,
  isHost,
  onNextRound,
  ACCENT = '#84cc16',
  ACCENT_LIGHT = '#a3e635',
}) {
  const isCivilianWin = state?.winner === 'civilians';
  const currentRound = state?.currentRound || 1;
  const totalRounds = settings?.totalRounds || 1;
  const isLastRound = currentRound >= totalRounds;

  const winEmoji = isCivilianWin ? '🎉' : '🕵️';
  const winTitle = isCivilianWin ? 'Les civils gagnent !' : 'Les imposteurs gagnent !';
  const winGlow = isCivilianWin
    ? 'rgba(74,222,128,0.4)'
    : 'rgba(132,204,22,0.3)';

  // Multi-round summary
  const roundWinners = state?.roundWinners || [];
  const civilWins = roundWinners.filter(w => w === 'civilians').length + (isCivilianWin ? 1 : 0);
  const imposteurWins = roundWinners.filter(w => w === 'undercover').length + (isCivilianWin ? 0 : 1);
  const overallWinner = civilWins > imposteurWins ? 'civilians' : imposteurWins > civilWins ? 'undercover' : 'tie';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '20px 0',
        textAlign: 'center',
      }}
    >
      {/* ── Winner Announcement ── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        style={{ fontSize: '3.5rem', lineHeight: 1 }}
      >
        {winEmoji}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: 'clamp(1.2rem, 5vw, 1.8rem)',
          color: '#ffffff',
          textShadow: `0 0 24px ${winGlow}, 0 0 48px ${winGlow}`,
        }}
      >
        {winTitle}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          fontSize: '0.82rem',
          color: 'rgba(238,242,255,0.5)',
          fontWeight: 600,
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          maxWidth: '300px',
        }}
      >
        {WIN_REASONS[state?.winReason] || ''}
      </motion.div>

      {/* ── Word Pair Reveal Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        style={{
          background: 'rgba(8,12,24,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(238,242,255,0.06)',
          borderRadius: '20px',
          padding: '20px 24px',
          width: '100%',
          maxWidth: '340px',
        }}
      >
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'rgba(238,242,255,0.3)',
          marginBottom: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>
          Les mots
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Civilian word */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: '0.68rem',
              color: '#3b82f6',
              fontWeight: 700,
              marginBottom: '6px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              Civils
            </div>
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
              color: '#ffffff',
            }}>
              {state?.wordPair?.civilian || '—'}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, rgba(238,242,255,0.12), transparent)',
          }} />

          {/* Impostor word */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: '0.68rem',
              color: ACCENT,
              fontWeight: 700,
              marginBottom: '6px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              Imposteur
            </div>
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
              color: '#ffffff',
            }}>
              {state?.wordPair?.undercover || '—'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── All Roles Revealed ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        style={{
          background: 'rgba(8,12,24,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(238,242,255,0.06)',
          borderRadius: '20px',
          padding: '16px 18px',
          width: '100%',
          maxWidth: '340px',
        }}
      >
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'rgba(238,242,255,0.3)',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>
          Rôles
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {players.map((p, index) => {
            const roleData = revealedRoles?.[p.uid];
            const config = ROLE_CONFIG[roleData?.role] || null;
            const RoleIcon = config?.Icon || UserCircle;

            return (
              <motion.div
                key={p.uid}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.9 + index * 0.08 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderBottom: index < players.length - 1
                    ? '1px solid rgba(238,242,255,0.04)'
                    : 'none',
                }}
              >
                <span style={{
                  fontSize: '0.84rem',
                  color: '#eef2ff',
                  fontWeight: 600,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  {p.name}
                </span>

                {config ? (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: config.color,
                    fontWeight: 700,
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}>
                    <RoleIcon size={16} weight="fill" />
                    {config.label}
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.78rem',
                    color: 'rgba(238,242,255,0.3)',
                    fontWeight: 600,
                  }}>
                    —
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Multi-round summary (last round only) ── */}
      {isLastRound && totalRounds > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0 + players.length * 0.08 }}
          style={{
            padding: '16px 20px', borderRadius: '20px',
            background: 'rgba(8,12,24,0.8)',
            border: '1px solid rgba(238,242,255,0.06)',
            width: '100%', maxWidth: '320px',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontSize: '0.7rem', fontWeight: 700,
            color: 'rgba(238,242,255,0.35)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Bilan final
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '10px',
          }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: "var(--font-title, 'Bungee'), cursive", color: '#3b82f6' }}>
                {civilWins}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.5)', fontWeight: 600 }}>Civils</div>
            </div>
            <div style={{ width: 1, background: 'rgba(238,242,255,0.08)' }} />
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: "var(--font-title, 'Bungee'), cursive", color: ACCENT }}>
                {imposteurWins}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.5)', fontWeight: 600 }}>Imposteurs</div>
            </div>
          </div>
          <div style={{
            fontSize: '0.85rem', fontWeight: 700, color: '#ffffff',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            {overallWinner === 'civilians' ? '🎉 Les civils l\'emportent !'
              : overallWinner === 'undercover' ? '🕵️ Les imposteurs l\'emportent !'
              : '🤝 Égalité parfaite !'}
          </div>
        </motion.div>
      )}

      {/* ── Action Button (host only) ── */}
      {isHost && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.2 + players.length * 0.08 }}
          onClick={onNextRound}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px 36px',
            borderRadius: '14px',
            border: 'none',
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
            color: '#000',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 4px 24px ${ACCENT}44`,
            letterSpacing: '-0.01em',
          }}
        >
          {isLastRound
            ? 'Retour au lobby'
            : `Manche suivante (${currentRound}/${totalRounds})`
          }
        </motion.button>
      )}
    </motion.div>
  );
}
