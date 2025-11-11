'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInAnonymously, onAuthStateChanged, auth } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isPro, isAdmin, adminStatus } = useSubscription(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
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
      await signInWithGoogle();
      // User will be set by onAuthStateChanged
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInAnonymously(auth);
      // User will be set by onAuthStateChanged
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🎮</div>
          <p className="loading-text">Chargement...</p>
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .loading-content {
            text-align: center;
          }
          .loading-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .loading-text {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Logo/Title */}
        <div className="login-header">
          <h1 className="app-title">LetsQueeze</h1>
          <p className="app-subtitle">Jeux de Buzzer Multijoueur</p>
        </div>

        {/* Main Card */}
        <div className="login-card">
          {!user ? (
            <>
              <h2 className="card-title">
                Connexion
              </h2>

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
                <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <div className="divider">
                <div className="divider-line"></div>
                <span className="divider-text">ou</span>
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
                <h2 className="success-title">
                  Connecté !
                </h2>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="user-avatar"
                  />
                )}
                <p className="user-name">
                  {user.displayName || 'Invité'}
                </p>
                {user.email && (
                  <p className="user-email">{user.email}</p>
                )}

                {/* Admin/Pro Badges */}
                {isAdmin && (
                  <div className="badges-container">
                    <div className="badge-admin">
                      {adminStatus}
                    </div>
                    <div className="badge-pro">
                      ⭐ PRO
                    </div>
                  </div>
                )}

                {isPro && !isAdmin && (
                  <div className="badges-container">
                    <span className="badge-pro">
                      ⭐ PRO
                    </span>
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

              <button
                onClick={handleContinue}
                className="btn-continue"
              >
                Continuer vers l'accueil
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">
            Quiz Buzzer • Alibi • Buzzer Mode
          </p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 1rem;
        }

        .login-wrapper {
          max-width: 28rem;
          width: 100%;
        }

        /* Header */
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .app-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .app-subtitle {
          font-size: 1.125rem;
          color: var(--text-secondary);
        }

        /* Card */
        .login-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          padding: 2rem;
          border: 1px solid var(--border-primary);
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1.5rem;
          text-align: center;
        }

        /* Error */
        .error-box {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(234, 67, 53, 0.1);
          border: 3px solid var(--brand-red);
          border-radius: var(--radius-md);
        }

        .error-text {
          color: var(--brand-red);
          font-weight: 500;
          font-size: 0.875rem;
        }

        /* Google Button */
        .btn-google {
          width: 100%;
          margin-bottom: 1rem;
          padding: 1rem 1.5rem;
          background: var(--bg-card);
          border: 3px solid var(--border-primary);
          border-radius: var(--radius-md);
          font-weight: 700;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          box-shadow: var(--shadow-sm);
        }

        .btn-google:hover {
          background: var(--bg-secondary);
          border-color: var(--brand-blue);
        }

        .btn-google:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Divider */
        .divider {
          position: relative;
          margin: 1.5rem 0;
        }

        .divider-line {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
        }

        .divider-line::before {
          content: '';
          width: 100%;
          border-top: 2px solid var(--border-primary);
        }

        .divider-text {
          position: relative;
          display: flex;
          justify-content: center;
          font-size: 0.875rem;
          padding: 0 1rem;
          background: var(--bg-card);
          color: var(--text-secondary);
          font-weight: 500;
          margin: 0 auto;
          width: fit-content;
        }

        /* Anonymous Button */
        .btn-anonymous {
          width: 100%;
          padding: 1rem 1.5rem;
          background: var(--bg-secondary);
          border: 3px solid var(--border-primary);
          border-radius: var(--radius-md);
          font-weight: 700;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-anonymous:hover {
          background: var(--bg-tertiary);
        }

        .btn-anonymous:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Terms */
        .terms-text {
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-tertiary);
          text-align: center;
        }

        /* Success State */
        .success-content {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .success-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .user-avatar {
          width: 5rem;
          height: 5rem;
          border-radius: 50%;
          margin: 0 auto 1rem;
          border: 4px solid var(--brand-blue);
        }

        .user-name {
          font-size: 1.125rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .user-email {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        /* Badges */
        .badges-container {
          margin-top: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
        }

        .badge-admin {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #A855F7, #EC4899);
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .badge-pro {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #FFD700, #FF6D00);
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        /* User Info Box */
        .user-info-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          text-align: left;
        }

        .info-title {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .info-text {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-family: monospace;
          word-break: break-all;
          margin-bottom: 0.25rem;
        }

        /* Continue Button */
        .btn-continue {
          width: 100%;
          padding: 1rem 1.5rem;
          background: var(--brand-blue);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .btn-continue:hover {
          transform: scale(1.05);
        }

        .btn-continue:active {
          transform: scale(0.95);
        }

        /* Footer */
        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
        }

        .footer-text {
          font-size: 0.875rem;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
