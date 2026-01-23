'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users } from 'lucide-react';

/**
 * TeamModeSelector - Composant centralisé pour le toggle Solo/Équipes
 *
 * @param {Object} props
 * @param {string} props.mode - Mode actuel ("individuel" | "équipes")
 * @param {number} props.teamCount - Nombre d'équipes (2, 3, ou 4)
 * @param {Function} props.onModeToggle - Callback quand on toggle le mode
 * @param {Function} props.onTeamCountChange - Callback quand on change le nombre d'équipes
 * @param {boolean} props.disabled - Désactiver les contrôles (pour les non-hosts)
 * @param {string} props.gameColor - Couleur du jeu pour le style (optionnel)
 */
export default function TeamModeSelector({
  mode = "individuel",
  teamCount = 2,
  onModeToggle,
  onTeamCountChange,
  disabled = false,
  gameColor
}) {
  const isTeamMode = mode === "équipes";

  return (
    <div className="lobby-card mode-selector">
      <div className="card-header">
        <span className="card-icon">👥</span>
        <span className="card-label">Mode de jeu</span>
      </div>
      <div className="mode-controls">
        {/* Toggle Solo / Équipes */}
        <div className="mode-toggle">
          <motion.button
            className={`mode-btn ${!isTeamMode ? "active" : ""}`}
            onClick={!disabled ? onModeToggle : undefined}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            disabled={disabled}
            style={!isTeamMode && gameColor ? { '--mode-active-color': gameColor } : {}}
          >
            <Zap size={18} />
            Solo
          </motion.button>
          <motion.button
            className={`mode-btn ${isTeamMode ? "active" : ""}`}
            onClick={!disabled ? onModeToggle : undefined}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            disabled={disabled}
            style={isTeamMode && gameColor ? { '--mode-active-color': gameColor } : {}}
          >
            <Users size={18} />
            Équipes
          </motion.button>
        </div>

        {/* Team Count Selector - only visible in team mode */}
        <AnimatePresence>
          {isTeamMode && (
            <motion.div
              className="team-count-selector"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="team-count-label">Nombre d'équipes</span>
              <div className="team-count-toggle">
                {[2, 3, 4].map(count => (
                  <motion.button
                    key={count}
                    className={`count-btn ${teamCount === count ? "active" : ""}`}
                    onClick={!disabled ? () => onTeamCountChange(count) : undefined}
                    whileHover={!disabled ? { scale: 1.05 } : {}}
                    whileTap={!disabled ? { scale: 0.95 } : {}}
                    disabled={disabled}
                    style={teamCount === count && gameColor ? { '--count-active-color': gameColor } : {}}
                  >
                    {count}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
