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

    // Normaliser mimeRotation : Firebase peut retourner un objet {0: uid, 1: uid} au lieu d'un array
    const rawRotation = state.mimeRotation;
    const mimeRotation = Array.isArray(rawRotation)
      ? rawRotation
      : Object.values(rawRotation || {});

    if (mimeRotation.length === 0) return;

    // Calculer le prochain index
    const nextIndex = currentIndex + 1;

    // Vérifier si la partie est terminée
    if (nextIndex >= totalWords) {
      await update(ref(db, `rooms_mime/${roomCode}/state`), {
        phase: 'ended',
        revealed: false,
        lockUid: null,
        buzzBanner: '',
        pausedAt: null,
        correctReveal: null,
      });
      return;
    }

    // Calculer le prochain mimeur en sautant les joueurs qui ont quitté
    // (identique au pattern useAskerRotation)
    let nextMimeIndex = nextIndex % mimeRotation.length;
    let nextMimeUid = mimeRotation[nextMimeIndex];

    // Joueurs encore présents (pas 'left') — les déconnectés restent dans la rotation
    const presentPlayers = players.filter(p => p.status !== 'left');

    if (presentPlayers.length > 0) {
      let attempts = 0;
      while (!presentPlayers.find(p => p.uid === nextMimeUid) && attempts < mimeRotation.length) {
        nextMimeIndex = (nextMimeIndex + 1) % mimeRotation.length;
        nextMimeUid = mimeRotation[nextMimeIndex];
        attempts++;
      }

      // Si aucun joueur valide trouvé, garder le premier disponible
      if (!presentPlayers.find(p => p.uid === nextMimeUid)) {
        nextMimeUid = presentPlayers[0]?.uid || nextMimeUid;
      }
    }

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
      pendingBuzzes: null,
      correctReveal: null,
      transitionToUid: null,
    });
  }, [db, roomCode, state, players]);

  // Annonce le prochain mimeur AVANT le swap effectif
  // → écrit transitionToUid, tous les clients affichent la transition
  // → caller doit ensuite attendre puis appeler advanceToNextWord (qui clear transitionToUid)
  const announceNextMimer = useCallback(async () => {
    if (!roomCode || !state) return null;

    const currentIndex = state.currentIndex || 0;
    const totalWords = state.totalWords || 0;

    const rawRotation = state.mimeRotation;
    const mimeRotation = Array.isArray(rawRotation)
      ? rawRotation
      : Object.values(rawRotation || {});

    if (mimeRotation.length === 0) return null;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalWords) return null; // Fin de partie — pas de transition

    let nextMimeIndex = nextIndex % mimeRotation.length;
    let nextMimeUid = mimeRotation[nextMimeIndex];
    const presentPlayers = players.filter(p => p.status !== 'left');

    if (presentPlayers.length > 0) {
      let attempts = 0;
      while (!presentPlayers.find(p => p.uid === nextMimeUid) && attempts < mimeRotation.length) {
        nextMimeIndex = (nextMimeIndex + 1) % mimeRotation.length;
        nextMimeUid = mimeRotation[nextMimeIndex];
        attempts++;
      }
      if (!presentPlayers.find(p => p.uid === nextMimeUid)) {
        nextMimeUid = presentPlayers[0]?.uid || nextMimeUid;
      }
    }

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      transitionToUid: nextMimeUid,
    });
    return nextMimeUid;
  }, [db, roomCode, state, players]);

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
    announceNextMimer,
    initializeRotation,
    mimeRotation: state?.mimeRotation || [],
    mimeIndex: state?.mimeIndex || 0,
    currentIndex: state?.currentIndex || 0,
    totalWords: state?.totalWords || 0,
    wordsPerPlayer: state?.wordsPerPlayer || 0
  };
}
