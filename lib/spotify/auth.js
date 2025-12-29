/**
 * Spotify OAuth Authentication
 * Gère le flow PKCE pour l'authentification Spotify
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

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

  // Stocker pour la vérification au callback
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
 * Échange le code d'autorisation contre des tokens
 * @param {string} code - Code reçu du callback
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>}
 */
export async function exchangeCodeForTokens(code) {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');

  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart authentication.');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  const tokens = await response.json();

  // Nettoyer le storage
  sessionStorage.removeItem('spotify_code_verifier');
  sessionStorage.removeItem('spotify_auth_state');

  // Stocker les tokens
  saveTokens(tokens);

  return tokens;
}

/**
 * Rafraîchit l'access token avec le refresh token
 * @returns {Promise<{access_token: string, expires_in: number}>}
 */
export async function refreshAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Si le refresh échoue, on déconnecte
    clearTokens();
    throw new Error('Failed to refresh token. Please reconnect.');
  }

  const tokens = await response.json();

  // Mettre à jour les tokens
  saveTokens({
    ...tokens,
    refresh_token: tokens.refresh_token || refreshToken,
  });

  return tokens;
}

/**
 * Sauvegarde les tokens dans le localStorage
 */
function saveTokens(tokens) {
  const expiresAt = Date.now() + (tokens.expires_in * 1000);

  localStorage.setItem('spotify_access_token', tokens.access_token);
  localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

  if (tokens.refresh_token) {
    localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
  }
}

/**
 * Récupère l'access token (rafraîchit si nécessaire)
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const accessToken = localStorage.getItem('spotify_access_token');
  const expiresAt = parseInt(localStorage.getItem('spotify_token_expires_at') || '0');

  if (!accessToken) {
    return null;
  }

  // Si le token expire dans moins de 5 minutes, le rafraîchir
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    try {
      const newTokens = await refreshAccessToken();
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return accessToken;
}

/**
 * Récupère le refresh token
 */
function getRefreshToken() {
  return localStorage.getItem('spotify_refresh_token');
}

/**
 * Vérifie si l'utilisateur est connecté à Spotify
 */
export function isSpotifyConnected() {
  return !!localStorage.getItem('spotify_access_token');
}

/**
 * Déconnecte l'utilisateur de Spotify
 */
export function clearTokens() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
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
  refreshAccessToken,
  getAccessToken,
  isSpotifyConnected,
  clearTokens,
  verifyState,
};
