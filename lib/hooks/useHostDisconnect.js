'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ref, onDisconnect, set, remove, onValue, serverTimestamp } from 'firebase/database';
import { db, auth } from '@/lib/firebase';

/**
 * Grace period avant de considérer l'hôte comme vraiment parti (en ms)
 * 2 minutes = 120000ms
 */
export const HOST_GRACE_PERIOD_MS = 120000;

/**
 * Hook pour gérer la déconnexion de l'hôte avec grace period
 *
 * Comportement:
 * - Quand l'hôte perd sa connexion Firebase, on écrit hostDisconnectedAt (timestamp)
 * - Quand l'hôte revient (visibilitychange, reconnexion, OU activité), on supprime hostDisconnectedAt
 * - Les clients vérifient: si hostDisconnectedAt > 2 minutes, la room est considérée fermée
 *
 * Cela permet:
 * - Switch d'app sans fermer la partie
 * - Changement de réseau (WiFi → 5G) sans fermer la partie
 * - Micro-coupures internet sans fermer la partie
 * - Reconnexion automatique sur n'importe quelle interaction (clic, touch)
 *
 * UNIVERSAL USAGE:
 * Préférer `hostUid` (de meta.hostUid) plutôt que `isHost` pour une détection automatique.
 * Le hook compare hostUid avec auth.currentUser?.uid pour déterminer si l'utilisateur est l'hôte.
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', etc.)
 * @param {string} options.hostUid - UID du créateur de la room (meta.hostUid) - PRÉFÉRÉ
 * @param {boolean} options.isHost - Si l'utilisateur actuel est l'hôte (legacy, utiliser hostUid à la place)
 * @param {boolean} options.enabled - Activer/désactiver le hook (default: true)
 * @returns {Object} { closeRoom, markVoluntaryLeave, isHostMarkedDisconnected }
 */
export function useHostDisconnect({
  roomCode,
  roomPrefix = 'rooms',
  hostUid,
  isHost = false,
  enabled = true
}) {
  // UNIVERSAL: Si hostUid est fourni, calculer isHost automatiquement
  // Sinon, utiliser le paramètre isHost pour rétro-compatibilité
  const computedIsHost = hostUid
    ? hostUid === auth.currentUser?.uid
    : isHost;
  const disconnectRef = useRef(null);
  const setupDoneRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const isVoluntaryLeaveRef = useRef(false); // Track if leaving via closeRoom
  const [isHostMarkedDisconnected, setIsHostMarkedDisconnected] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const reconnectAttemptsRef = useRef(0);

  // Get normalized room code
  const getCode = useCallback(() => {
    return roomCode ? String(roomCode).toUpperCase() : null;
  }, [roomCode]);

  // Clear the disconnected timestamp (host is back)
  const clearDisconnectedAt = useCallback(async (forceRetry = false) => {
    const code = getCode();
    if (!code) return false;

    // If not connected and not forcing, don't try
    if (!isFirebaseConnected && !forceRetry) {
      console.log('[HostDisconnect] Firebase not connected, skipping clear');
      return false;
    }

    try {
      await remove(ref(db, `${roomPrefix}/${code}/meta/hostDisconnectedAt`));
      console.log('[HostDisconnect] Cleared hostDisconnectedAt - host is back');
      reconnectAttemptsRef.current = 0;
      return true;
    } catch (error) {
      console.error('[HostDisconnect] Failed to clear hostDisconnectedAt:', error);
      reconnectAttemptsRef.current++;
      return false;
    }
  }, [roomPrefix, getCode, isFirebaseConnected]);

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
    if (!enabled || !computedIsHost || !roomCode) return;

    isCleaningUpRef.current = false;

    // Listen to .info/connected to setup/re-setup after reconnection
    const connectedRef = ref(db, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setIsFirebaseConnected(connected);

      if (connected && !isCleaningUpRef.current) {
        // Connected or reconnected - setup onDisconnect and clear timestamp
        console.log('[HostDisconnect] Firebase connected - setting up');
        setupDisconnect();
      } else if (!connected) {
        console.log('[HostDisconnect] Firebase disconnected');
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
          // IMPORTANT: Force retry even if we think Firebase is disconnected
          // The state might be stale after coming back from background
          await clearDisconnectedAt(true);
          await setupDisconnect();
        }
      }
    };

    // Handle beforeunload (tab close, browser close, navigation away)
    // This is a best-effort backup - onDisconnect is the primary mechanism
    const handleBeforeUnload = () => {
      // If leaving voluntarily (via closeRoom), don't do anything
      // closeRoom already set closed: true
      if (isVoluntaryLeaveRef.current) {
        return;
      }

      // For involuntary leave (tab close), the onDisconnect will fire
      // We just log here for debugging
      console.log('[HostDisconnect] beforeunload - onDisconnect will handle this');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCleaningUpRef.current = true;
      unsubscribeConnected();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Only cancel onDisconnect if this is a voluntary leave (via closeRoom)
      // If the tab is closing without closeRoom, let onDisconnect fire to write hostDisconnectedAt
      if (disconnectRef.current && isVoluntaryLeaveRef.current) {
        disconnectRef.current.cancel().catch(() => {});
        console.log('[HostDisconnect] Cancelled onDisconnect (voluntary leave)');
      } else {
        console.log('[HostDisconnect] Keeping onDisconnect active (will fire on connection close)');
      }
    };
  }, [roomCode, roomPrefix, computedIsHost, enabled, setupDisconnect, clearDisconnectedAt]);

  // Effect to listen to hostDisconnectedAt and update state (for showing alert to host)
  useEffect(() => {
    if (!enabled || !computedIsHost || !roomCode) return;

    const code = String(roomCode).toUpperCase();
    const disconnectedAtRef = ref(db, `${roomPrefix}/${code}/meta/hostDisconnectedAt`);

    const unsubscribe = onValue(disconnectedAtRef, (snapshot) => {
      const timestamp = snapshot.val();
      if (timestamp && !isCleaningUpRef.current) {
        // Host is marked as disconnected
        setIsHostMarkedDisconnected(true);
        console.log('[HostDisconnect] Host marked as disconnected - showing alert');
      } else {
        setIsHostMarkedDisconnected(false);
      }
    });

    return () => unsubscribe();
  }, [roomCode, roomPrefix, computedIsHost, enabled]);

  // Effect to listen for any activity (click, touch) to clear disconnected state
  useEffect(() => {
    if (!enabled || !computedIsHost || !roomCode) return;

    const handleActivity = async () => {
      // Only clear if we're marked as disconnected and not cleaning up
      if (isHostMarkedDisconnected && !isCleaningUpRef.current) {
        console.log('[HostDisconnect] Activity detected - attempting to clear disconnectedAt');

        // Force retry even if we think we're disconnected
        // (the state might be stale)
        const success = await clearDisconnectedAt(true);

        if (success) {
          await setupDisconnect();
        } else {
          console.log('[HostDisconnect] Clear failed, will retry on next activity');
        }
      }
    };

    // Listen for any interaction
    document.addEventListener('click', handleActivity);
    document.addEventListener('touchstart', handleActivity);

    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
    };
  }, [roomCode, roomPrefix, computedIsHost, enabled, isHostMarkedDisconnected, clearDisconnectedAt, setupDisconnect]);

  // Function to manually close the room (for Exit button)
  const closeRoom = useCallback(async () => {
    const code = getCode();
    if (!code) return;

    // Mark as voluntary leave so cleanup won't let onDisconnect fire
    isVoluntaryLeaveRef.current = true;
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

  // Mark as voluntary leave (call this before writing closed: true directly)
  // This prevents onDisconnect from firing after the room is already closed
  const markVoluntaryLeave = useCallback(() => {
    isVoluntaryLeaveRef.current = true;
    // Cancel onDisconnect immediately
    if (disconnectRef.current) {
      disconnectRef.current.cancel().catch(() => {});
      console.log('[HostDisconnect] Marked voluntary leave - cancelled onDisconnect');
    }
  }, []);

  // Manual reconnect function for UI
  const forceReconnect = useCallback(async () => {
    console.log('[HostDisconnect] Force reconnect requested');
    const success = await clearDisconnectedAt(true);
    if (success) {
      await setupDisconnect();
    }
    return success;
  }, [clearDisconnectedAt, setupDisconnect]);

  return {
    closeRoom,
    markVoluntaryLeave,
    isHostMarkedDisconnected,
    isFirebaseConnected,
    forceReconnect
  };
}
