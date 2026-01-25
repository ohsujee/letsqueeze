'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour empêcher l'écran de se verrouiller pendant une partie
 *
 * Utilise la Screen Wake Lock API (web) ou le plugin Capacitor (app)
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Activer/désactiver le wake lock (default: true)
 *
 * @example
 * // Dans une page de jeu (lobby, play, host)
 * useWakeLock({ enabled: true });
 */
export function useWakeLock({ enabled = true } = {}) {
  const wakeLockRef = useRef(null);
  const isActiveRef = useRef(false);

  // Request wake lock
  const requestWakeLock = useCallback(async () => {
    if (!enabled || isActiveRef.current) return;

    try {
      // Check if we're in a Capacitor app
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
        // Use Capacitor KeepAwake plugin
        const { KeepAwake } = await import('@capacitor-community/keep-awake').catch(() => ({}));
        if (KeepAwake) {
          await KeepAwake.keepAwake();
          isActiveRef.current = true;
          console.log('[WakeLock] Capacitor KeepAwake activated');
        }
      } else if ('wakeLock' in navigator) {
        // Use Web Wake Lock API
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        isActiveRef.current = true;
        console.log('[WakeLock] Screen Wake Lock activated');

        // Listen for release (happens when tab is hidden)
        wakeLockRef.current.addEventListener('release', () => {
          console.log('[WakeLock] Screen Wake Lock released');
          isActiveRef.current = false;
          wakeLockRef.current = null;
        });
      } else {
        console.log('[WakeLock] Wake Lock API not supported');
      }
    } catch (error) {
      // Wake lock request failed - usually means:
      // - Page is not visible
      // - Low battery mode on some devices
      // - Permission denied
      console.warn('[WakeLock] Request failed:', error.message);
      isActiveRef.current = false;
    }
  }, [enabled]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
        const { KeepAwake } = await import('@capacitor-community/keep-awake').catch(() => ({}));
        if (KeepAwake) {
          await KeepAwake.allowSleep();
          console.log('[WakeLock] Capacitor KeepAwake released');
        }
      } else if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        console.log('[WakeLock] Screen Wake Lock released manually');
      }
    } catch (error) {
      console.warn('[WakeLock] Release failed:', error.message);
    } finally {
      wakeLockRef.current = null;
      isActiveRef.current = false;
    }
  }, []);

  // Main effect
  useEffect(() => {
    if (!enabled) {
      releaseWakeLock();
      return;
    }

    // Request wake lock on mount
    requestWakeLock();

    // Re-request when page becomes visible again
    // (Wake lock is automatically released when page is hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return {
    isActive: isActiveRef.current,
    request: requestWakeLock,
    release: releaseWakeLock
  };
}
