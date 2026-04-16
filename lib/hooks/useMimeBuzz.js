'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDatabase, ref, update, onValue, set, remove, increment, get } from 'firebase/database';
import { getApp } from 'firebase/app';
import { MIME_CONFIG, calculateMimePoints } from '@/lib/config/rooms';

/**
 * useMimeBuzz - Hook pour gérer le système de buzz pour Mime
 *
 * Similaire au Quiz mais:
 * - Le mimeur ne peut pas buzzer
 * - Pénalité de 8s pour mauvaise réponse
 * - Points: +100 devineur, +50 mimeur, -25 mauvaise réponse
 *
 * @param {Object} params
 * @param {string} params.roomCode - Code de la room
 * @param {Object} params.state - State de la room
 * @param {string} params.myUid - UID du joueur actuel
 * @param {boolean} params.isMimer - Si le joueur est le mimeur
 * @param {boolean} params.isHost - Si le joueur est l'hôte
 * @param {number} params.serverOffset - Offset serveur pour synchronisation
 * @returns {Object}
 */
export default function useMimeBuzz({ roomCode, state, myUid, isMimer, isHost, serverOffset = 0 }) {
  const db = getDatabase(getApp());
  const [buzzStatus, setBuzzStatus] = useState('idle'); // idle, pending, locked, blocked
  const [lockedPlayer, setLockedPlayer] = useState(null);
  const [pendingBuzzes, setPendingBuzzes] = useState({});
  const buzzWindowRef = useRef(null);
  const isProcessingRef = useRef(false);

  const BUZZ_WINDOW = MIME_CONFIG.BUZZ_WINDOW_MS;
  const LOCKOUT_MS = MIME_CONFIG.LOCKOUT_MS;

  // Écouter les pendingBuzzes
  useEffect(() => {
    if (!roomCode) return;

    const pendingRef = ref(db, `rooms_mime/${roomCode}/state/pendingBuzzes`);
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      setPendingBuzzes(snapshot.val() || {});
    });

    return () => unsubscribe();
  }, [db, roomCode]);

  // Écouter le lockUid pour savoir qui a buzzé
  useEffect(() => {
    if (!roomCode) return;

    const lockRef = ref(db, `rooms_mime/${roomCode}/state/lockUid`);
    const unsubscribe = onValue(lockRef, async (snapshot) => {
      const lockUid = snapshot.val();
      if (lockUid) {
        // Récupérer les infos du joueur locké
        const playerSnap = await get(ref(db, `rooms_mime/${roomCode}/players/${lockUid}`));
        const player = playerSnap.val();
        setLockedPlayer(player ? { uid: lockUid, name: player.name } : null);

        // Mettre à jour le status
        if (lockUid === myUid) {
          setBuzzStatus('locked');
        } else {
          setBuzzStatus('blocked');
        }
      } else {
        setLockedPlayer(null);
        setBuzzStatus('idle');
      }
    });

    return () => unsubscribe();
  }, [db, roomCode, myUid]);

  // Vérifier si le joueur est bloqué (pénalité)
  const isBlocked = useCallback(() => {
    if (!state?.revealed) return true;
    if (isMimer) return true; // Le mimeur ne peut pas buzzer
    if (state?.lockUid) return true; // Quelqu'un a déjà buzzé

    // Vérifier la pénalité
    const player = state?.players?.[myUid];
    if (player?.blockedUntil && player.blockedUntil > Date.now() + serverOffset) {
      return true;
    }

    return false;
  }, [state, myUid, isMimer]);

  // Buzzer
  const buzz = useCallback(async () => {
    if (!roomCode || !myUid || isBlocked()) return false;

    const adjustedTime = Date.now() + serverOffset;

    try {
      // Écrire dans pendingBuzzes
      await set(ref(db, `rooms_mime/${roomCode}/state/pendingBuzzes/${myUid}`), {
        uid: myUid,
        adjustedTime
      });

      setBuzzStatus('pending');
      return true;
    } catch (error) {
      console.error('Buzz error:', error);
      return false;
    }
  }, [db, roomCode, myUid, serverOffset, isBlocked]);

  // Résoudre les buzzes (appelé par le mimeur/host après la fenêtre de 150ms)
  const resolveBuzzes = useCallback(async () => {
    if (!roomCode || (!isMimer && !isHost)) return null;

    const buzzesSnap = await get(ref(db, `rooms_mime/${roomCode}/state/pendingBuzzes`));
    const buzzes = buzzesSnap.val();

    if (!buzzes || Object.keys(buzzes).length === 0) return null;

    // Trouver le buzz le plus rapide
    let fastestBuzz = null;
    for (const [uid, buzzData] of Object.entries(buzzes)) {
      if (!fastestBuzz || buzzData.adjustedTime < fastestBuzz.adjustedTime) {
        fastestBuzz = { uid, ...buzzData };
      }
    }

    if (!fastestBuzz) return null;

    // Récupérer le nom du joueur
    const playerSnap = await get(ref(db, `rooms_mime/${roomCode}/players/${fastestBuzz.uid}`));
    const player = playerSnap.val();

    // Mettre à jour le state
    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      lockUid: fastestBuzz.uid,
      lockedAt: Date.now(),
      buzzBanner: player?.name || 'Joueur'
    });

    // Supprimer les pendingBuzzes
    await remove(ref(db, `rooms_mime/${roomCode}/state/pendingBuzzes`));

    return { uid: fastestBuzz.uid, name: player?.name };
  }, [db, roomCode, isMimer, isHost]);

  // Valider la réponse (bonne réponse)
  // secondsLeft est passé pour calculer les points dégressifs
  // Le reset du state (lockUid, etc.) est géré par advanceToNextWord après
  // le délai de reveal, pas ici — ça laisse l'UI afficher "X a trouvé !" en flip card verte.
  const validateCorrect = useCallback(async (secondsLeft = 0) => {
    if (isProcessingRef.current || !roomCode || (!isMimer && !isHost)) return;

    const lockUid = state?.lockUid;
    const currentMimeUid = state?.currentMimeUid;

    if (!lockUid) return;

    isProcessingRef.current = true;
    try {
      // Récupérer le nom du gagnant pour l'afficher dans le reveal
      const winnerSnap = await get(ref(db, `rooms_mime/${roomCode}/players/${lockUid}`));
      const winner = winnerSnap.val();

      const { guesserPoints, mimerPoints } = calculateMimePoints(secondsLeft);

      // Incrémenter les scores + écrire correctReveal (garde lockUid pour le visuel)
      const updates = {};
      updates[`players/${lockUid}/score`] = increment(guesserPoints);
      if (currentMimeUid) {
        updates[`players/${currentMimeUid}/score`] = increment(mimerPoints);
      }
      updates['state/correctReveal'] = {
        uid: lockUid,
        name: winner?.name || 'Joueur',
        guesserPoints,
        mimerPoints,
        at: Date.now(),
      };

      await update(ref(db, `rooms_mime/${roomCode}`), updates);

      return { guesserPoints, mimerPoints };
    } finally {
      isProcessingRef.current = false;
    }
  }, [db, roomCode, state?.lockUid, state?.currentMimeUid, isMimer, isHost]);

  // Rejeter la réponse (mauvaise réponse)
  const validateWrong = useCallback(async () => {
    if (isProcessingRef.current || !roomCode || (!isMimer && !isHost)) return;

    const lockUid = state?.lockUid;
    if (!lockUid) return;

    isProcessingRef.current = true;
    try {
      // -25 points et blocage 8s
      // On garde le runTransaction pour respecter le plancher à 0
      const { runTransaction: fbTransaction } = await import('firebase/database');
      await fbTransaction(ref(db, `rooms_mime/${roomCode}/players/${lockUid}/score`), (cur) =>
        Math.max(0, (cur || 0) - MIME_CONFIG.WRONG_ANSWER_PENALTY)
      );

      // Timestamp frais (serverOffset inclus) + reset state en un seul appel
      await update(ref(db, `rooms_mime/${roomCode}`), {
        [`players/${lockUid}/blockedUntil`]: Date.now() + serverOffset + LOCKOUT_MS,
        'state/lockUid': null,
        'state/lockedAt': null,
        'state/buzzBanner': ''
        // Note: pausedAt reste - sera géré par resumeTimer dans useMimeTimer
      });

      return true;
    } finally {
      isProcessingRef.current = false;
    }
  }, [db, roomCode, state?.lockUid, isMimer, isHost, LOCKOUT_MS, serverOffset]);

  // Passer le mot (timeout ou skip)
  const skipWord = useCallback(async () => {
    if (!roomCode || (!isMimer && !isHost)) return;

    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      lockUid: null,
      lockedAt: null,
      buzzBanner: '',
      pausedAt: null
    });

    return true;
  }, [db, roomCode, isMimer, isHost]);

  // Annuler le buzz (buzz accidentel - pas de pénalité)
  const cancelBuzz = useCallback(async () => {
    if (!roomCode || (!isMimer && !isHost)) return;

    const lockUid = state?.lockUid;
    if (!lockUid) return;

    // Juste débloquer sans pénalité
    await update(ref(db, `rooms_mime/${roomCode}/state`), {
      lockUid: null,
      lockedAt: null,
      buzzBanner: ''
      // pausedAt reste - sera géré par resumeTimer
    });

    return true;
  }, [db, roomCode, state?.lockUid, isMimer, isHost]);

  return {
    buzzStatus,
    isBlocked: isBlocked(),
    lockedPlayer,
    pendingBuzzes,
    buzz,
    resolveBuzzes,
    validateCorrect,
    validateWrong,
    skipWord,
    cancelBuzz
  };
}
