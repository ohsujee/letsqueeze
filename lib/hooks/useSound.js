'use client';

import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook pour jouer des sons
 * Précharge le son et retourne une fonction pour le jouer
 *
 * @param {string} url - URL du fichier audio
 * @param {number} volume - Volume (0-1, default: 0.6)
 * @returns {Function} - Fonction pour jouer le son
 */
export function useSound(url, volume = 0.6) {
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

  return useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, []);
}
