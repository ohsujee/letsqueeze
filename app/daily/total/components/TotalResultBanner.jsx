'use client';

import { motion } from 'framer-motion';
import { Trophy, ChartBar, HashStraight, Timer, ArrowLeft } from '@phosphor-icons/react';
import { formatResult, getStreakFlames } from './helpers';

export default function TotalResultBanner({ exact, difference, bestResult, target, timeMs, score, stats, streak, endReason, onShowStats, onShowLeaderboard }) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);

  const verdictMap = {
    exact: { icon: <Trophy size={28} weight="fill" color="#10b981" />, title: 'Compte exact !' },
    attempts: { icon: <HashStraight size={28} weight="fill" color="#f59e0b" />, title: 'Plus d\'essais !' },
    time: { icon: <Timer size={28} weight="fill" color="#ef4444" />, title: 'Temps écoulé !' },
    quit: { icon: <ArrowLeft size={28} weight="fill" color="#ef4444" />, title: 'Partie abandonnée' },
  };
  const verdict = verdictMap[endReason] || verdictMap.time;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'rgba(8,14,32,0.92)',
        border: `1px solid ${exact ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.12)'}`,
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}
    >
      {/* Verdict */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{verdict.icon}</div>
        <p style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.1rem', color: '#fff', margin: 0,
        }}>{verdict.title}</p>
        {exact ? (
          <p style={{
            fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', margin: '6px 0 0',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>En {timeStr}</p>
        ) : bestResult !== null ? (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8,
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 2,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>Résultat</span>
              <span style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem', color: '#fff',
              }}>{formatResult(bestResult)}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 2,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}>Écart</span>
              <span style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem',
                color: difference <= 5 ? '#10b981' : difference <= 10 ? '#f59e0b' : '#ef4444',
              }}>±{formatResult(difference)}</span>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', margin: '6px 0 0',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>Aucune soumission</p>
        )}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.8rem', lineHeight: 1,
          color: '#3b82f6',
          textShadow: '0 0 20px rgba(59,130,246,0.5)',
        }}>{score.toLocaleString('fr-FR')}</span>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, color: 'rgba(59,130,246,0.6)',
          marginLeft: 6, textTransform: 'uppercase',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>pts</span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 24,
        width: '100%',
      }}>
        {[
          { value: stats.played, label: `partie${stats.played > 1 ? 's' : ''}` },
          { value: `${winPct}%`, label: 'exacts' },
          { value: `${streak.count}${flames}`, label: streak.count > 1 ? 'jours' : 'jour' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <span style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.1rem', color: '#fff', display: 'block',
            }}>{s.value}</span>
            <span style={{
              fontSize: '0.65rem', color: 'rgba(238,242,255,0.35)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div style={{ width: '60%', height: 1, background: 'rgba(238,242,255,0.06)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button
          onClick={onShowStats}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <ChartBar size={15} weight="fill" /> Stats
        </button>
        <button
          onClick={onShowLeaderboard}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#3b82f6', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}
