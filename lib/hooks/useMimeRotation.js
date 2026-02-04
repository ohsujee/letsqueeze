'use client';

import { useMemo, useCallback } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import { getApp } from 'firebase/app';

/**
 * useMimeRotation - Hook pour gérer la rotation des mimeurs
 *
 * Différent de useAskerRotation car:
 * - Pas de Party Mode (tous les joueurs jouent toujours)
 * - Rotation basée sur mimeIndex et mimeRotation
 * - Le mimeur actuel ne peut pas buzzer
 *
 * @param {Object} params
 * @param {string} params.roomCode - Code de la room
 * @param {Object} params.meta - Metadata de la room
 * @param {Object} params.state - State de la room
 * @param {Array} params.players - Liste des joueurs actifs
 * @returns {Object}
 */
export default function useMimeRotation({ roomCode, meta, state, players }) {
  const db = getDatabase(getApp());

  // Joueur qui mime actuellement
  const currentMimeUid = state?.currentMimeUid || null;

  // Infos du mimeur actuel
  const currentMimer = useMemo(() => {
    if (!currentMimeUid || !players) return null;
    const player = players.find(p => p.uid === currentMimeUid);
    if (!player) return null;
    return {
      uid: player.uid,
      name: player.name
    };
  }, [currentMimeUid, players]);

  // Vérifie si un joueur est le mimeur actuel
  const isCurrentMimer = useCallback((uid) => {
    return uid === currentMimeUid;
  }, [currentMimeUid]);

  // Vérifie si un joueur peut buzzer (pas le mimeur)
  const canBuzz = useCallback((uid) => {
    // Le mimeur ne peut pas buzzer
    if (uid === currentMimeUid) return false;
    // Vérifier que le mot est révélé
    if (!state?.revealed) return false;
    // Vérifier la phase
    if (state?.phase !== 'playing') return false;
    return true;
  }, [currentMimeUid, state?.revealed, state?.phase]);

  // Avancer au prochain mot (et potentiellement prochain mimeur)
  const advanceToNextWord = useCallback(async () => {
    if (!roomCode || !state) return;

    const currentIndex = state.currentIndex || 0;
    const totalWords = state.totalWords || 0;
    const mimeRotation = state.mimeRotation || [];
    const wordsPerPlayer = state.wordsPerPlayer || 1;

    // Calculer le prochain index
    const nextIndex = currentIndex + 1;

    // Vérifier si la partie est terminée
    if (nextIndex >= totalWords) {
      // Fin de partie
      await update(ref(db, `rooms_mime/${roomCode}/state`), {
        phase: 'ended',
        revealed: false,
        lockUid: null,
        buzzBanner: '',
        pausedAt: null
      });
      return;
    }

    // Calculer le prochain mimeur
    // mimeIndex = currentIndex % mimeRotation.length (chaque joueur mime à tour de rôle)
    const nextMimeIndex = nextIndex % mimeRotation.length;
    const nextMimeUid = mimeRotation[nextMimeIndex] || mimeRotation[0];

    // Mettre à jour le state
    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      currentIndex: nextIndex,
      mimeIndex: nextMimeIndex,
      currentMimeUid: nextMimeUid,
      revealed: false,
      revealedAt: null,
      pausedAt: null,
      elapsedAcc: 0,
      lockUid: null,
      lockedAt: null,
      buzzBanner: '',
      pendingBuzzes: null
    });
  }, [db, roomCode, state]);

  // Initialiser la rotation au démarrage du jeu
  const initializeRotation = useCallback(async (activePlayers, totalWords, wordsPerPlayer) => {
    if (!roomCode || !activePlayers?.length) return;

    // Créer la rotation (ordre aléatoire des joueurs)
    const shuffled = [...activePlayers]
      .sort(() => Math.random() - 0.5)
      .map(p => p.uid);

    const firstMimeUid = shuffled[0];

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      phase: 'playing',
      mimeRotation: shuffled,
      mimeIndex: 0,
      currentMimeUid: firstMimeUid,
      currentIndex: 0,
      totalWords,
      wordsPerPlayer,
      revealed: false,
      revealedAt: null,
      pausedAt: null,
      elapsedAcc: 0,
      lockUid: null,
      lockedAt: null,
      buzzBanner: ''
    });

    return shuffled;
  }, [db, roomCode]);

  return {
    currentMimeUid,
    currentMimer,
    isCurrentMimer,
    canBuzz,
    advanceToNextWord,
    initializeRotation,
    mimeRotation: state?.mimeRotation || [],
    mimeIndex: state?.mimeIndex || 0,
    currentIndex: state?.currentIndex || 0,
    totalWords: state?.totalWords || 0,
    wordsPerPlayer: state?.wordsPerPlayer || 0
  };
}
