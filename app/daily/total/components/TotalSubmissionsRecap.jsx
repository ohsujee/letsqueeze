'use client';

import { motion } from 'framer-motion';
import { MAX_SUBMISSIONS, formatResult } from './helpers';

export default function TotalSubmissionsRecap({ submissions }) {
  if (!submissions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}
    >
      <p style={{
        fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
      }}>
        Tes essais · {submissions.length}/{MAX_SUBMISSIONS}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {submissions.map((sub, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: sub.difference === 0
                ? 'rgba(16,185,129,0.1)'
                : sub.difference <= 10
                  ? 'rgba(245,158,11,0.06)'
                  : 'rgba(255,255,255,0.04)',
              border: sub.difference === 0
                ? '1px solid rgba(16,185,129,0.2)'
                : sub.difference <= 10
                  ? '1px solid rgba(245,158,11,0.15)'
                  : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              minWidth: 18,
            }}>#{i + 1}</span>
            <span style={{
              flex: 1, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>{sub.expression}</span>
            <span style={{
              fontSize: '0.85rem', fontWeight: 700,
              color: sub.difference === 0 ? '#10b981' : sub.difference <= 10 ? '#f59e0b' : '#fff',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>= {formatResult(sub.result)}</span>
            <span style={{
              fontSize: '0.75rem', fontWeight: 600,
              color: sub.difference === 0 ? '#10b981' : 'rgba(238,242,255,0.4)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              minWidth: 40, textAlign: 'right',
            }}>
              {sub.difference === 0 ? '🎯' : `±${formatResult(sub.difference)}`}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
