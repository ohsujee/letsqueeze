'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Hook pour détecter l'inactivité d'un joueur
 *
 * Marque le joueur comme "inactive" après X secondes sans interaction
 * Revient à "active" dès qu'il interagit à nouveau
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase
 * @param {string} options.playerUid - UID du joueur
 * @param {number} options.inactivityTimeout - Délai en ms avant de marquer inactif (default: 30000)
 * @param {boolean} options.enabled - Activer/désactiver la détection (default: true)
 */
export function useInactivityDetection({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  inactivityTimeout = 30000, // 30 secondes par défaut
  enabled = true
}) {
  const timeoutRef = useRef(null);
  const isInactiveRef = useRef(false);

  const updateStatus = useCallback(async (status) => {
    if (!roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${playerUid}`;

    try {
      await update(ref(db, playerPath), {
        activityStatus: status,
        lastActivityAt: Date.now()
      });
    } catch (error) {
      console.error('[InactivityDetection] Failed to update status:', error);
    }
  }, [roomCode, roomPrefix, playerUid]);

  const markActive = useCallback(() => {
    if (isInactiveRef.current) {
      isInactiveRef.current = false;
      updateStatus('active');
    }

    // Reset le timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      isInactiveRef.current = true;
      updateStatus('inactive');
    }, inactivityTimeout);
  }, [inactivityTimeout, updateStatus]);

  useEffect(() => {
    if (!enabled || !roomCode || !playerUid) return;

    // Événements à écouter pour détecter l'activité
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'touchmove',
      'scroll',
      'click'
    ];

    // Throttle pour éviter trop d'updates
    let lastActivity = Date.now();
    const throttleMs = 1000; // Max 1 update par seconde

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > throttleMs) {
        lastActivity = now;
        markActive();
      }
    };

    // Marquer actif au départ
    markActive();

    // Ajouter les listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markActive();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibility);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, roomCode, playerUid, markActive]);

  return { markActive };
}
