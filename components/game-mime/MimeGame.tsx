'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import MimeCard from './MimeCard';
import { MimeTheme, createWordPool } from '@/data/mime-words';
import ExitButton from '@/lib/components/ExitButton';
import { getFlatCSSVars } from '@/lib/config/colors';

interface MimeGameProps {
  selectedThemes: MimeTheme[];
  onBackToLobby: () => void;
}

export default function MimeGame({ selectedThemes, onBackToLobby }: MimeGameProps) {
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    const pool = createWordPool(selectedThemes);
    setWordPool(pool);
    setCurrentIndex(0);
  }, [selectedThemes]);

  const currentWord = wordPool[currentIndex] || '';
  const wordsRemaining = wordPool.length - currentIndex;

  const nextWord = useCallback(() => {
    if (currentIndex < wordPool.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCardKey(prev => prev + 1);
    } else {
      const newPool = createWordPool(selectedThemes);
      setWordPool(newPool);
      setCurrentIndex(0);
      setCardKey(prev => prev + 1);
    }
  }, [currentIndex, wordPool.length, selectedThemes]);

  const prevWord = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCardKey(prev => prev + 1);
    }
  }, [currentIndex]);

  const flatVars = getFlatCSSVars('mime') as React.CSSProperties;

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#0e0e1a',
      position: 'relative',
      ...flatVars,
    }}>
      {/* Header — flat */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--flat-bg, #0a3028)',
        borderBottom: '3px solid var(--flat-bg-dark, #06201a)',
      }}>
        <ExitButton
          variant="header"
          onExit={onBackToLobby}
          confirmMessage="Voulez-vous vraiment quitter la partie ?"
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🎭</span>
          <h1 style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            color: '#ffffff',
            margin: 0,
            lineHeight: 1,
          }}>
            Mime
          </h1>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          padding: '6px 12px',
          background: 'var(--flat-accent, #1a5a48)',
          borderBottom: '2px solid var(--flat-accent-dark, #0e4035)',
          borderRadius: 8,
        }}>
          <span style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 20,
            color: 'var(--flat-text, #a7f3d0)',
          }}>
            {wordsRemaining}
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--flat-muted, #6ee7b7)',
          }}>
            restants
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        zIndex: 1,
        minHeight: 0,
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={cardKey}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: 360,
            }}
          >
            <MimeCard word={currentWord} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer — flat 3D buttons */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        gap: 12,
        padding: 20,
        background: '#0e0e1a',
        borderTop: '2px solid #222240',
      }}>
        <motion.button
          onClick={prevWord}
          disabled={currentIndex === 0}
          whileHover={currentIndex > 0 ? { y: -2 } : {}}
          whileTap={currentIndex > 0 ? { y: 2 } : {}}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 20px',
            border: 'none',
            borderRadius: 12,
            borderBottom: currentIndex > 0 ? '4px solid #475569' : '4px solid rgba(30, 30, 40, 0.8)',
            cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.03em',
            color: currentIndex > 0 ? '#0a0a0f' : 'rgba(255, 255, 255, 0.4)',
            background: currentIndex > 0
              ? 'linear-gradient(180deg, #94a3b8 0%, #64748b 100%)'
              : 'linear-gradient(180deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 40, 50, 0.8) 100%)',
            opacity: currentIndex > 0 ? 1 : 0.6,
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
          <span>Précédent</span>
        </motion.button>

        <motion.button
          onClick={nextWord}
          whileHover={{ y: -2 }}
          whileTap={{ y: 2 }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 20px',
            border: 'none',
            borderRadius: 12,
            borderBottom: '4px solid var(--game-dark, #059669)',
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.03em',
            color: '#0a0a0f',
            background: 'linear-gradient(180deg, var(--game-color, #059669) 0%, var(--game-secondary, #047857) 100%)',
            boxShadow: '0 4px 15px rgba(52, 211, 153, 0.25)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Suivant</span>
          <ArrowRight size={22} strokeWidth={2.5} />
        </motion.button>
      </footer>
    </div>
  );
}
