/**
 * Native Audio Player — Bridge vers AVPlayer iOS natif
 *
 * Bypass complet des restrictions WKWebView (pas de geste utilisateur requis).
 * Sur Android/Web, ou si le plugin natif n'est pas encore installé, fallback vers HTML5 Audio.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

// Enregistre le plugin seulement sur iOS natif (évite les erreurs sur Android/web)
const NativeAudioPlayer = isIOSNative ? registerPlugin('NativeAudioPlayer') : null;

// Fallback HTML5 Audio (Android, Web, et iOS si plugin pas encore installé)
let fallbackAudio = null;

async function fallbackPlay(url, startTime, volume) {
  if (fallbackAudio) {
    fallbackAudio.pause();
  }
  fallbackAudio = new Audio(url);
  fallbackAudio.volume = volume;
  fallbackAudio.preload = 'auto';

  await new Promise((resolve, reject) => {
    fallbackAudio.addEventListener('canplay', resolve, { once: true });
    fallbackAudio.addEventListener('error', reject, { once: true });
    setTimeout(() => reject(new Error('Audio load timeout')), 2000);
  });

  fallbackAudio.currentTime = startTime;
  await fallbackAudio.play();
}

/**
 * Joue un audio depuis une URL
 * @param {string} url - URL du preview audio
 * @param {number} startTime - Position de départ en secondes (default: 0)
 * @param {number} volume - Volume 0-1 (default: 0.8)
 */
export async function nativePlay(url, startTime = 0, volume = 0.8) {
  if (isIOSNative) {
    try {
      await NativeAudioPlayer.play({ url, startTime, volume });
      return;
    } catch (e) {
      // Plugin pas encore installé ou erreur → fallback HTML5
    }
  }
  await fallbackPlay(url, startTime, volume);
}

/**
 * Stop et libère le player
 */
export async function nativeStop() {
  if (isIOSNative) {
    try {
      await NativeAudioPlayer.stop({});
      // Stop aussi le fallback au cas où il tournait (transition ancien → nouveau build)
      if (fallbackAudio) {
        fallbackAudio.pause();
        fallbackAudio.currentTime = 0;
        fallbackAudio = null;
      }
      return;
    } catch (e) {}
  }
  if (fallbackAudio) {
    fallbackAudio.pause();
    fallbackAudio.currentTime = 0;
    fallbackAudio = null;
  }
}

/**
 * Pause sans libérer
 */
export async function nativePause() {
  if (isIOSNative) {
    try {
      await NativeAudioPlayer.pause({});
      return;
    } catch (e) {}
  }
  if (fallbackAudio) {
    fallbackAudio.pause();
  }
}

/**
 * Reprend la lecture
 */
export async function nativeResume() {
  if (isIOSNative) {
    try {
      await NativeAudioPlayer.resume({});
      return;
    } catch (e) {}
  }
  if (fallbackAudio) {
    await fallbackAudio.play();
  }
}

/**
 * Change le volume
 * @param {number} volume - Volume 0-1
 */
export async function nativeSetVolume(volume) {
  if (isIOSNative) {
    try {
      await NativeAudioPlayer.setVolume({ volume });
      return;
    } catch (e) {}
  }
  if (fallbackAudio) {
    fallbackAudio.volume = volume;
  }
}

/**
 * Récupère la position actuelle
 * @returns {{ currentTime: number, isPlaying: boolean }}
 */
export async function nativeGetCurrentTime() {
  if (isIOSNative) {
    try {
      return await NativeAudioPlayer.getCurrentTime({});
    } catch (e) {}
  }
  if (fallbackAudio) {
    return {
      currentTime: fallbackAudio.currentTime,
      isPlaying: !fallbackAudio.paused
    };
  }
  return { currentTime: 0, isPlaying: false };
}
