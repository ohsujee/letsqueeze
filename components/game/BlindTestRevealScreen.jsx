"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Play, Pause, SkipForward, Trophy } from "lucide-react";
import './BlindTestRevealScreen.css';

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

    </AnimatePresence>
  );
}
