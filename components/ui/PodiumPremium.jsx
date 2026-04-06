"use client";
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useGameAudio } from '@/lib/hooks/useGameAudio';
import { darkenColor } from '@/lib/utils/colorUtils';

const RANK_STYLES = {
  1: { bg: '#FFD233', dark: '#CC9600', text: '#5C3D00' },
  2: { bg: '#C8D6E5', dark: '#8E9BAD', text: '#2C3E50' },
  3: { bg: '#E8945A', dark: '#A05A2E', text: '#4A2000' },
};

const SIZES = {
  large:  { height: 90, avatarSize: 62, fontSize: '1.6rem', scoreSize: '0.85rem', pedestalW: 90, rankFont: '2rem' },
  medium: { height: 65, avatarSize: 52, fontSize: '1.3rem', scoreSize: '0.75rem', pedestalW: 75, rankFont: '1.5rem' },
  small:  { height: 45, avatarSize: 48, fontSize: '1.2rem', scoreSize: '0.7rem', pedestalW: 70, rankFont: '1.3rem' },
};

function buildPodiumSlots(topPlayers) {
  const players = topPlayers.filter(Boolean);
  if (players.length === 0) return [];

  const ranks = players.map(p => p.rank);
  const uniqueRanks = [...new Set(ranks)];

  // Tous ex-aequo
  if (uniqueRanks.length === 1) {
    return players.map((p, i) => ({
      player: p,
      rank: p.rank,
      size: 'large',
      delay: i * 0.3,
    }));
  }

  // 2 premiers ex-aequo (rank 1, rank 1, rank 3)
  const rank1Players = players.filter(p => p.rank === 1);
  if (rank1Players.length === 2) {
    const third = players.find(p => p.rank !== 1);
    return [
      { player: rank1Players[0], rank: 1, size: 'large', delay: 0 },
      { player: rank1Players[1], rank: 1, size: 'large', delay: 0.3 },
      ...(third ? [{ player: third, rank: third.rank, size: 'small', delay: 0.6 }] : []),
    ];
  }

  // 2e et 3e ex-aequo (rank 1, rank 2, rank 2)
  const rank2Players = players.filter(p => p.rank === 2);
  if (rank2Players.length === 2) {
    const first = players.find(p => p.rank === 1);
    return [
      ...(rank2Players[0] ? [{ player: rank2Players[0], rank: 2, size: 'medium', delay: 0 }] : []),
      ...(first ? [{ player: first, rank: 1, size: 'large', delay: 0.4 }] : []),
      ...(rank2Players[1] ? [{ player: rank2Players[1], rank: 2, size: 'medium', delay: 0.8 }] : []),
    ];
  }

  // Cas normal : 3 rangs différents → 2e | 1er | 3e
  return [
    players[1] ? { player: players[1], rank: players[1].rank, size: 'medium', delay: 0 } : null,
    players[0] ? { player: players[0], rank: players[0].rank, size: 'large', delay: 0.4 } : null,
    players[2] ? { player: players[2], rank: players[2].rank, size: 'small', delay: 0.8 } : null,
  ].filter(Boolean);
}

export const PodiumPremium = ({ topPlayers, disableAnimations = false }) => {
  const audio = useGameAudio();

  useEffect(() => {
    audio.play('victory/end-celebration', { volume: 0.4 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const podiumSlots = buildPodiumSlots(topPlayers);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: '10px',
      padding: '0.5rem 0 0 0',
      position: 'relative',
    }}>
      {podiumSlots.map((slot) => {
        const { player, rank, size: sizeKey, delay } = slot;
        const style = RANK_STYLES[rank] || RANK_STYLES[3];
        const size = SIZES[sizeKey];

        const isTeam = !!player.color;
        const displayName = isTeam
          ? (player.name || '').replace(/^(Équipe |Team )/i, '') || 'Équipe'
          : player.name || 'Joueur';
        const initial = displayName.charAt(0).toUpperCase();

        const bg = isTeam ? player.color : style.bg;
        const dark = isTeam ? darkenColor(player.color, 40) : style.dark;
        const text = isTeam ? '#fff' : style.text;

        return (
          <motion.div
            key={player.uid || player.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: sizeKey === 'large' ? 10 : 5,
            }}
            initial={disableAnimations ? false : { y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={disableAnimations ? { duration: 0 } : {
              delay,
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: size.avatarSize,
              height: size.avatarSize,
              borderRadius: '50%',
              background: bg,
              border: `4px solid ${dark}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: "'Bungee', cursive",
                fontSize: size.fontSize,
                color: text,
                lineHeight: 1,
              }}>
                {initial}
              </span>
            </div>

            {/* Nom */}
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              marginBottom: 4,
              maxWidth: '110px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </div>

            {/* Score */}
            <div style={{
              fontFamily: "'Bungee', cursive",
              fontSize: size.scoreSize,
              color: '#fff',
              background: '#3a3a58',
              borderBottom: '2px solid #2a2a45',
              borderRadius: 8,
              padding: '4px 12px',
              marginBottom: 10,
            }}>
              {player.score ?? 0}
            </div>

            {/* Piédestal */}
            <motion.div
              style={{
                width: size.pedestalW,
                background: bg,
                borderRadius: '12px 12px 0 0',
                borderBottom: `4px solid ${dark}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              initial={disableAnimations ? false : { height: 0 }}
              animate={{ height: size.height }}
              transition={disableAnimations ? { duration: 0 } : {
                delay: delay + 0.2,
                duration: 0.6,
                ease: 'easeOut',
              }}
            >
              <span style={{
                fontFamily: "'Bungee', cursive",
                fontSize: size.rankFont,
                color: text,
                lineHeight: 1,
              }}>
                {rank}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

