import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ref, get, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

/**
 * Enregistre appVersion et platform dans Firebase pour tous les users natifs authentifiés.
 * N'écrit que si la valeur a changé (évite les écritures inutiles).
 */
export function useAppTracking() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous || trackedRef.current) return;
      trackedRef.current = true;

      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        const currentVersion = info.version;
        const currentPlatform = Capacitor.getPlatform();

        const userRef = (field) => ref(db, `users/${user.uid}/${field}`);

        // Lire les valeurs actuelles
        const [vSnap, pSnap] = await Promise.all([
          get(userRef('appVersion')),
          get(userRef('platform')),
        ]);

        // N'écrire que si différent
        const writes = [];
        if (vSnap.val() !== currentVersion) {
          writes.push(set(userRef('appVersion'), currentVersion));
        }
        if (pSnap.val() !== currentPlatform) {
          writes.push(set(userRef('platform'), currentPlatform));
        }

        if (writes.length > 0) {
          await Promise.all(writes);
        }
      } catch {}
    });

    return () => unsub();
  }, []);
}
