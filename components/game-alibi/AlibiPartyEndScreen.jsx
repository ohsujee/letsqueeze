'use client';

import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Skull, FileText, RotateCcw, Home, Users } from 'lucide-react';
import './AlibiPartyEndScreen.css';

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

  // Confetti removed (caused white squares on Android)

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

    </div>
  );
}
