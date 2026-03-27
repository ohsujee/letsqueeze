"use client";

import { motion } from 'framer-motion';

const ACCENT = '#84cc16';
const ACCENT_LIGHT = '#a3e635';

/**
 * Displays all submitted clues for a given sub-round in a card grid.
 * Each card shows the player name and their clue.
 */
export default function ImposteurClueWall({ clues, players, subRound }) {
  const currentClues = clues?.[subRound] || {};
  const clueEntries = Object.entries(currentClues);

  if (clueEntries.length === 0) return null;

  const getPlayerName = (uid) => {
    const p = players?.find(p => p.uid === uid);
    return p?.name || 'Joueur';
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.13em',
        color: 'rgba(238,242,255,0.35)',
        textTransform: 'uppercase',
        marginBottom: '4px',
      }}>
        Indices — Tour {subRound}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '8px',
      }}>
        {clueEntries.map(([uid, clue], index) => (
          <motion.div
            key={uid}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            style={{
              background: 'rgba(8,14,32,0.92)',
              border: '1px solid rgba(132,204,22,0.12)',
              borderRadius: '12px',
              padding: '10px 12px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              fontSize: '0.68rem', fontWeight: 700,
              color: 'rgba(238,242,255,0.4)',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {getPlayerName(uid)}
            </div>
            <div style={{
              fontSize: '0.9rem', fontWeight: 700,
              color: '#eef2ff',
              wordBreak: 'break-word',
            }}>
              {clue || '...'}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
