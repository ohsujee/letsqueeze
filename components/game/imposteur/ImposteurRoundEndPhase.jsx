"use client";

import { motion } from 'framer-motion';
import { Trophy, UserCircle, Detective, Ghost } from '@phosphor-icons/react';
import './ImposteurRoundEndPhase.css';

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
      className="round-end-container"
    >
      {/* ── Winner Announcement ── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        className="round-end-emoji"
      >
        {winEmoji}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="round-end-title"
        style={{ textShadow: `0 0 24px ${winGlow}, 0 0 48px ${winGlow}` }}
      >
        {winTitle}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="round-end-reason"
      >
        {WIN_REASONS[state?.winReason] || ''}
      </motion.div>

      {/* ── Word Pair Reveal Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="round-end-card round-end-card--words"
      >
        <div className="round-end-card-label round-end-card-label--words">
          Les mots
        </div>

        <div className="round-end-words-row">
          {/* Civilian word */}
          <div className="round-end-word-col">
            <div className="round-end-word-tag round-end-word-tag--civilian">
              Civils
            </div>
            <div className="round-end-word-value">
              {state?.wordPair?.civilian || '—'}
            </div>
          </div>

          {/* Divider */}
          <div className="round-end-words-divider" />

          {/* Impostor word */}
          <div className="round-end-word-col">
            <div className="round-end-word-tag" style={{ color: ACCENT }}>
              Imposteur
            </div>
            <div className="round-end-word-value">
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
        className="round-end-card round-end-card--roles"
      >
        <div className="round-end-card-label round-end-card-label--roles">
          Rôles
        </div>

        <div className="round-end-roles-list">
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
                className="round-end-role-row"
                style={index < players.length - 1
                  ? { borderBottom: '1px solid rgba(238,242,255,0.04)' }
                  : undefined
                }
              >
                <span className="round-end-role-name">
                  {p.name}
                </span>

                {config ? (
                  <span className="round-end-role-badge" style={{ color: config.color }}>
                    <RoleIcon size={16} weight="fill" />
                    {config.label}
                  </span>
                ) : (
                  <span className="round-end-role-unknown">
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
          className="round-end-summary"
        >
          <div className="round-end-summary-label">
            Bilan final
          </div>
          <div className="round-end-summary-scores">
            <div>
              <div className="round-end-summary-count round-end-summary-count--civil">
                {civilWins}
              </div>
              <div className="round-end-summary-team-label">Civils</div>
            </div>
            <div className="round-end-summary-divider" />
            <div>
              <div className="round-end-summary-count" style={{ color: ACCENT }}>
                {imposteurWins}
              </div>
              <div className="round-end-summary-team-label">Imposteurs</div>
            </div>
          </div>
          <div className="round-end-summary-result">
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
          className="round-end-action-btn"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
            boxShadow: `0 4px 24px ${ACCENT}44`,
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
