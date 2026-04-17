'use client';

import { motion } from 'framer-motion';
import { Trophy, ChartBar, HashStraight, Timer, ArrowLeft } from '@phosphor-icons/react';
import { formatResult } from './helpers';
import { getStreakFlames } from '@/components/daily/dailyHelpers';

const VERDICT_MAP = {
  exact: { icon: <Trophy size={28} weight="fill" />, title: 'Compte exact !', cls: 'exact' },
  attempts: { icon: <HashStraight size={28} weight="fill" />, title: "Plus d'essais !", cls: 'attempts' },
  time: { icon: <Timer size={28} weight="fill" />, title: 'Temps écoulé !', cls: 'time' },
  quit: { icon: <ArrowLeft size={28} weight="fill" />, title: 'Partie abandonnée', cls: 'quit' },
};

export default function TotalResultBanner({ exact, difference, bestResult, target, timeMs, score, stats, streak, endReason, onShowStats, onShowLeaderboard }) {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);
  const verdict = VERDICT_MAP[endReason] || VERDICT_MAP.time;

  return (
    <motion.div
      className={`total-result-flat ${verdict.cls}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Verdict */}
      <div className="total-result-verdict">
        <span className={`total-result-icon ${verdict.cls}`}>{verdict.icon}</span>
        <p className="total-result-title">{verdict.title}</p>
        {exact ? (
          <p className="total-result-sub">En {timeStr}</p>
        ) : bestResult !== null ? (
          <div className="total-result-details">
            <div className="total-result-detail">
              <span className="total-result-detail-label">Résultat</span>
              <span className="total-result-detail-value">{formatResult(bestResult)}</span>
            </div>
            <div className="total-result-detail">
              <span className="total-result-detail-label">Écart</span>
              <span className={`total-result-detail-value ${difference <= 5 ? 'exact' : difference <= 10 ? 'close' : 'far'}`}>
                {bestResult >= target ? '+' : '−'}{formatResult(difference)}
              </span>
            </div>
          </div>
        ) : (
          <p className="total-result-sub">Aucune soumission</p>
        )}
      </div>

      {/* Score */}
      <div className="total-result-score">
        <span className="total-result-score-value">{score.toLocaleString('fr-FR')}</span>
      </div>

      {/* Stats */}
      <div className="daily-banner-chips">
        <span className="daily-chip"><strong>{stats.played}</strong> partie{stats.played > 1 ? 's' : ''}</span>
        <span className="daily-chip-dot" />
        <span className="daily-chip"><strong>{winPct}%</strong> exacts</span>
        <span className="daily-chip-dot" />
        <span className="daily-chip"><strong>{streak.count}{flames}</strong> {streak.count > 1 ? 'jours' : 'jour'}</span>
      </div>

      {/* Actions */}
      <div className="daily-banner-actions">
        <button className="daily-btn secondary" onClick={onShowStats}>
          <ChartBar size={15} weight="fill" /> Stats
        </button>
        <button className="daily-btn primary" onClick={onShowLeaderboard}>
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}
