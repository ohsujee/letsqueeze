"use client";

/**
 * useBlindTestBuzz — Système de résolution de buzz pour le blind test
 *
 * Responsabilités :
 * - Écouter les pendingBuzzes dans Firebase
 * - Résoudre le gagnant après une fenêtre de 150ms
 * - Reset des buzzers (cancel + replay)
 */

import { useRef, useEffect } from "react";
import { db, ref, onValue, update, serverTimestamp } from "@/lib/firebase";

const BUZZ_WINDOW_MS = 150;

export function useBlindTestBuzz({ code, canControl, pauseMusic, playBuzz, playLevel, currentSnippet, currentTrack }) {
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({});
  const isResolving = useRef(false);

  // Listener + résolution
  useEffect(() => {
    if (!canControl || !code) return;

    const pendingBuzzesRef = ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`);

    const resolveBuzzes = async () => {
      isResolving.current = true;
      buzzWindowTimeout.current = null;

      try {
        const buzzesToResolve = { ...buzzCache.current };
        const buzzCount = Object.keys(buzzesToResolve).length;

        if (buzzCount === 0) return;

        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms_blindtest/${code}/state/lockUid`));
        if (lockSnap.val()) return;

        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms_blindtest/${code}/state/lockUid`), (currentLock) => {
          if (currentLock) return currentLock;
          return winner.uid;
        });

        if (lockResult.snapshot.val() !== winner.uid) return;

        pauseMusic();

        await update(ref(db, `rooms_blindtest/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

        playBuzz();

      } catch (error) {
        console.error('[Buzz] Error:', error);
      } finally {
        isResolving.current = false;
        buzzCache.current = {};
      }
    };

    const unsubscribe = onValue(pendingBuzzesRef, (snapshot) => {
      const pendingBuzzes = snapshot.val() || {};
      const buzzCount = Object.keys(pendingBuzzes).length;

      buzzCache.current = pendingBuzzes;

      if (buzzCount === 0) return;
      if (buzzWindowTimeout.current) return;
      if (isResolving.current) return;

      buzzWindowTimeout.current = setTimeout(resolveBuzzes, BUZZ_WINDOW_MS);
    });

    return () => {
      unsubscribe();
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
        buzzWindowTimeout.current = null;
      }
      buzzCache.current = {};
      isResolving.current = false;
    };
  }, [canControl, code, playBuzz, pauseMusic]);

  // Reset buzzers
  const resetBuzzers = async () => {
    if (!canControl) return;
    isResolving.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    await update(ref(db, `rooms_blindtest/${code}/state`), {
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      pausedAt: null,
      lockedAt: null
    });
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms_blindtest/${code}/state/pendingBuzzes`))
    ).catch(() => {});
    if (currentSnippet !== null && currentTrack) {
      await playLevel(currentSnippet);
    }
  };

  return {
    resetBuzzers,
    isResolving, // Ref exposé car utilisé par validation et trackMgmt pour reset
  };
}
