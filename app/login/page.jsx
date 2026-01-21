'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithApple, signInAnonymously, onAuthStateChanged, auth } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { initializeUserProfile } from '@/lib/userProfile';
import { trackSignup, trackLogin, initAnalytics } from '@/lib/analytics';
import { useToast } from '@/lib/hooks/useToast';
import { motion } from 'framer-motion';
import { AuthButtons } from '@/components/auth';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isPro, isAdmin, adminStatus } = useSubscription(user);

  useEffect(() => {
    // Initialize analytics
    initAnalytics();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Initialize user profile in Firebase
        await initializeUserProfile(currentUser);
        // User is logged in, redirect to home
        router.push('/home');
      } else {
        // No user, show login screen
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithGoogle();

      // Track signup or login
      if (result && result.user) {
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          trackSignup('google', result.user.uid);
          toast.success('Compte créé avec succès !');
        } else {
          trackLogin('google', result.user.uid);
          toast.success('Connexion réussie !');
        }
      }
      // User will be set by onAuthStateChanged
    } catch (err) {
      setError(err.message);
      toast.error('Erreur de connexion : ' + err.message);
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithApple();

      // Track signup or login
      if (result && result.user) {
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          trackSignup('apple', result.user.uid);
          toast.success('Compte créé avec succès !');
        } else {
          trackLogin('apple', result.user.uid);
          toast.success('Connexion réussie !');
        }
      }
      // User will be set by onAuthStateChanged
    } catch (err) {
      // Apple Sign-In not configured yet - show friendly message
      if (err.code === 'auth/operation-not-allowed') {
        setError('Connexion Apple bientôt disponible !');
        toast.info('Connexion Apple bientôt disponible !');
      } else {
        setError(err.message);
        toast.error('Erreur de connexion : ' + err.message);
      }
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInAnonymously(auth);

      // Track anonymous signup
      if (result && result.user) {
        trackSignup('anonymous', result.user.uid);
        toast.success('Connexion anonyme réussie !');
      }
      // User will be set by onAuthStateChanged
    } catch (err) {
      setError(err.message);
      toast.error('Erreur de connexion anonyme : ' + err.message);
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="login-loading">
        <div className="login-loading-content">
          <div className="login-loading-icon">🎮</div>
          <p className="login-loading-text">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <motion.div
        className="login-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Logo/Title */}
        <div className="login-header">
          <h1 className="app-title">Gigglz</h1>
          <p className="app-subtitle">Jeux de Buzzer Multijoueur</p>
        </div>

        {/* Main Card */}
        <div className="login-card">
          {!user ? (
            <>
              <h2 className="card-title">Connexion</h2>

              {error && (
                <div className="error-box">
                  <p className="error-text">{error}</p>
                </div>
              )}

              {/* Auth Buttons */}
              <AuthButtons
                onGoogle={handleGoogleSignIn}
                onApple={handleAppleSignIn}
                onGuest={handleAnonymousSignIn}
                disabled={loading}
              />

              <p className="terms-text">
                En continuant, vous acceptez nos conditions d'utilisation
              </p>
            </>
          ) : (
            <>
              <div className="success-content">
                <div className="success-icon">✅</div>
                <h2 className="success-title">Connecté !</h2>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="user-avatar"
                  />
                )}
                <p className="user-name">{user.displayName || 'Invité'}</p>
                {user.email && <p className="user-email">{user.email}</p>}

                {/* Admin/Pro Badges */}
                {isAdmin && (
                  <div className="badges-container">
                    <div className="badge-admin">{adminStatus}</div>
                    <div className="badge-pro">⭐ PRO</div>
                  </div>
                )}

                {isPro && !isAdmin && (
                  <div className="badges-container">
                    <span className="badge-pro">⭐ PRO</span>
                  </div>
                )}

                {/* User Info for Testing */}
                <div className="user-info-box">
                  <p className="info-title">Info de compte :</p>
                  <p className="info-text">
                    <strong>UID:</strong> {user.uid}
                  </p>
                  {user.email && (
                    <p className="info-text">
                      <strong>Email:</strong> {user.email}
                    </p>
                  )}
                </div>
              </div>

              <button onClick={handleContinue} className="btn-continue">
                Continuer vers l'accueil
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">Quiz Buzzer • Alibi • Buzzer Mode</p>
        </div>
      </motion.div>
    </div>
  );
}
