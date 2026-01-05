'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import MimeCard from './MimeCard';
import { MimeTheme, createWordPool } from '@/data/mime-words';
import ExitButton from '@/lib/components/ExitButton';

// Couleurs MIME - alignées sur theme.css (--mime-primary, --mime-secondary)
const MIME_COLORS = {
  primary: '#00ff66',
  primaryRgb: '0, 255, 102',
  secondary: '#00cc52',
  dark: '#00802f',
};

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
      // Reshuffle quand tous les mots sont utilisés
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

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0f',
      position: 'relative',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(${MIME_COLORS.primaryRgb}, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(${MIME_COLORS.primaryRgb}, 0.08) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        paddingTop: 'calc(14px + env(safe-area-inset-top))',
        background: 'linear-gradient(180deg, rgba(12, 12, 18, 0.95) 0%, rgba(10, 10, 15, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid rgba(${MIME_COLORS.primaryRgb}, 0.25)`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        <ExitButton
          variant="header"
          onExit={onBackToLobby}
          confirmMessage="Voulez-vous vraiment quitter la partie ?"
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28, filter: `drop-shadow(0 0 15px rgba(${MIME_COLORS.primaryRgb}, 0.6))` }}>🎭</span>
          <h1 style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            color: '#ffffff',
            textShadow: `0 0 12px rgba(${MIME_COLORS.primaryRgb}, 1), 0 0 25px rgba(${MIME_COLORS.primaryRgb}, 0.6)`,
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
          padding: '8px 14px',
          background: `linear-gradient(135deg, rgba(${MIME_COLORS.primaryRgb}, 0.2), rgba(${MIME_COLORS.primaryRgb}, 0.08))`,
          border: `2px solid rgba(${MIME_COLORS.primaryRgb}, 0.5)`,
          borderRadius: 9999,
          boxShadow: `0 0 15px rgba(${MIME_COLORS.primaryRgb}, 0.3)`,
        }}>
          <span style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 20,
            color: MIME_COLORS.primary,
            textShadow: `0 0 10px rgba(${MIME_COLORS.primaryRgb}, 0.8)`,
          }}>
            {wordsRemaining}
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.6)',
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

      {/* Footer - Style Guide 3D Buttons */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        gap: 12,
        padding: 20,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.9) 0%, rgba(12, 12, 18, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid rgba(${MIME_COLORS.primaryRgb}, 0.25)`,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Bouton PRÉCÉDENT - Gris/Disabled style quand pas dispo */}
        <motion.button
          onClick={prevWord}
          disabled={currentIndex === 0}
          whileHover={currentIndex > 0 ? { y: -3 } : {}}
          whileTap={currentIndex > 0 ? { y: 3 } : {}}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 20px',
            border: 'none',
            borderRadius: 16,
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
            boxShadow: currentIndex > 0
              ? '0 5px 0 #475569, 0 8px 20px rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)'
              : '0 3px 0 rgba(30, 30, 40, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            opacity: currentIndex > 0 ? 1 : 0.6,
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
          <span>Précédent</span>
        </motion.button>

        {/* Bouton SUIVANT - Neon Green 3D */}
        <motion.button
          onClick={nextWord}
          whileHover={{ y: -3 }}
          whileTap={{ y: 3 }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '16px 20px',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.03em',
            color: '#0a0a0f',
            background: `linear-gradient(180deg, ${MIME_COLORS.primary} 0%, ${MIME_COLORS.secondary} 100%)`,
            boxShadow: `
              0 5px 0 ${MIME_COLORS.dark},
              0 8px 25px rgba(${MIME_COLORS.primaryRgb}, 0.5),
              0 0 40px rgba(${MIME_COLORS.primaryRgb}, 0.2),
              inset 0 2px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'box-shadow 0.15s ease',
          }}
        >
          <span>Suivant</span>
          <ArrowRight size={22} strokeWidth={2.5} />
        </motion.button>
      </footer>
    </div>
  );
}
