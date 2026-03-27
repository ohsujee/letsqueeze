"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#e11d48';
const ACCENT_LIGHT = '#f43f5e';

/**
 * Vote selection grid — tap a player avatar to vote, then confirm.
 * Shows simultaneous reveal of all votes with staggered animation.
 */
export default function ImposteurVoteGrid({
  players,
  myUid,
  votes,
  subRound,
  hasVoted,
  onVote,
  allVotesIn,
  isHost,
  onRevealVotes,
}) {
  const [selectedUid, setSelectedUid] = useState(null);

  const currentVotes = votes?.[subRound] || {};
  const myVote = currentVotes[myUid];
  const voteCount = Object.keys(currentVotes).length;
  const alivePlayers = players.filter(p => p.alive !== false);
  const totalAlive = alivePlayers.length;

  const handleSelect = useCallback((uid) => {
    if (hasVoted || uid === myUid) return;
    setSelectedUid(uid);
  }, [hasVoted, myUid]);

  const handleConfirm = useCallback(() => {
    if (!selectedUid || hasVoted) return;
    onVote?.(selectedUid);
    setSelectedUid(null);
  }, [selectedUid, hasVoted, onVote]);

  // Count votes per target for reveal
  const voteCounts = {};
  Object.values(currentVotes).forEach(target => {
    voteCounts[target] = (voteCounts[target] || 0) + 1;
  });

  const isMe = (uid) => uid === myUid;
  const isAlive = (uid) => alivePlayers.some(p => p.uid === uid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Vote progress */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '8px 16px',
        background: 'rgba(8,14,32,0.7)',
        borderRadius: '10px',
        border: '1px solid rgba(238,242,255,0.07)',
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(238,242,255,0.5)' }}>
          {allVotesIn ? 'Tous les votes sont in !' : `${voteCount}/${totalAlive} ont voté`}
        </span>
        {!allVotesIn && (
          <div style={{
            display: 'flex', gap: '3px',
          }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: ACCENT_LIGHT,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Player grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '10px',
      }}>
        {alivePlayers.map((player, index) => {
          const isSelected = selectedUid === player.uid;
          const isSelf = isMe(player.uid);
          const receivedVotes = allVotesIn ? (voteCounts[player.uid] || 0) : 0;
          const isEliminated = allVotesIn && receivedVotes === Math.max(...Object.values(voteCounts), 0) && receivedVotes > 0;

          return (
            <motion.button
              key={player.uid}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileTap={!hasVoted && !isSelf ? { scale: 0.95 } : {}}
              onClick={() => handleSelect(player.uid)}
              disabled={hasVoted || isSelf}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '6px',
                padding: '12px 8px',
                borderRadius: '14px',
                border: isSelected
                  ? `2px solid ${ACCENT_LIGHT}`
                  : isEliminated
                    ? '2px solid #ef4444'
                    : '1px solid rgba(238,242,255,0.08)',
                background: isSelected
                  ? 'rgba(225,29,72,0.1)'
                  : isEliminated
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(238,242,255,0.03)',
                cursor: hasVoted || isSelf ? 'default' : 'pointer',
                opacity: isSelf ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {/* Avatar circle */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isSelf
                  ? 'rgba(59,130,246,0.15)'
                  : isSelected
                    ? 'rgba(225,29,72,0.15)'
                    : 'rgba(238,242,255,0.06)',
                border: `2px solid ${isSelf ? '#3b82f640' : isSelected ? `${ACCENT}60` : 'rgba(238,242,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1rem',
                color: isSelf ? '#3b82f6' : isSelected ? ACCENT_LIGHT : 'rgba(238,242,255,0.5)',
              }}>
                {player.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: isSelf ? '#3b82f6' : '#eef2ff',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '90px',
              }}>
                {isSelf ? 'Toi' : player.name}
              </div>

              {/* Vote count reveal */}
              <AnimatePresence>
                {allVotesIn && receivedVotes > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 24, height: 24, borderRadius: '50%',
                      background: isEliminated ? '#ef4444' : ACCENT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '0.7rem', color: '#fff',
                      boxShadow: `0 0 12px ${isEliminated ? '#ef444466' : `${ACCENT}66`}`,
                    }}
                  >
                    {receivedVotes}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button */}
      {!hasVoted && selectedUid && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleConfirm}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
            color: '#fff',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${ACCENT}44`,
          }}
        >
          Confirmer le vote
        </motion.button>
      )}

      {/* Voted confirmation */}
      {hasVoted && !allVotesIn && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'rgba(238,242,255,0.4)',
        }}>
          ✅ Vote enregistré — en attente des autres…
        </div>
      )}
    </div>
  );
}
