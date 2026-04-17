'use client';

/**
 * DailyHeader — header partagé pour tous les jeux daily (flat cartoon).
 *
 * Props :
 *  - title        : string
 *  - badge        : { label, color } optionnel (ex: V2 cyan)
 *  - onBack       : () => void
 *  - onStats      : () => void (optionnel — bouton ChartBar)
 *  - onHelp       : () => void (optionnel — bouton Question)
 *  - extras       : JSX (optionnel, boutons en plus à gauche des stats/help)
 */

import { ArrowLeft, ChartBar, Question } from '@phosphor-icons/react';

export default function DailyHeader({
  title,
  badge,
  onBack,
  onStats,
  onHelp,
  extras,
}) {
  return (
    <header className="daily-header">
      <button className="daily-icon-btn" onClick={onBack} aria-label="Retour">
        <ArrowLeft size={20} weight="fill" />
      </button>

      <h1 className="daily-header-title">
        <span>{title}</span>
        {badge && (
          <span
            className="daily-header-badge"
            style={{ background: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </h1>

      <div className="daily-header-actions">
        {extras}
        {onStats && (
          <button className="daily-icon-btn accent" onClick={onStats} aria-label="Statistiques">
            <ChartBar size={18} weight="fill" />
          </button>
        )}
        {onHelp && (
          <button className="daily-icon-btn accent" onClick={onHelp} aria-label="Comment jouer">
            <Question size={18} weight="fill" />
          </button>
        )}
      </div>
    </header>
  );
}
