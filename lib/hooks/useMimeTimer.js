'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDatabase, ref, update, serverTimestamp } from 'firebase/database';
import { getApp } from 'firebase/app';
import { MIME_CONFIG } from '@/lib/config/rooms';

/**
 * useMimeTimer - Hook pour gérer le timer de 30 secondes par mot
 *
 * Le timer:
 * - Démarre quand le mimeur révèle le mot (revealedAt)
 * - Se pause quand quelqu'un buzze (pausedAt)
 * - S'accumule si pause/reprise (elapsedAcc)
 * - Expire après 30 secondes → passer au mot suivant
 *
 * @param {Object} params
 * @param {string} params.roomCode - Code de la room
 * @param {Object} params.state - State de la room
 * @param {boolean} params.isHost - Si l'utilisateur est l'hôte
 * @param {boolean} params.isMimer - Si l'utilisateur est le mimeur actuel
 * @param {Function} params.onTimeUp - Callback quand le temps est écoulé
 * @returns {Object}
 */
export default function useMimeTimer({ roomCode, state, isHost, isMimer, onTimeUp }) {
  const db = getDatabase(getApp());
  const [timeLeft, setTimeLeft] = useState(MIME_CONFIG.TIMER_DURATION_MS);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const hasTriggeredTimeUp = useRef(false);

  const DURATION = MIME_CONFIG.TIMER_DURATION_MS;

  // Calculer le temps restant basé sur l'état Firebase
  const calculateTimeLeft = useCallback(() => {
    if (!state?.revealedAt) {
      return DURATION;
    }

    const now = Date.now();
    const revealedAt = state.revealedAt;
    const pausedAt = state.pausedAt || null;
    const elapsedAcc = state.elapsedAcc || 0;

    let elapsed;
    if (pausedAt) {
      // Timer en pause - utiliser le temps accumulé jusqu'à la pause
      elapsed = elapsedAcc + (pausedAt - revealedAt);
    } else {
      // Timer actif
      elapsed = elapsedAcc + (now - revealedAt);
    }

    const remaining = Math.max(0, DURATION - elapsed);
    return remaining;
  }, [state?.revealedAt, state?.pausedAt, state?.elapsedAcc, DURATION]);

  // Mettre à jour le timer toutes les 100ms
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset time up flag when word changes
    hasTriggeredTimeUp.current = false;

    // Si pas de revealedAt ou en pause, pas de timer actif
    if (!state?.revealedAt || state?.pausedAt) {
      setTimeLeft(calculateTimeLeft());
      setIsRunning(false);
      return;
    }

    setIsRunning(true);

    // Update immédiat
    setTimeLeft(calculateTimeLeft());

    // Interval pour mise à jour continue
    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      // Temps écoulé
      if (remaining <= 0 && !hasTriggeredTimeUp.current) {
        hasTriggeredTimeUp.current = true;
        if ((isHost || isMimer) && onTimeUp) {
          onTimeUp();
        }
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state?.revealedAt, state?.pausedAt, state?.currentIndex, calculateTimeLeft, isHost, isMimer, onTimeUp]);

  // Révéler le mot (le mimeur voit le mot, mais timer pas encore démarré)
  const revealWord = useCallback(async () => {
    if (!roomCode) return;

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      revealed: true,
      // Ne pas mettre revealedAt ici - le timer ne démarre pas encore
    });
  }, [db, roomCode]);

  // Démarrer le mime (le mimeur clique "Je commence", timer démarre pour tous)
  const startMiming = useCallback(async () => {
    if (!roomCode) return;

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      revealedAt: Date.now(),
      pausedAt: null,
      elapsedAcc: 0
    });
  }, [db, roomCode]);

  // Mettre en pause le timer (quand quelqu'un buzze)
  const pauseTimer = useCallback(async () => {
    if (!roomCode || !state?.revealedAt || state?.pausedAt) return;

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      pausedAt: Date.now()
    });
  }, [db, roomCode, state?.revealedAt, state?.pausedAt]);

  // Reprendre le timer (après validation buzz)
  const resumeTimer = useCallback(async () => {
    if (!roomCode || !state?.pausedAt) return;

    // Calculer le temps déjà écoulé et le stocker dans elapsedAcc
    const revealedAt = state.revealedAt;
    const pausedAt = state.pausedAt;
    const previousElapsedAcc = state.elapsedAcc || 0;
    const newElapsedAcc = previousElapsedAcc + (pausedAt - revealedAt);

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      revealedAt: Date.now(),
      pausedAt: null,
      elapsedAcc: newElapsedAcc
    });
  }, [db, roomCode, state?.revealedAt, state?.pausedAt, state?.elapsedAcc]);

  // Réinitialiser le timer (nouveau mot)
  const resetTimer = useCallback(async () => {
    if (!roomCode) return;

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      revealed: false,
      revealedAt: null,
      pausedAt: null,
      elapsedAcc: 0
    });
  }, [db, roomCode]);

  // Pourcentage restant (pour la barre de progression)
  const percentLeft = (timeLeft / DURATION) * 100;

  // Secondes restantes (pour affichage)
  const secondsLeft = Math.ceil(timeLeft / 1000);

  return {
    timeLeft,
    secondsLeft,
    percentLeft,
    isRunning,
    isPaused: !!state?.pausedAt,
    isRevealed: !!state?.revealed,
    isMimingStarted: !!state?.revealedAt, // Timer a démarré
    revealWord,
    startMiming,
    pauseTimer,
    resumeTimer,
    resetTimer
  };
}
