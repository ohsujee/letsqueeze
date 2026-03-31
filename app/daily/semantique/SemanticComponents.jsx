'use client';

/**
 * Semantic UI Components + Helpers
 * Extrait de app/daily/semantique/page.jsx
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChartBar, Trophy } from '@phosphor-icons/react';

export function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ─── Système de température ───────────────────────────────────────────────────
// score = rank/1000 (rank 1–1000, 1000 = mot cible)
// mots hors top 1000 → score = -0.05 (glacial)
export function toCelsius(score) {
  if (score >= 1) return 100;
  return Math.round(score * 100 * 100) / 100;
}

export function formatCelsius(score) {
  const deg = toCelsius(score);
  return deg.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getTemperature(score) {
  const deg = toCelsius(score);
  if (deg >= 100) return { emoji: '🎯', cls: 'trouve',  barCls: 'bar-trouve'  };
  if (deg >= 50)  return { emoji: '😱', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 40)  return { emoji: '🔥', cls: 'brulant', barCls: 'bar-brulant' };
  if (deg >= 20)  return { emoji: '😎', cls: 'chaud',   barCls: 'bar-chaud'   };
  if (deg >= 0)   return { emoji: '🥶', cls: 'froid',   barCls: 'bar-froid'   };
  return               { emoji: '🧊', cls: 'glacial', barCls: 'bar-glacial' };
}

export function computeFinalScore(attempts) {
  return Math.max(100, Math.round(5000 / (1 + 0.05 * (attempts - 1))));
}

export function getStreakFlames(count) {
  if (count < 2) return '';
  if (count < 4) return ' 🔥';
  if (count < 7) return ' 🔥🔥';
  return ' 🔥🔥🔥';
}

export function SemanticStatsModal({ isOpen, onClose, stats, streak }) {
  if (!isOpen) return null;
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="wordle-stats-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="wordle-stats-modal"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wsm-header">
              <h3 className="wsm-title" style={{ color: '#f97316' }}>Mes statistiques</h3>
              <button className="wsm-close" onClick={onClose}><X size={16} weight="fill" /></button>
            </div>
            <div className="wsm-stats-row">
              <div className="wsm-stat"><span className="wsm-stat-val">{stats.played}</span><span className="wsm-stat-lbl">Parties</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{winPct}%</span><span className="wsm-stat-lbl">Victoires</span></div>
              <div className="wsm-stat"><span className="wsm-stat-val">{streak.count}</span><span className="wsm-stat-lbl">{streak.count > 1 ? 'Jours 🔥' : 'Jour 🔥'}</span></div>
            </div>
            <p className="wsm-dist-title" style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
              Jouez chaque jour pour maintenir votre série !
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Result Banner ────────────────────────────────────────────────────────────
export function SemanticResultBanner({ attempts, score, stats, streak, targetWord, onShowStats, onShowLeaderboard, unranked = false }) {
  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const flames = getStreakFlames(streak.count);

  return (
    <motion.div
      className="sres-banner"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="sres-glow" />

      <div className="sres-hero">
        <div className="sres-hero-left">
          <span className="sres-emoji">🎯</span>
          <div>
            <p className="sres-verdict">Trouvé !</p>
            <p className="sres-sub">
              Le mot était <strong>{targetWord?.toUpperCase()}</strong> · {attempts} essai{attempts > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {unranked ? (
          <div className="sres-score" style={{ textAlign: 'right' }}>
            <span className="sres-score-val" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Non classé</span>
          </div>
        ) : (
          <div className="sres-score">
            <span className="sres-score-val">{score.toLocaleString('fr-FR')}</span>
            <span className="sres-score-lbl">pts</span>
          </div>
        )}
      </div>

      {unranked && (
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.5 }}>
          Tu n&apos;es pas dans le classement pour cette partie.
        </p>
      )}

      <div className="wres-stats-row">
        <span className="wres-stat-chip">
          <strong>{stats.played}</strong> partie{stats.played > 1 ? 's' : ''}
        </span>
        <span className="wres-stat-dot" />
        <span className="wres-stat-chip">
          <strong>{winPct}%</strong> victoires
        </span>
        <span className="wres-stat-dot" />
        <span className="wres-stat-chip">
          <strong>{streak.count}{flames}</strong> {streak.count > 1 ? 'jours de suite' : 'jour'}
        </span>
      </div>

      <div className="wres-actions">
        <button className="sres-btn secondary" onClick={onShowStats}>
          <ChartBar size={15} weight="fill" /> Statistiques
        </button>
        <button className="sres-btn primary" onClick={onShowLeaderboard} disabled={unranked} style={unranked ? { opacity: 0.4, cursor: 'default' } : {}}>
          <Trophy size={15} weight="fill" /> Classement
        </button>
      </div>
    </motion.div>
  );
}

// ─── GuessRow ─────────────────────────────────────────────────────────────────
export function GuessRow({ entry, isLatestRow = false, flash = false }) {
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
      className={`semantic-guess-row ${entry.score >= 1 ? 'winner' : ''} ${isLatestRow ? 'latest-row' : ''} ${flash ? 'flash-duplicate' : ''}`}
      initial={isLatestRow ? { opacity: 0, y: -6 } : false}
      animate={flash ? { opacity: [1, 0.3, 1, 0.3, 1], transition: { duration: 0.6 } } : { opacity: 1, y: 0 }}
      transition={flash ? {} : { duration: 0.22 }}
    >
      <span className="semantic-guess-num">{entry.attemptIndex}</span>
      <span className="semantic-guess-word">{entry.word}</span>
      <span className={`semantic-guess-temp temp-${cls}`}>{formatCelsius(entry.score)}°</span>
      <span className="semantic-guess-emoji">{emoji}</span>
      {inTop1000 ? (
        <div className="semantic-progression">
          <span className="semantic-prog-rank">{entry.rank}</span>
          <div className="semantic-prog-bar-track">
            <div className={`semantic-prog-bar-fill ${barCls}${isLatestRow ? ' latest' : ''}`} style={{ width: `${animatedPercent}%` }} />
          </div>
        </div>
      ) : (
        <div className="semantic-progression" />
      )}
    </motion.div>
  );
}
