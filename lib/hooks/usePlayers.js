'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '@/lib/firebase';

/**
 * Hook centralisé pour la gestion des joueurs dans tous les jeux
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', 'rooms_alibi')
 * @param {Object} options.sort - Options de tri { by: 'score' | 'joinedAt', order: 'asc' | 'desc' }
 *
 * @returns {Object} {
 *   players: Array - Liste des joueurs valides avec uid
 *   me: Object|null - Le joueur actuel
 *   activePlayers: Array - Joueurs avec status 'active' uniquement
 *   playersMap: Object - Objet brut Firebase (pour cas spéciaux)
 *   isLoading: boolean - Chargement initial
 * }
 */
export function usePlayers({ roomCode, roomPrefix = 'rooms', sort = null }) {
  const [playersMap, setPlayersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Écoute Firebase + reconnexion automatique sur perte de connexion
  useEffect(() => {
    if (!roomCode) {
      setPlayersMap({});
      setIsLoading(false);
      return;
    }

    const code = String(roomCode).toUpperCase();
    const playersRef = ref(db, `${roomPrefix}/${code}/players`);
    const connectedRef = ref(db, '.info/connected');

    // Listener principal sur les joueurs
    const unsubPlayers = onValue(playersRef, (snap) => {
      const raw = snap.val() || {};
      setPlayersMap(raw);
      setIsLoading(false);
    });

    // Listener sur l'état de connexion pour détecter les reconnexions
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Reconnecté - Firebase va automatiquement resynchroniser
        console.log('[usePlayers] Firebase reconnecté');
      }
    });

    return () => {
      unsubPlayers();
      unsubConnected();
    };
  }, [roomCode, roomPrefix]);

  // Transformation et filtrage des joueurs
  const { players, me, activePlayers } = useMemo(() => {
    const currentUid = auth.currentUser?.uid;

    // Convertir en tableau avec uid et filtrer les invalides
    let playersList = Object.entries(playersMap)
      .map(([uid, data]) => ({ uid, ...data }))
      .filter(p => p && p.name); // Filtrer les joueurs sans nom (fantômes)

    // Tri si demandé
    if (sort?.by) {
      const order = sort.order === 'asc' ? 1 : -1;
      playersList = playersList.sort((a, b) => {
        const aVal = a[sort.by] ?? 0;
        const bVal = b[sort.by] ?? 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (bVal - aVal) * order;
        }
        return 0;
      });
    }

    // Trouver le joueur actuel
    const currentPlayer = playersList.find(p => p.uid === currentUid) || null;

    // Filtrer les joueurs actifs uniquement
    const active = playersList.filter(p => p.status === 'active' || !p.status);

    return {
      players: playersList,
      me: currentPlayer,
      activePlayers: active,
    };
  }, [playersMap]);

  return {
    players,
    me,
    activePlayers,
    playersMap,
    isLoading,
  };
}

/**
 * Hook simplifié pour obtenir uniquement le joueur actuel
 * Utile pour les pages où on n'a besoin que de ses propres données
 *
 * @param {Object} options
 * @param {string} options.roomCode
 * @param {string} options.roomPrefix
 */
export function useCurrentPlayer({ roomCode, roomPrefix = 'rooms' }) {
  const [player, setPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!roomCode || !currentUid) {
      setPlayer(null);
      setIsLoading(false);
      return;
    }

    const code = String(roomCode).toUpperCase();
    const playerRef = ref(db, `${roomPrefix}/${code}/players/${currentUid}`);

    const unsub = onValue(playerRef, (snap) => {
      const data = snap.val();
      if (data && data.name) {
        setPlayer({ uid: currentUid, ...data });
      } else {
        setPlayer(null);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [roomCode, roomPrefix]);

  return { player, isLoading };
}

export default usePlayers;
