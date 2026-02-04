'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Music, Trophy, Sparkles } from 'lucide-react';

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';

// Fake track data for demo
const DEMO_TRACK = {
  title: "Blinding Lights",
  artist: "The Weeknd",
  albumArt: "https://cdn-images.dzcdn.net/images/cover/eb68e47a4c55c8ddc2a6198a5e3934f7/500x500-000000-80-0-0.jpg"
};

const DEMO_WINNER = {
  name: "Alice",
  points: 200,
  level: "1.5s"
};

export default function RevealScreenDemo() {
  const [showReveal, setShowReveal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);

  // Simulate music progress with requestAnimationFrame for smooth animation
  useEffect(() => {
    if (!isPlaying) return;

    let startTime = null;
    let startProgress = progress;
    const duration = 25000; // 25 seconds total
    let animationId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progressIncrement = (elapsed / duration) * 100;
      const newProgress = Math.min(startProgress + progressIncrement, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        setIsPlaying(false);
        return;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  const handleShowReveal = () => {
    setShowReveal(true);
    setIsPlaying(true);
    setProgress(0);
  };

  const handleNext = () => {
    setShowReveal(false);
    setIsPlaying(false);
    setProgress(0);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Calculate progress from mouse/touch position
  const calculateProgress = useCallback((clientX) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const newProgress = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setProgress(newProgress);
  }, []);

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    calculateProgress(clientX);
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    calculateProgress(clientX);
  }, [isDragging, calculateProgress]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse/touch listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className="demo-page">
      <header className="demo-header">
        <h1>🎵 Écran de Révélation</h1>
        <p>Prototype de l'écran affiché après une bonne réponse</p>
      </header>

      <div className="demo-controls">
        <button className="trigger-btn" onClick={handleShowReveal}>
          Simuler une bonne réponse
        </button>
      </div>

      {/* Reveal Screen Overlay */}
      <AnimatePresence>
        {showReveal && (
          <motion.div
            className="reveal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Background Effects */}
            <div className="reveal-bg-effects">
              <div className="bg-gradient" />
              <div className="bg-particles">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="particle"
                    initial={{
                      opacity: 0,
                      y: 100,
                      x: Math.random() * 400 - 200
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      y: -200,
                      x: Math.random() * 400 - 200
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <motion.div
              className="reveal-content"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              {/* Winner Badge */}
              <motion.div
                className="winner-badge"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                <div className="winner-avatar">
                  <Trophy size={18} />
                </div>
                <div className="winner-info">
                  <span className="winner-name">{DEMO_WINNER.name}</span>
                  <span className="winner-detail">a trouvé en {DEMO_WINNER.level}</span>
                </div>
                <div className="winner-points-box">
                  <span className="winner-points-value">+{DEMO_WINNER.points}</span>
                  <span className="winner-points-label">pts</span>
                </div>
              </motion.div>

              {/* Album Art */}
              <motion.div
                className="album-container"
                initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="album-glow" />
                <img
                  src={DEMO_TRACK.albumArt}
                  alt="Album"
                  className="album-art"
                />
                {isPlaying && (
                  <div className="playing-indicator">
                    <span /><span /><span /><span />
                  </div>
                )}
              </motion.div>

              {/* Track Info */}
              <motion.div
                className="track-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="track-title">{DEMO_TRACK.title}</h2>
                <p className="track-artist">{DEMO_TRACK.artist}</p>
              </motion.div>

              {/* Progress Bar */}
              <motion.div
                className="progress-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div
                  ref={progressBarRef}
                  className={`progress-bar ${isDragging ? 'dragging' : ''}`}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="progress-thumb"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <div className="progress-time">
                  <span>{Math.floor(progress * 0.25)}s</span>
                  <span>25s</span>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                className="action-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button className="play-pause-btn" onClick={togglePlay}>
                  <div className="play-pause-icon">
                    {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
                  </div>
                  <span>{isPlaying ? 'Pause' : 'Écouter'}</span>
                </button>

                <button className="next-btn" onClick={handleNext}>
                  <span>Suivant</span>
                  <SkipForward size={20} />
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .demo-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
          padding: 20px;
          color: white;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .demo-header h1 {
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          margin: 0 0 8px 0;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .demo-header p {
          color: rgba(255,255,255,0.6);
          margin: 0;
        }

        .demo-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
        }

        .trigger-btn {
          padding: 16px 32px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border: none;
          border-radius: 16px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(162, 56, 255, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .trigger-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(162, 56, 255, 0.5);
        }

        /* ===== REVEAL OVERLAY ===== */
        .reveal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .reveal-bg-effects {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 30%, rgba(162, 56, 255, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 70%, rgba(255, 0, 146, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(162, 56, 255, 0.15) 0%, transparent 50%),
            #0a0a0f;
        }

        .bg-particles {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: ${DEEZER_PURPLE};
          border-radius: 50%;
          box-shadow: 0 0 10px ${DEEZER_PURPLE};
        }

        .reveal-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
          max-width: 400px;
        }

        /* Winner Badge */
        .winner-badge {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%);
          border: 2px solid rgba(34, 197, 94, 0.5);
          border-radius: 16px;
          box-shadow:
            0 4px 20px rgba(34, 197, 94, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .winner-avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #22c55e, #10b981);
          border-radius: 12px;
          color: white;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        }

        .winner-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .winner-name {
          font-family: 'Bungee', cursive;
          font-size: 1rem;
          color: white;
        }

        .winner-detail {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .winner-points-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 14px;
          background: rgba(34, 197, 94, 0.25);
          border-radius: 10px;
          margin-left: auto;
        }

        .winner-points-value {
          font-family: 'Bungee', cursive;
          font-size: 1.1rem;
          color: #4ade80;
          line-height: 1;
        }

        .winner-points-label {
          font-size: 0.65rem;
          color: rgba(34, 197, 94, 0.8);
          text-transform: uppercase;
        }

        /* Album Art */
        .album-container {
          position: relative;
          width: 200px;
          height: 200px;
        }

        .album-glow {
          position: absolute;
          inset: -20px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 24px;
          filter: blur(40px);
          opacity: 0.6;
        }

        .album-art {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          object-fit: cover;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .playing-indicator {
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 24px;
          padding: 6px 14px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(162, 56, 255, 0.5);
        }

        .playing-indicator span {
          width: 4px;
          background: white;
          border-radius: 2px;
          animation: equalizer 0.6s ease-in-out infinite;
        }

        .playing-indicator span:nth-child(1) { height: 8px; animation-delay: 0s; }
        .playing-indicator span:nth-child(2) { height: 14px; animation-delay: 0.15s; }
        .playing-indicator span:nth-child(3) { height: 10px; animation-delay: 0.3s; }
        .playing-indicator span:nth-child(4) { height: 6px; animation-delay: 0.45s; }

        @keyframes equalizer {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }

        /* Track Info */
        .track-info {
          text-align: center;
        }

        .track-title {
          font-family: 'Bungee', cursive;
          font-size: 1.6rem;
          margin: 0 0 8px 0;
          color: white;
          text-shadow: 0 2px 20px rgba(162, 56, 255, 0.5);
        }

        .track-artist {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.1rem;
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Progress */
        .progress-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .progress-bar {
          position: relative;
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          cursor: pointer;
          overflow: visible;
        }

        .progress-bar:hover .progress-thumb,
        .progress-bar.dragging .progress-thumb {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        }

        .progress-bar.dragging {
          cursor: grabbing;
        }

        .progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 4px;
          pointer-events: none;
        }

        .progress-bar:not(.dragging) .progress-fill {
          transition: width 0.1s linear;
        }

        .progress-thumb {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 20px;
          background: white;
          border-radius: 6px;
          transform: translate(-50%, -50%);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          pointer-events: none;
          z-index: 2;
        }

        .progress-time {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-family: 'Space Grotesk', sans-serif;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .play-pause-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .play-pause-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }

        .play-pause-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(162, 56, 255, 0.4);
        }

        .play-pause-btn span {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
        }

        /* Next Button */
        .next-btn {
          flex: 1.5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 24px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border: none;
          border-radius: 14px;
          color: white;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 25px rgba(162, 56, 255, 0.4);
          transition: all 0.2s;
        }

        .next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(162, 56, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
