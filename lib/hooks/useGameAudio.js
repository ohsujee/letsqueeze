"use client";
import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook pour gérer l'audio du jeu avec cache et préchargement
 * @returns {Object} { play, playSequence, playMusic, stopMusic }
 */
export function useGameAudio() {
  const audioCache = useRef(new Map());
  const musicRef = useRef(null);

  // Précharger les sons
  useEffect(() => {
    const sounds = [
      'ui/button-click',
      'ui/button-hover',
      'ui/swoosh-in',
      'ui/swoosh-out',
      'game/reveal-dramatic',
      'game/buzz-alert',
      'game/buzz-anticipated',
      'game/correct-fanfare',
      'game/wrong-buzzer',
      'game/timer-warning',
      'victory/podium-1st',
      'victory/podium-2nd',
      'victory/podium-3rd',
      'ambiance/applause'
    ];

    sounds.forEach(sound => {
      try {
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.preload = 'auto';
        audioCache.current.set(sound, audio);
      } catch (e) {
        console.warn(`Could not preload sound: ${sound}`);
      }
    });

    return () => {
      // Cleanup
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioCache.current.clear();
    };
  }, []);

  const play = useCallback((soundName, options = {}) => {
    const {
      volume = 1,
      playbackRate = 1,
      loop = false,
      delay = 0
    } = options;

    setTimeout(() => {
      const audio = audioCache.current.get(soundName);
      if (audio) {
        audio.volume = volume;
        audio.playbackRate = playbackRate;
        audio.loop = loop;
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Audio play failed - autoplay blocked
        });
      }
    }, delay);
  }, []);

  const playSequence = useCallback((sequence) => {
    // sequence = [{ sound: 'name', delay: 0, volume: 1 }, ...]
    sequence.forEach(({ sound, delay = 0, volume = 1 }) => {
      setTimeout(() => play(sound, { volume }), delay);
    });
  }, [play]);

  const playMusic = useCallback((musicName, volume = 0.3) => {
    try {
      if (musicRef.current) {
        musicRef.current.pause();
      }

      const music = new Audio(`/sounds/ambiance/${musicName}.mp3`);
      music.volume = volume;
      music.loop = true;
      music.play().catch(() => {
        // Music play failed - autoplay blocked
      });
      musicRef.current = music;
    } catch (e) {
      console.warn('Could not play music:', musicName);
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }
  }, []);

  return { play, playSequence, playMusic, stopMusic };
}

export default useGameAudio;
