"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Play, Pause, SkipForward, Trophy } from "lucide-react";

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';
const DEEZER_LIGHT = '#C574FF';
const REVEAL_DURATION = 25; // seconds (5s to 30s)

/**
 * BlindTestRevealScreen - Shared reveal screen for host and players
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the reveal
 * @param {Object} props.track - { title, artist, albumArt }
 * @param {Object} props.winner - { name, points, level } or null
 * @param {boolean} props.isPlaying - Playback state
 * @param {number} props.progress - 0-100 progress bar position
 * @param {boolean} props.isController - true = interactive controls (host/asker)
 * @param {Function} props.onTogglePlayback - Play/pause callback (controller only)
 * @param {Function} props.onNext - Next track callback (controller only)
 * @param {Function} props.onDragStart - Drag start callback (controller only)
 * @param {React.Ref} props.progressBarRef - Ref for progress bar (controller only)
 */
export default function BlindTestRevealScreen({
  show,
  track,
  winner,
  isPlaying = false,
  progress = 0,
  isController = false,
  onTogglePlayback,
  onNext,
  onDragStart,
  progressBarRef,
}) {
  return (
    <AnimatePresence>
      {show && track && (
        <motion.div
          className="reveal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background Effects */}
          <div className="reveal-bg-effects">
            <div className="reveal-bg-gradient" />
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
            {winner && (
              <motion.div
                className="reveal-winner-badge"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                <div className="reveal-winner-avatar">
                  <Trophy size={18} />
                </div>
                <div className="reveal-winner-info">
                  <span className="reveal-winner-name">{winner.name}</span>
                  <span className="reveal-winner-detail">a trouvé en {winner.level}</span>
                </div>
                <div className="reveal-winner-points-box">
                  <span className="reveal-winner-points-value">+{winner.points}</span>
                  <span className="reveal-winner-points-label">pts</span>
                </div>
              </motion.div>
            )}

            {/* Album Art */}
            <motion.div
              className="reveal-album-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="reveal-album-glow" />
              {track.albumArt ? (
                <img src={track.albumArt} alt="Album" className="reveal-album-art" />
              ) : (
                <div className="reveal-album-placeholder">
                  <Music size={48} />
                </div>
              )}
              {isPlaying && (
                <div className="reveal-playing-indicator">
                  <span /><span /><span /><span />
                </div>
              )}
            </motion.div>

            {/* Track Info */}
            <motion.div
              className="reveal-track-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="reveal-track-title">{track.title}</h2>
              <p className="reveal-track-artist">{track.artist}</p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className="reveal-progress-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div
                ref={isController ? progressBarRef : undefined}
                className={`reveal-progress-bar ${isController ? 'interactive' : 'readonly'}`}
                onMouseDown={isController ? onDragStart : undefined}
                onTouchStart={isController ? onDragStart : undefined}
              >
                <div
                  className="reveal-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
                {isController && (
                  <div
                    className="reveal-progress-thumb"
                    style={{ left: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                )}
              </div>
              <div className="reveal-progress-time">
                <span>{Math.floor((progress / 100) * REVEAL_DURATION)}s</span>
                <span>{REVEAL_DURATION}s</span>
              </div>
            </motion.div>

            {/* Play/Pause Button */}
            {isController ? (
              <motion.button
                className="reveal-play-pause-btn"
                onClick={onTogglePlayback}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="white" style={{ marginLeft: 3 }} />}
              </motion.button>
            ) : (
              <motion.div
                className="reveal-play-pause-btn readonly"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="white" style={{ marginLeft: 3 }} />}
              </motion.div>
            )}

            {/* Next Button (controller only) */}
            {isController && (
              <motion.button
                className="reveal-next-btn"
                onClick={onNext}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Question suivante</span>
                <SkipForward size={20} />
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}

      <style jsx global>{`
        /* ===== REVEAL SCREEN ===== */
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

        .reveal-bg-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 30%, rgba(162, 56, 255, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 70%, rgba(255, 0, 146, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(162, 56, 255, 0.15) 0%, transparent 50%),
            #0a0a0f;
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
        .reveal-winner-badge {
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

        .reveal-winner-avatar {
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

        .reveal-winner-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .reveal-winner-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: white;
        }

        .reveal-winner-detail {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .reveal-winner-points-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 14px;
          background: rgba(34, 197, 94, 0.25);
          border-radius: 10px;
          margin-left: auto;
        }

        .reveal-winner-points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: #4ade80;
          line-height: 1;
        }

        .reveal-winner-points-label {
          font-size: 0.65rem;
          color: rgba(34, 197, 94, 0.8);
          text-transform: uppercase;
        }

        /* Album Art */
        .reveal-album-container {
          position: relative;
          width: 200px;
          height: 200px;
        }

        .reveal-album-glow {
          position: absolute;
          inset: -20px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 24px;
          filter: blur(40px);
          opacity: 0.6;
        }

        .reveal-album-art {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          object-fit: cover;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .reveal-album-placeholder {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 16px;
          background: rgba(162, 56, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${DEEZER_LIGHT};
        }

        .reveal-playing-indicator {
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

        .reveal-playing-indicator span {
          width: 4px;
          background: white;
          border-radius: 2px;
          animation: reveal-equalizer 0.6s ease-in-out infinite;
        }

        .reveal-playing-indicator span:nth-child(1) { height: 8px; animation-delay: 0s; }
        .reveal-playing-indicator span:nth-child(2) { height: 14px; animation-delay: 0.15s; }
        .reveal-playing-indicator span:nth-child(3) { height: 10px; animation-delay: 0.3s; }
        .reveal-playing-indicator span:nth-child(4) { height: 6px; animation-delay: 0.45s; }

        @keyframes reveal-equalizer {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.4); }
        }

        /* Track Info */
        .reveal-track-info {
          text-align: center;
        }

        .reveal-track-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.5rem;
          margin: 0 0 8px 0;
          color: white;
          text-shadow: 0 2px 20px rgba(162, 56, 255, 0.5);
        }

        .reveal-track-artist {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1rem;
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Progress Bar */
        .reveal-progress-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .reveal-progress-bar {
          position: relative;
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: visible;
        }

        .reveal-progress-bar.interactive {
          cursor: pointer;
        }

        .reveal-progress-bar.readonly {
          cursor: default;
        }

        .reveal-progress-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border-radius: 4px;
          pointer-events: none;
        }

        .reveal-progress-thumb {
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

        .reveal-progress-bar.interactive:hover .reveal-progress-thumb,
        .reveal-progress-bar.dragging .reveal-progress-thumb {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        }

        .reveal-progress-bar.dragging {
          cursor: grabbing;
        }

        .reveal-progress-time {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
        }

        /* Play/Pause Button */
        .reveal-play-pause-btn {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          box-shadow:
            0 8px 30px rgba(162, 56, 255, 0.5),
            0 0 0 4px rgba(162, 56, 255, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
        }

        .reveal-play-pause-btn.readonly {
          cursor: default;
          opacity: 0.8;
        }

        .reveal-play-pause-btn:not(.readonly):hover {
          transform: scale(1.08);
          box-shadow:
            0 12px 40px rgba(162, 56, 255, 0.6),
            0 0 0 6px rgba(162, 56, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .reveal-play-pause-btn:not(.readonly):active {
          transform: scale(0.95);
        }

        /* Next Button */
        .reveal-next-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reveal-next-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .reveal-next-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </AnimatePresence>
  );
}
