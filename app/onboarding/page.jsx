'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { signInWithGoogle, signInWithApple, signInAnonymously, auth, db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { initializeUserProfile, updateUserPseudo, validatePseudo } from '@/lib/userProfile';
import { trackSignup, trackLogin } from '@/lib/analytics';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronRight, X, AlertTriangle } from 'lucide-react';

// Images des jeux pour le carousel (WebP optimisées)
const GAME_IMAGES = [
  { src: '/images/optimized/quiz-buzzer.webp', color: '#8b5cf6' },  // Purple
  { src: '/images/optimized/alibi.webp', color: '#ff6b2c' },        // Orange vif
  { src: '/images/optimized/blind-test.webp', color: '#A238FF' },   // Magenta
  { src: '/images/optimized/mime-game.webp', color: '#22c55e' },    // Green plus vif
];

const SLIDE_COLORS = ['#8b5cf6', '#22c55e', '#8b5cf6'];

// Mascot images par émotion (WebP optimisées)
const MASCOT_IMAGES = {
  welcome: '/images/mascot/giggly-excited.webp',
  ready: '/images/mascot/giggly-determined.webp',
  curious: '/images/mascot/giggly-curious.webp',
  warning: '/images/mascot/giggly-worried.webp',
};

// Mascotte avec image ou placeholder
function Mascot({ emotion = 'welcome', size = 200 }) {
  const imageSrc = MASCOT_IMAGES[emotion];

  // Si on a une image pour cette émotion, l'afficher
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt="Giggly"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        draggable={false}
      />
    );
  }

  // Sinon, placeholder
  const emotionLabels = {
    welcome: '🐧 Excité\nBras ouverts',
    ready: '🐧 Motivé\nPrêt à jouer',
    curious: '🐧 Curieux\nTête penchée',
    warning: '🐧 Inquiet\nMains levées',
  };

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 20,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '2px dashed rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <span style={{ fontSize: size * 0.3 }}>🐧</span>
      <span style={{
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        whiteSpace: 'pre-line',
        fontFamily: 'Inter, sans-serif',
      }}>
        {emotionLabels[emotion]}
      </span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isAndroid } = usePlatform();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState('');
  const [savingPseudo, setSavingPseudo] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [showPseudoSlide, setShowPseudoSlide] = useState(false);
  const [visibleHeight, setVisibleHeight] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Détecte l'ouverture du clavier via visualViewport (iOS + Android)
  useEffect(() => {
    if (!showPseudoSlide) return;
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
  }, [showPseudoSlide]);

  const containerRef = useRef(null);
  const x = useMotionValue(0);

  // Easing inspiré d'iOS pour des animations fluides
  const EASE = [0.32, 0.72, 0, 1];

  const handleNext = () => {
    if (currentSlide < 1) {
      setCurrentSlide(1);
    }
  };

  const handleDragEnd = (event, info) => {
    const containerWidth = containerRef.current?.offsetWidth || 400;
    const swipeThreshold = containerWidth * 0.2;
    const velocityThreshold = 300;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Swipe detection basé sur distance OU vélocité
    if ((offset < -swipeThreshold || velocity < -velocityThreshold) && currentSlide < 1) {
      setCurrentSlide(1);
    } else if ((offset > swipeThreshold || velocity > velocityThreshold) && currentSlide > 0) {
      setCurrentSlide(0);
    }
  };

  const completeOnboarding = () => {
    storage.set('hasSeenOnboarding', true);
  };

  const goToPseudoSlide = (displayName) => {
    if (displayName) {
      setPseudo(displayName.split(' ')[0]);
    }
    setShowPseudoSlide(true);
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
        const snap = await get(ref(db, `users/${result.user.uid}/profile/pseudo`));
        const existingPseudo = snap.val();
        if (existingPseudo) {
          localStorage.setItem('lq_cached_pseudo', existingPseudo);
          completeOnboarding();
          router.push('/home');
        } else {
          goToPseudoSlide(result.user.displayName);
        }
      }
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
        const snap = await get(ref(db, `users/${result.user.uid}/profile/pseudo`));
        const existingPseudo = snap.val();
        if (existingPseudo) {
          localStorage.setItem('lq_cached_pseudo', existingPseudo);
          completeOnboarding();
          router.push('/home');
        } else {
          goToPseudoSlide(result.user.displayName);
        }
      }
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
      goToPseudoSlide(null);
      setLoadingGuest(false);
    } catch (err) {
      console.error('Anonymous sign-in error:', err);
      setLoadingGuest(false);
    }
  };

  const handleSavePseudo = async () => {
    const validation = validatePseudo(pseudo.trim());
    if (!validation.valid) {
      setPseudoError(validation.error);
      return;
    }

    try {
      setSavingPseudo(true);
      setPseudoError('');

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

  const currentColor = SLIDE_COLORS[currentSlide];

  // ====== PSEUDO SLIDE (après auth) ======
  if (showPseudoSlide) {
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
          background: `radial-gradient(ellipse at 50% 30%, ${SLIDE_COLORS[2]}25 0%, transparent 50%), #0a0a0f`,
          zIndex: 0
        }} />

        {/* Orbe avec radial-gradient (pas de blur = performant) */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${SLIDE_COLORS[2]}50 0%, ${SLIDE_COLORS[2]}00 70%)`,
            top: '-20%',
            right: '-20%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

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
              textShadow: `0 0 30px ${SLIDE_COLORS[2]}80`
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
            onClick={handleSavePseudo}
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

  // ====== ONBOARDING SLIDES (0 et 1) ======
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{
        height: '100dvh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        background: '#0a0a0f',
      }}>
      {/* Background animé */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${currentColor}25 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, ${currentColor}15 0%, transparent 40%), #0a0a0f`
        }}
        animate={{
          background: `radial-gradient(ellipse at 50% 30%, ${currentColor}25 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, ${currentColor}15 0%, transparent 40%), #0a0a0f`
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Orbe avec radial-gradient (pas de blur = performant) */}
      <motion.div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          top: '-20%',
          right: '-20%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
        animate={{
          background: `radial-gradient(circle, ${currentColor}50 0%, ${currentColor}00 70%)`,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Container principal */}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Slides Container - Carousel fluide */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <motion.div
            style={{
              display: 'flex',
              height: '100%',
              width: '200%', // 2 slides
              x,
              cursor: 'grab',
            }}
            drag="x"
            dragConstraints={{ left: -containerRef.current?.offsetWidth || -400, right: 0 }}
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={{ x: -currentSlide * (containerRef.current?.offsetWidth || 400) }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {/* SLIDE 0: Welcome */}
            <div style={{
              width: '50%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              textAlign: 'center',
              gap: '1.5rem',
              boxSizing: 'border-box',
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Mascot emotion="welcome" size={180} />
              </motion.div>

              <motion.h1
                style={{
                  fontFamily: "'Bungee', cursive",
                  fontSize: 'clamp(1.75rem, 8vw, 2.5rem)',
                  fontWeight: 400,
                  color: '#ffffff',
                  margin: 0,
                  lineHeight: 1.2,
                  textShadow: `0 0 40px ${SLIDE_COLORS[0]}80`
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Des jeux pour animer vos soirées
              </motion.h1>

              <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0' }}>
                {GAME_IMAGES.map((game, i) => (
                  <motion.div
                    key={i}
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: `0 4px 20px ${game.color}40`,
                      border: `2px solid ${game.color}60`,
                    }}
                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <img
                      src={game.src}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      draggable={false}
                    />
                  </motion.div>
                ))}
              </div>

              <motion.p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1rem',
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: 0,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Quiz, Blind Test, Alibi et plus encore...
              </motion.p>
            </div>

            {/* SLIDE 1: Auth */}
            <div style={{
              width: '50%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              textAlign: 'center',
              gap: '1.5rem',
              boxSizing: 'border-box',
            }}>
              <Mascot emotion="ready" size={160} />

              <h1 style={{
                fontFamily: "'Bungee', cursive",
                fontSize: 'clamp(2rem, 10vw, 3rem)',
                fontWeight: 400,
                color: '#ffffff',
                margin: 0,
                textShadow: `0 0 30px ${SLIDE_COLORS[1]}80`
              }}>
                Prêt à jouer ?
              </h1>

              <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Google */}
                <motion.button
                  onClick={handleGoogleSignIn}
                  disabled={loadingGoogle || loadingApple || loadingGuest}
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
                    cursor: (loadingGoogle || loadingApple || loadingGuest) ? 'wait' : 'pointer',
                    opacity: (loadingGoogle || loadingApple || loadingGuest) ? 0.7 : 1,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {loadingGoogle ? 'Connexion...' : 'S\'inscrire avec Google'}
                </motion.button>

                {/* Apple - Hidden on Android */}
                {!isAndroid && (
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
                      background: '#000000',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 12,
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: (loadingGoogle || loadingApple || loadingGuest) ? 'wait' : 'pointer',
                      opacity: (loadingGoogle || loadingApple || loadingGuest) ? 0.7 : 1,
                    }}
                    whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {loadingApple ? 'Connexion...' : 'S\'inscrire avec Apple'}
                  </motion.button>
                )}

                {/* Separator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                  margin: '0.25rem 0',
                }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.15)' }} />
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                  }}>ou</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.15)' }} />
                </div>

                {/* Guest */}
                <motion.button
                  onClick={() => setShowGuestWarning(true)}
                  disabled={loadingGoogle || loadingApple || loadingGuest}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.875rem 1.5rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    cursor: (loadingGoogle || loadingApple || loadingGuest) ? 'wait' : 'pointer',
                  }}
                  whileHover={{ borderColor: 'rgba(255, 255, 255, 0.4)', color: 'rgba(255, 255, 255, 0.9)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Jouer sans compte
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom navigation */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.5rem',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}>
          {/* Dots */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            opacity: currentSlide === 0 ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}>
            {[0, 1].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Slide ${index + 1}`}
                style={{
                  width: index === currentSlide ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: index === currentSlide ? SLIDE_COLORS[index] : 'rgba(255, 255, 255, 0.3)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: index === currentSlide ? `0 0 12px ${SLIDE_COLORS[index]}` : 'none',
                }}
              />
            ))}
          </div>

          {/* Next button */}
          <motion.button
            onClick={handleNext}
            style={{
              width: '100%',
              maxWidth: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem 2rem',
              background: `linear-gradient(135deg, ${SLIDE_COLORS[0]}, ${SLIDE_COLORS[0]}cc)`,
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: currentSlide === 0 ? 'pointer' : 'default',
              boxShadow: `0 4px 20px ${SLIDE_COLORS[0]}50`,
              opacity: currentSlide === 0 ? 1 : 0,
              pointerEvents: currentSlide === 0 ? 'auto' : 'none',
              transition: 'opacity 0.3s ease',
            }}
            whileHover={currentSlide === 0 ? { scale: 1.02, y: -2 } : {}}
            whileTap={currentSlide === 0 ? { scale: 0.98 } : {}}
          >
            <span>Suivant</span>
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>

      {/* ========== Guest Warning Modal ========== */}
      <AnimatePresence>
        {showGuestWarning && (
          <>
            <motion.div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                zIndex: 100,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuestWarning(false)}
            />

            <motion.div
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                zIndex: 101,
                pointerEvents: 'none',
              }}
            >
              <motion.div
                style={{
                  width: '100%',
                  maxWidth: 360,
                  background: '#14141e',
                  borderRadius: 20,
                  padding: '2rem 1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'auto',
                  position: 'relative',
                }}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <button
                  onClick={() => setShowGuestWarning(false)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: 8,
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '1.25rem',
                }}>
                  <Mascot emotion="warning" size={110} />

                  <div>
                    <h2 style={{
                      fontFamily: "'Bungee', cursive",
                      fontSize: '1.25rem',
                      color: '#ffffff',
                      margin: '0 0 0.75rem 0',
                    }}>
                      Mode Invité
                    </h2>
                    <p style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      Tu ne pourras pas créer de partie<br />
                      et ta progression sera perdue.
                    </p>
                  </div>

                  <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
                    <p style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: '0 0 0.25rem 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      S'inscrire avec
                    </p>

                    <motion.button
                      onClick={() => { setShowGuestWarning(false); handleGoogleSignIn(); }}
                      disabled={loadingGoogle || loadingApple || loadingGuest}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.625rem',
                        padding: '0.75rem 1rem',
                        background: '#ffffff',
                        color: '#1f1f1f',
                        border: 'none',
                        borderRadius: 10,
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </motion.button>

                    {!isAndroid && (
                      <motion.button
                        onClick={() => { setShowGuestWarning(false); handleAppleSignIn(); }}
                        disabled={loadingGoogle || loadingApple || loadingGuest}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.625rem',
                          padding: '0.75rem 1rem',
                          background: '#000000',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: 10,
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        Apple
                      </motion.button>
                    )}
                  </div>

                  <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />

                  <motion.button
                    onClick={() => { setShowGuestWarning(false); handleGuestMode(); }}
                    disabled={loadingGuest}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.5)',
                      border: 'none',
                      borderRadius: 10,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: loadingGuest ? 'wait' : 'pointer',
                    }}
                    whileHover={{ color: 'rgba(255, 255, 255, 0.8)' }}
                  >
                    {loadingGuest ? 'Connexion...' : 'Continuer quand même'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
