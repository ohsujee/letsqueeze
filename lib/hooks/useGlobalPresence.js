'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, onDisconnect, set, update, serverTimestamp } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

const HEARTBEAT_INTERVAL = 60_000; // 60s

/**
 * Tracks the current user's global presence in Firebase RTDB.
 * Writes to presence/{uid} when connected, removes on disconnect.
 * Sends a heartbeat every 60s so stale entries can be detected.
 * Used by Punkrecords dashboard to count real-time active users.
 */
export function useGlobalPresence() {
  useEffect(() => {
    let connectedUnsub = null;
    let heartbeatInterval = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (connectedUnsub) { connectedUnsub(); connectedUnsub = null; }
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      if (!user) return;

      const presenceRef = ref(db, `presence/${user.uid}`);

      connectedUnsub = onValue(ref(db, '.info/connected'), async (snap) => {
        if (!snap.val()) return;
        try {
          await onDisconnect(presenceRef).remove();
          await set(presenceRef, {
            anon: user.isAnonymous,
            t: serverTimestamp(),
          });

          // Heartbeat — met à jour t toutes les 60s pour prouver que l'user est encore actif
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(async () => {
            try {
              await update(presenceRef, { t: serverTimestamp() });
            } catch {
              // Silently fail
            }
          }, HEARTBEAT_INTERVAL);
        } catch {
          // Silently fail if rules don't allow yet
        }
      });
    });

    return () => {
      authUnsub();
      if (connectedUnsub) connectedUnsub();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);
}
