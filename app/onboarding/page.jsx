'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { signInWithGoogle, signInWithApple, signInAnonymously, auth } from '@/lib/firebase';
import { initializeUserProfile, updateUserPseudo, validatePseudo } from '@/lib/userProfile';
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
    accent: '#22c55e',
  },
  {
    id: 4,
    title: 'Comment tu t\'appelles ?',
    description: 'Ce sera ton nom dans tous les jeux',
    accent: '#8b5cf6',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState('');
  const [savingPseudo, setSavingPseudo] = useState(false);

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
        // Pré-remplir avec le nom Google si disponible
        if (result.user.displayName) {
          setPseudo(result.user.displayName.split(' ')[0]); // Prénom seulement
        }
      }

      // Aller à la slide pseudo au lieu de /home
      setCurrentSlide(3); // Slide 4 (index 3)
      setLoadingGoogle(false);
    } catch (err) {
      console.error('Google sign-in error:', err);
      setLoadingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingApple(true);
      const result = await signInWithApple();

      if (result && result.user) {
        await initializeUserProfile(result.user);
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          trackSignup('apple', result.user.uid);
        } else {
          trackLogin('apple', result.user.uid);
        }
        // Pré-remplir avec le nom Apple si disponible
        if (result.user.displayName) {
          setPseudo(result.user.displayName.split(' ')[0]);
        }
      }

      setCurrentSlide(3);
      setLoadingApple(false);
    } catch (err) {
      console.error('Apple sign-in error:', err);
      setLoadingApple(false);
    }
  };

  const handleGuestMode = async () => {
    try {
      setLoadingGuest(true);
      const result = await signInAnonymously(auth);

      if (result && result.user) {
        trackSignup('anonymous', result.user.uid);
      }

      setCurrentSlide(3);
      setLoadingGuest(false);
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setLoadingGuest(false);
    }
  };

  const handleSavePseudo = async () => {
    // Validation
    const validation = validatePseudo(pseudo.trim());
    if (!validation.valid) {
      setPseudoError(validation.error);
      return;
    }

    try {
      setSavingPseudo(true);
      setPseudoError('');

      // Sauvegarder le pseudo
      const user = auth.currentUser;
      if (user) {
        await updateUserPseudo(user.uid, pseudo.trim());
      }

      completeOnboarding();
      router.push('/home');
    } catch (err) {
      console.error('Save pseudo error:', err);
      setPseudoError('Erreur lors de la sauvegarde');
      setSavingPseudo(false);
    }
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div style={{
      height: '100dvh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden',
      background: '#0a0a0f',
      boxSizing: 'border-box'
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
        height: '85vh',
        position: 'relative',
        zIndex: 10,
        overflow: 'hidden'
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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
                    margin: '0 0 2rem 0',
                    textTransform: 'uppercase',
                    textShadow: `0 0 20px ${slide.accent}, 0 0 40px ${slide.accent}80`
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {slide.title}
                </motion.h1>

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

                {/* Apple Sign-In Button */}
                <motion.button
                  onClick={handleAppleSignIn}
                  disabled={loadingGoogle || loadingApple || loadingGuest}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.5rem',
                    marginTop: '0.75rem',
                    background: '#000000',
                    color: '#ffffff',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: (loadingGoogle || loadingApple || loadingGuest) ? 'wait' : 'pointer',
                    opacity: (loadingGoogle || loadingApple || loadingGuest) ? 0.7 : 1,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  {loadingApple ? 'Connexion...' : 'Continuer avec Apple'}
                </motion.button>

                {/* Guest Mode Link */}
                <motion.button
                  onClick={handleGuestMode}
                  disabled={loadingGoogle || loadingApple || loadingGuest}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    cursor: (loadingGoogle || loadingApple || loadingGuest) ? 'wait' : 'pointer',
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

            {/* Slide 4: Pseudo Selection */}
            {slide.id === 4 && (
              <>
                <motion.h1
                  style={{
                    fontFamily: "'Bungee', cursive",
                    fontSize: 'clamp(1.5rem, 8vw, 2.25rem)',
                    fontWeight: 400,
                    color: '#ffffff',
                    margin: '0 0 0.5rem 0',
                    textTransform: 'uppercase',
                    textShadow: `0 0 20px ${slide.accent}, 0 0 40px ${slide.accent}80`
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {slide.title}
                </motion.h1>

                <motion.p
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: '0 0 2rem 0',
                    textAlign: 'center'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.description}
                </motion.p>

                {/* Pseudo Input */}
                <motion.div
                  style={{ width: '100%', marginBottom: '1rem' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
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
                      border: pseudoError
                        ? '2px solid #ef4444'
                        : '2px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      color: '#ffffff',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '1.1rem',
                      textAlign: 'center',
                      letterSpacing: '0.02em',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!pseudoError) {
                        e.target.style.borderColor = '#8b5cf6';
                        e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                        e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.2)';
                      }
                    }}
                    onBlur={(e) => {
                      if (!pseudoError) {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />

                  {/* Character count & error */}
                  <div style={{
                    display: 'flex',
                    justifyContent: pseudoError ? 'space-between' : 'flex-end',
                    marginTop: '0.5rem',
                    padding: '0 0.25rem'
                  }}>
                    {pseudoError && (
                      <span style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: '#ef4444'
                      }}>
                        {pseudoError}
                      </span>
                    )}
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.75rem',
                      color: pseudo.length > 14 ? '#f59e0b' : 'rgba(255, 255, 255, 0.4)'
                    }}>
                      {pseudo.length}/16
                    </span>
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  onClick={handleSavePseudo}
                  disabled={savingPseudo || pseudo.trim().length < 2}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
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
                    transition: 'all 0.15s ease'
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileHover={!savingPseudo && pseudo.trim().length >= 2 ? {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 0 #15803d, 0 10px 30px rgba(34, 197, 94, 0.5)'
                  } : {}}
                  whileTap={!savingPseudo && pseudo.trim().length >= 2 ? {
                    transform: 'translateY(2px)',
                    boxShadow: '0 2px 0 #15803d, 0 4px 12px rgba(34, 197, 94, 0.3)'
                  } : {}}
                >
                  {savingPseudo ? 'Enregistrement...' : "C'est parti !"}
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
          {/* Dots - only show first 3 slides, slide 4 is after auth */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {slides.slice(0, 3).map((s, index) => (
              <button
                key={index}
                onClick={() => {
                  // Can only go back or to next intro slide, not skip to auth
                  if (index <= currentSlide || index < 2) {
                    setCurrentSlide(index);
                  }
                }}
                aria-label={`Slide ${index + 1}`}
                style={{
                  width: index === currentSlide ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: index === currentSlide ? slides[index].accent : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  padding: 0,
                  cursor: index <= currentSlide || index < 2 ? 'pointer' : 'default',
                  opacity: index <= currentSlide || index < 2 ? 1 : 0.5,
                  transition: 'all 0.3s ease',
                  boxShadow: index === currentSlide ? `0 0 12px ${slides[index].accent}` : 'none'
                }}
              />
            ))}
          </div>

          {/* Next button (only on slides 1-2, not on auth screen) */}
          {currentSlide < 2 && (
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
