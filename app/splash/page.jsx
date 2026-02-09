'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { storage } from '@/lib/utils/storage';
import { motion } from 'framer-motion';

// Preload images for smooth animation
const NEUTRAL_IMG = '/images/mascot/giggly-head-neutral.webp';
const WINK_IMG = '/images/mascot/giggly-head-wink.webp';

// 3 orbes avec dégradés radiaux (pas de blur filter = plus performant)
const ORBS = [
  { color: '#8b5cf6', top: '-10%', left: '5%', size: 350 },    // Purple
  { color: '#f59e0b', bottom: '-15%', right: '-5%', size: 400 }, // Orange
  { color: '#06b6d4', top: '30%', left: '-15%', size: 350 },   // Cyan
];

// Durée totale du splash (sans fade)
const SPLASH_DURATION = 1200;
// Moment où Giggly fait le wink (ms)
const WINK_TIME = 700;
// Durée du fade-out (ms)
const FADE_DURATION = 400;

export default function SplashScreen() {
  const router = useRouter();
  const [isWinking, setIsWinking] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);
  const authResultRef = useRef({ user: null, hasSeenOnboarding: false });
  const hasRedirected = useRef(false);

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const hasSeenOnboarding = storage.get('hasSeenOnboarding');
      authResultRef.current = { user, hasSeenOnboarding };
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Preload images before starting animations
  useEffect(() => {
    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;

    const onLoad = () => {
      loaded++;
      if (loaded === 2) {
        setImagesLoaded(true);
      }
    };

    img1.onload = onLoad;
    img2.onload = onLoad;
    img1.src = NEUTRAL_IMG;
    img2.src = WINK_IMG;

    // Fallback si les images ne chargent pas en 500ms
    const fallbackTimer = setTimeout(() => setImagesLoaded(true), 500);

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Animation effect (runs once when images are loaded)
  useEffect(() => {
    if (!imagesLoaded) return;

    // Déclencher le wink
    const winkTimeout = setTimeout(() => {
      setIsWinking(true);
    }, WINK_TIME);

    // Marquer l'animation comme terminée
    const animationTimeout = setTimeout(() => {
      setAnimationDone(true);
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(winkTimeout);
      clearTimeout(animationTimeout);
    };
  }, [imagesLoaded]);

  // Redirect effect (triggers when both animation AND auth are done)
  useEffect(() => {
    if (!animationDone || !authChecked || hasRedirected.current) return;

    hasRedirected.current = true;
    setIsFadingOut(true);

    const redirectTimeout = setTimeout(() => {
      const { user, hasSeenOnboarding } = authResultRef.current;

      // Use router.push for smooth transitions (no full page reload)
      if (!hasSeenOnboarding) {
        router.push('/onboarding');
      } else if (user) {
        router.push('/home');
      } else {
        router.push('/login');
      }
    }, FADE_DURATION);

    return () => clearTimeout(redirectTimeout);
  }, [animationDone, authChecked, router]);

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
      {/* Orbes colorées avec dégradés radiaux (pas de blur = performant) */}
      {ORBS.map((orb, index) => (
        <motion.div
          key={orb.color}
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}66 0%, ${orb.color}00 70%)`,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.3,
          }}
        />
      ))}

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
        {/* Giggly Head avec animation simple */}
        <motion.div
          style={{
            width: 'clamp(180px, 55vw, 280px)',
            height: 'clamp(180px, 55vw, 280px)',
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.4,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          {/* Neutral head - visible jusqu'au wink */}
          <img
            src={NEUTRAL_IMG}
            alt="Giggly"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'absolute',
              inset: 0,
              opacity: isWinking ? 0 : 1,
            }}
            draggable={false}
          />
          {/* Wink head - apparaît au moment du wink */}
          <img
            src={WINK_IMG}
            alt="Giggly wink"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              position: 'absolute',
              inset: 0,
              opacity: isWinking ? 1 : 0,
            }}
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

      {/* Barre de progression en bas - CSS animation (pas de state updates) */}
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
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6, #f59e0b, #10b981)',
            borderRadius: '2px',
            width: imagesLoaded ? '100%' : '0%',
            transition: `width ${SPLASH_DURATION}ms linear`,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
