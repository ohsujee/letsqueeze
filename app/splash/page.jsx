'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { motion } from 'framer-motion';

// Les 5 couleurs des jeux
const GAME_COLORS = [
  '#8b5cf6', // Quiz - Purple
  '#f59e0b', // Alibi - Orange
  '#10b981', // BlindTest - Green
  '#A238FF', // DeezTest - Magenta
  '#06b6d4', // LaLoi - Cyan
];

// Durée totale du splash (sans fade)
const SPLASH_DURATION = 1200;
// Moment où Giggly fait le wink (ms)
const WINK_TIME = 700;
// Durée du fade-out (ms)
const FADE_DURATION = 400;

export default function SplashScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [isWinking, setIsWinking] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Animation de la barre de progression
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / SPLASH_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(progressInterval);
      }
    }, 16);

    // Déclencher le wink
    const winkTimeout = setTimeout(() => {
      setIsWinking(true);
    }, WINK_TIME);

    // Déclencher le fade-out
    const fadeTimeout = setTimeout(() => {
      setIsFadingOut(true);
    }, SPLASH_DURATION);

    // Redirection après le fade
    const redirectTimeout = setTimeout(() => {
      const hasSeenOnboarding = storage.get('hasSeenOnboarding');

      if (!hasSeenOnboarding) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/login';
      }
    }, SPLASH_DURATION + FADE_DURATION);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(winkTimeout);
      clearTimeout(fadeTimeout);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <motion.div
      style={{
        minHeight: '100dvh',
        maxHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0a0a0f'
      }}
      animate={{
        opacity: isFadingOut ? 0 : 1,
        scale: isFadingOut ? 1.05 : 1,
      }}
      transition={{
        duration: FADE_DURATION / 1000,
        ease: [0.4, 0, 1, 1]
      }}
    >
      {/* Orbes colorées - chaque jeu représenté */}
      {GAME_COLORS.map((color, index) => {
        // Positions différentes pour chaque orbe
        const positions = [
          { top: '-5%', left: '10%', size: 280 },    // Purple - haut gauche
          { top: '60%', right: '-5%', size: 320 },   // Orange - bas droite
          { bottom: '-10%', left: '20%', size: 260 }, // Green - bas gauche
          { top: '20%', right: '5%', size: 240 },    // Magenta - haut droite
          { top: '40%', left: '-10%', size: 300 },   // Cyan - milieu gauche
        ];
        const pos = positions[index];

        return (
          <motion.div
            key={color}
            style={{
              position: 'absolute',
              width: pos.size,
              height: pos.size,
              borderRadius: '50%',
              background: color,
              filter: 'blur(100px)',
              opacity: 0,
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
            }}
            animate={{
              opacity: [0, 0.5, 0.35, 0.5],
              scale: [0.8, 1.1, 1, 1.05],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: index * 0.15,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      {/* Grille subtile */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        zIndex: 1,
      }} />

      {/* Contenu principal */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          gap: '0.5rem',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Giggly Head avec animation rotation → wink */}
        <motion.div
          style={{
            width: 'clamp(180px, 55vw, 280px)',
            height: 'clamp(180px, 55vw, 280px)',
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: [null, 0, -8, 8, -5, 0]
          }}
          transition={{
            opacity: { duration: 0.3 },
            scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
            rotate: {
              duration: 0.6,
              delay: 0.3,
              ease: "easeInOut",
              times: [0, 0.2, 0.4, 0.6, 0.8, 1]
            }
          }}
        >
          {/* Neutral head - visible jusqu'au wink */}
          <motion.img
            src="/images/mascot/giggly-head-neutral.png"
            alt="Giggly"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'absolute',
              inset: 0,
            }}
            animate={{ opacity: isWinking ? 0 : 1 }}
            transition={{ duration: 0.1 }}
            draggable={false}
          />
          {/* Wink head - apparaît au moment du wink */}
          <motion.img
            src="/images/mascot/giggly-head-wink.png"
            alt="Giggly wink"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'absolute',
              inset: 0,
            }}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{
              opacity: isWinking ? 1 : 0,
              scale: isWinking ? 1 : 1.1
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            draggable={false}
          />
        </motion.div>

        {/* Wordmark GIGGLZ */}
        <motion.h1
          style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 'clamp(3.5rem, 18vw, 6rem)',
            fontWeight: 400,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '0.02em',
            textShadow: `
              0 0 60px rgba(139, 92, 246, 0.4),
              0 0 120px rgba(245, 158, 11, 0.2),
              0 4px 0 rgba(0, 0, 0, 0.4)
            `,
            WebkitTextStroke: '1px rgba(255, 255, 255, 0.1)',
          }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
            delay: 0.1
          }}
        >
          GIGGLZ
        </motion.h1>
      </motion.div>

      {/* Barre de progression en bas */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140px',
          height: '3px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
          zIndex: 10,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <motion.div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6, #f59e0b, #10b981)',
            borderRadius: '2px',
            width: `${progress}%`,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
