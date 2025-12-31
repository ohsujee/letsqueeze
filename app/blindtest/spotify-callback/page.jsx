'use client';

/**
 * Spotify OAuth Callback Page
 * Échange le code contre les tokens et redirige vers le lobby
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCodeForTokens, verifyState } from '@/lib/spotify/auth';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Connexion à Spotify...');
  const [error, setError] = useState(null);

  // Prevent double execution in React 18 StrictMode
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing (React 18 StrictMode)
      if (hasProcessed.current) {
        console.log('[Spotify Callback] Already processed, skipping');
        return;
      }
      hasProcessed.current = true;
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('spotify_error');

      // Vérifier les erreurs
      if (errorParam) {
        setError(getErrorMessage(errorParam));
        return;
      }

      if (!code) {
        setError('Code d\'autorisation manquant');
        return;
      }

      // Vérifier le state (protection CSRF)
      if (state && !verifyState(state)) {
        setError('Session invalide. Veuillez réessayer.');
        return;
      }

      try {
        setStatus('Authentification en cours...');

        // Échanger le code contre les tokens
        await exchangeCodeForTokens(code);

        setStatus('Connexion réussie !');

        // Récupérer le code room stocké avant l'auth
        const pendingRoomCode = sessionStorage.getItem('blindtest_pending_room');
        sessionStorage.removeItem('blindtest_pending_room');

        // Rediriger vers le lobby ou la page de création
        setTimeout(() => {
          if (pendingRoomCode) {
            router.replace(`/blindtest/room/${pendingRoomCode}`);
          } else {
            router.replace('/blindtest');
          }
        }, 1000);

      } catch (err) {
        console.error('Token exchange error:', err);
        setError(err.message || 'Erreur lors de la connexion à Spotify');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'access_denied':
        return 'Vous avez refusé l\'accès à Spotify';
      case 'no_code':
        return 'Code d\'autorisation manquant';
      default:
        return `Erreur Spotify: ${errorCode}`;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Erreur de connexion
            </h1>
            <p className="text-[var(--text-secondary)] mb-6">
              {error}
            </p>
            <button
              onClick={() => router.replace('/blindtest')}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
            >
              Retour
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1DB954] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {status}
            </h1>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
