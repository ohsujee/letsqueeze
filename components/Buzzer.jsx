'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function Buzzer({ roomCode, playerUid }) {
  const [state, setState] = useState({});

  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  const armed = useMemo(() => {
    const canBuzz = !!state?.canBuzz;
    const lockedBy = state?.lockedBy ?? '';
    return canBuzz && (!lockedBy || lockedBy === '');
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
      // retour haptique léger (si dispo)
      try { navigator?.vibrate?.(15); } catch {}
    } catch (e) {
      // no-op: on ne casse rien si la write échoue
    }
  };

  // Placement pouce-friendly : un peu au-dessus du bas, en respectant la safe-area iOS
  const bottomStyle = {
    bottom: 'max(12vh, calc(env(safe-area-inset-bottom, 0px) + 56px))',
  };

  return (
    <div
      className="fixed inset-x-0 flex justify-center pointer-events-none"
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
  );
}
