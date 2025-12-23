'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Chargement');

  useEffect(() => {
    // Animation du texte de chargement
    const texts = ['Chargement', 'Chargement.', 'Chargement..', 'Chargement...'];
    let index = 0;
    const textInterval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 400);

    // Redirection après 2.5s
    const redirectTimeout = setTimeout(() => {
      const hasSeenOnboarding = storage.get('hasSeenOnboarding');

      if (!hasSeenOnboarding) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/login';
      }
    }, 1200);

    return () => {
      clearInterval(textInterval);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: '#0a0a0f'
    }}>
      {/* Background avec dégradés */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(34, 197, 94, 0.05) 0%, transparent 40%),
          #0a0a0f
        `,
        zIndex: 0
      }} />

      {/* Grille subtile */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        zIndex: 1,
        opacity: 0.5
      }} />

      {/* Orbes flottantes */}
      <motion.div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: '#8b5cf6',
          filter: 'blur(80px)',
          top: '-15%',
          right: '-10%',
          opacity: 0.4,
          zIndex: 2
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.9, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: '#f59e0b',
          filter: 'blur(80px)',
          bottom: '-10%',
          left: '-10%',
          opacity: 0.35,
          zIndex: 2
        }}
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 25, -15, 0],
          scale: [1, 0.95, 1.1, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Contenu principal */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo avec effet 3D */}
        <motion.div
          style={{
            position: 'relative',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          {/* Anneau externe pulsant */}
          <motion.div
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '2px solid #8b5cf6'
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          {/* Anneau interne */}
          <motion.div
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '2px solid #8b5cf6'
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.6, 0.3, 0.6]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          {/* Coeur du logo */}
          <motion.div
            style={{
              width: 100,
              height: 100,
              background: 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              position: 'relative',
              zIndex: 5,
              border: '3px solid rgba(255, 255, 255, 0.2)',
              boxShadow: `
                0 10px 40px rgba(139, 92, 246, 0.4),
                0 0 60px rgba(139, 92, 246, 0.2),
                inset 0 -4px 10px rgba(0, 0, 0, 0.3),
                inset 0 4px 10px rgba(255, 255, 255, 0.2)
              `
            }}
            animate={{
              boxShadow: [
                '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2), inset 0 -4px 10px rgba(0, 0, 0, 0.3), inset 0 4px 10px rgba(255, 255, 255, 0.2)',
                '0 10px 60px rgba(139, 92, 246, 0.6), 0 0 100px rgba(139, 92, 246, 0.4), inset 0 -4px 10px rgba(0, 0, 0, 0.3), inset 0 4px 10px rgba(255, 255, 255, 0.2)',
                '0 10px 40px rgba(139, 92, 246, 0.4), 0 0 60px rgba(139, 92, 246, 0.2), inset 0 -4px 10px rgba(0, 0, 0, 0.3), inset 0 4px 10px rgba(255, 255, 255, 0.2)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Zap size={56} strokeWidth={2.5} fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Titre */}
        <motion.h1
          style={{
            fontFamily: "'Bungee', cursive",
            fontSize: 'clamp(2.5rem, 12vw, 4rem)',
            fontWeight: 400,
            color: '#ffffff',
            margin: '0 0 0.5rem 0',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            textShadow: `
              0 0 20px rgba(139, 92, 246, 0.6),
              0 0 40px rgba(139, 92, 246, 0.4),
              0 0 80px rgba(139, 92, 246, 0.2),
              0 4px 0 rgba(0, 0, 0, 0.3)
            `
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Gigglz
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            margin: '0 0 3rem 0'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Jeux de Soirée
        </motion.p>

        {/* Loader dots */}
        <motion.div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: '#8b5cf6',
                  borderRadius: '50%',
                  boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)'
                }}
                animate={{
                  y: [0, -18, 0],
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: [0.4, 0, 0.2, 1]
                }}
              />
            ))}
          </div>
          <motion.p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              margin: 0,
              minWidth: 120
            }}
            key={loadingText}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {loadingText}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Version en bas */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.1em',
          zIndex: 10
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        v2.0
      </motion.div>
    </div>
  );
}
