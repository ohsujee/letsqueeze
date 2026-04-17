'use client';

/**
 * DailyResultBanner — bannière de fin de partie (flat cartoon).
 *
 * Props :
 *  - emoji            : string
 *  - verdict          : string (ex: "Trouvé !")
 *  - sub              : JSX | string (ex: "Le mot était ORANGE · 4 essais")
 *  - score            : number
 *  - scoreLabel       : string (ex: "pts")
 *  - unranked         : boolean (si true, masque le score + montre "Non classé")
 *  - unrankedMessage  : string | JSX
 *  - stats            : { played, won } (pour les chips)
 *  - streak           : { count, flames? } (flames = string rendue à côté du nombre)
 *  - onShowStats      : () => void
 *  - onShowLeaderboard: () => void
 *  - showActions      : boolean (défaut true)
 */

import { motion } from 'framer-motion';
import { ChartBar, Trophy } from '@phosphor-icons/react';

export default function DailyResultBanner({
  emoji = '🎯',
  verdict,
  sub,
  score = 0,
  scoreLabel = 'pts',
  unranked = false,
  unrankedMessage = "Tu n'es pas dans le classement pour cette partie.",
  stats = { played: 0, won: 0 },
  streak = { count: 0 },
  flamesSuffix = '',
  onShowStats,
  onShowLeaderboard,
  showActions = true,
}) {
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <motion.div
      className="daily-banner"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="daily-banner-hero">
        <div className="daily-banner-hero-left">
          <span className="daily-banner-emoji">{emoji}</span>
          <div>
            <p className="daily-banner-verdict">{verdict}</p>
            {sub && <p className="daily-banner-sub">{sub}</p>}
          </div>
        </div>

        {unranked ? (
          <div className="daily-banner-score">
            <span
              className="daily-banner-score-value"
              style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)' }}
            >
              Non classé
            </span>
          </div>
        ) : (
          <div className="daily-banner-score">
            <span className="daily-banner-score-value">
              {score.toLocaleString('fr-FR')}
            </span>
            <span className="daily-banner-score-label">{scoreLabel}</span>
          </div>
        )}
      </div>

      {unranked && <p className="daily-banner-unranked">{unrankedMessage}</p>}

      <div className="daily-banner-chips">
        <span className="daily-chip">
          <strong>{stats.played}</strong> partie{stats.played > 1 ? 's' : ''}
        </span>
        <span className="daily-chip-dot" />
        <span className="daily-chip">
          <strong>{winPct}%</strong> victoires
        </span>
        <span className="daily-chip-dot" />
        <span className="daily-chip">
          <strong>{streak.count}{flamesSuffix}</strong> {streak.count > 1 ? 'jours' : 'jour'}
        </span>
      </div>

      {showActions && (
        <div className="daily-banner-actions">
          {onShowStats && (
            <button className="daily-btn secondary" onClick={onShowStats}>
              <ChartBar size={15} weight="fill" /> Statistiques
            </button>
          )}
          {onShowLeaderboard && (
            <button
              className="daily-btn primary"
              onClick={onShowLeaderboard}
              disabled={unranked}
            >
              <Trophy size={15} weight="fill" /> Classement
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
