'use client';

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

interface MimeCardProps {
  word: string;
}

export default function MimeCard({ word }: MimeCardProps) {
  const y = useMotionValue(0);
  const controls = useAnimation();

  // Max drag distance (60% reveal)
  const maxDrag = -180;

  // Transform for cover card
  const coverY = useTransform(y, [maxDrag, 0], [maxDrag * 0.65, 0]);
  const coverOpacity = useTransform(y, [maxDrag, 0], [0.6, 1]);
  const coverRotateX = useTransform(y, [maxDrag, 0], [-4, 0]);
  const coverScale = useTransform(y, [maxDrag, 0], [0.97, 1]);

  // Word card reveal effect
  const wordOpacity = useTransform(y, [maxDrag, -80, 0], [1, 0.7, 0.4]);
  const wordScale = useTransform(y, [maxDrag, 0], [1, 0.96]);

  // Handle drag end - spring back
  const handleDragEnd = () => {
    controls.start({
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30 }
    });
  };

  // Reset when word changes
  useEffect(() => {
    y.set(0);
  }, [word, y]);

  return (
    <div className="mime-card-container">
      {/* Word Card (Behind) */}
      <motion.div
        className="mime-card word-card"
        style={{ opacity: wordOpacity, scale: wordScale }}
      >
        <span className="mime-word">{word}</span>
      </motion.div>

      {/* Cover Card (On top - draggable) */}
      <motion.div
        className="mime-card cover-card"
        style={{
          y: coverY,
          opacity: coverOpacity,
          rotateX: coverRotateX,
          scale: coverScale,
        }}
        drag="y"
        dragConstraints={{ top: maxDrag, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        <div className="cover-content">
          <div className="cover-icon">🎭</div>
          <span className="cover-title">Ton mot</span>
          <span className="cover-instruction">Glisse vers le haut pour voir</span>
          <motion.div
            className="swipe-hint"
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="swipe-arrow">↑</span>
          </motion.div>
        </div>
      </motion.div>

      <style jsx>{`
        .mime-card-container {
          position: relative;
          width: 100%;
          max-width: 320px;
          height: 340px;
          perspective: 1000px;
        }

        .mime-card {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Word Card - Behind */
        .word-card {
          background: linear-gradient(180deg, rgba(132, 204, 22, 0.12) 0%, rgba(34, 197, 94, 0.08) 100%);
          border: 2px solid rgba(132, 204, 22, 0.3);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .mime-word {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(1.75rem, 7vw, 2.5rem);
          color: var(--mime-primary, #84cc16);
          text-align: center;
          padding: 1.5rem;
          text-shadow: 0 0 30px rgba(132, 204, 22, 0.5);
          line-height: 1.2;
        }

        /* Cover Card - On top */
        .cover-card {
          background: linear-gradient(180deg, rgba(26, 26, 36, 1) 0%, rgba(18, 18, 26, 1) 100%);
          border: 2px solid rgba(132, 204, 22, 0.35);
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          cursor: grab;
          touch-action: none;
        }

        .cover-card:active {
          cursor: grabbing;
        }

        .cover-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
        }

        .cover-icon {
          font-size: 4rem;
          filter: drop-shadow(0 4px 16px rgba(132, 204, 22, 0.5));
        }

        .cover-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.5rem;
          color: var(--mime-primary, #84cc16);
          text-shadow: 0 0 20px rgba(132, 204, 22, 0.5);
        }

        .cover-instruction {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-align: center;
        }

        .swipe-hint {
          margin-top: 0.5rem;
        }

        .swipe-arrow {
          font-size: 1.25rem;
          color: var(--mime-primary, #84cc16);
          text-shadow: 0 0 12px rgba(132, 204, 22, 0.5);
        }
      `}</style>
    </div>
  );
}
