'use client';

import { useEffect, useRef } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import { getApp } from 'firebase/app';

/**
 * useAutoUnblockPenalty — Auto-reset le blockedUntil du joueur avec la pénalité
 * la plus proche de la fin, si TOUS les joueurs éligibles sont en pénalité.
 *
 * Évite le blocage où personne ne peut buzzer car tout le monde a été pénalisé.
 *
 * Seul le hôte/mimeur/asker (`canWrite`) déclenche le write Firebase — les autres
 * clients observent juste. Un ref interne empêche les writes redondants dans la
 * même fenêtre de pénalité.
 *
 * @param {Object} params
 * @param {string} params.roomCode - Code de la room
 * @param {string} params.roomPrefix - 'rooms' | 'rooms_mime' | 'rooms_blindtest'
 * @param {Array} params.eligiblePlayers - Joueurs qui peuvent être débloqués
 *        (actifs, non-mimeur, non-asker). Format: [{ uid, blockedUntil, ... }]
 * @param {number} params.serverNow - Timestamp serveur actuel (Date.now() + offset)
 * @param {boolean} params.canWrite - Si ce client a l'autorité pour écrire (host/mimer)
 * @param {boolean} params.enabled - Activer le hook (défaut: true)
 */
export default function useAutoUnblockPenalty({
  roomCode,
  roomPrefix,
  eligiblePlayers = [],
  serverNow,
  canWrite = false,
  enabled = true,
}) {
  const lastUnblockedUidRef = useRef(null);
  const db = getDatabase(getApp());

  useEffect(() => {
    if (!enabled || !canWrite || !roomCode || eligiblePlayers.length === 0) return;
    if (!serverNow) return;

    // Tous les joueurs éligibles sont-ils en pénalité ?
    const allBlocked = eligiblePlayers.every(
      (p) => (p.blockedUntil || 0) > serverNow
    );
    if (!allBlocked) {
      lastUnblockedUidRef.current = null;
      return;
    }

    // Trouver le joueur avec la pénalité la plus courte (qui finit bientôt)
    const soonest = eligiblePlayers.reduce((min, p) =>
      (p.blockedUntil || 0) < (min.blockedUntil || 0) ? p : min
    );

    // Éviter de re-unblock le même joueur plusieurs fois dans la même fenêtre
    if (lastUnblockedUidRef.current === soonest.uid) return;
    lastUnblockedUidRef.current = soonest.uid;

    const code = String(roomCode).toUpperCase();
    update(ref(db, `${roomPrefix}/${code}/players/${soonest.uid}`), {
      blockedUntil: 0,
    }).catch((err) => {
      console.warn('[useAutoUnblockPenalty] reset failed:', err);
      lastUnblockedUidRef.current = null;
    });
  }, [db, roomCode, roomPrefix, eligiblePlayers, serverNow, canWrite, enabled]);
}
