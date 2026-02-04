'use client';

import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Skull, FileText, RotateCcw, Home, Users } from 'lucide-react';
import { triggerConfetti } from '@/components/shared/Confetti';

/**
 * AlibiPartyEndScreen - Écran de fin style "Rapport d'enquête"
 *
 * Affiche le classement des groupes avec leur % de cohérence.
 * Design unique pour Alibi Party Mode.
 *
 * @param {Object} props
 * @param {Object} props.groups - { groupId: { name, color, score: { correct, total } } }
 * @param {string} props.myGroupId - ID du groupe du joueur
 * @param {boolean} props.isHost - Si l'utilisateur est l'hôte
 * @param {Function} props.onNewGame - Callback pour rejouer (retour lobby)
 * @param {Function} props.onGoHome - Callback pour quitter (retour accueil)
 * @param {boolean} props.hostPresent - Si l'hôte est encore présent
 */
export default function AlibiPartyEndScreen({
  groups,
  myGroupId,
  isHost,
  onNewGame,
  onGoHome,
  hostPresent = true
}) {

  // Calculer le classement avec gestion des égalités
  const ranking = useMemo(() => {
    const sorted = Object.entries(groups)
      .filter(([id]) => id.startsWith('group'))
      .map(([id, group]) => {
        const { correct = 0, total = 1 } = group.score || {};
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        return {
          id,
          name: group.name,
          color: group.color,
          correct,
          total,
          percentage
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Attribuer les rangs avec gestion des ex-aequo
    let currentRank = 0;
    return sorted.map((group, index) => {
      // Si c'est le premier ou si le pourcentage est différent du précédent
      if (index === 0 || group.percentage !== sorted[index - 1].percentage) {
        currentRank = index;
      }
      // Vérifier s'il y a égalité (même % que précédent ou suivant)
      const isTied =
        (index > 0 && group.percentage === sorted[index - 1].percentage) ||
        (index < sorted.length - 1 && group.percentage === sorted[index + 1].percentage);

      return {
        ...group,
        rank: currentRank,
        isTied
      };
    });
  }, [groups]);

  // Message selon le pourcentage
  const getMessage = (percentage) => {
    if (percentage >= 90) return 'Alibis parfaits !';
    if (percentage >= 75) return 'Alibis quasi parfaits';
    if (percentage >= 50) return 'Quelques incohérences';
    if (percentage >= 25) return 'Alibis douteux';
    return 'Coupables évidents';
  };

  // Icône de rang
  const getRankIcon = (rank) => {
    switch (rank) {
      case 0: return <Trophy size={24} />;
      case 1: return <Medal size={24} />;
      case 2: return <Medal size={20} />;
      default: return <Skull size={20} />;
    }
  };

  // Couleur de rang
  const getRankColor = (rank) => {
    switch (rank) {
      case 0: return '#fbbf24'; // Or
      case 1: return '#94a3b8'; // Argent
      case 2: return '#cd7f32'; // Bronze
      default: return '#6b7280'; // Gris
    }
  };

  // Confetti pour le gagnant
  useEffect(() => {
    if (ranking.length > 0 && ranking[0].id === myGroupId) {
      const timer = setTimeout(() => triggerConfetti('victory'), 500);
      return () => clearTimeout(timer);
    }
  }, [ranking, myGroupId]);

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="alibi-end-screen">
      <motion.div
        className="report-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header style dossier */}
        <div className="report-header">
          <div className="report-stamp">
            <FileText size={20} />
            <span>CONFIDENTIEL</span>
          </div>
          <h1 className="report-title">Rapport d'Enquête</h1>
          <p className="report-date">Établi le {today}</p>
        </div>

        {/* Classement */}
        <div className="report-rankings">
          {ranking.map((group, index) => {
            const isMyGroup = group.id === myGroupId;
            const rankColor = getRankColor(group.rank);

            return (
              <motion.div
                key={group.id}
                className={`ranking-row ${isMyGroup ? 'my-group' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.15 }}
                style={{
                  '--group-color': group.color,
                  '--rank-color': rankColor
                }}
              >
                {/* Rang */}
                <div className="rank-badge" style={{ color: rankColor }}>
                  {getRankIcon(group.rank)}
                  <span className="rank-number">
                    {group.rank + 1}
                    {group.isTied && <span className="tied-badge">ex æquo</span>}
                  </span>
                </div>

                {/* Infos groupe */}
                <div className="group-info">
                  <div className="group-header">
                    <div
                      className="group-dot"
                      style={{ background: group.color }}
                    />
                    <span className="group-name" style={{ color: group.color }}>
                      {group.name}
                    </span>
                    {isMyGroup && (
                      <span className="my-group-badge">Toi</span>
                    )}
                  </div>
                  <div className="group-message">
                    {getMessage(group.percentage)}
                  </div>
                </div>

                {/* Score */}
                <div className="score-section">
                  <div className="score-percentage">
                    {group.percentage}%
                  </div>
                  <div className="score-details">
                    {group.correct}/{group.total} cohérents
                  </div>
                  <div className="score-bar">
                    <motion.div
                      className="score-bar-fill"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: group.percentage / 100 }}
                      transition={{ delay: 0.5 + index * 0.15, duration: 0.8 }}
                      style={{ background: group.color }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <motion.div
          className="report-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {isHost ? (
            <>
              <button className="action-btn primary" onClick={onNewGame}>
                <RotateCcw size={20} />
                <span>Rejouer</span>
              </button>
              <button className="action-btn secondary" onClick={onGoHome}>
                <Home size={20} />
                <span>Quitter</span>
              </button>
            </>
          ) : hostPresent ? (
            <button className="action-btn primary" onClick={onNewGame}>
              <Users size={20} />
              <span>Retour au lobby</span>
            </button>
          ) : (
            <button className="action-btn secondary" onClick={onGoHome}>
              <Home size={20} />
              <span>Retour à l'accueil</span>
            </button>
          )}
        </motion.div>
      </motion.div>

      <style jsx>{`
        .alibi-end-screen {
          min-height: 100%;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg, #1a1410 0%, #0d0a08 100%);
        }

        :global(.report-container) {
          width: 100%;
          max-width: 440px;
          background: linear-gradient(180deg, rgba(35, 28, 20, 0.95) 0%, rgba(25, 20, 15, 0.95) 100%);
          border: 2px solid rgba(245, 158, 11, 0.3);
          border-radius: 20px;
          padding: 24px;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .report-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px dashed rgba(245, 158, 11, 0.3);
        }

        .report-stamp {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 4px;
          color: #ef4444;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 12px;
          transform: rotate(-2deg);
        }

        .report-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.5rem;
          color: #fbbf24;
          margin: 0 0 8px 0;
          text-shadow: 0 0 30px rgba(251, 191, 36, 0.4);
        }

        .report-date {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }

        .report-rankings {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        :global(.ranking-row) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: all 0.2s;
        }

        :global(.ranking-row.my-group) {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .rank-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 50px;
        }

        .rank-number {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .tied-badge {
          font-size: 0.75rem;
          font-weight: 600;
          opacity: 0.9;
          white-space: nowrap;
        }

        .group-info {
          flex: 1;
          min-width: 0;
        }

        .group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .group-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .group-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .my-group-badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 10px;
          color: #fbbf24;
          font-weight: 600;
        }

        .group-message {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }

        .score-section {
          text-align: right;
          min-width: 80px;
        }

        .score-percentage {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: var(--group-color);
          line-height: 1;
        }

        .score-details {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 6px;
        }

        .score-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        :global(.score-bar-fill) {
          height: 100%;
          transform-origin: left center;
          border-radius: 2px;
          box-shadow: 0 0 8px currentColor;
        }

        :global(.report-actions) {
          display: flex;
          flex-direction: row;
          gap: 12px;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
        }

        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
        }

        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
        }

        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
