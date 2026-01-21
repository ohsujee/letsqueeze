/**
 * Spotify Web Playback SDK Wrapper
 * Gère la lecture audio Spotify dans le navigateur
 */

import { getAccessToken } from './auth';

let player = null;
let deviceId = null;
let isReady = false;
let onReadyCallback = null;
let onStateChangeCallback = null;
let onErrorCallback = null;
let keepAliveInterval = null;

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
  // If player exists and is ready, just reuse it
  if (player && isReady && deviceId) {
    onReady?.(deviceId);
    return deviceId;
  }

  // If player exists but not ready, try to reconnect
  if (player && !isReady) {
    try {
      const success = await player.connect();
      if (success) {
        // Wait for ready event
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Reconnection timeout'));
          }, 10000);

          onReadyCallback = (id) => {
            clearTimeout(timeout);
            onReady?.(id);
            resolve(id);
          };
          onStateChangeCallback = onStateChange;
          onErrorCallback = onError;
        });
      }
    } catch (e) {
      // Reconnect failed, creating new player
    }
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
          // getAccessToken() handles refresh automatically via httpOnly cookie API
          const token = await getAccessToken();
          if (!token) {
            throw new Error('No token available');
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
      deviceId = device_id;
      isReady = true;

      // Start keep-alive to prevent timeout (more aggressive)
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(async () => {
        if (player && isReady) {
          try {
            const state = await player.getCurrentState();
            // If state is null, player might be disconnected
            if (!state) {
              isReady = false;
              await player.connect().catch(() => {});
            }
          } catch (e) {
            isReady = false;
            try {
              await player.connect();
            } catch (reconnectErr) {
              // Reconnect failed silently
            }
          }
        }
      }, 15000); // Ping every 15 seconds

      onReadyCallback?.(device_id);
    });

    player.addListener('not_ready', ({ device_id }) => {
      isReady = false;
      // Try to reconnect automatically
      setTimeout(async () => {
        if (!isReady && player) {
          try {
            await player.connect();
          } catch (e) {
            console.error('[Spotify Player] Auto-reconnect failed:', e);
          }
        }
      }, 1000);
    });

    player.addListener('player_state_changed', (state) => {
      // Notify preload system of state changes
      notifyPreloadStateChange(state);
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
 * Précharge une track silencieusement pour éviter le délai de chargement
 * Stratégie: Lance la lecture à volume 0, pause immédiate, seek à 0
 * @param {string} trackUri - URI Spotify (spotify:track:xxx)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
let preloadAbortController = null;
let currentPreloadSessionId = 0;

export async function preloadTrack(trackUri) {
  const accessToken = await getAccessToken();
  const sessionId = ++currentPreloadSessionId;

  if (!accessToken || !deviceId || !player || !isReady) {
    return { success: false, error: 'Player not ready' };
  }

  // Cancel any previous preload
  if (preloadAbortController) {
    preloadAbortController.abort();
  }
  preloadAbortController = new AbortController();
  const signal = preloadAbortController.signal;

  const isSessionValid = () => sessionId === currentPreloadSessionId && !signal.aborted;

  try {
    // 1. Set volume to 0
    await player.setVolume(0);
    if (!isSessionValid()) return { success: false, error: 'Session cancelled' };

    // 2. Start playing (this loads the track into buffer)
    const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [trackUri],
        position_ms: 0,
      }),
    });

    if (!playResponse.ok && playResponse.status !== 204) {
      return { success: false, error: `HTTP ${playResponse.status}` };
    }

    if (!isSessionValid()) return { success: false, error: 'Session cancelled' };

    // 3. Wait a tiny bit for playback to start (minimum time for buffer to load)
    await new Promise(resolve => setTimeout(resolve, 150));

    if (!isSessionValid()) return { success: false, error: 'Session cancelled' };

    // 4. AGGRESSIVELY pause - multiple attempts

    // Attempt 1: SDK pause
    await player.pause().catch(() => {});

    // Attempt 2: API pause
    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});

    // 5. Wait and verify
    await new Promise(resolve => setTimeout(resolve, 100));

    // 6. Check state and force pause if still playing
    let attempts = 0;
    while (attempts < 5) {
      const state = await player.getCurrentState();
      if (!state || state.paused) {
        break; // Successfully paused
      }

      await player.pause().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    // 7. Seek back to position 0 to ensure we start from beginning
    await player.seek(0).catch(() => {});

    return { success: true };

  } catch (e) {
    if (e.name === 'AbortError') return { success: false, error: 'Aborted' };

    // Force pause on error
    try {
      await player?.pause();
    } catch (_) {}

    return { success: false, error: e.message };
  }
}

// No longer needed - we don't use state change listener for preload
export function notifyPreloadStateChange(state) {
  // Kept for compatibility but unused
}

/**
 * Joue une track spécifique
 * @param {string} trackUri - URI Spotify (spotify:track:xxx)
 * @param {number} positionMs - Position de départ en ms
 */
export async function playTrack(trackUri, positionMs = 0) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('No access token - please reconnect Spotify');
  }

  // If player exists but not ready, try to reconnect
  if (player && (!isReady || !deviceId)) {
    try {
      await player.connect();
      // Wait for ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
        const check = setInterval(() => {
          if (isReady && deviceId) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });
    } catch (e) {
      console.error('[Spotify Player] Reconnection failed:', e);
      throw new Error('Player disconnected - please refresh the page');
    }
  }

  if (!player) {
    throw new Error('Player not initialized - please refresh the page');
  }

  // Restore volume to 1 (in case preload left it at 0)
  await player.setVolume(1);

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
    // If device not found, try to reconnect
    if (response.status === 404) {
      isReady = false;

      // Try to reconnect the player
      try {
        await player.disconnect();
        const success = await player.connect();
        if (success) {
          // Wait for ready event
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
            const checkReady = setInterval(() => {
              if (isReady && deviceId) {
                clearInterval(checkReady);
                clearTimeout(timeout);
                resolve();
              }
            }, 100);
          });

          // Retry the play request
          const retryResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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

          if (retryResponse.ok || retryResponse.status === 204) {
            return; // Success after reconnect
          }
        }
      } catch (reconnectError) {
        console.error('[Spotify Player] Reconnection failed:', reconnectError);
      }

      throw new Error('Device not found - please refresh the page');
    }

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
  let stopped = false;

  if (durationMs) {
    // Wait for playback to actually start before starting the timer
    const waitForPlayback = () => {
      return new Promise((resolve) => {
        let resolved = false;
        const checkState = async () => {
          if (stopped || resolved) {
            return;
          }
          try {
            const state = await player?.getCurrentState();
            if (state && !state.paused && state.position > 0) {
              // Playback has actually started (position > 0)
              resolved = true;
              resolve();
            } else {
              // Check again in 30ms
              setTimeout(checkState, 30);
            }
          } catch (e) {
            setTimeout(checkState, 30);
          }
        };
        checkState();
        // Fallback: start timer after 1500ms max wait
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 1500);
      });
    };

    await waitForPlayback();

    if (!stopped) {
      timeoutId = setTimeout(async () => {
        if (!stopped) {
          await pause();
        }
      }, durationMs);
    }
  }

  return {
    stop: async () => {
      stopped = true;
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
    try {
      const state = await player.getCurrentState();
      // Only pause if there's an active track
      if (state && state.track_window?.current_track) {
        await player.pause();
      }
    } catch (e) {
      // Ignore pause errors when no track is loaded
    }
  }
}

/**
 * Reprend la lecture
 */
export async function resume() {
  if (player) {
    try {
      const state = await player.getCurrentState();
      // Only resume if there's an active track
      if (state && state.track_window?.current_track) {
        await player.resume();
      }
    } catch (e) {
      // Ignore resume errors when no track is loaded
    }
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
