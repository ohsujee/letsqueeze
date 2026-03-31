'use client';

/**
 * PseudoSlide — Écran de saisie du pseudo après authentification
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Mascot from './Mascot';

const SLIDE_COLOR = '#8b5cf6';
const EASE = [0.32, 0.72, 0, 1];

export default function PseudoSlide({
  pseudo, setPseudo,
  pseudoError, setPseudoError,
  savingPseudo, onSave,
}) {
  const [visibleHeight, setVisibleHeight] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kbOpen = vv.height < window.innerHeight * 0.75;
      setVisibleHeight(vv.height);
      setKeyboardOpen(kbOpen);
    };
    vv.addEventListener('resize', update);
    update();
    return () => vv.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{
      height: visibleHeight ? `${visibleHeight}px` : '100dvh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: keyboardOpen ? 'flex-start' : 'center',
      padding: keyboardOpen ? '1.5rem 1.5rem 0' : '1.5rem',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden',
      background: '#0a0a0f',
      boxSizing: 'border-box',
      transition: 'padding 0.2s ease',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, ${SLIDE_COLOR}25 0%, transparent 50%), #0a0a0f`,
        zIndex: 0
      }} />

      {/* Orbe */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${SLIDE_COLOR}50 0%, ${SLIDE_COLOR}00 70%)`,
        top: '-20%',
        right: '-20%',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      <motion.div
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: keyboardOpen ? '1rem' : '1.5rem',
          zIndex: 10,
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {!keyboardOpen && <Mascot emotion="curious" size={150} />}

        <div>
          <h1 style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 'clamp(1.5rem, 7vw, 2rem)',
            fontWeight: 400,
            color: '#ffffff',
            margin: '0 0 0.5rem 0',
            textShadow: `0 0 30px ${SLIDE_COLOR}80`
          }}>
            Comment tu t'appelles ?
          </h1>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '0.95rem',
            color: 'rgba(255, 255, 255, 0.6)',
            margin: 0,
          }}>
            Ce sera ton nom dans les jeux
          </p>
        </div>

        <div style={{ width: '100%' }}>
          <input
            type="text"
            value={pseudo}
            onChange={(e) => {
              setPseudo(e.target.value);
              if (pseudoError) setPseudoError('');
            }}
            placeholder="Ton pseudo..."
            maxLength={16}
            autoFocus
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: pseudoError ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              color: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '1.1rem',
              textAlign: 'center',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: pseudoError ? 'space-between' : 'flex-end',
            marginTop: '0.5rem',
            padding: '0 0.25rem'
          }}>
            {pseudoError && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>
                {pseudoError}
              </span>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: pseudo.length > 14 ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)',
              fontFamily: 'Inter, sans-serif',
            }}>
              {pseudo.length}/16
            </span>
          </div>
        </div>

        <motion.button
          onClick={onSave}
          disabled={savingPseudo || pseudo.trim().length < 2}
          style={{
            width: '100%',
            padding: '1rem 2rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: (savingPseudo || pseudo.trim().length < 2) ? 'not-allowed' : 'pointer',
            opacity: (savingPseudo || pseudo.trim().length < 2) ? 0.6 : 1,
            boxShadow: '0 4px 0 #15803d, 0 6px 20px rgba(34, 197, 94, 0.4)',
          }}
          whileHover={!savingPseudo && pseudo.trim().length >= 2 ? { y: -2 } : {}}
          whileTap={!savingPseudo && pseudo.trim().length >= 2 ? { y: 2 } : {}}
        >
          {savingPseudo ? 'Enregistrement...' : "C'est parti !"}
        </motion.button>
      </motion.div>
    </div>
  );
}
