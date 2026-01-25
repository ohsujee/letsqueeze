'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ref, onDisconnect, set, remove, onValue, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Grace period avant de considérer l'hôte comme vraiment parti (en ms)
 * 2 minutes = 120000ms
 */
export const HOST_GRACE_PERIOD_MS = 120000;

/**
 * Hook pour gérer la déconnexion de l'hôte avec grace period
 *
 * Nouveau comportement:
 * - Quand l'hôte perd sa connexion Firebase, on écrit hostDisconnectedAt (timestamp)
 * - Quand l'hôte revient (visibilitychange ou reconnexion), on supprime hostDisconnectedAt
 * - Les clients vérifient: si hostDisconnectedAt > 2 minutes, la room est considérée fermée
 *
 * Cela permet:
 * - Switch d'app sans fermer la partie
 * - Changement de réseau (WiFi → 5G) sans fermer la partie
 * - Micro-coupures internet sans fermer la partie
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
  const isCleaningUpRef = useRef(false);

  // Get normalized room code
  const getCode = useCallback(() => {
    return roomCode ? String(roomCode).toUpperCase() : null;
  }, [roomCode]);

  // Clear the disconnected timestamp (host is back)
  const clearDisconnectedAt = useCallback(async () => {
    const code = getCode();
    if (!code) return;

    try {
      await remove(ref(db, `${roomPrefix}/${code}/meta/hostDisconnectedAt`));
      console.log('[HostDisconnect] Cleared hostDisconnectedAt - host is back');
    } catch (error) {
      console.error('[HostDisconnect] Failed to clear hostDisconnectedAt:', error);
    }
  }, [roomPrefix, getCode]);

  // Setup onDisconnect handler
  const setupDisconnect = useCallback(async () => {
    const code = getCode();
    if (!code || isCleaningUpRef.current) return;

    const disconnectedAtPath = `${roomPrefix}/${code}/meta/hostDisconnectedAt`;
    const disconnectedAtRef = ref(db, disconnectedAtPath);

    try {
      // Cancel previous onDisconnect if any
      if (disconnectRef.current) {
        await disconnectRef.current.cancel().catch(() => {});
      }

      // Set up new onDisconnect - write timestamp instead of closing
      disconnectRef.current = onDisconnect(disconnectedAtRef);
      await disconnectRef.current.set(serverTimestamp());

      // Clear any existing hostDisconnectedAt (we're connected now)
      await clearDisconnectedAt();

      setupDoneRef.current = true;
      console.log('[HostDisconnect] Setup complete - grace period enabled (2 min)');
    } catch (error) {
      console.error('[HostDisconnect] Setup failed:', error);
    }
  }, [roomPrefix, getCode, clearDisconnectedAt]);

  // Main effect - setup listeners
  useEffect(() => {
    // Only run for hosts
    if (!enabled || !isHost || !roomCode) return;

    isCleaningUpRef.current = false;

    // Listen to .info/connected to setup/re-setup after reconnection
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true && !isCleaningUpRef.current) {
        // Connected or reconnected - setup onDisconnect and clear timestamp
        setupDisconnect();
      }
    });

    // Handle visibility change (user comes back from background)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !isCleaningUpRef.current) {
        // User came back - clear disconnected timestamp and re-setup
        console.log('[HostDisconnect] Visibility changed to visible - clearing disconnectedAt');

        // Small delay to let Firebase reconnect first
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!isCleaningUpRef.current) {
          await clearDisconnectedAt();
          await setupDisconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCleaningUpRef.current = true;
      unsubscribeConnected();
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Cancel onDisconnect when component unmounts normally
      // The closeRoom function should be used for intentional closing
      if (disconnectRef.current) {
        disconnectRef.current.cancel().catch(() => {});
      }
    };
  }, [roomCode, roomPrefix, isHost, enabled, setupDisconnect, clearDisconnectedAt]);

  // Function to manually close the room (for Exit button)
  const closeRoom = useCallback(async () => {
    const code = getCode();
    if (!code) return;

    isCleaningUpRef.current = true;

    // Cancel onDisconnect first to avoid race conditions
    if (disconnectRef.current) {
      await disconnectRef.current.cancel().catch(() => {});
    }

    // Clear hostDisconnectedAt and set closed = true
    await remove(ref(db, `${roomPrefix}/${code}/meta/hostDisconnectedAt`)).catch(() => {});
    await set(ref(db, `${roomPrefix}/${code}/meta/closed`), true);

    console.log('[HostDisconnect] Room closed manually');
  }, [roomPrefix, getCode]);

  return { closeRoom };
}
