"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import ImposteurClueWall from '@/components/game/ImposteurClueWall';
import ImposteurVoteGrid from '@/components/game/ImposteurVoteGrid';

export default function ImposteurVotingPhase({
  settings,
  descriptions,
  players,
  myUid,
  alivePlayers,
  amIAlive,
  currentSubRound,
  onVote,
  onTimerEnd,
  onAllVoted,
  currentVotes,
}) {
  const [cluesExpanded, setCluesExpanded] = useState(false);
  const isWrittenMode = settings?.clueMode === 'written';
  const hasClues = descriptions && Object.keys(descriptions).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* ── Collapsible clue wall (written mode only) ── */}
      {isWrittenMode && hasClues && (
        <div style={{
          borderRadius: '16px',
          border: '1px solid rgba(238,242,255,0.06)',
          background: 'rgba(8,12,24,0.8)',
          overflow: 'hidden',
        }}>
          {/* Toggle header */}
          <motion.button
            onClick={() => setCluesExpanded(prev => !prev)}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: '0.82rem', fontWeight: 700,
              color: 'rgba(238,242,255,0.6)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              Voir les indices
            </span>
            <motion.div
              animate={{ rotate: cluesExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(238,242,255,0.4)',
              }}
            >
              {cluesExpanded
                ? <CaretUp size={18} weight="bold" />
                : <CaretDown size={18} weight="bold" />
              }
            </motion.div>
          </motion.button>

          {/* Clue wall content */}
          <AnimatePresence initial={false}>
            {cluesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 12px 12px' }}>
                  <ImposteurClueWall
                    clues={descriptions}
                    players={players}
                    subRound={currentSubRound}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Vote grid ── */}
      <ImposteurVoteGrid
        players={players}
        myUid={myUid}
        alivePlayers={alivePlayers}
        onVote={onVote}
        onTimerEnd={onTimerEnd}
        onAllVoted={onAllVoted}
        currentVotes={currentVotes}
        voteDuration={10}
        isEliminated={!amIAlive}
      />
    </motion.div>
  );
}
