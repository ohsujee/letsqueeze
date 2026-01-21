/**
 * useGameListeners - Firebase Realtime Database listeners pour les jeux
 *
 * Centralise les listeners Firebase communs aux pages de jeu.
 * Gère automatiquement le cleanup et les redirections de phase.
 *
 * Usage:
 *   // Basic - listen to meta and state
 *   const { meta, state } = useGameListeners({
 *     roomCode: code,
 *     roomPrefix: 'rooms',
 *   });
 *
 *   // With callbacks
 *   useGameListeners({
 *     roomCode: code,
 *     roomPrefix: 'rooms_blindtest',
 *     onMeta: (meta) => console.log('Meta updated', meta),
 *     onState: (state) => console.log('State updated', state),
 *     onPhaseChange: (phase) => {
 *       if (phase === 'ended') router.push('/blindtest/game/' + code + '/end');
 *     }
 *   });
 *
 *   // With custom paths
 *   useGameListeners({
 *     roomCode: code,
 *     roomPrefix: 'rooms',
 *     customPaths: {
 *       quiz: `rooms/${code}/quiz`,
 *       config: `rooms/${code}/config`,
 *     },
 *     onCustom: {
 *       quiz: (data) => setQuiz(data),
 *       config: (data) => setConfig(data),
 *     }
 *   });
 */

import { useState, useEffect, useRef } from 'react';
import { db, ref, onValue } from '@/lib/firebase';

/**
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase (rooms, rooms_blindtest, etc.)
 * @param {Function} options.onMeta - Callback quand meta change
 * @param {Function} options.onState - Callback quand state change
 * @param {Function} options.onPhaseChange - Callback quand la phase change
 * @param {Object} options.customPaths - Chemins personnalisés { key: path }
 * @param {Object} options.onCustom - Callbacks pour chemins personnalisés { key: callback }
 * @param {boolean} options.enabled - Activer/désactiver les listeners (default: true)
 * @returns {Object} { meta, state, customData, loading }
 */
export function useGameListeners(options = {}) {
  const {
    roomCode,
    roomPrefix,
    onMeta,
    onState,
    onPhaseChange,
    customPaths = {},
    onCustom = {},
    enabled = true,
  } = options;

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [customData, setCustomData] = useState({});
  const [loading, setLoading] = useState(true);

  // Track previous phase for change detection
  const prevPhaseRef = useRef(null);

  useEffect(() => {
    if (!roomCode || !roomPrefix || !enabled) {
      return;
    }

    const unsubscribers = [];

    // Meta listener
    const metaRef = ref(db, `${roomPrefix}/${roomCode}/meta`);
    const metaUnsub = onValue(metaRef, (snapshot) => {
      const data = snapshot.val();
      setMeta(data);
      onMeta?.(data);
    });
    unsubscribers.push(metaUnsub);

    // State listener
    const stateRef = ref(db, `${roomPrefix}/${roomCode}/state`);
    const stateUnsub = onValue(stateRef, (snapshot) => {
      const data = snapshot.val();
      setState(data);
      onState?.(data);

      // Phase change detection
      if (data?.phase && data.phase !== prevPhaseRef.current) {
        prevPhaseRef.current = data.phase;
        onPhaseChange?.(data.phase, data);
      }

      setLoading(false);
    });
    unsubscribers.push(stateUnsub);

    // Custom paths listeners
    Object.entries(customPaths).forEach(([key, path]) => {
      const customRef = ref(db, path);
      const customUnsub = onValue(customRef, (snapshot) => {
        const data = snapshot.val();
        setCustomData(prev => ({ ...prev, [key]: data }));
        onCustom[key]?.(data);
      });
      unsubscribers.push(customUnsub);
    });

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [roomCode, roomPrefix, enabled]);

  return {
    meta,
    state,
    customData,
    loading,
    // Convenience getters
    phase: state?.phase ?? null,
    isLobby: state?.phase === 'lobby',
    isPlaying: state?.phase === 'playing',
    isEnded: state?.phase === 'ended',
  };
}

/**
 * Hook simplifié pour écouter un seul chemin Firebase
 * @param {string} path - Chemin complet Firebase
 * @param {boolean} enabled - Activer/désactiver
 * @returns {any} Les données du chemin
 */
export function useFirebaseValue(path, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path || !enabled) {
      return;
    }

    const dataRef = ref(db, path);
    const unsub = onValue(dataRef, (snapshot) => {
      setData(snapshot.val());
      setLoading(false);
    });

    return () => unsub();
  }, [path, enabled]);

  return { data, loading };
}

/**
 * Hook pour surveiller la fermeture de room (meta.closed)
 * @param {string} roomCode
 * @param {string} roomPrefix
 * @param {Function} onClosed - Callback quand la room est fermée
 */
export function useRoomClosed(roomCode, roomPrefix, onClosed) {
  useEffect(() => {
    if (!roomCode || !roomPrefix) return;

    const closedRef = ref(db, `${roomPrefix}/${roomCode}/meta/closed`);
    const unsub = onValue(closedRef, (snapshot) => {
      if (snapshot.val() === true) {
        onClosed?.();
      }
    });

    return () => unsub();
  }, [roomCode, roomPrefix, onClosed]);
}

export default useGameListeners;
