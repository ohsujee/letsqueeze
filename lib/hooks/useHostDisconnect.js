'use client';

import { useEffect, useRef } from 'react';
import { ref, onDisconnect, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Hook pour gérer la déconnexion de l'hôte
 *
 * Quand l'hôte perd sa connexion Firebase (app fermée, navigation, crash),
 * la room est automatiquement fermée (meta.closed = true).
 *
 * Tous les joueurs qui écoutent meta.closed seront redirigés.
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', etc.)
 * @param {boolean} options.isHost - Si l'utilisateur actuel est l'hôte
 * @param {boolean} options.enabled - Activer/désactiver le hook (default: true)
 */
export function useHostDisconnect({
  roomCode,
  roomPrefix = 'rooms',
  isHost = false,
  enabled = true
}) {
  const disconnectRef = useRef(null);
  const setupDoneRef = useRef(false);

  useEffect(() => {
    // Only run for hosts
    if (!enabled || !isHost || !roomCode) return;

    const code = String(roomCode).toUpperCase();
    const closedPath = `${roomPrefix}/${code}/meta/closed`;
    const closedRef = ref(db, closedPath);

    // Setup onDisconnect to close room when host loses connection
    const setupDisconnect = async () => {
      try {
        // Cancel previous onDisconnect if any
        if (disconnectRef.current) {
          await disconnectRef.current.cancel().catch(() => {});
        }

        // Set up new onDisconnect
        disconnectRef.current = onDisconnect(closedRef);
        await disconnectRef.current.set(true);

        setupDoneRef.current = true;
        console.log('[HostDisconnect] Setup complete - room will close on host disconnect');
      } catch (error) {
        console.error('[HostDisconnect] Setup failed:', error);
      }
    };

    // Listen to .info/connected to re-setup after reconnection
    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // Connected or reconnected - setup onDisconnect
        setupDisconnect();
      }
    });

    return () => {
      unsubscribe();
      // Cancel onDisconnect when component unmounts normally (host intentionally leaving)
      // Note: If host uses Exit button, they should set meta.closed themselves
      // This cancel ensures we don't double-close
      if (disconnectRef.current) {
        disconnectRef.current.cancel().catch(() => {});
      }
    };
  }, [roomCode, roomPrefix, isHost, enabled]);

  // Function to manually close the room (for Exit button)
  const closeRoom = async () => {
    if (!roomCode) return;

    const code = String(roomCode).toUpperCase();
    const closedPath = `${roomPrefix}/${code}/meta/closed`;

    // Cancel onDisconnect first to avoid race conditions
    if (disconnectRef.current) {
      await disconnectRef.current.cancel().catch(() => {});
    }

    // Set closed = true
    await set(ref(db, closedPath), true);
    console.log('[HostDisconnect] Room closed manually');
  };

  return { closeRoom };
}
