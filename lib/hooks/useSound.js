'use client';

import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook pour jouer des sons
 * @param {string} url - URL du fichier audio
 * @param {Object} options - Options
 * @param {number} options.volume - Volume (0-1), défaut 0.5
 * @returns {Function} Fonction pour jouer le son
 */
export function useSound(url, { volume = 0.6 } = {}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof Audio === 'undefined') return;

    audioRef.current = new Audio(url);
    audioRef.current.preload = 'auto';
    audioRef.current.volume = volume;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [url, volume]);

  const play = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    const playPromise = audioRef.current.play();

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Autoplay bloqué par le navigateur - comportement normal
        console.debug('Audio autoplay prevented:', error.message);
      });
    }
  }, []);

  return play;
}

export default useSound;
