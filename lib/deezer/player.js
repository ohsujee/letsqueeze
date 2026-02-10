/**
 * Deezer Preview Player
 *
 * Simple HTML5 audio player for Deezer 30-second previews
 * No authentication required - just plays preview URLs
 */

let audioElement = null;
let isReady = false;
let currentPreviewUrl = null;
let onStateChangeCallback = null;
let onErrorCallback = null;
let onEndedCallback = null;
let volume = 0.8;

// Start offset to skip the intro (which often reveals the title)
export const PREVIEW_START_OFFSET_SEC = 5;

/**
 * Initialize the preview player
 * @param {Object} options
 * @param {Function} options.onReady - Callback when player is ready
 * @param {Function} options.onStateChange - Callback when state changes
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onEnded - Callback when track ends
 */
export function initializePlayer({ onReady, onStateChange, onError, onEnded } = {}) {
  // Clean up existing audio element
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement.load();
  }

  // Create new audio element
  audioElement = new Audio();
  audioElement.volume = volume;
  audioElement.preload = 'auto';

  // Store callbacks
  onStateChangeCallback = onStateChange;
  onErrorCallback = onError;
  onEndedCallback = onEnded;

  // Event listeners
  audioElement.addEventListener('play', () => {
    console.log('[Deezer Player] Playing');
    onStateChange?.({ paused: false, position: audioElement.currentTime * 1000 });
  });

  audioElement.addEventListener('pause', () => {
    console.log('[Deezer Player] Paused');
    onStateChange?.({ paused: true, position: audioElement.currentTime * 1000 });
  });

  audioElement.addEventListener('ended', () => {
    console.log('[Deezer Player] Ended');
    onStateChange?.({ paused: true, position: audioElement.duration * 1000, ended: true });
    onEnded?.();
  });

  isReady = true;
  currentPreviewUrl = null;

  console.log('[Deezer Player] Initialized');
  onReady?.();

  return Promise.resolve();
}

/**
 * Load a preview URL and wait for it to be ready
 * @param {string} previewUrl - The Deezer preview URL
 * @returns {Promise<void>}
 */
export function loadPreview(previewUrl) {
  return new Promise((resolve, reject) => {
    if (!audioElement) {
      reject(new Error('Player not initialized'));
      return;
    }

    if (!previewUrl) {
      reject(new Error('No preview URL provided'));
      return;
    }

    console.log('[Deezer Player] Loading:', previewUrl);

    // Remove previous listeners
    const onCanPlay = () => {
      console.log('[Deezer Player] Can play');
      audioElement.removeEventListener('canplay', onCanPlay);
      audioElement.removeEventListener('error', onLoadError);
      resolve();
    };

    const onLoadError = (e) => {
      audioElement.removeEventListener('canplay', onCanPlay);
      audioElement.removeEventListener('error', onLoadError);

      // Get more error details
      const mediaError = audioElement.error;
      const errorCode = mediaError?.code;
      const errorMessage = mediaError?.message || 'Unknown error';

      console.error('[Deezer Player] Load error:', {
        url: previewUrl,
        errorCode,
        errorMessage,
        networkState: audioElement.networkState,
        readyState: audioElement.readyState,
        event: e
      });

      const errorMsg = `Erreur audio (code ${errorCode}): ${errorMessage}`;
      onErrorCallback?.({ message: errorMsg, code: errorCode, url: previewUrl });
      reject(new Error(errorMsg));
    };

    audioElement.addEventListener('canplay', onCanPlay);
    audioElement.addEventListener('error', onLoadError);

    currentPreviewUrl = previewUrl;
    audioElement.src = previewUrl;
    audioElement.load();
  });
}

/**
 * Play the loaded preview (or load and play a new one)
 * @param {string} previewUrl - Optional new preview URL to play
 */
export async function playPreview(previewUrl = null) {
  if (!audioElement) {
    throw new Error('Player not initialized');
  }

  // If new URL, load it first
  if (previewUrl && previewUrl !== currentPreviewUrl) {
    await loadPreview(previewUrl);
  }

  // Now play - start after the offset to avoid spoiling the title
  try {
    audioElement.currentTime = PREVIEW_START_OFFSET_SEC;
    await audioElement.play();
  } catch (e) {
    console.error('[Deezer Player] Play failed:', e);
    throw e;
  }
}

/**
 * Play a snippet with automatic stop after duration
 * @param {string} previewUrl - The preview URL
 * @param {number} durationMs - How long to play (null = full 30s)
 * @returns {Object} - Object with stop() function
 */
export async function playSnippet(previewUrl, durationMs = null) {
  await playPreview(previewUrl);

  let timeoutId = null;
  let stopped = false;

  if (durationMs && durationMs < 30000) {
    timeoutId = setTimeout(() => {
      if (!stopped) {
        pause();
      }
    }, durationMs);
  }

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      pause();
    },
  };
}

/**
 * Pause playback
 */
export function pause() {
  if (audioElement) {
    audioElement.pause();
  }
}

/**
 * Resume playback
 */
export async function resume() {
  if (audioElement && currentPreviewUrl) {
    try {
      await audioElement.play();
    } catch (e) {
      console.error('[Deezer Player] Resume failed:', e);
    }
  }
}

/**
 * Toggle play/pause
 */
export async function togglePlay() {
  if (audioElement) {
    if (audioElement.paused) {
      await resume();
    } else {
      pause();
    }
  }
}

/**
 * Seek to position
 * @param {number} positionMs - Position in milliseconds
 */
export function seek(positionMs) {
  if (audioElement) {
    audioElement.currentTime = positionMs / 1000;
  }
}

/**
 * Set volume
 * @param {number} vol - Volume between 0 and 1
 */
export function setVolume(vol) {
  volume = Math.max(0, Math.min(1, vol));
  if (audioElement) {
    audioElement.volume = volume;
  }
}

/**
 * Get current volume
 * @returns {number}
 */
export function getVolume() {
  return volume;
}

/**
 * Get current player state
 * @returns {Object|null}
 */
export function getPlayerState() {
  if (!audioElement) return null;

  return {
    paused: audioElement.paused,
    position: audioElement.currentTime * 1000,
    duration: audioElement.duration * 1000 || 30000,
    previewUrl: currentPreviewUrl,
  };
}

/**
 * Check if player is ready
 * @returns {boolean}
 */
export function isPlayerReady() {
  return isReady && !!audioElement;
}

/**
 * Disconnect/cleanup the player
 */
export function disconnect() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement.load();
    audioElement = null;
  }
  isReady = false;
  currentPreviewUrl = null;
  onStateChangeCallback = null;
  onErrorCallback = null;
  onEndedCallback = null;
}

/**
 * Preload a preview (for faster playback start)
 * @param {string} previewUrl
 */
export async function preloadPreview(previewUrl) {
  if (!previewUrl) return { success: false, error: 'No URL' };

  try {
    // Use fetch to preload into browser cache
    const response = await fetch(previewUrl, { mode: 'no-cors' });
    console.log('[Deezer Player] Preloaded:', previewUrl);
    return { success: true };
  } catch (e) {
    console.warn('[Deezer Player] Preload failed:', e);
    return { success: false, error: e.message };
  }
}

export default {
  initializePlayer,
  loadPreview,
  playPreview,
  playSnippet,
  pause,
  resume,
  togglePlay,
  seek,
  setVolume,
  getVolume,
  getPlayerState,
  isPlayerReady,
  disconnect,
  preloadPreview,
};
