"use client";

import { motion } from "framer-motion";
import { getGameById } from "@/lib/config/games";

/**
 * JoinLoadingScreen - Displays a Game Card with loading animation
 * while the ad plays and the lobby loads in background.
 *
 * @param {string} gameId - The game ID (quiz, blindtest, deeztest, alibi)
 */
export default function JoinLoadingScreen({ gameId }) {
  const game = getGameById(gameId);

  // Fallback for unknown games
  const gameName = game?.name || "Partie";
  const gameImage = game?.image || "/images/quiz-buzzer.png";

  return (
    <div className="join-loading-screen">
      {/* Background glow effect */}
      <div className="join-loading-bg">
        <div className="glow-orb glow-1" />
        <div className="glow-orb glow-2" />
      </div>

      {/* Content */}
      <motion.div
        className="join-loading-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Game Card */}
        <div className="join-game-card">
          <div className="game-card-image-wrapper">
            <img
              src={gameImage}
              alt={gameName}
              className="game-card-image"
            />
            <div className="game-card-shine" />
          </div>
          <h2 className="game-card-title">{gameName}</h2>
        </div>

        {/* Loading indicator */}
        <div className="join-loading-indicator">
          <div className="loading-dots">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <p className="loading-text">Connexion en cours...</p>
        </div>
      </motion.div>
    </div>
  );
}
