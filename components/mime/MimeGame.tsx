'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, ArrowRight } from 'lucide-react';
import MimeCard from './MimeCard';
import { MimeTheme, createWordPool } from '@/data/mime-words';
import ExitButton from '@/lib/components/ExitButton';

interface MimeGameProps {
  selectedThemes: MimeTheme[];
  onBackToLobby: () => void;
}

export default function MimeGame({ selectedThemes, onBackToLobby }: MimeGameProps) {
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  // Initialize word pool
  useEffect(() => {
    const pool = createWordPool(selectedThemes);
    setWordPool(pool);
    setCurrentIndex(0);
  }, [selectedThemes]);

  const currentWord = wordPool[currentIndex] || '';
  const wordsRemaining = wordPool.length - currentIndex;

  // Get next word
  const nextWord = useCallback(() => {
    if (currentIndex < wordPool.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCardKey(prev => prev + 1);
    } else {
      // Reshuffle when all words used
      const newPool = createWordPool(selectedThemes);
      setWordPool(newPool);
      setCurrentIndex(0);
      setCardKey(prev => prev + 1);
    }
  }, [currentIndex, wordPool.length, selectedThemes]);

  const skipWord = useCallback(() => {
    nextWord();
  }, [nextWord]);

  return (
    <div className="mime-game-container">
      {/* Header */}
      <header className="mime-game-header">
        <ExitButton
          variant="header"
          onExit={onBackToLobby}
          confirmMessage="Voulez-vous vraiment quitter la partie ?"
        />
        <div className="mime-game-title-row">
          <span className="mime-game-emoji">🎭</span>
          <h1 className="mime-game-title">Mime</h1>
        </div>
        <div className="mime-word-counter">
          <span className="counter-value">{wordsRemaining}</span>
          <span className="counter-label">restants</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mime-game-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={cardKey}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.25 }}
            className="mime-card-wrapper"
          >
            <MimeCard word={currentWord} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Action Buttons */}
      <footer className="mime-game-footer">
        <motion.button
          className="mime-action-btn skip"
          onClick={skipWord}
          whileTap={{ scale: 0.97 }}
        >
          <SkipForward size={20} />
          <span>Passer</span>
        </motion.button>
        <motion.button
          className="mime-action-btn next"
          onClick={nextWord}
          whileTap={{ scale: 0.97 }}
        >
          <span>Suivant</span>
          <ArrowRight size={20} />
        </motion.button>
      </footer>

      <style jsx>{`
        .mime-game-container {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          position: relative;
        }

        .mime-game-container::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(132, 204, 22, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        /* Header */
        .mime-game-header {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          padding-top: calc(0.75rem + env(safe-area-inset-top));
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(132, 204, 22, 0.15);
        }

        .mime-game-title-row {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mime-game-emoji {
          font-size: 1.5rem;
        }

        .mime-game-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(1.25rem, 4vw, 1.5rem);
          color: var(--mime-primary, #84cc16);
          text-shadow:
            0 0 10px rgba(132, 204, 22, 0.5),
            0 0 20px rgba(132, 204, 22, 0.3);
          margin: 0;
          line-height: 1;
        }

        .mime-word-counter {
          display: flex;
          align-items: baseline;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: rgba(132, 204, 22, 0.1);
          border: 1px solid rgba(132, 204, 22, 0.2);
          border-radius: 9999px;
        }

        .counter-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.125rem;
          color: var(--mime-primary, #84cc16);
        }

        .counter-label {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
        }

        /* Content */
        .mime-game-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .mime-card-wrapper {
          width: 100%;
          max-width: 360px;
          display: flex;
          justify-content: center;
        }

        /* Footer */
        .mime-game-footer {
          position: relative;
          z-index: 10;
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(132, 204, 22, 0.15);
        }

        .mime-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .mime-action-btn.skip {
          background: rgba(251, 191, 36, 0.12);
          border: 2px solid rgba(251, 191, 36, 0.3);
          color: var(--mime-accent, #fbbf24);
        }

        .mime-action-btn.skip:hover {
          background: rgba(251, 191, 36, 0.18);
          border-color: rgba(251, 191, 36, 0.5);
        }

        .mime-action-btn.next {
          background: linear-gradient(135deg, var(--mime-primary, #84cc16), #65a30d);
          color: var(--bg-primary, #0a0a0f);
          box-shadow: 0 4px 0 #4d7c0f;
        }

        .mime-action-btn.next:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #4d7c0f;
        }

        .mime-action-btn.next:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #4d7c0f;
        }
      `}</style>
    </div>
  );
}
