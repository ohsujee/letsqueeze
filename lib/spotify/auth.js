/**
 * Spotify OAuth Authentication
 * Gère le flow PKCE pour l'authentification Spotify
 *
 * SECURITY: Tokens are stored in httpOnly cookies via /api/spotify/token
 * This prevents XSS attacks from stealing tokens
 */

import { fetchWithTimeout } from '../fetchWithTimeout';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const API_TIMEOUT = 10000; // 10 seconds

// Scopes nécessaires pour le Blind Test
const SCOPES = [
  'streaming',                    // Web Playback SDK
  'user-read-playback-state',     // Lire l'état de lecture
  'user-modify-playback-state',   // Contrôler la lecture
  'user-read-currently-playing',  // Chanson en cours
  'playlist-read-private',        // Playlists privées
  'playlist-read-collaborative',  // Playlists collaboratives
  'user-read-private',            // Infos compte (pour vérifier Premium)
  'user-read-email',              // Email utilisateur
].join(' ');

/**
 * Génère un code verifier aléatoire pour PKCE
 */
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Génère le code challenge à partir du verifier (SHA-256)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Encode en base64 URL-safe
 */
function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Génère un state aléatoire pour la sécurité OAuth
 */
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Démarre le flow d'authentification Spotify
 * Redirige l'utilisateur vers Spotify pour autorisation
 */
export async function startSpotifyAuth() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Spotify credentials not configured');
  }

  // Générer et stocker le code verifier (PKCE)
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Stocker pour la vérification au callback (sessionStorage is OK - short-lived)
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);
  sessionStorage.setItem('spotify_auth_state', state);

  // Construire l'URL d'autorisation
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  // Rediriger vers Spotify
  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre des tokens via API sécurisée
 * Les tokens sont stockés dans des cookies httpOnly côté serveur
 * @param {string} code - Code reçu du callback
 */
export async function exchangeCodeForTokens(code) {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart authentication.');
  }

  // Appeler notre API qui stocke les tokens en httpOnly cookies
  const response = await fetchWithTimeout('/api/spotify/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      codeVerifier,
    }),
  }, API_TIMEOUT);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to exchange code for tokens');
  }

  // Nettoyer le sessionStorage
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_auth_state');

  console.log('[Spotify Auth] Tokens stored securely in httpOnly cookies');

  return { success: true, expiresIn: data.expiresIn };
}

/**
 * Récupère l'access token depuis l'API (rafraîchit si nécessaire)
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  try {
    const response = await fetchWithTimeout('/api/spotify/token', {
      method: 'GET',
      credentials: 'include', // Important: include cookies
    }, API_TIMEOUT);

    const data = await response.json();

    if (!data.connected) {
      console.log('[Spotify Auth] Not connected');
      return null;
    }

    return data.accessToken;
  } catch (error) {
    console.error('[Spotify Auth] Error getting access token:', error);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur est connecté à Spotify
 * @returns {Promise<boolean>}
 */
export async function isSpotifyConnected() {
  try {
    const response = await fetchWithTimeout('/api/spotify/token', {
      method: 'GET',
      credentials: 'include',
    }, API_TIMEOUT);

    const data = await response.json();
    return data.connected === true;
  } catch (error) {
    console.error('[Spotify Auth] Error checking connection:', error);
    return false;
  }
}

/**
 * Déconnecte l'utilisateur de Spotify (supprime les cookies)
 */
export async function clearTokens() {
  try {
    await fetchWithTimeout('/api/spotify/token', {
      method: 'DELETE',
      credentials: 'include',
    }, API_TIMEOUT);
    console.log('[Spotify Auth] Tokens cleared');
  } catch (error) {
    console.error('[Spotify Auth] Error clearing tokens:', error);
  }
}

/**
 * Vérifie le state retourné par Spotify (sécurité CSRF)
 */
export function verifyState(returnedState) {
  const savedState = sessionStorage.getItem('spotify_auth_state');
  return savedState === returnedState;
}

export default {
  startSpotifyAuth,
  exchangeCodeForTokens,
  getAccessToken,
  isSpotifyConnected,
  clearTokens,
  verifyState,
};
