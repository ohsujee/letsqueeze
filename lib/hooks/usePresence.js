/**
 * usePresence - Système de présence temps réel pour les lobbies
 *
 * Gère la présence joueur via Firebase Realtime Database:
 * - Détecte la vraie connexion via .info/connected
 * - Configure onDisconnect AVANT set (évite race condition)
 * - Heartbeat configurable pour détecter les joueurs "fantômes"
 * - Force reconnexion via goOffline/goOnline
 *
 * Structure Firebase:
 * /{roomPrefix}/{code}/presence/{uid}: {
 *   online: boolean,
 *   lastSeen: timestamp,
 *   lastHeartbeat: timestamp
 * }
 */

'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  ref,
  onValue,
  set,
  update,
  onDisconnect,
  serverTimestamp,
  goOffline,
  goOnline
} from 'firebase/database';

/**
 * Hook de présence pour les rooms de jeu
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase (ex: 'rooms', 'rooms_blindtest')
 * @param {string} options.playerUid - UID du joueur
 * @param {number} options.heartbeatInterval - Intervalle heartbeat en ms (0 = désactivé, défaut: 15000)
 * @param {boolean} options.enabled - Activer/désactiver le hook (défaut: true)
 *
 * @returns {Object} { isConnected, forceReconnect, presenceRef }
 */
export function usePresence({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  heartbeatInterval = 15000,
  enabled = true
}) {
  const [isConnected, setIsConnected] = useState(false);
  const heartbeatIntervalRef = useRef(null);
  const presenceRefPath = useRef(null);
  const onDisconnectRegistered = useRef(false);

  // Construire le chemin de présence
  const getPresencePath = useCallback(() => {
    if (!roomCode || !playerUid) return null;
    const code = String(roomCode).toUpperCase();
    return `${roomPrefix}/${code}/presence/${playerUid}`;
  }, [roomCode, roomPrefix, playerUid]);

  // Force reconnexion - utile quand l'app revient du background
  const forceReconnect = useCallback(async () => {
    if (!enabled) return;

    try {
      // Force Firebase à se déconnecter puis reconnecter
      // Cela déclenche immédiatement les handlers onDisconnect
      goOffline(db);

      // Petit délai pour laisser le temps à onDisconnect de s'exécuter
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reconnexion - va re-trigger le listener .info/connected
      goOnline(db);
    } catch (error) {
      console.error('[usePresence] Force reconnect error:', error);
    }
  }, [enabled]);

  // Enregistrer la présence (appelé quand connecté)
  const registerPresence = useCallback(async () => {
    const path = getPresencePath();
    if (!path) return;

    const presenceRef = ref(db, path);
    presenceRefPath.current = path;

    try {
      // IMPORTANT: Configurer onDisconnect AVANT set
      // Cela évite la race condition où le joueur apparaît online
      // après avoir été déconnecté
      await onDisconnect(presenceRef).set({
        online: false,
        lastSeen: serverTimestamp(),
        lastHeartbeat: serverTimestamp()
      });

      onDisconnectRegistered.current = true;

      // PUIS marquer comme online
      await set(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
        lastHeartbeat: serverTimestamp()
      });

    } catch (error) {
      console.error('[usePresence] Register presence error:', error);
      onDisconnectRegistered.current = false;
    }
  }, [getPresencePath]);

  // Envoyer un heartbeat
  const sendHeartbeat = useCallback(async () => {
    const path = getPresencePath();
    if (!path || !isConnected) return;

    try {
      await update(ref(db, path), {
        lastHeartbeat: serverTimestamp()
      });
    } catch (error) {
      // Silently fail - la connexion est probablement perdue
      console.debug('[usePresence] Heartbeat failed:', error.message);
    }
  }, [getPresencePath, isConnected]);

  // Écouter la connexion Firebase
  useEffect(() => {
    if (!enabled || !roomCode || !playerUid) {
      setIsConnected(false);
      return;
    }

    const connectedRef = ref(db, '.info/connected');

    const unsubscribe = onValue(connectedRef, async (snapshot) => {
      const connected = snapshot.val() === true;
      setIsConnected(connected);

      if (connected) {
        // Connecté - enregistrer la présence
        await registerPresence();
      } else {
        // Déconnecté - reset le flag onDisconnect
        onDisconnectRegistered.current = false;
      }
    });

    return () => {
      unsubscribe();
      onDisconnectRegistered.current = false;
    };
  }, [enabled, roomCode, playerUid, registerPresence]);

  // Gérer le heartbeat
  useEffect(() => {
    // Nettoyer l'ancien interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Ne pas démarrer si désactivé ou non connecté
    if (!enabled || !isConnected || heartbeatInterval <= 0) {
      return;
    }

    // Envoyer un heartbeat immédiatement
    sendHeartbeat();

    // Puis à intervalle régulier
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [enabled, isConnected, heartbeatInterval, sendHeartbeat]);

  // Gérer visibilitychange - force reconnexion au retour
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'utilisateur revient - forcer reconnexion pour re-register presence
        // Délai court pour laisser le temps à l'app de se stabiliser
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            forceReconnect();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, forceReconnect]);

  // Cleanup à la destruction du hook
  useEffect(() => {
    return () => {
      // Nettoyer le heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Marquer offline si on quitte proprement
      const path = presenceRefPath.current;
      if (path && onDisconnectRegistered.current) {
        update(ref(db, path), {
          online: false,
          lastSeen: serverTimestamp()
        }).catch(() => {});
      }
    };
  }, []);

  return {
    isConnected,
    forceReconnect,
    presenceRef: presenceRefPath.current ? ref(db, presenceRefPath.current) : null
  };
}

/**
 * Hook pour écouter la présence d'un joueur spécifique (côté host)
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase
 * @param {string} options.playerUid - UID du joueur à observer
 * @param {number} options.staleThreshold - Seuil en ms pour considérer stale (défaut: 25000)
 *
 * @returns {Object} { presence, status }
 */
export function usePlayerPresence({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  staleThreshold = 25000
}) {
  const [presence, setPresence] = useState(null);
  const [status, setStatus] = useState('unknown'); // 'online' | 'uncertain' | 'offline' | 'unknown'

  useEffect(() => {
    if (!roomCode || !playerUid) {
      setPresence(null);
      setStatus('unknown');
      return;
    }

    const code = String(roomCode).toUpperCase();
    const presenceRef = ref(db, `${roomPrefix}/${code}/presence/${playerUid}`);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      setPresence(data);

      if (!data) {
        setStatus('unknown');
        return;
      }

      if (!data.online) {
        setStatus('offline');
        return;
      }

      // Vérifier l'âge du heartbeat
      const heartbeatAge = Date.now() - (data.lastHeartbeat || 0);

      if (heartbeatAge < staleThreshold) {
        setStatus('online');
      } else if (heartbeatAge < staleThreshold * 1.5) {
        setStatus('uncertain');
      } else {
        setStatus('offline');
      }
    });

    return () => unsubscribe();
  }, [roomCode, roomPrefix, playerUid, staleThreshold]);

  // Re-évaluer le status périodiquement (le heartbeat age avec le temps)
  useEffect(() => {
    if (!presence?.online) return;

    const interval = setInterval(() => {
      const heartbeatAge = Date.now() - (presence.lastHeartbeat || 0);

      if (heartbeatAge < staleThreshold) {
        setStatus('online');
      } else if (heartbeatAge < staleThreshold * 1.5) {
        setStatus('uncertain');
      } else {
        setStatus('offline');
      }
    }, 5000); // Vérifier toutes les 5 secondes

    return () => clearInterval(interval);
  }, [presence, staleThreshold]);

  return { presence, status };
}

/**
 * Hook pour écouter la présence de tous les joueurs d'une room (côté host)
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase
 * @param {number} options.staleThreshold - Seuil en ms pour considérer stale (défaut: 25000)
 *
 * @returns {Object} { presenceMap, getStatus }
 */
export function useRoomPresence({
  roomCode,
  roomPrefix = 'rooms',
  staleThreshold = 25000
}) {
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    if (!roomCode) {
      setPresenceMap({});
      return;
    }

    const code = String(roomCode).toUpperCase();
    const presenceRef = ref(db, `${roomPrefix}/${code}/presence`);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val() || {};
      setPresenceMap(data);
    });

    return () => unsubscribe();
  }, [roomCode, roomPrefix]);

  // Fonction pour obtenir le status d'un joueur
  const getStatus = useCallback((playerUid) => {
    const presence = presenceMap[playerUid];

    if (!presence) return 'unknown';
    if (!presence.online) return 'offline';

    const heartbeatAge = Date.now() - (presence.lastHeartbeat || 0);

    if (heartbeatAge < staleThreshold) return 'online';
    if (heartbeatAge < staleThreshold * 1.5) return 'uncertain';
    return 'offline';
  }, [presenceMap, staleThreshold]);

  return { presenceMap, getStatus };
}

export default usePresence;
