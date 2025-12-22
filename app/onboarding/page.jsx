'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { signInWithGoogle, signInAnonymously, auth } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { trackSignup, trackLogin } from '@/lib/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'Fini les soirées ennuyeuses',
    accent: '#8b5cf6',
  },
  {
    id: 2,
    title: 'Fous rires garantis',
    description: 'Des jeux qui rapprochent, des moments qui restent',
    accent: '#f59e0b',
  },
  {
    id: 3,
    title: 'Prêt à jouer ?',
    description: 'Gratuit, jusqu\'à 8 joueurs',
    accent: '#22c55e',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const completeOnboarding = () => {
    storage.set('hasSeenOnboarding', true);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      const result = await signInWithGoogle();

      if (result && result.user) {
        await initializeUserProfile(result.user);
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          trackSignup('google', result.user.uid);
        } else {
          trackLogin('google', result.user.uid);
        }
      }

      completeOnboarding();
      router.push('/home');
    } catch (err) {
      console.error('Google sign-in error:', err);
      setLoadingGoogle(false);
    }
  };

  const handleGuestMode = async () => {
    try {
      setLoadingGuest(true);
      const result = await signInAnonymously(auth);

      if (result && result.user) {
        trackSignup('anonymous', result.user.uid);
      }

      completeOnboarding();
      router.push('/home');
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setLoadingGuest(false);
    }
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      background: '#0a0a0f'
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 30% 20%, ${slide.accent}20 0%, transparent 50%),
          radial-gradient(ellipse at 70% 80%, ${slide.accent}15 0%, transparent 50%),
          #0a0a0f
        `,
        transition: 'background 0.5s ease',
        zIndex: 0
      }} />

      {/* Orbes animées */}
      <motion.div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.3,
          top: '-10%',
          right: '-10%',
          background: slide.accent,
          transition: 'background 0.5s ease',
          zIndex: 1
        }}
        animate={{
          x: [0, 20, -10, 0],
          y: [0, -20, 10, 0],
          scale: [1, 1.1, 0.95, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: '50%',
          filter: 'blur(80px)',
          opacity: 0.3,
          bottom: '-5%',
          left: '-10%',
          background: slide.accent,
          transition: 'background 0.5s ease',
          zIndex: 1
        }}
        animate={{
          x: [0, -15, 20, 0],
          y: [0, 15, -10, 0],
          scale: [1, 0.9, 1.1, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Contenu */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '85vh',
        position: 'relative',
        zIndex: 10
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2rem 0'
            }}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Slide 1 & 2: Simple title + description */}
            {(slide.id === 1 || slide.id === 2) && (
              <>
                <motion.h1
                  style={{
                    fontFamily: "'Bungee', cursive",
                    fontSize: 'clamp(2rem, 9vw, 3rem)',
                    fontWeight: 400,
                    color: '#ffffff',
                    margin: 0,
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                    textAlign: 'center',
                    textShadow: `0 0 30px ${slide.accent}, 0 0 60px ${slide.accent}66`
                  }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                >
                  {slide.title}
                </motion.h1>

                {slide.description && (
                  <motion.p
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '1.125rem',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.7)',
                      margin: '1.5rem 0 0 0',
                      textAlign: 'center',
                      lineHeight: 1.5
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    {slide.description}
                  </motion.p>
                )}
              </>
            )}

            {/* Slide 3: CTA */}
            {slide.id === 3 && (
              <>
                <motion.h1
                  style={{
                    fontFamily: "'Bungee', cursive",
                    fontSize: 'clamp(2rem, 10vw, 3rem)',
                    fontWeight: 400,
                    color: '#ffffff',
                    margin: '0 0 0.5rem 0',
                    textTransform: 'uppercase',
                    textShadow: `0 0 20px ${slide.accent}, 0 0 40px ${slide.accent}80`
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {slide.title}
                </motion.h1>

                <motion.p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: '0 0 3rem 0'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.description}
                </motion.p>

                {/* Google Sign-In Button */}
                <motion.button
                  onClick={handleGoogleSignIn}
                  disabled={loadingGoogle || loadingGuest}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.5rem',
                    background: '#ffffff',
                    color: '#1f1f1f',
                    border: 'none',
                    borderRadius: 12,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: (loadingGoogle || loadingGuest) ? 'wait' : 'pointer',
                    opacity: (loadingGoogle || loadingGuest) ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {loadingGoogle ? 'Connexion...' : 'Continuer avec Google'}
                </motion.button>

                {/* Guest Mode Link */}
                <motion.button
                  onClick={handleGuestMode}
                  disabled={loadingGoogle || loadingGuest}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    cursor: (loadingGoogle || loadingGuest) ? 'wait' : 'pointer',
                    padding: '1rem',
                    marginTop: '0.5rem'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  {loadingGuest ? 'Connexion...' : 'Jouer sans compte'}
                </motion.button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom navigation */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: 'env(safe-area-inset-bottom, 1rem)'
        }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {slides.map((s, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Slide ${index + 1}`}
                style={{
                  width: index === currentSlide ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: index === currentSlide ? slides[index].accent : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: index === currentSlide ? `0 0 12px ${slides[index].accent}` : 'none'
                }}
              />
            ))}
          </div>

          {/* Next button (only on slides 1-2) */}
          {!isLastSlide && (
            <motion.button
              onClick={handleNext}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                background: `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`,
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${slide.accent}66`
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Suivant</span>
              <ChevronRight size={20} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
