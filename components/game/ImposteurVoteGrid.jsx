"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

const ACCENT = '#84cc16';
const ACCENT_LIGHT = '#a3e635';

/**
 * Vote grid — tap a player to vote (no confirm), changeable, with countdown timer.
 * When timer expires → onTimerEnd(). When all alive voted → onAllVoted().
 */
export default function ImposteurVoteGrid({
  players,
  myUid,
  alivePlayers,
  onVote,
  onTimerEnd,
  onAllVoted,
  currentVotes = {},
  voteDuration = 10,
  isEliminated = false,
}) {
  const [timeLeft, setTimeLeft] = useState(voteDuration);
  const [showResults, setShowResults] = useState(false);
  const timerEndedRef = useRef(false);
  const allVotedFiredRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // My current vote
  const myVote = currentVotes[myUid] || null;

  // Vote count
  const aliveUids = new Set((alivePlayers || []).map(p => p.uid));
  const aliveVoteCount = Object.keys(currentVotes).filter(uid => aliveUids.has(uid)).length;
  const totalAlive = alivePlayers?.length || 0;
  const allVotesIn = aliveVoteCount >= totalAlive && totalAlive > 0;

  // Count votes per target
  const voteCounts = {};
  Object.values(currentVotes).forEach(target => {
    voteCounts[target] = (voteCounts[target] || 0) + 1;
  });

  // Countdown timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerEndedRef.current = false;
    allVotedFiredRef.current = false;
    setTimeLeft(voteDuration);
    setShowResults(false);

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, voteDuration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && !timerEndedRef.current) {
        timerEndedRef.current = true;
        clearInterval(interval);
        setShowResults(true);
        onTimerEnd?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [voteDuration, onTimerEnd]);

  // All voted check
  useEffect(() => {
    if (allVotesIn && !allVotedFiredRef.current && !timerEndedRef.current) {
      allVotedFiredRef.current = true;
      setShowResults(true);
      onAllVoted?.();
    }
  }, [allVotesIn, onAllVoted]);

  // Haptic feedback
  const triggerHaptic = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
    }
  }, []);

  const handleTap = useCallback((targetUid) => {
    if (isEliminated || showResults) return;
    if (targetUid === myUid) return;
    // Check target is alive
    if (!aliveUids.has(targetUid)) return;
    triggerHaptic();
    onVote?.(targetUid);
  }, [isEliminated, showResults, myUid, aliveUids, triggerHaptic, onVote]);

  const timerDanger = timeLeft <= 5;
  const displaySeconds = Math.ceil(timeLeft);

  // Max votes for highlight
  const maxVotes = Math.max(...Object.values(voteCounts), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Timer */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
          animate={timerDanger && !showResults ? {
            scale: [1, 1.08, 1],
            color: ['#ef4444', '#ff6b6b', '#ef4444'],
          } : {}}
          transition={timerDanger ? { duration: 0.8, repeat: Infinity } : {}}
          style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: 'clamp(2rem, 8vw, 3rem)',
            color: showResults ? 'rgba(238,242,255,0.3)' : timerDanger ? '#ef4444' : ACCENT_LIGHT,
            textShadow: showResults
              ? 'none'
              : timerDanger
                ? '0 0 20px #ef444466'
                : `0 0 20px ${ACCENT}55`,
            lineHeight: 1,
          }}
        >
          {showResults ? '0' : displaySeconds}
        </motion.div>
      </div>

      {/* Title */}
      <div style={{
        textAlign: 'center',
        fontFamily: "var(--font-title, 'Bungee'), cursive",
        fontSize: '1rem',
        color: ACCENT_LIGHT,
        textShadow: `0 0 16px ${ACCENT}55`,
      }}>
        Qui est l'imposteur ?
      </div>

      {/* Vote progress */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        padding: '6px 14px',
        background: 'rgba(8,14,32,0.7)',
        borderRadius: '10px',
        border: '1px solid rgba(238,242,255,0.07)',
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(238,242,255,0.5)' }}>
          {allVotesIn ? 'Tous les votes sont in !' : `${aliveVoteCount}/${totalAlive} ont voté`}
        </span>
        {!allVotesIn && !showResults && (
          <div style={{ display: 'flex', gap: '3px' }}>
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

      {/* Spectator indicator */}
      {isEliminated && (
        <div style={{
          textAlign: 'center', padding: '10px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '12px',
          fontSize: '0.8rem', fontWeight: 700, color: '#f87171',
        }}>
          Tu observes le vote en spectateur
        </div>
      )}

      {/* Player grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
      }}>
        {(alivePlayers || []).map((player, index) => {
          const isSelf = player.uid === myUid;
          const isMyVoteTarget = myVote === player.uid;
          const isAlive = aliveUids.has(player.uid);
          const receivedVotes = showResults ? (voteCounts[player.uid] || 0) : 0;
          const isTopVoted = showResults && receivedVotes === maxVotes && receivedVotes > 0;
          const canTap = !isSelf && isAlive && !isEliminated && !showResults;

          return (
            <motion.button
              key={player.uid}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              whileTap={canTap ? { scale: 0.95 } : {}}
              onClick={() => handleTap(player.uid)}
              disabled={!canTap}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
                padding: '14px 10px',
                borderRadius: '16px',
                border: isMyVoteTarget
                  ? `2px solid ${ACCENT_LIGHT}`
                  : isTopVoted
                    ? '2px solid #ef4444'
                    : '1px solid rgba(238,242,255,0.08)',
                background: isMyVoteTarget
                  ? 'rgba(132,204,22,0.1)'
                  : isTopVoted
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(238,242,255,0.03)',
                cursor: canTap ? 'pointer' : 'default',
                opacity: isSelf ? 0.4 : 1,
                transition: 'border 0.15s ease, background 0.15s ease',
              }}
            >
              {/* Avatar circle */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isSelf
                  ? 'rgba(59,130,246,0.15)'
                  : isMyVoteTarget
                    ? 'rgba(132,204,22,0.15)'
                    : 'rgba(238,242,255,0.06)',
                border: `2px solid ${isSelf ? '#3b82f640' : isMyVoteTarget ? `${ACCENT}60` : 'rgba(238,242,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem',
                color: isSelf ? '#3b82f6' : isMyVoteTarget ? ACCENT_LIGHT : 'rgba(238,242,255,0.5)',
              }}>
                {player.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Name */}
              <div style={{
                fontSize: '0.78rem', fontWeight: 700,
                color: isSelf ? '#3b82f6' : '#eef2ff',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100px',
              }}>
                {player.name}
              </div>

              {/* "Toi" label for self */}
              {isSelf && (
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  color: '#3b82f6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  Toi
                </div>
              )}

              {/* "Ton vote" badge */}
              {isMyVoteTarget && !showResults && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    position: 'absolute', top: -8, right: -8,
                    padding: '2px 8px', borderRadius: '10px',
                    background: ACCENT,
                    fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                    letterSpacing: '0.03em',
                    boxShadow: `0 2px 8px ${ACCENT}66`,
                  }}
                >
                  Ton vote
                </motion.div>
              )}

              {/* Vote count badge (results reveal) */}
              <AnimatePresence>
                {showResults && receivedVotes > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 15 }}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      width: 28, height: 28, borderRadius: '50%',
                      background: isTopVoted ? '#ef4444' : ACCENT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '0.75rem', color: '#fff',
                      boxShadow: `0 0 12px ${isTopVoted ? '#ef444466' : `${ACCENT}66`}`,
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
    </div>
  );
}
