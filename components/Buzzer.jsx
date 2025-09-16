'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function Buzzer({ roomCode, playerUid }) {
  const [state, setState] = useState({});

  // Écoute l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Détecte si le buzzer doit être "armé" (prêt)
  // -> on tolère plusieurs conventions de clés : canBuzz / revealed / buzzer.canBuzz / isRevealed / etc.
  const armed = useMemo(() => {
    const s = state || {};

    // diff de noms possibles selon les versions
    const canBuzzSignal =
      s.canBuzz === true ||
      s?.buzzer?.canBuzz === true ||
      s.isBuzzArmed === true ||
      s.armed === true;

    const revealedSignal =
      s.revealed === true ||
      s.isRevealed === true ||
      s.questionRevealed === true;

    const lockedBy =
      s.lockedBy ??
      s.locked ??
      (s.buzz && s.buzz.uid) ??
      '';

    const lockFree = !lockedBy || lockedBy === '';

    return (canBuzzSignal || revealedSignal) && lockFree;
  }, [state]);

  const isDisabled = !armed || state?.phase !== 'playing';

  const handleBuzz = async () => {
    if (isDisabled) return;
    const code = String(roomCode).toUpperCase();
    try {
      await update(ref(db, `rooms/${code}/state`), {
        lockedBy: playerUid,
        buzz: { uid: playerUid, at: serverTimestamp() },
      });
      // haptique léger si dispo
      try { navigator?.vibrate?.(15); } catch {}
    } catch (e) {
      // no-op
    }
  };

  // Placement pouce-friendly : un peu au-dessus du bord bas + safe-area iOS
  const bottomStyle = {
    bottom: 'max(12vh, calc(env(safe-area-inset-bottom, 0px) + 56px))',
  };

  return (
    <>
      {/* Spacer invisible qui réserve l’espace en bas de la page pour éviter que le buzzer "couvre" le contenu */}
      <div aria-hidden className="h-[22rem] md:h-[18rem]" />

      {/* Buzzer fixe au-dessus, mais sans masquer le contenu grâce au spacer */}
      <div
        className="fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={bottomStyle}
      >
        <button
          onClick={handleBuzz}
          disabled={isDisabled}
          className={[
            'pointer-events-auto select-none rounded-full font-extrabold',
            'shadow-2xl focus:outline-none focus-visible:ring-8',
            'transition-all duration-200 ease-out active:scale-95',
            // tailles : très grand sur mobile, un peu moins sur md+
            'w-[18rem] h-[18rem] text-3xl md:w-[16rem] md:h-[16rem] md:text-3xl',
            isDisabled
              ? 'bg-gray-200 text-black ring-8 ring-gray-300'
              : 'bg-red-600 text-white ring-[12px] ring-red-300 animate-pulse',
          ].join(' ')}
          aria-label="Buzzer"
          aria-live="polite"
          style={{ touchAction: 'manipulation' }}
        >
          {isDisabled ? 'En attente…' : 'BUZZ !'}
        </button>
      </div>
    </>
  );
}
