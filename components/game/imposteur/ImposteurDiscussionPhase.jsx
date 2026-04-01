"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChatCircleDots, Scales, ArrowClockwise, Eye } from '@phosphor-icons/react';
import './ImposteurDiscussionPhase.css';

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
      className="discussion-phase"
    >
      {/* ── Header ── */}
      <div className="discussion-header">
        <div className="discussion-header-icon">
          <ChatCircleDots size={26} weight="fill" color={ACCENT} />
        </div>
        <div className="discussion-header-title">
          Discussion
        </div>
        <div className="discussion-header-subtitle">
          Débattez pour trouver l'imposteur !
        </div>
      </div>

      {/* ── Spectator badge ── */}
      {!amIAlive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="discussion-spectator-badge"
        >
          <Eye size={18} weight="bold" color="#f87171" />
          <span className="discussion-spectator-text">
            Tu observes en spectateur
          </span>
        </motion.div>
      )}

      {/* ── Two-column vote buttons ── */}
      <div className="discussion-vote-grid">
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
      <div className="discussion-progress">
        <div className="discussion-progress-header">
          <span className="discussion-progress-label">
            Progression vers la majorité
          </span>
          <span className="discussion-progress-label">
            {majority}/{alivePlayers.length}
          </span>
        </div>
        <div className="discussion-progress-track">
          <motion.div
            animate={{ width: `${Math.min(progressFraction, 1) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="discussion-progress-fill"
            style={{
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
            className="discussion-majority-flash"
            style={{
              background: voteReached
                ? `rgba(132,204,22,0.1)`
                : 'rgba(59,130,246,0.1)',
              border: `1px solid ${voteReached ? 'rgba(132,204,22,0.2)' : 'rgba(59,130,246,0.2)'}`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
              className="discussion-majority-text"
              style={{
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
    <div className="discussion-choice-column">
      <motion.button
        onClick={() => !isDisabled && onChoose()}
        whileTap={!isDisabled ? { scale: 0.93 } : {}}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        disabled={isDisabled}
        className="discussion-choice-btn"
        style={{
          border: isSelected
            ? `2px solid ${accentColor}66`
            : '1.5px solid rgba(238,242,255,0.08)',
          background: isSelected
            ? `${accentColor}15`
            : 'rgba(8,12,24,0.8)',
          cursor: isDisabled ? 'default' : 'pointer',
          boxShadow: isSelected ? `0 0 24px ${accentColor}18` : 'none',
        }}
      >
        {/* Subtle glow on selected */}
        {isSelected && (
          <div
            className="discussion-choice-glow"
            style={{
              background: `radial-gradient(ellipse at 50% 80%, ${accentColor}10, transparent 70%)`,
            }}
          />
        )}

        <div className="discussion-choice-icon" style={{ color: isSelected ? accentColor : 'rgba(238,242,255,0.5)' }}>
          {icon}
        </div>
        <span className="discussion-choice-label" style={{ color: isSelected ? '#ffffff' : 'rgba(238,242,255,0.7)' }}>
          {label}
        </span>

        {/* Count badge */}
        <div
          className="discussion-choice-count-badge"
          style={{
            background: isSelected ? `${accentColor}25` : 'rgba(238,242,255,0.05)',
            border: `1px solid ${isSelected ? `${accentColor}30` : 'rgba(238,242,255,0.06)'}`,
          }}
        >
          <span className="discussion-choice-count-text" style={{ color: isSelected ? '#ffffff' : 'rgba(238,242,255,0.4)' }}>
            {count}/{total}
          </span>
        </div>
      </motion.button>

      {/* Player heads */}
      <div className="discussion-player-heads">
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
                className="discussion-player-avatar"
                style={{
                  background: `${accentColor}20`,
                  border: `1.5px solid ${accentColor}50`,
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
