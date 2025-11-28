'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour gérer les sons du buzzer
 * Précharge les sons et fournit une fonction playSound
 */
export function useBuzzerAudio() {
  const buzzSoundRef = useRef(null);
  const successSoundRef = useRef(null);
  const errorSoundRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    buzzSoundRef.current = new Audio('/sounds/buzz.mp3');
    successSoundRef.current = new Audio('/sounds/correct.wav');
    errorSoundRef.current = new Audio('/sounds/wrong.wav');

    // Preload
    buzzSoundRef.current.preload = 'auto';
    successSoundRef.current.preload = 'auto';
    errorSoundRef.current.preload = 'auto';
  }, []);

  const playSound = useCallback((type) => {
    try {
      const sound = type === 'buzz' ? buzzSoundRef.current
                  : type === 'success' ? successSoundRef.current
                  : errorSoundRef.current;

      if (sound) {
        sound.currentTime = 0;
        sound.volume = 0.5;
        sound.play().catch(() => {});
      }
    } catch (_e) {
      // Silently fail
    }
  }, []);

  return { playSound };
}
