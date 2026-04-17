'use client';

/**
 * GuessRow — ligne de guess flat cartoon.
 *
 * Température → emoji + classe couleur + palier de la barre.
 * La dernière tentative (latest) + le flash duplicate ont des styles spécifiques.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatCelsius, getTemperature } from '@/components/daily/dailyHelpers';

export default function GuessRow({ entry, isLatestRow = false, flash = false }) {
  const { emoji, cls, barCls } = getTemperature(entry.score);
  const inTop1000 = entry.rank != null && entry.rank > 0 && entry.rank <= 1000;
  const progressPercent = inTop1000 ? Math.round((entry.rank / 1000) * 100) : 0;
  const [animatedPercent, setAnimatedPercent] = useState(isLatestRow ? 0 : progressPercent);

  useEffect(() => {
    if (!isLatestRow) return;
    const t = setTimeout(() => setAnimatedPercent(progressPercent), 320);
    return () => clearTimeout(t);
  }, [isLatestRow, progressPercent]);

  return (
    <motion.div
      className={[
        'sem-row',
        entry.score >= 1 ? 'winner' : '',
        isLatestRow ? 'latest' : '',
        flash ? 'flash' : '',
      ].filter(Boolean).join(' ')}
      initial={isLatestRow ? { opacity: 0, y: -6 } : false}
      animate={flash
        ? { opacity: [1, 0.3, 1, 0.3, 1], transition: { duration: 0.6 } }
        : { opacity: 1, y: 0 }
      }
      transition={flash ? {} : { duration: 0.22 }}
    >
      <span className="sem-row-num">{entry.attemptIndex}</span>
      <span className="sem-row-word">{entry.word}</span>
      <span className={`sem-row-temp temp-${cls}`}>{formatCelsius(entry.score)}°</span>
      <span className="sem-row-emoji">{emoji}</span>
      {inTop1000 ? (
        <div className="sem-row-prog">
          <span className="sem-row-prog-rank">{entry.rank}</span>
          <div className="sem-row-prog-track">
            <div
              className={`sem-row-prog-fill ${barCls}${isLatestRow ? ' latest' : ''}`}
              style={{ width: `${animatedPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="sem-row-prog" />
      )}
    </motion.div>
  );
}
