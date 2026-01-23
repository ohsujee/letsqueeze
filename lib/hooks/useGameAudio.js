"use client";
import { useRef, useCallback, useEffect } from 'react';

/**
 * Sound mapping - maps logical sound names to actual files
 * This allows components to use semantic names while we handle the actual file paths
 */
const SOUND_MAP = {
  // Game sounds
  'buzz': '/sounds/quiz-buzzer.wav',
  'buzzer': '/sounds/quiz-buzzer.wav',
  'correct': '/sounds/correct.wav',
  'wrong': '/sounds/wrong.wav',
  'reveal': '/sounds/reveal.mp3',
  'end': '/sounds/end.wav',
  'podium': '/sounds/quiz-podium-time.mp3',
  // Quiz specific
  'quiz-buzzer': '/sounds/quiz-buzzer.wav',
  'quiz-correct': '/sounds/quiz-good-answer.wav',
  'quiz-wrong': '/sounds/quiz-bad-answer.wav',
  // Alibi specific
  'alibi-correct': '/sounds/bonne-reponse-alibi.wav',
  'alibi-wrong': '/sounds/mauvaise-reponse-alibi.wav',
  'alibi-score-low': '/sounds/final-score-bas-alibi.wav',
  'alibi-score-high': '/sounds/final-score-haut-alibi.mp3',
  // Victory / end sounds (used by PodiumPremium)
  'victory/end-celebration': '/sounds/quiz-podium-time.mp3',
  'victory/podium': '/sounds/quiz-podium-time.mp3',
  'ambiance/applause': '/sounds/end.wav',
};

/**
 * Hook pour gérer l'audio du jeu avec cache et préchargement
 * @returns {Object} { play, playSequence, playMusic, stopMusic }
 */
export function useGameAudio() {
  const audioCache = useRef(new Map());
  const musicRef = useRef(null);

  // Précharger les sons disponibles
  useEffect(() => {
    Object.entries(SOUND_MAP).forEach(([name, path]) => {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        // Silently handle load errors (file might not exist)
        audio.addEventListener('error', () => {
          audioCache.current.delete(name);
        });
        audioCache.current.set(name, audio);
      } catch (e) {
        // Ignore preload errors
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

      // Check if it's a mapped sound or a direct path
      const path = SOUND_MAP[musicName] || `/sounds/${musicName}.mp3`;
      const music = new Audio(path);
      music.volume = volume;
      music.loop = true;
      music.play().catch(() => {
        // Music play failed - autoplay blocked or file not found
      });
      musicRef.current = music;
    } catch (e) {
      // Could not play music - silently ignore
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
