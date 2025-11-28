// Gère la présence en RTDB (anti-fantômes) quand activée par flag.
// Écrit sous rooms/{code}/presence/{uid} : { online, lastSeen }
// Ne supprime JAMAIS les fiches players (zéro casse). L'UI pourra filtrer.

'use client';
import { useEffect } from 'react';
import { db } from '@/lib/firebase';
import { onValue, ref, serverTimestamp, onDisconnect, set, update } from 'firebase/database';
import { useRoomFlags } from '@/lib/flags';

export function usePresence(roomCode, uid) {
  const flags = useRoomFlags(roomCode);

  useEffect(() => {
    if (!roomCode || !uid) return;
    if (!flags?.presence_enabled) return;

    const code = String(roomCode).toUpperCase();
    const connRef = ref(db, '.info/connected');
    const presenceRef = ref(db, `rooms/${code}/presence/${uid}`);

    const unsub = onValue(connRef, async (snap) => {
      const isConnected = snap.val() === true;

      if (!isConnected) return;

      try {
        // Marque online = true + timestamp
        await set(presenceRef, {
          online: true,
          lastSeen: serverTimestamp(),
        });

        // À la déconnexion réseau/onglet → bascule online=false + lastSeen
        onDisconnect(presenceRef).update({
          online: false,
          lastSeen: serverTimestamp(),
        });

        // Optionnel: garde un lastSeen côté player (utile pour UI)
        const playerMetaRef = ref(db, `rooms/${code}/players/${uid}`);
        update(playerMetaRef, { lastSeen: serverTimestamp() }).catch(() => {});
      } catch {
        // no-op: on ne casse rien si les rules ne le permettent pas encore
      }
    });

    return () => unsub();
  }, [roomCode, uid, flags?.presence_enabled]);
}

export default usePresence;
