'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInAnonymously, onAuthStateChanged, auth } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { initializeUserProfile } from '@/lib/userProfile';
import { trackSignup, trackLogin, initAnalytics } from '@/lib/analytics';
import { useToast } from '@/lib/hooks/useToast';
import { motion } from 'framer-motion';

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
          <h1 className="app-title">LetsQueeze</h1>
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

              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-google"
              >
                <svg viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </button>

              {/* Divider */}
              <div className="login-divider">
                <div className="divider-line"></div>
                <span className="divider-text">ou</span>
                <div className="divider-line"></div>
              </div>

              {/* Anonymous Sign-In Button */}
              <button
                onClick={handleAnonymousSignIn}
                disabled={loading}
                className="btn-anonymous"
              >
                Continuer en mode invité
              </button>

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
