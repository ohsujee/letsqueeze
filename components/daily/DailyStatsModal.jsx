'use client';

/**
 * DailyStatsModal — modal stats générique (flat cartoon).
 *
 * Props :
 *  - isOpen  : boolean
 *  - onClose : () => void
 *  - title   : string (ex: "Mes statistiques")
 *  - stats   : { played, won }
 *  - streak  : { count }
 *  - hint    : string | JSX (optionnel, message sous les stats)
 *  - children: JSX (optionnel, contenu additionnel — ex: histogramme)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

export default function DailyStatsModal({
  isOpen,
  onClose,
  title = 'Mes statistiques',
  stats = { played: 0, won: 0 },
  streak = { count: 0 },
  hint,
  children,
}) {
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="daily-modal-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="daily-modal"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="daily-modal-header">
              <h3 className="daily-modal-title">{title}</h3>
              <button className="daily-modal-close" onClick={onClose} aria-label="Fermer">
                <X size={14} weight="bold" />
              </button>
            </div>

            <div className="daily-stats-row">
              <div className="daily-stat">
                <span className="daily-stat-value">{stats.played}</span>
                <span className="daily-stat-label">Parties</span>
              </div>
              <div className="daily-stat">
                <span className="daily-stat-value">{winPct}%</span>
                <span className="daily-stat-label">Victoires</span>
              </div>
              <div className="daily-stat">
                <span className="daily-stat-value">{streak.count}</span>
                <span className="daily-stat-label">{streak.count > 1 ? 'Jours 🔥' : 'Jour 🔥'}</span>
              </div>
            </div>

            {children}

            {hint && <p className="daily-stats-hint">{hint}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
