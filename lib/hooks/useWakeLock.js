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
      // 1. Essayer le plugin Capacitor KeepAwake s'il est installé
      if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
        const { KeepAwake } = await import('@capacitor-community/keep-awake').catch(() => ({}));
        if (KeepAwake?.keepAwake) {
          await KeepAwake.keepAwake();
          isActiveRef.current = true;
          return;
        }
      }

      // 2. Web Wake Lock API — fonctionne sur iOS 16.4+ (WKWebView) et Android Chrome WebView.
      // Utilisé comme fallback natif quand le plugin n'est pas installé,
      // et comme solution principale sur web.
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        isActiveRef.current = true;

        wakeLockRef.current.addEventListener('release', () => {
          isActiveRef.current = false;
          wakeLockRef.current = null;
        });
      }
    } catch (error) {
      // Échec normal si page non visible, batterie faible, ou permission refusée
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
