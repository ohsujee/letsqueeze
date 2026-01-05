'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import {
  ChevronLeft, Wifi, WifiOff, Check, Music, Crown,
  AlertTriangle, ExternalLink, X
} from 'lucide-react';
import { startSpotifyAuth, isSpotifyConnected, clearTokens } from '@/lib/spotify/auth';
import { getCurrentUser, isPremiumUser } from '@/lib/spotify/api';

// Spotify Logo SVG
const SpotifyLogo = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export default function SpotifySettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.isAnonymous) {
        router.push('/profile');
      } else {
        setUser(currentUser);
        setLoading(false);
        checkSpotifyConnection();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const checkSpotifyConnection = async () => {
    const connected = await isSpotifyConnected();
    setSpotifyConnected(connected);

    if (connected) {
      try {
        const [userData, premium] = await Promise.all([
          getCurrentUser(),
          isPremiumUser()
        ]);
        setSpotifyUser(userData);
        setIsPremium(premium);
      } catch (err) {
        console.error('Failed to get Spotify user:', err);
        if (err.message.includes('expired') || err.message.includes('Not authenticated')) {
          clearTokens();
          setSpotifyConnected(false);
          setSpotifyUser(null);
        }
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await startSpotifyAuth();
    } catch (err) {
      console.error('Spotify auth error:', err);
      setError('Impossible de se connecter à Spotify');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearTokens();
    setSpotifyConnected(false);
    setSpotifyUser(null);
    setIsPremium(false);
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner spotify" />
      </div>
    );
  }

  return (
    <div className="settings-page spotify">
      {/* Background */}
      <div className="settings-bg" />

      {/* Header */}
      <header className="settings-header">
        <div className="settings-header-inner">
          <button onClick={() => router.push('/profile')} className="settings-back-btn">
            <ChevronLeft size={24} />
          </button>
          <div className="settings-header-title">
            <h1>Spotify</h1>
            <p>Connecte ton compte pour le Blind Test</p>
          </div>
          <div className={`settings-status ${spotifyConnected ? 'connected' : ''}`}>
            {spotifyConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{spotifyConnected ? 'Connecté' : 'Déconnecté'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="settings-main">
        {/* Hero Section */}
        <section className="settings-hero">
          <div className="settings-hero-icon spotify">
            <SpotifyLogo size={40} />
          </div>
          <div className="settings-hero-content">
            <h2>Blind Test Musical</h2>
            <p>Connecte ton compte Spotify pour jouer au Blind Test avec tes playlists.</p>
          </div>
        </section>

        {/* Premium Warning */}
        <div className="settings-warning">
          <Crown size={20} />
          <div className="settings-warning-text">
            <strong>Spotify Premium requis</strong>
            <span>Le Blind Test nécessite un compte Spotify Premium pour lire les musiques.</span>
          </div>
        </div>

        {/* Connection Section */}
        <section className="settings-section">
          {spotifyConnected ? (
            <motion.div
              className="settings-connected-card spotify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="settings-connected-header">
                <div className="settings-connected-icon">
                  <Check size={32} />
                </div>
                <div className="settings-connected-info">
                  <h3>Compte connecté</h3>
                  {spotifyUser && (
                    <p>{spotifyUser.display_name || spotifyUser.id}</p>
                  )}
                </div>
              </div>

              {/* Premium Status */}
              <div className={`settings-premium-status ${isPremium ? 'premium' : 'free'}`}>
                <div className="settings-premium-icon">
                  {isPremium ? <Crown size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="settings-premium-info">
                  <span className="settings-premium-label">
                    {isPremium ? 'Spotify Premium' : 'Spotify Gratuit'}
                  </span>
                  <span className="settings-premium-desc">
                    {isPremium ? 'Tu peux jouer au Blind Test !' : 'Le Blind Test nécessite Premium'}
                  </span>
                </div>
              </div>

              {!isPremium && (
                <a
                  href="https://www.spotify.com/premium/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-btn settings-btn-spotify"
                >
                  <span>Passer à Premium</span>
                  <ExternalLink size={16} />
                </a>
              )}

              <button onClick={handleDisconnect} className="settings-btn settings-btn-danger">
                Déconnecter
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="settings-connect-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="settings-connect-icon spotify">
                <SpotifyLogo size={48} />
              </div>
              <h3>Connecte-toi à Spotify</h3>
              <p>Autorise l'accès à ton compte pour jouer au Blind Test.</p>

              {error && (
                <div className="settings-error">
                  <X size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="settings-btn settings-btn-spotify settings-btn-large"
              >
                {isConnecting ? (
                  <>
                    <div className="btn-spinner" />
                    <span>Connexion...</span>
                  </>
                ) : (
                  <>
                    <SpotifyLogo size={20} />
                    <span>Se connecter avec Spotify</span>
                  </>
                )}
              </button>

              <p className="settings-privacy">
                Nous n'accédons qu'à tes playlists et ne stockons aucune donnée musicale.
              </p>
            </motion.div>
          )}
        </section>

        {/* Features */}
        <section className="settings-features">
          <h3>
            <Music size={20} />
            Fonctionnalités
          </h3>
          <div className="settings-features-list">
            <div className="settings-feature">
              <span className="settings-feature-emoji">🎵</span>
              <div className="settings-feature-text">
                <strong>Tes playlists</strong>
                <span>Joue avec tes propres playlists Spotify</span>
              </div>
            </div>
            <div className="settings-feature">
              <span className="settings-feature-emoji">🔍</span>
              <div className="settings-feature-text">
                <strong>Recherche</strong>
                <span>Trouve n'importe quelle playlist publique</span>
              </div>
            </div>
            <div className="settings-feature">
              <span className="settings-feature-emoji">🎮</span>
              <div className="settings-feature-text">
                <strong>Multi-joueurs</strong>
                <span>Buzzez en temps réel contre vos amis</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
