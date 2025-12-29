/**
 * Spotify Web Playback SDK Wrapper
 * Gère la lecture audio Spotify dans le navigateur
 */

import { getAccessToken, refreshAccessToken } from './auth';

let player = null;
let deviceId = null;
let isReady = false;
let onReadyCallback = null;
let onStateChangeCallback = null;
let onErrorCallback = null;

/**
 * Charge le SDK Spotify (script externe)
 */
function loadSpotifySDK() {
  return new Promise((resolve, reject) => {
    // Si déjà chargé
    if (window.Spotify) {
      resolve(window.Spotify);
      return;
    }

    // Callback appelé quand le SDK est prêt
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve(window.Spotify);
    };

    // Charger le script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Initialise le player Spotify
 * @param {Object} options
 * @param {Function} options.onReady - Callback quand le player est prêt
 * @param {Function} options.onStateChange - Callback quand l'état change
 * @param {Function} options.onError - Callback en cas d'erreur
 */
export async function initializePlayer({ onReady, onStateChange, onError } = {}) {
  if (player && isReady) {
    onReady?.(deviceId);
    return deviceId;
  }

  onReadyCallback = onReady;
  onStateChangeCallback = onStateChange;
  onErrorCallback = onError;

  try {
    const Spotify = await loadSpotifySDK();

    player = new Spotify.Player({
      name: 'LetsQueeze Blind Test',
      getOAuthToken: async (callback) => {
        try {
          let token = await getAccessToken();
          if (!token) {
            const refreshed = await refreshAccessToken();
            token = refreshed.access_token;
          }
          callback(token);
        } catch (error) {
          console.error('Failed to get token for player:', error);
          onErrorCallback?.({ message: 'Authentication failed' });
        }
      },
      volume: 0.5,
    });

    // Event listeners
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with device ID:', device_id);
      deviceId = device_id;
      isReady = true;
      onReadyCallback?.(device_id);
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device has gone offline:', device_id);
      isReady = false;
    });

    player.addListener('player_state_changed', (state) => {
      onStateChangeCallback?.(state);
    });

    player.addListener('initialization_error', ({ message }) => {
      console.error('Initialization error:', message);
      onErrorCallback?.({ type: 'initialization', message });
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Authentication error:', message);
      onErrorCallback?.({ type: 'authentication', message });
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Account error (Premium required):', message);
      onErrorCallback?.({ type: 'account', message: 'Spotify Premium required' });
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
      onErrorCallback?.({ type: 'playback', message });
    });

    // Connecter le player
    const success = await player.connect();

    if (!success) {
      throw new Error('Failed to connect Spotify Player');
    }

    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (isReady && deviceId) {
          clearInterval(checkReady);
          resolve(deviceId);
        }
      }, 100);

      // Timeout après 10 secondes
      setTimeout(() => {
        clearInterval(checkReady);
        if (!isReady) {
          onErrorCallback?.({ type: 'timeout', message: 'Player connection timeout' });
        }
      }, 10000);
    });
  } catch (error) {
    console.error('Failed to initialize Spotify player:', error);
    onErrorCallback?.({ type: 'init', message: error.message });
    throw error;
  }
}

/**
 * Joue une track spécifique
 * @param {string} trackUri - URI Spotify (spotify:track:xxx)
 * @param {number} positionMs - Position de départ en ms
 */
export async function playTrack(trackUri, positionMs = 0) {
  const accessToken = await getAccessToken();

  if (!accessToken || !deviceId) {
    throw new Error('Player not ready');
  }

  const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: [trackUri],
      position_ms: positionMs,
    }),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to play track');
  }
}

/**
 * Joue un extrait d'une durée spécifique
 * @param {string} trackUri - URI Spotify
 * @param {number} durationMs - Durée de l'extrait en ms (null = pas de limite)
 * @param {number} startPositionMs - Position de départ
 * @returns {Promise<{stop: Function}>} - Fonction pour arrêter avant la fin
 */
export async function playSnippet(trackUri, durationMs = null, startPositionMs = 0) {
  await playTrack(trackUri, startPositionMs);

  let timeoutId = null;

  if (durationMs) {
    timeoutId = setTimeout(async () => {
      await pause();
    }, durationMs);
  }

  return {
    stop: async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      await pause();
    },
  };
}

/**
 * Met en pause la lecture
 */
export async function pause() {
  if (player) {
    await player.pause();
  }
}

/**
 * Reprend la lecture
 */
export async function resume() {
  if (player) {
    await player.resume();
  }
}

/**
 * Bascule play/pause
 */
export async function togglePlay() {
  if (player) {
    await player.togglePlay();
  }
}

/**
 * Déplace la lecture à une position
 * @param {number} positionMs
 */
export async function seek(positionMs) {
  if (player) {
    await player.seek(positionMs);
  }
}

/**
 * Définit le volume
 * @param {number} volume - Entre 0 et 1
 */
export async function setVolume(volume) {
  if (player) {
    await player.setVolume(Math.max(0, Math.min(1, volume)));
  }
}

/**
 * Récupère le volume actuel
 * @returns {Promise<number>}
 */
export async function getVolume() {
  if (player) {
    return player.getVolume();
  }
  return 0.5;
}

/**
 * Récupère l'état actuel du player
 * @returns {Promise<Object|null>}
 */
export async function getPlayerState() {
  if (player) {
    return player.getCurrentState();
  }
  return null;
}

/**
 * Vérifie si le player est prêt
 */
export function isPlayerReady() {
  return isReady && !!deviceId;
}

/**
 * Récupère le device ID
 */
export function getDeviceId() {
  return deviceId;
}

/**
 * Déconnecte le player
 */
export function disconnect() {
  if (player) {
    player.disconnect();
    player = null;
    deviceId = null;
    isReady = false;
  }
}

export default {
  initializePlayer,
  playTrack,
  playSnippet,
  pause,
  resume,
  togglePlay,
  seek,
  setVolume,
  getVolume,
  getPlayerState,
  isPlayerReady,
  getDeviceId,
  disconnect,
};
