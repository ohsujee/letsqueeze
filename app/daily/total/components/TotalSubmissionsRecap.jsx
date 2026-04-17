'use client';

import { motion } from 'framer-motion';
import { Star } from '@phosphor-icons/react';
import { MAX_SUBMISSIONS, formatResult } from './helpers';

export default function TotalSubmissionsRecap({ submissions, target }) {
  if (!submissions.length) return null;

  // Trouver le meilleur essai (plus petit écart)
  const bestIdx = submissions.reduce((best, sub, i) =>
    sub.difference < submissions[best].difference ? i : best
  , 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}
    >
      <p className="total-recap-title">
        Tes essais · {submissions.length}/{MAX_SUBMISSIONS}
      </p>
      <div className="total-recap-list">
        {submissions.map((sub, i) => (
          <div key={i} className="total-recap-row">
            <span className="total-recap-num">#{i + 1}</span>
            {i === bestIdx && <Star size={14} weight="fill" className="total-recap-star" />}
            <span className="total-recap-expr">{sub.expression}</span>
            <span className={`total-recap-result ${sub.difference === 0 ? 'exact' : ''}`}>
              = {formatResult(sub.result)}
            </span>
            <span className={`total-recap-diff ${sub.difference === 0 ? 'exact' : ''}`}>
              {sub.difference === 0 ? '🎯' : `${sub.result >= target ? '+' : '−'}${formatResult(sub.difference)}`}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
