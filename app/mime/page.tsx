'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, HelpCircle } from 'lucide-react';
import MimeGame from '@/components/game-mime/MimeGame';
import { MimeTheme, themeInfos } from '@/data/mime-words';
import ExitButton from '@/lib/components/ExitButton';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { incrementLifetimeGamesCount } from '@/lib/utils/lifetimeGames';
import { useHearts } from '@/lib/hooks/useHearts';
import { storage } from '@/lib/utils/storage';
import { auth } from '@/lib/firebase';

type GamePhase = 'lobby' | 'playing';

export default function MimePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [selectedThemes, setSelectedThemes] = useState<MimeTheme[]>([]);
  const { openManually: openHowToPlay } = useHowToPlay();
  const gameRecordedRef = useRef(false);

  const { isPro } = useSubscription(auth.currentUser);
  const { consumeHeart } = useHearts({ isPro });

  const handleToggleTheme = useCallback((theme: MimeTheme) => {
    setSelectedThemes(prev =>
      prev.includes(theme)
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    );
  }, []);

  const handleStart = useCallback(() => {
    if (selectedThemes.length > 0) {
      consumeHeart();
      setPhase('playing');
    }
  }, [selectedThemes, consumeHeart]);

  const handleBackToLobby = useCallback(() => {
    // Record game as completed (only once per session)
    if (!gameRecordedRef.current) {
      incrementLifetimeGamesCount();
      gameRecordedRef.current = true;
      storage.set('returnedFromGame', true);
    }
    setPhase('lobby');
  }, []);

  const handleBackToHome = useCallback(() => {
    // Record game if we were playing
    if (phase === 'playing' && !gameRecordedRef.current) {
      incrementLifetimeGamesCount();
      gameRecordedRef.current = true;
      storage.set('returnedFromGame', true);
    }
    router.push('/home');
  }, [router, phase]);

  const canStart = selectedThemes.length > 0;
  const totalWords = selectedThemes.reduce((acc, theme) => {
    const info = themeInfos.find(t => t.id === theme);
    return acc + (info?.wordCount || 0);
  }, 0);

  if (phase === 'playing') {
    return (
      <MimeGame
        selectedThemes={selectedThemes}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  return (
    <div className="lobby-container mime game-page">
      {/* Modal How To Play */}

      {/* Header */}
      <header className="lobby-header mime">
        <div className="header-left">
          <ExitButton
            variant="header"
            onExit={handleBackToHome}
            confirmMessage="Voulez-vous vraiment quitter ?"
          />
          <div className="header-title-row">
            <span style={{ fontSize: '1.5rem' }}>🎭</span>
            <h1 className="lobby-title">Mime</h1>
          </div>
        </div>
        <div className="header-right">
          <motion.button
            className="help-btn mime"
            onClick={openHowToPlay}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Comment jouer"
          >
            <HelpCircle size={18} />
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lobby-main">
        <div className="lobby-content">
          {/* Instructions Card */}
          <div className="lobby-card mime-instructions">
            <h2 className="mime-instructions-title">
              <span>📖</span>
              Comment jouer ?
            </h2>
            <ol className="mime-instructions-list">
              <li>
                <span className="mime-step-num">1</span>
                Un joueur regarde secrètement le mot
              </li>
              <li>
                <span className="mime-step-num">2</span>
                Il mime le mot aux autres joueurs
              </li>
              <li>
                <span className="mime-step-num">3</span>
                Celui qui trouve devient le mimeur
              </li>
            </ol>
          </div>

          {/* Theme Selection */}
          <div className="lobby-card theme-selector mime">
            <div className="mime-section-header">
              <h2 className="mime-section-title">Choisis les thèmes</h2>
              {totalWords > 0 && (
                <span className="mime-word-count">{totalWords} mots</span>
              )}
            </div>

            <div className="mime-themes-grid">
              {themeInfos.map((theme, index) => {
                const isSelected = selectedThemes.includes(theme.id);

                return (
                  <motion.button
                    key={theme.id}
                    className={`mime-theme-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleTheme(theme.id)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isSelected && (
                      <motion.div
                        className="mime-theme-check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </motion.div>
                    )}
                    <span className="mime-theme-emoji">{theme.emoji}</span>
                    <span className="mime-theme-name">{theme.name}</span>
                    <span className="mime-theme-count">{theme.wordCount} mots</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="lobby-footer">
          <motion.button
            className={`lobby-start-btn mime ${canStart ? '' : 'disabled'}`}
            onClick={canStart ? handleStart : undefined}
            whileHover={canStart ? { scale: 1.02 } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
            disabled={!canStart}
          >
            <span className="btn-icon">🎭</span>
            <span className="btn-text">C'est parti !</span>
          </motion.button>
        </div>
      </main>
    </div>
  );
}
