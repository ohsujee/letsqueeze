'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Props:
 * - roomCode: string (code de la room)
 * - playerUid: string (auth.uid du joueur)
 */
export default function Buzzer({ roomCode, playerUid }) {
  const [state, setState] = useState(null);

  // 1) Écouter l'état de la room (host met à jour canBuzz / revealed / lockedBy)
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // 2) Déterminer si le buzzer est "armé" (prêt à buzz)
  const armed = useMemo(() => {
    const s = state || {};

    // Divers flags possibles selon l'écran host
    const canBuzzSignal =
      s.canBuzz === true ||
      s?.buzzer?.canBuzz === true ||
      s.isBuzzArmed === true ||
      s.can_buzz === true ||
      s.buzzEnabled === true ||
      s.armed === true;

    const revealedSignal =
      s.revealed === true ||
      s.isRevealed === true ||
      s.questionRevealed === true ||
      s?.question?.revealed === true;

    const lockedBy = s?.lockedBy || '';
    const lockFree = !lockedBy;

    return (canBuzzSignal || revealedSignal) && lockFree;
  }, [state]);

  const isDisabled = !armed;

  // 3) Clic: on tente le lock + trace du buzz (les rules ci-dessus autorisent ce cas)
  const handleBuzz = async () => {
    if (isDisabled || !roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();

    const rootUpdates = {};
    // -> le lock (premier arrivé, premier servi, côté rules)
    rootUpdates[`rooms/${code}/state/lockedBy`] = playerUid;
    // -> la trace du buzz
    rootUpdates[`rooms/${code}/state/buzz`] = {
      uid: playerUid,
      at: serverTimestamp(),
    };

    try {
      await update(ref(db), rootUpdates);
      // Haptique légère si dispo
      try {
        navigator?.vibrate?.(20);
      } catch {}
    } catch {
      // Si jamais ça échoue, on ne spam pas d'erreur ici (rules / réseau)
    }
  };

  // Styles
  const ready = !isDisabled;
  const label = ready ? 'BUZZ !' : 'En attente…';

  return (
    <>
      {/* Spacer: évite que l’UI soit cachée par le dock */}
      <div className="h-28" />

      {/* Dock sticky bas d’écran */}
      <div className="sticky bottom-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center pb-[env(safe-area-inset-bottom)] pt-2">
          <button
            onClick={handleBuzz}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-label={label}
            className={[
              'transition-all duration-150 ease-out',
              'h-24 w-24 rounded-full shadow-lg',
              'text-lg font-extrabold tracking-wide',
              'border-4',
              ready
                ? 'bg-red-600 hover:bg-red-700 active:scale-95 text-white border-red-700'
                : 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed',
              ready ? 'animate-pulse' : ''
            ].join(' ')}
          >
            {label}
          </button>
        </div>
      </div>
    </>
  );
}
