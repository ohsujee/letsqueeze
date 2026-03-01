'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { auth, db } from '@/lib/firebase';

/**
 * Tracks the current user's global presence in Firebase RTDB.
 * Writes to presence/{uid} when connected, removes on disconnect.
 * Used by Punkrecords dashboard to count real-time active users.
 */
export function useGlobalPresence() {
  useEffect(() => {
    let connectedUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (connectedUnsub) { connectedUnsub(); connectedUnsub = null; }
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
        } catch {
          // Silently fail if rules don't allow yet
        }
      });
    });

    return () => {
      authUnsub();
      if (connectedUnsub) connectedUnsub();
    };
  }, []);
}
