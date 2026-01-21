/**
 * useGameTimer - Timer de jeu avec pause
 *
 * Gère un countdown avec pause, reset, et callbacks.
 * Utilisé dans Alibi prep, TrouveRegle, etc.
 *
 * Usage:
 *   const {
 *     timeLeft,
 *     isRunning,
 *     isPaused,
 *     isUrgent,
 *     progress,
 *     formatted,
 *     pause,
 *     resume,
 *     reset,
 *     toggle
 *   } = useGameTimer({
 *     initialTime: 90,
 *     onComplete: () => console.log('Timer done!'),
 *     onTick: (time) => updateFirebase(time),
 *     urgentThreshold: 15,
 *     autoStart: true,
 *     enabled: isHost,
 *   });
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Formate les secondes en MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formate les secondes en format long (Xm Ys)
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimeLong(seconds) {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}

/**
 * @param {Object} options
 * @param {number} options.initialTime - Temps initial en secondes
 * @param {Function} options.onComplete - Callback quand le timer atteint 0
 * @param {Function} options.onTick - Callback à chaque tick (reçoit timeLeft)
 * @param {number} options.urgentThreshold - Seuil pour état urgent (default: 15)
 * @param {boolean} options.autoStart - Démarrer automatiquement (default: true)
 * @param {boolean} options.enabled - Activer le timer (default: true)
 * @param {boolean} options.loop - Recommencer au lieu de s'arrêter (default: false)
 * @returns {Object}
 */
export function useGameTimer(options = {}) {
  const {
    initialTime = 60,
    onComplete,
    onTick,
    urgentThreshold = 15,
    autoStart = true,
    enabled = true,
    loop = false,
  } = options;

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [isComplete, setIsComplete] = useState(false);

  const timerRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Main timer effect
  useEffect(() => {
    // Don't run if disabled or paused
    if (!enabled || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Timer complete
    if (timeLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!isComplete) {
        setIsComplete(true);
        onCompleteRef.current?.();

        if (loop) {
          setTimeLeft(initialTime);
          setIsComplete(false);
        }
      }
      return;
    }

    // Start interval
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        onTickRef.current?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, isPaused, enabled, isComplete, initialTime, loop]);

  // Control functions
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const toggle = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const reset = useCallback((newTime) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(newTime ?? initialTime);
    setIsComplete(false);
    setIsPaused(!autoStart);
  }, [initialTime, autoStart]);

  const start = useCallback(() => {
    setIsPaused(false);
    setIsComplete(false);
  }, []);

  const stop = useCallback(() => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const setTime = useCallback((newTime) => {
    setTimeLeft(newTime);
    setIsComplete(newTime <= 0);
  }, []);

  return {
    // State
    timeLeft,
    isPaused,
    isComplete,
    isRunning: !isPaused && !isComplete && enabled && timeLeft > 0,
    isUrgent: timeLeft <= urgentThreshold && timeLeft > 0,

    // Computed
    progress: Math.max(0, Math.min(100, (timeLeft / initialTime) * 100)),
    formatted: formatTime(timeLeft),
    formattedLong: formatTimeLong(timeLeft),

    // Controls
    pause,
    resume,
    toggle,
    reset,
    start,
    stop,
    setTime,
  };
}

export default useGameTimer;
