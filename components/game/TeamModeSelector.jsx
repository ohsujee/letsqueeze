'use client';

import { motion } from 'framer-motion';
import { Zap, Users } from 'lucide-react';

/**
 * TeamModeSelector - Toggle compact Solo/Équipes
 *
 * @param {Object} props
 * @param {string} props.mode - Mode actuel ("individuel" | "équipes")
 * @param {Function} props.onModeToggle - Callback quand on toggle le mode
 * @param {boolean} props.disabled - Désactiver les contrôles (pour les non-hosts)
 * @param {string} props.gameColor - Couleur du jeu pour le style (optionnel)
 */
export default function TeamModeSelector({
  mode = "individuel",
  onModeToggle,
  disabled = false,
  gameColor
}) {
  const isTeamMode = mode === "équipes";

  return (
    <div className="mode-toggle-compact">
      <motion.button
        className={`mode-btn-compact ${!isTeamMode ? "active" : ""}`}
        onClick={!disabled ? onModeToggle : undefined}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        disabled={disabled}
        style={!isTeamMode && gameColor ? { '--mode-active-color': gameColor } : {}}
      >
        <Zap size={16} />
        Solo
      </motion.button>
      <motion.button
        className={`mode-btn-compact ${isTeamMode ? "active" : ""}`}
        onClick={!disabled ? onModeToggle : undefined}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        disabled={disabled}
        style={isTeamMode && gameColor ? { '--mode-active-color': gameColor } : {}}
      >
        <Users size={16} />
        Équipes
      </motion.button>
    </div>
  );
}
