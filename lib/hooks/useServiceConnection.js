/**
 * useServiceConnection - Gestion connexion services externes
 *
 * Hook générique pour gérer les connexions à des services tiers
 * (Philips Hue, etc.)
 *
 * Usage:
 *   // Hue example
 *   const {
 *     isConnected,
 *     connect,
 *     disconnect,
 *   } = useServiceConnection({
 *     checkFn: () => hueService.getConfig().isConnected,
 *     disconnectFn: () => hueService.disconnect(),
 *   });
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {Function} options.checkFn - Async function that returns connection status
 * @param {Function} options.connectFn - Async function to initiate connection
 * @param {Function} options.disconnectFn - Async function to disconnect
 * @param {Function} options.onConnected - Callback when connected (receives status)
 * @param {Function} options.onDisconnected - Callback when disconnected
 * @param {Function} options.onError - Callback on error
 * @param {boolean} options.autoCheck - Check connection on mount (default: true)
 * @param {boolean} options.enabled - Enable the hook (default: true)
 * @returns {Object}
 */
export function useServiceConnection(options = {}) {
  const {
    checkFn,
    connectFn,
    disconnectFn,
    onConnected,
    onDisconnected,
    onError,
    autoCheck = true,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!checkFn || !enabled) {
      setIsChecking(false);
      return false;
    }

    try {
      setIsChecking(true);
      setError(null);
      const connected = await checkFn();
      setIsConnected(!!connected);

      if (connected) {
        onConnected?.(connected);
      }

      return connected;
    } catch (err) {
      console.error('[useServiceConnection] Check error:', err);
      setIsConnected(false);
      setError(err.message || 'Erreur de vérification');
      onError?.(err);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [checkFn, enabled, onConnected, onError]);

  // Initial check
  useEffect(() => {
    if (autoCheck && enabled) {
      checkConnection();
    } else {
      setIsChecking(false);
    }
  }, [autoCheck, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect
  const connect = useCallback(async () => {
    if (!connectFn) {
      console.warn('[useServiceConnection] No connectFn provided');
      return false;
    }

    try {
      setIsConnecting(true);
      setError(null);
      const result = await connectFn();

      // Some connect functions (like OAuth flows) redirect and don't return
      // So we might not reach this code
      if (result !== undefined) {
        const connected = result === true || !!result;
        setIsConnected(connected);

        if (connected) {
          onConnected?.(result);
        }

        return result;
      }

      return true;
    } catch (err) {
      console.error('[useServiceConnection] Connect error:', err);
      setError(err.message || 'Erreur de connexion');
      onError?.(err);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [connectFn, onConnected, onError]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!disconnectFn) {
      console.warn('[useServiceConnection] No disconnectFn provided');
      setIsConnected(false);
      return true;
    }

    try {
      setIsDisconnecting(true);
      setError(null);
      await disconnectFn();
      setIsConnected(false);
      onDisconnected?.();
      return true;
    } catch (err) {
      console.error('[useServiceConnection] Disconnect error:', err);
      setError(err.message || 'Erreur de déconnexion');
      onError?.(err);
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectFn, onDisconnected, onError]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConnected,
    isChecking,
    isConnecting,
    isDisconnecting,
    error,

    // Actions
    connect,
    disconnect,
    checkConnection,
    clearError,

    // Computed
    isLoading: isChecking || isConnecting || isDisconnecting,
    canConnect: !isConnected && !isConnecting && enabled,
    canDisconnect: isConnected && !isDisconnecting,
  };
}

export default useServiceConnection;
