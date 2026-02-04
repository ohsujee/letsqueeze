"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Square, Play, RotateCcw } from "lucide-react";
import { useAuthProtect } from "@/lib/hooks/useAuthProtect";
import { getUserProfile } from "@/lib/userProfile";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";

/**
 * Page de test pour toutes les transitions de fin de jeu
 * Accessible via: /test/transition
 *
 * Permet de prévisualiser les transitions fullscreen avant les résultats
 * pour chaque jeu de l'application.
 */
// Faux joueurs pour les tests d'écrans de fin
const MOCK_PLAYERS = {
  quiz: [
    { uid: "1", name: "MaxGamer", score: 2450, rank: 1 },
    { uid: "2", name: "SarahPro", score: 2180, rank: 2 },
    { uid: "3", name: "Kev_Quiz", score: 1920, rank: 3 },
    { uid: "4", name: "LéaSuper", score: 1650, rank: 4 },
    { uid: "5", name: "TomBuzz", score: 1420, rank: 5 },
    { uid: "6", name: "EmmaWin", score: 1180, rank: 6 },
  ],
  deeztest: [
    { uid: "1", name: "DJMax", score: 2800, rank: 1, correctAnswers: 11, wrongAnswers: 2 },
    { uid: "2", name: "TrackStar", score: 2500, rank: 2, correctAnswers: 9, wrongAnswers: 4 },
    { uid: "3", name: "BassDrop", score: 2100, rank: 3, correctAnswers: 8, wrongAnswers: 5 },
    { uid: "4", name: "VibeCheck", score: 1800, rank: 4, correctAnswers: 7, wrongAnswers: 6 },
  ],
  alibi: [
    { uid: "1", name: "Detective", score: 85, rank: 1, role: "inspector" },
    { uid: "2", name: "Sherlock", score: 72, rank: 2, role: "inspector" },
    { uid: "3", name: "Suspect1", score: 60, rank: 3, role: "suspect" },
    { uid: "4", name: "Suspect2", score: 45, rank: 4, role: "suspect" },
  ],
  laloi: [
    { uid: "1", name: "RuleFinder", score: 45, rank: 1 },
    { uid: "2", name: "Enquêteur", score: 38, rank: 2 },
    { uid: "3", name: "Joueur3", score: 25, rank: 3 },
    { uid: "4", name: "Newbie", score: 12, rank: 4 },
  ],
};

export default function TransitionTestPage() {
  const { user } = useAuthProtect({ required: false });
  const [selectedGame, setSelectedGame] = useState("quiz");
  const [category, setCategory] = useState("lobby"); // "lobby", "transition", "classement"
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0);
  const [playerName, setPlayerName] = useState("Joueur");

  // Récupère le pseudo depuis le profil Firebase
  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then(profile => {
        const pseudo = profile?.profile?.pseudo;
        if (pseudo) {
          setPlayerName(pseudo);
        }
      });
    }
  }, [user?.uid]);

  const games = [
    { id: "quiz", label: "Quiz", color: "#8b5cf6", emoji: "🏆" },
    { id: "deeztest", label: "DeezTest", color: "#A238FF", emoji: "🎧" },
    { id: "alibi", label: "Alibi", color: "#f59e0b", emoji: "🔍" },
    { id: "laloi", label: "La Loi", color: "#06b6d4", emoji: "💡" },
  ];

  const mockPlayers = MOCK_PLAYERS[selectedGame] || MOCK_PLAYERS.quiz;

  const handlePlay = () => {
    setKey(k => k + 1);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  // Ne relance PAS - reste figé à la fin
  const handleComplete = () => {
    // Animation terminée, on reste figé pour voir tous les éléments
  };

  return (
    <div className="test-page">
      {/* Barre de contrôle fixe en haut */}
      <div className="control-bar">
        <div className="control-bar-content">
          <span className="control-label">
            {isPlaying ? `▶ ${games.find(g => g.id === selectedGame)?.label}` : "Transition Test"}
          </span>
          {isPlaying ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="replay-btn" onClick={handlePlay}>
                <RotateCcw size={16} />
                Replay
              </button>
              <button className="stop-btn" onClick={handleStop}>
                <Square size={16} />
                Stop
              </button>
            </div>
          ) : (
            <button
              className="play-btn-small"
              onClick={handlePlay}
              style={{ background: games.find(g => g.id === selectedGame)?.color }}
            >
              <Play size={16} />
              Play
            </button>
          )}
        </div>
      </div>

      {/* Header avec sélecteur */}
      <header className="test-header">
        <h1 className="test-title">Test des Transitions</h1>
        <p className="test-subtitle">Prévisualisation des écrans de transition avant les résultats</p>
      </header>

      {/* Toggle Catégories */}
      <div className="type-toggle">
        <button
          className={`toggle-btn ${category === "lobby" ? "active" : ""}`}
          onClick={() => { setCategory("lobby"); setIsPlaying(false); }}
        >
          🚪 Entrée
        </button>
        <button
          className={`toggle-btn ${category === "lancement" ? "active" : ""}`}
          onClick={() => { setCategory("lancement"); setIsPlaying(false); }}
        >
          🚀 Lancement
        </button>
        <button
          className={`toggle-btn ${category === "transition" ? "active" : ""}`}
          onClick={() => { setCategory("transition"); setIsPlaying(false); }}
        >
          🏁 Fin
        </button>
        <button
          className={`toggle-btn ${category === "classement" ? "active" : ""}`}
          onClick={() => { setCategory("classement"); setIsPlaying(false); }}
        >
          🏆 Classement
        </button>
      </div>

      {/* Sélecteur de jeu */}
      <div className="game-selector">
        {games.map((game) => (
          <button
            key={game.id}
            className={`game-btn ${selectedGame === game.id ? "active" : ""}`}
            onClick={() => {
              setSelectedGame(game.id);
              if (isPlaying) {
                setKey(k => k + 1);
              }
            }}
            style={{
              "--game-color": game.color,
            }}
          >
            <span className="game-dot" style={{ background: game.color }} />
            {game.label}
          </button>
        ))}
      </div>

      {/* Zone de prévisualisation */}
      <div className="preview-zone">
        {!isPlaying && (
          <motion.div
            className="preview-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="preview-info">
              {category === "lobby" ? "🚪 Entrée" : category === "lancement" ? "🚀 Lancement" : category === "transition" ? "🏁 Fin" : "🏆 Classement"} - <strong>{games.find(g => g.id === selectedGame)?.label}</strong>
            </p>
            <motion.button
              className="play-btn"
              onClick={handlePlay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: `linear-gradient(135deg, ${games.find(g => g.id === selectedGame)?.color}, ${games.find(g => g.id === selectedGame)?.color}dd)`,
              }}
            >
              {category === "classement" ? "Voir l'écran de fin" : "Lancer la transition"}
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Tout en fullscreen */}
      {isPlaying && (
        category === "lobby" ? (
          <LobbyEntryTransition
            key={key}
            gameColor={games.find(g => g.id === selectedGame)?.color}
            playerName={playerName}
            onComplete={handleComplete}
          />
        ) : category === "lancement" ? (
          <GameLaunchCountdown
            key={key}
            gameColor={games.find(g => g.id === selectedGame)?.color}
            onComplete={handleComplete}
          />
        ) : category === "transition" ? (
          <GameTransition
            key={key}
            variant={selectedGame}
            onComplete={handleComplete}
          />
        ) : (
          <EndScreenPreview
            key={key}
            gameId={selectedGame}
            gameColor={games.find(g => g.id === selectedGame)?.color}
            gameEmoji={games.find(g => g.id === selectedGame)?.emoji}
            players={mockPlayers}
          />
        )
      )}

      <style jsx global>{`
        .test-page {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
        }

        /* Barre de contrôle fixe */
        .control-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
        }

        .control-bar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
        }

        .control-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: white;
        }

        .stop-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ef4444;
          border: none;
          border-radius: 6px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stop-btn:hover {
          background: #dc2626;
        }

        .replay-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .replay-btn:hover {
          background: #2563eb;
        }

        .play-btn-small {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .play-btn-small:hover {
          filter: brightness(1.1);
        }

        .test-header {
          padding: 24px;
          padding-top: 60px; /* Espace pour la barre de contrôle */
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .test-title {
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          color: white;
          margin: 0 0 8px 0;
          text-transform: uppercase;
        }

        .test-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .type-toggle {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          justify-content: center;
          background: rgba(20, 20, 30, 0.8);
        }

        .toggle-btn {
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .toggle-btn.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: white;
          color: white;
        }

        .game-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px 16px;
          justify-content: center;
          background: rgba(20, 20, 30, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .game-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .game-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .game-btn.active {
          background: color-mix(in srgb, var(--game-color) 20%, transparent);
          border-color: var(--game-color);
          color: white;
        }

        .game-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .preview-zone {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 40px;
        }

        .preview-info {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .preview-info strong {
          color: white;
        }

        .play-btn {
          padding: 16px 40px;
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .preview-hint {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL DE TRANSITION
// ============================================

function GameTransition({ variant, onComplete, duration = 3500 }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 400);
    const timer2 = setTimeout(() => setStep(2), duration - 800);
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [duration, onComplete]);

  // Configuration par jeu
  const configs = {
    "quiz": {
      gradient: ["rgba(139, 92, 246, 0.97)", "rgba(109, 40, 217, 0.97)"],
      glow: "rgba(139, 92, 246, 0.6)",
      accent: "#8b5cf6",
      accentGlow: "#a78bfa",
      title: "Calcul des scores",
      subtitle: "Préparez-vous pour le podium...",
      icon: "trophy",
      particleColor: "#a78bfa"
    },
    "deeztest": {
      gradient: ["rgba(162, 56, 255, 0.97)", "rgba(130, 30, 220, 0.97)"],
      glow: "rgba(162, 56, 255, 0.6)",
      accent: "#A238FF",
      accentGlow: "#c084fc",
      title: "Résultats en cours",
      subtitle: "Qui connaît le mieux la musique ?",
      icon: "music",
      particleColor: "#c084fc"
    },
    "alibi": {
      gradient: ["rgba(16, 185, 129, 0.97)", "rgba(5, 150, 105, 0.97)"],
      glow: "rgba(52, 211, 153, 0.6)",
      accent: "#10b981",
      accentGlow: "#34d399",
      title: "Enquête Terminée",
      subtitle: "Découvrez les résultats...",
      icon: "folder",
      particleColor: "#34d399"
    },
    "laloi": {
      gradient: ["rgba(6, 182, 212, 0.97)", "rgba(8, 145, 178, 0.97)"],
      glow: "rgba(6, 182, 212, 0.6)",
      accent: "#06b6d4",
      accentGlow: "#22d3ee",
      title: "Règle Révélée",
      subtitle: "Découvrez les scores...",
      icon: "lightbulb",
      particleColor: "#22d3ee"
    }
  };

  const config = configs[variant] || configs.quiz;

  return (
    <motion.div
      className="transition-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
      }}
    >
      {/* Radial glow */}
      <div
        className="transition-glow"
        style={{
          background: `radial-gradient(circle at center, ${config.glow} 0%, transparent 60%)`
        }}
      />

      {/* Vignette */}
      <div className="transition-vignette" />

      {/* Scanlines */}
      <motion.div
        className="transition-scanlines"
        animate={{ y: ["-100%", "100%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Flash subtil */}
      <motion.div
        className="transition-flash"
        animate={{ opacity: [0, 0.12, 0] }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ background: config.accentGlow }}
      />

      {/* Contenu principal */}
      <div className="transition-content">
        {/* Icône animée */}
        <TransitionIcon
          type={config.icon}
          color={config.accent}
          glowColor={config.accentGlow}
          step={step}
        />

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.h1
            className="transition-title"
            animate={step === 1 ? {
              textShadow: [
                `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`,
                `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
                `0 0 20px ${config.glow}, 0 0 40px ${config.glow}`
              ]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {config.title}
          </motion.h1>
        </motion.div>

        {/* Sous-titre */}
        <motion.p
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {config.subtitle}
        </motion.p>

        {/* Barre de progression */}
        <motion.div
          className="transition-progress"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step === 2 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background: `linear-gradient(90deg, ${config.accent}, white)`,
            boxShadow: `0 0 20px ${config.glow}`
          }}
        />
      </div>

      {/* Particles */}
      <FloatingParticles count={20} color={config.particleColor} />

      <style jsx global>{`
        .transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .transition-glow {
          position: absolute;
          inset: 0;
          opacity: 0.7;
          pointer-events: none;
        }

        .transition-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
          pointer-events: none;
        }

        .transition-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.02) 2px,
            rgba(255, 255, 255, 0.02) 4px
          );
          pointer-events: none;
          opacity: 0.4;
        }

        .transition-flash {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .transition-content {
          position: relative;
          text-align: center;
          padding: 2rem;
          max-width: 600px;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .transition-title {
          font-family: 'Bungee', cursive !important;
          font-size: clamp(2rem, 8vw, 3.5rem) !important;
          font-weight: 400 !important;
          color: white !important;
          letter-spacing: 0.02em !important;
          margin: 0 0 1rem 0 !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
        }

        .transition-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: clamp(1rem, 4vw, 1.5rem) !important;
          font-weight: 500 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          margin: 0 0 2rem 0 !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
          line-height: 1.4 !important;
        }

        .transition-progress {
          height: 4px;
          width: 200px;
          border-radius: 2px;
          transform-origin: left;
          margin-top: 1rem;
        }

        @media (max-width: 480px) {
          .transition-title {
            font-size: 1.75rem !important;
          }

          .transition-subtitle {
            font-size: 1rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
}

// ============================================
// ICÔNES ANIMÉES
// ============================================

function TransitionIcon({ type, color, glowColor, step }) {
  const size = 120;

  const icons = {
    trophy: <TrophyIcon size={size} color={color} glowColor={glowColor} />,
    music: <MusicIcon size={size} color={color} glowColor={glowColor} />,
    folder: <FolderIcon size={size} color={color} glowColor={glowColor} />,
    lightbulb: <LightbulbIcon size={size} color={color} glowColor={glowColor} />,
  };

  return (
    <motion.div
      className="transition-icon"
      initial={{ scale: 0, rotate: -10 }}
      animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      style={{ marginBottom: "1.5rem" }}
    >
      {icons[type] || icons.trophy}
    </motion.div>
  );
}

function TrophyIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Trophée */}
        <motion.path
          d="M12 17V14M12 14C14.5 14 16 12 16 9V4H8V9C8 12 9.5 14 12 14Z"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        {/* Poignées */}
        <motion.path
          d="M16 5H18C19 5 20 6 20 7C20 9 18 10 16 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        />
        <motion.path
          d="M8 5H6C5 5 4 6 4 7C4 9 6 10 8 10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        />
        {/* Base */}
        <motion.path
          d="M9 21H15M12 17V21"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        />
        {/* Étoile au centre */}
        <motion.path
          d="M12 7L12.5 8.5H14L12.75 9.5L13.25 11L12 10L10.75 11L11.25 9.5L10 8.5H11.5L12 7Z"
          fill={glowColor}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, type: "spring" }}
        />
      </svg>
    </div>
  );
}

function MusicIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Double croche - deux notes liées */}
        {/* Barres verticales */}
        <motion.path
          d="M7 19V8M17 17V6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        {/* Barres horizontales de liaison */}
        <motion.path
          d="M7 8L17 6M7 11L17 9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
        {/* Cercles des notes - alignés avec les barres */}
        <motion.ellipse
          cx="5"
          cy="19"
          rx="3"
          ry="2.5"
          fill="white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transform="rotate(-20 5 19)"
          transition={{ delay: 0.7, type: "spring" }}
        />
        <motion.ellipse
          cx="15"
          cy="17"
          rx="3"
          ry="2.5"
          fill="white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transform="rotate(-20 15 17)"
          transition={{ delay: 0.8, type: "spring" }}
        />
      </svg>
    </div>
  );
}

function FolderIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: "absolute",
          inset: -20,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(15px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Dossier */}
        <motion.path
          d="M3 6C3 5 4 4 5 4H9L11 6H19C20 6 21 7 21 8V18C21 19 20 20 19 20H5C4 20 3 19 3 18V6Z"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        />
        {/* Lignes de texte */}
        <motion.line
          x1="7" y1="11" x2="17" y2="11"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        />
        <motion.line
          x1="7" y1="14" x2="14" y2="14"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        />
        <motion.line
          x1="7" y1="17" x2="11" y2="17"
          stroke="white" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        />
        {/* Checkmark */}
        <motion.path
          d="M14 15L16 17L20 13"
          stroke={glowColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        />
      </svg>
    </div>
  );
}

function LightbulbIcon({ size, color, glowColor }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -15,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
          filter: "blur(20px)"
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Ampoule */}
        <motion.path
          d="M12 2C8.5 2 6 5 6 8C6 10.5 7.5 12.5 9 14V17H15V14C16.5 12.5 18 10.5 18 8C18 5 15.5 2 12 2Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        />

        {/* Base */}
        <motion.rect
          x="9"
          y="17"
          width="6"
          height="2"
          rx="1"
          fill="white"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5 }}
        />
        <motion.rect
          x="9"
          y="20"
          width="6"
          height="2"
          rx="1"
          fill="white"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6 }}
        />
      </svg>
    </div>
  );
}

// ============================================
// PARTICULES FLOTTANTES
// ============================================

function FloatingParticles({ count = 15, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    // Utiliser des valeurs fixes pour éviter les problèmes SSR
    const w = 800;
    const h = 600;
    return [...Array(count)].map((_, i) => ({
      id: i,
      startX: Math.random() * w,
      endX: Math.random() * w,
      duration: 4 + Math.random() * 3,
      delay: Math.random() * 2,
      startY: h + 50,
      size: 3 + Math.random() * 4
    }));
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: p.startX, y: p.startY }}
          animate={{ opacity: [0, 0.8, 0], y: -100, x: p.endX }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            background: color,
            borderRadius: "50%",
            pointerEvents: "none",
            boxShadow: `0 0 ${p.size * 2}px ${color}`
          }}
        />
      ))}
    </>
  );
}

// ============================================
// TRANSITION ENTRÉE LOBBY
// ============================================

function LobbyEntryTransition({ gameColor, playerName, onComplete, duration = 2500 }) {
  const [step, setStep] = useState(0);

  // Générer une version plus claire pour le glow
  const glowColor = gameColor + "99";
  const accentGlow = gameColor + "cc";

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 300);
    const timer2 = setTimeout(() => setStep(2), duration - 600);
    const timer3 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [duration, onComplete]);

  return (
    <motion.div
      className="transition-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${gameColor}f7, ${gameColor}dd)`
      }}
    >
      {/* Radial glow */}
      <div
        className="transition-glow"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)`
        }}
      />

      {/* Vignette */}
      <div className="transition-vignette" />

      {/* Lumière qui vient de la porte */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.4, 0.2], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, white 0%, ${accentGlow} 30%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none"
        }}
      />

      {/* Contenu principal */}
      <div className="transition-content">
        {/* Icône porte animée */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={step >= 1 ? { scale: 1, rotate: 0 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          style={{ marginBottom: "1.5rem" }}
        >
          <DoorIcon size={120} color={gameColor} glowColor={accentGlow} step={step} />
        </motion.div>

        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.h1
            className="transition-title"
            style={{ fontSize: "clamp(1.5rem, 6vw, 2.5rem)" }}
            animate={step === 1 ? {
              textShadow: [
                `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
                `0 0 40px ${glowColor}, 0 0 80px ${glowColor}`,
                `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`
              ]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Vous entrez dans le lobby
          </motion.h1>
        </motion.div>

        {/* Sous-titre avec nom du joueur */}
        <motion.p
          className="transition-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {playerName}, préparez-vous...
        </motion.p>

        {/* Barre de progression */}
        <motion.div
          className="transition-progress"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step === 2 ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: `linear-gradient(90deg, ${gameColor}, white)`,
            boxShadow: `0 0 20px ${glowColor}`
          }}
        />
      </div>

      {/* Particules qui convergent vers le centre (effet d'aspiration) */}
      <ConvergingParticles count={15} color={accentGlow} />

      <style jsx global>{`
        .transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .transition-glow {
          position: absolute;
          inset: 0;
          opacity: 0.7;
          pointer-events: none;
        }

        .transition-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
          pointer-events: none;
        }

        .transition-content {
          position: relative;
          text-align: center;
          padding: 2rem;
          max-width: 600px;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .transition-title {
          font-family: 'Bungee', cursive !important;
          font-size: clamp(1.5rem, 6vw, 2.5rem) !important;
          font-weight: 400 !important;
          color: white !important;
          letter-spacing: 0.02em !important;
          margin: 0 0 1rem 0 !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
        }

        .transition-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: clamp(1rem, 4vw, 1.5rem) !important;
          font-weight: 500 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          margin: 0 0 2rem 0 !important;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3) !important;
          line-height: 1.4 !important;
        }

        .transition-progress {
          height: 4px;
          width: 200px;
          border-radius: 2px;
          transform-origin: left;
          margin-top: 1rem;
        }
      `}</style>
    </motion.div>
  );
}

// Icône de porte qui s'ouvre - avec vraie transformation CSS 3D
function DoorIcon({ size, color, glowColor, step }) {
  const doorWidth = size * 0.6;
  const doorHeight = size * 0.85;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Glow pulsant */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -25,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
          filter: "blur(25px)"
        }}
      />

      {/* Container avec perspective */}
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: "500px",
        }}
      >
        {/* Cadre de porte (chambranle) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute",
            width: doorWidth + 10,
            height: doorHeight + 10,
            border: "4px solid white",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.1)",
          }}
        />

        {/* Lumière intérieure (derrière la porte) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{
            position: "absolute",
            width: doorWidth,
            height: doorHeight,
            background: "linear-gradient(90deg, rgba(255,255,255,0.3) 0%, white 100%)",
            borderRadius: "2px",
          }}
        />

        {/* Porte qui s'ouvre avec rotateY */}
        <motion.div
          initial={{ rotateY: 0 }}
          animate={{ rotateY: -65 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: doorWidth,
            height: doorHeight,
            background: color,
            border: "3px solid white",
            borderRadius: "3px",
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "12px",
          }}
        >
          {/* Poignée */}
          <div
            style={{
              width: 8,
              height: 8,
              background: "white",
              borderRadius: "50%",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

// ============================================
// TRANSITION LANCEMENT - COUNTDOWN 3, 2, 1, GO!
// ============================================

function GameLaunchCountdown({ gameColor, onComplete }) {
  const [step, setStep] = useState(-1); // -1=rien, 0=3, 1=2, 2=1, 3=GO

  const steps = ["3", "2", "1", "GO!"];
  const duration = 500; // Durée égale pour chaque chiffre

  useEffect(() => {
    const timers = [];

    // Affiche chaque chiffre avec timing égal
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setStep(i);
      }, i * duration + 100)); // +100ms délai initial
    });

    // Fin de l'animation
    timers.push(setTimeout(() => {
      if (onComplete) onComplete();
    }, steps.length * duration + 300));

    return () => timers.forEach(t => clearTimeout(t));
  }, [onComplete]);

  const glowColor = `${gameColor}99`;

  return (
    <motion.div
      className="countdown-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background: `linear-gradient(135deg, ${gameColor}f5, ${gameColor}dd)`,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)`,
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Countdown numbers */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AnimatePresence mode="popLayout">
          {step >= 0 && (
            <motion.div
              key={step}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: [0.5, 1.15, 1],
                opacity: 1,
              }}
              exit={{
                scale: 1.8,
                opacity: 0,
              }}
              transition={{
                duration: 0.15,
                ease: "easeOut",
              }}
              style={{
                position: 'relative',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: step === 3 ? 'clamp(5rem, 25vw, 10rem)' : 'clamp(8rem, 40vw, 16rem)',
                  fontWeight: 400,
                  color: 'white',
                  textShadow: `
                    0 0 20px ${glowColor},
                    0 0 40px ${glowColor},
                    0 0 80px ${gameColor},
                    0 4px 0 rgba(0,0,0,0.3)
                  `,
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                {steps[step]}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Impact ring - centré, un par chiffre */}
        {step >= 0 && (
          <motion.div
            key={`ring-${step}`}
            initial={{ scale: 0.3, opacity: 0.4 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              position: 'absolute',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: `2px solid rgba(255, 255, 255, 0.6)`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Particles burst on each number */}
      <CountdownParticles color={gameColor} step={step} />

      <style jsx global>{`
        .countdown-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
}

// Particules qui explosent à chaque chiffre
function CountdownParticles({ color, step }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (step < 0) return; // Pas de particules avant le countdown

    // Génère de nouvelles particules à chaque changement de step
    const newParticles = [...Array(12)].map((_, i) => ({
      id: `${step}-${i}`,
      angle: (i / 12) * Math.PI * 2,
      distance: 150 + Math.random() * 100,
      size: 4 + Math.random() * 6,
      duration: 0.4 + Math.random() * 0.2,
    }));
    setParticles(newParticles);
  }, [step]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: p.duration,
            ease: "easeOut",
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            background: 'white',
            borderRadius: '50%',
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

// ============================================
// MINI ICÔNES HEADER (pour écrans de fin)
// ============================================

function HeaderIcon({ gameId, color }) {
  const size = 24;

  if (gameId === "quiz") {
    return (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        width={size}
        height={size}
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M12 17V14M12 14C14.5 14 16 12 16 9V4H8V9C8 12 9.5 14 12 14Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M16 5H18C19 5 20 6 20 7C20 9 18 10 16 10"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 5H6C5 5 4 6 4 7C4 9 6 10 8 10"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M9 21H15M12 17V21"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </motion.svg>
    );
  }

  if (gameId === "deeztest") {
    return (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        width={size}
        height={size}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M9 18V5L21 3V16"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="6" cy="18" r="3" fill={color} />
        <circle cx="18" cy="16" r="3" fill={color} />
      </motion.svg>
    );
  }

  if (gameId === "laloi") {
    return (
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        width={size}
        height={size}
        animate={{
          filter: [
            `drop-shadow(0 0 2px ${color})`,
            `drop-shadow(0 0 8px ${color})`,
            `drop-shadow(0 0 2px ${color})`
          ]
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M12 2C8.5 2 6 5 6 8C6 10.5 7.5 12.5 9 14V17H15V14C16.5 12.5 18 10.5 18 8C18 5 15.5 2 12 2Z"
          fill={color}
          stroke={color}
          strokeWidth="1.5"
        />
        <rect x="9" y="17" width="6" height="2" rx="1" fill="white" fillOpacity="0.8" />
        <rect x="9" y="20" width="6" height="2" rx="1" fill="white" fillOpacity="0.6" />
        <path
          d="M12 6V10M10 8H14"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.svg>
    );
  }

  // Default - trophy
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M12 17V14M12 14C14.5 14 16 12 16 9V4H8V9C8 12 9.5 14 12 14Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M9 21H15M12 17V21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </motion.svg>
  );
}

// ============================================
// ÉCRAN DE CLASSEMENT (FIN DE PARTIE)
// ============================================

function EndScreenPreview({ gameId, gameColor, gameEmoji, players }) {
  // Alibi a un écran complètement différent
  if (gameId === "alibi") {
    return <AlibiEndPreview />;
  }

  const currentPlayerUid = "3"; // Simule le joueur actuel (3ème position)
  const containerRef = useRef(null);
  const podiumWrapperRef = useRef(null);
  const [podiumScale, setPodiumScale] = useState(0.4);

  // Titres par jeu
  const titles = {
    quiz: "Partie terminée",
    deeztest: "Deez Test",
    laloi: "Règle révélée",
  };

  // Stats personnelles (pour DeezTest)
  const myPlayer = players.find(p => p.uid === currentPlayerUid);
  const showStats = gameId === "deeztest" && myPlayer;

  // Calcul dynamique du scale du podium
  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current || !podiumWrapperRef.current) return;

      // Hauteur totale disponible
      const containerHeight = containerRef.current.clientHeight;

      // Hauteur des autres éléments (header, stats, leaderboard min, footer)
      const header = containerRef.current.querySelector('.end-header');
      const stats = containerRef.current.querySelector('.my-stats-card');
      const footer = containerRef.current.querySelector('.end-footer');

      const headerHeight = header?.offsetHeight || 50;
      const statsHeight = stats?.offsetHeight || 0;
      const footerHeight = footer?.offsetHeight || 70;
      const leaderboardMinHeight = 180; // Hauteur min pour le leaderboard

      // Espace disponible pour le podium
      const availableHeight = containerHeight - headerHeight - statsHeight - footerHeight - leaderboardMinHeight - 20; // 20px de marges

      // Hauteur originale du podium (~520px)
      const originalPodiumHeight = 520;

      // Calcul du scale optimal
      let optimalScale = availableHeight / originalPodiumHeight;

      // Aussi considérer la largeur (podium ~480px de large)
      const containerWidth = containerRef.current.clientWidth;
      const originalPodiumWidth = 480;
      const maxScaleForWidth = (containerWidth - 20) / originalPodiumWidth; // 20px de marge

      // Clamp entre 0.30 et min(0.55, maxScaleForWidth)
      const maxScale = Math.min(0.55, maxScaleForWidth);
      optimalScale = Math.max(0.30, Math.min(maxScale, optimalScale));

      setPodiumScale(optimalScale);
    };

    // Calcul initial
    calculateScale();

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(calculateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [showStats]);

  // Calcul de la hauteur visible du podium après scale
  const podiumVisualHeight = 520 * podiumScale + 20;

  return (
    <div className="end-screen-preview" style={{ "--game-color": gameColor }} ref={containerRef}>
      {/* Header */}
      <div className="end-header">
        <HeaderIcon gameId={gameId} color={gameColor} />
        <span className="title-text">{titles[gameId]}</span>
      </div>

      {/* Podium - wrapper avec hauteur fixe pour éviter l'overlap */}
      <div className="podium-wrapper" style={{ height: `${podiumVisualHeight}px` }}>
        <div
          className="podium-section"
          ref={podiumWrapperRef}
          style={{ transform: `scale(${podiumScale})` }}
        >
          <PodiumPremium topPlayers={players.slice(0, 3)} />
        </div>
      </div>

      {/* Stats personnelles (DeezTest) */}
      {showStats && (
        <div className="my-stats-card" style={{ borderColor: `${gameColor}40` }}>
          <div className="stats-title">Ton récap</div>
          <div className="stats-row">
            <div className="stat-item correct">
              <span className="stat-value">{myPlayer.correctAnswers || 0}</span>
              <span className="stat-label">Bonnes</span>
            </div>
            <div className="stat-item wrong">
              <span className="stat-value">{myPlayer.wrongAnswers || 0}</span>
              <span className="stat-label">Erreurs</span>
            </div>
            <div className="stat-item total" style={{ borderColor: `${gameColor}40` }}>
              <span className="stat-value" style={{ color: gameColor }}>{myPlayer.score}</span>
              <span className="stat-label">Points</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard - scrollable */}
      <div className="leaderboard-wrapper">
        <Leaderboard players={players} currentPlayerUid={currentPlayerUid} />
      </div>

      {/* Footer partagé */}
      <EndScreenFooter gameColor={gameColor} />

      <style jsx>{`
        .end-screen-preview {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
          padding-top: 50px; /* Espace pour la barre de contrôle */
        }

        .end-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          flex-shrink: 0;
        }

        .title-text {
          font-family: 'Bungee', cursive;
          font-size: 1.1rem;
          color: var(--game-color);
          text-shadow: 0 0 15px var(--game-color);
        }

        .podium-wrapper {
          flex-shrink: 0;
          overflow: visible;
          display: flex;
          justify-content: center;
        }

        .podium-section {
          transform-origin: center top;
        }

        .my-stats-card {
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid;
          border-radius: 12px;
          padding: 10px;
          margin: 0 16px 8px 16px;
        }

        .stats-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          text-align: center;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          gap: 6px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          flex: 1;
        }

        .stat-item.correct {
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .stat-item.wrong {
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .stat-item.total {
          border: 1px solid;
        }

        .stat-value {
          font-family: 'Bungee', cursive;
          font-size: 1.3rem;
          line-height: 1;
        }

        .stat-item.correct .stat-value {
          color: #22c55e;
        }

        .stat-item.wrong .stat-value {
          color: #f87171;
        }

        .stat-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .leaderboard-wrapper {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          padding: 0 16px;
          margin-bottom: 8px;
        }

      `}</style>
    </div>
  );
}

// ============================================
// FOOTER PARTAGÉ - NOUVELLE PARTIE
// ============================================

function EndScreenFooter({ gameColor }) {
  const footerStyle = {
    flexShrink: 0,
    padding: '12px 16px',
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    background: 'rgba(10, 10, 15, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: `1px solid ${gameColor}40`,
  };

  const buttonStyle = {
    display: 'block',
    width: '100%',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'white',
    background: `linear-gradient(135deg, ${gameColor}, ${gameColor}cc)`,
    boxShadow: `0 5px 0 ${gameColor}88, 0 8px 15px ${gameColor}40`,
  };

  return (
    <div style={footerStyle}>
      <button style={buttonStyle}>
        Nouvelle partie
      </button>
    </div>
  );
}

// ============================================
// ÉCRAN DE FIN ALIBI (Design spécifique)
// ============================================

function AlibiEndPreview() {
  const [displayScore, setDisplayScore] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  // Mock data: 7/10 = succès
  const score = { correct: 7, total: 10 };
  const percentage = Math.round((score.correct / score.total) * 100);
  const isSuccess = percentage >= 50;

  // Animation du compteur
  useEffect(() => {
    let current = 0;
    const target = score.correct;
    const duration = 1500;
    const increment = target / (duration / 50);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
        setTimeout(() => setShowMessage(true), 300);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton !";
    if (percentage >= 80) return "Excellent ! Très crédible !";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant !";
    if (percentage >= 50) return "Passable... Quelques failles...";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences !";
    return "Alibi effondré ! Trop d'erreurs !";
  };

  return (
    <div className="alibi-end-preview">
      <div className="alibi-content">
        {/* Carte principale */}
        <motion.div
          className="alibi-card"
          data-success={isSuccess}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Glow */}
          <div className="alibi-glow" data-success={isSuccess} />

          {/* Icône */}
          <div className="alibi-icon">
            {isSuccess ? (
              <AlibiTrophyIcon size={80} />
            ) : (
              <AlibiSkullIcon size={80} />
            )}
          </div>

          {/* Titre */}
          <motion.h1
            className="alibi-title"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isSuccess ? "Alibi Validé" : "Alibi Rejeté"}
          </motion.h1>

          {/* Score animé */}
          <motion.div
            className="alibi-score-container"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <span className="alibi-score" data-success={isSuccess}>
              {displayScore}
            </span>
            <span className="alibi-separator">/</span>
            <span className="alibi-total">{score.total}</span>
          </motion.div>

          {/* Pourcentage */}
          <div className="alibi-percentage" data-success={isSuccess}>
            {Math.round((displayScore / score.total) * 100)}%
          </div>

          {/* Message */}
          <AnimatePresence>
            {showMessage && (
              <motion.div
                className="alibi-message"
                data-success={isSuccess}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p>{getMessage()}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer partagé */}
      <EndScreenFooter gameColor="#f59e0b" />

      <style jsx global>{`
        .alibi-end-preview {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          background: #0a0a0f;
          padding-top: 50px;
        }

        .alibi-end-preview::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(251, 191, 36, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .alibi-content {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          gap: 24px;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
          position: relative;
          z-index: 1;
          overflow-y: auto;
        }

        .alibi-card {
          position: relative;
          background: rgba(20, 20, 30, 0.85);
          border-radius: 24px;
          padding: 24px;
          text-align: center;
          border: 1px solid rgba(245, 158, 11, 0.2);
          backdrop-filter: blur(20px);
          overflow: hidden;
        }

        .alibi-card[data-success="true"] {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.2);
        }

        .alibi-card[data-success="false"] {
          border-color: rgba(239, 68, 68, 0.3);
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);
        }

        .alibi-glow {
          position: absolute;
          top: -50%;
          left: 50%;
          transform: translateX(-50%);
          width: 200%;
          height: 200%;
          pointer-events: none;
        }

        .alibi-glow[data-success="true"] {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 50%);
        }

        .alibi-glow[data-success="false"] {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 50%);
        }

        .alibi-icon {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }

        .alibi-title {
          position: relative;
          z-index: 1;
          font-family: 'Bungee', cursive;
          font-size: clamp(1.3rem, 5vw, 2rem);
          color: white;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          text-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
        }

        .alibi-score-container {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .alibi-score {
          font-family: 'Bungee', cursive;
          font-size: clamp(4rem, 15vw, 6rem);
          line-height: 1;
        }

        .alibi-score[data-success="true"] {
          color: #10b981;
          text-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
        }

        .alibi-score[data-success="false"] {
          color: #ef4444;
          text-shadow: 0 0 40px rgba(239, 68, 68, 0.6);
        }

        .alibi-separator {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.5rem, 6vw, 2.5rem);
          color: rgba(255, 255, 255, 0.5);
        }

        .alibi-total {
          font-family: 'Bungee', cursive;
          font-size: clamp(2rem, 8vw, 3rem);
          color: rgba(255, 255, 255, 0.7);
        }

        .alibi-percentage {
          position: relative;
          z-index: 1;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .alibi-percentage[data-success="true"] {
          color: #10b981;
        }

        .alibi-percentage[data-success="false"] {
          color: #ef4444;
        }

        .alibi-message {
          position: relative;
          z-index: 1;
          padding: 12px 16px;
          border-radius: 12px;
        }

        .alibi-message[data-success="true"] {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .alibi-message[data-success="false"] {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .alibi-message p {
          font-family: 'Inter', sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// Icône Trophy pour Alibi (victoire)
function AlibiTrophyIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M6 4H18V9C18 12.5 15.5 14 12 14C8.5 14 6 12.5 6 9V4Z"
          fill="url(#trophyGold)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
        />
        <motion.path
          d="M6 5H4.5C4 5 3.5 5.5 3.5 6V7.5C3.5 8.5 4.5 9.5 5.5 9.5H6"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        <motion.path
          d="M18 5H19.5C20 5 20.5 5.5 20.5 6V7.5C20.5 8.5 19.5 9.5 18.5 9.5H18"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        <motion.rect
          x="10" y="14" width="4" height="4"
          fill="#f59e0b"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />
        <motion.path
          d="M8 18H16V20C16 20.5 15.5 21 15 21H9C8.5 21 8 20.5 8 20V18Z"
          fill="#d97706"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.1, type: "spring" }}
        />
        <defs>
          <linearGradient id="trophyGold" x1="6" y1="4" x2="18" y2="14">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

// Icône Skull pour Alibi (défaite)
function AlibiSkullIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow rouge */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M12 2C7 2 4 6 4 10C4 13 5 15 7 16V19C7 20 8 21 9 21H15C16 21 17 20 17 19V16C19 15 20 13 20 10C20 6 17 2 12 2Z"
          fill="url(#skullGrad)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        <motion.path
          d="M8 9L10 11M10 9L8 11"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
        <motion.path
          d="M14 9L16 11M16 9L14 11"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />
        <motion.path
          d="M12 12V14"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, delay: 1 }}
        />
        <motion.path
          d="M9 17V19M12 17V19M15 17V19"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.1 }}
        />
        <defs>
          <linearGradient id="skullGrad" x1="4" y1="2" x2="20" y2="21">
            <stop stopColor="#f87171" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

// Particules qui convergent vers le centre
function ConvergingParticles({ count = 15, color }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(() => {
    if (!mounted) return [];
    return [...Array(count)].map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const distance = 300 + Math.random() * 200;
      return {
        id: i,
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        duration: 1.5 + Math.random() * 1,
        delay: Math.random() * 0.8,
        size: 3 + Math.random() * 4
      };
    });
  }, [mounted, count]);

  if (!mounted) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: p.startX, y: p.startY }}
          animate={{
            opacity: [0, 0.9, 0],
            x: 0,
            y: 0,
            scale: [1, 0.5, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn"
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            background: color,
            borderRadius: "50%",
            pointerEvents: "none",
            boxShadow: `0 0 ${p.size * 2}px ${color}`
          }}
        />
      ))}
    </>
  );
}
