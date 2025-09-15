'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

type Props = {
  roomCode: string;
  playerUid: string;
};

type RoomState = {
  phase?: 'lobby' | 'playing' | 'end';
  lockedBy?: string | null;
  canBuzz?: boolean;
};

export default function BuzzerButton({ roomCode, playerUid }: Props) {
  const [state, setState] = useState<RoomState>({});

  useEffect(() => {
    const unsub = onValue(ref(db, `rooms/${roomCode}/state`), (snap) => {
      setState((snap.val() || {}) as RoomState);
    });
    return () => unsub();
  }, [roomCode]);

  const armed = useMemo(() => {
    return !!state.canBuzz && (!state.lockedBy || state.lockedBy === '');
  }, [state.canBuzz, state.lockedBy]);

  const isDisabled = !armed || state.phase !== 'playing';

  const handleBuzz = async () => {
    if (isDisabled) return;
    await update(ref(db, `rooms/${roomCode}/state`), {
      lockedBy: playerUid,
      buzz: { uid: playerUid, at: serverTimestamp() },
    });
    // Optionnel: petit retour haptique (safe si non supporté)
    try {
      (navigator as any)?.vibrate?.(15);
    } catch {}
  };

  // Placement “pouce-friendly” :
  // - Sur mobile: bouton très gros, légèrement AU-DESSUS du bas (12vh min),
  //   + marge safe-area iOS si présente.
  // - Sur desktop: plus raisonnable mais visible.
  const bottomStyle: React.CSSProperties = {
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
        // Gros bouton rond, ring épais, ombre marquée, transition douce.
        className={[
          'pointer-events-auto select-none rounded-full font-extrabold',
          'shadow-2xl focus:outline-none focus-visible:ring-8',
          'transition-all duration-200 ease-out active:scale-95',
          // Tailles : très grand sur mobile, un peu plus raisonnable sur md+
          'w-[18rem] h-[18rem] text-3xl md:w-[16rem] md:h-[16rem] md:text-3xl',
          // États visuels
          isDisabled
            ? 'bg-gray-200 text-black ring-8 ring-gray-300'
            : 'bg-red-600 text-white ring-[12px] ring-red-300 animate-pulse',
        ].join(' ')}
        aria-label="Buzzer"
        aria-live="polite"
        // Évite le délai 300ms sur mobile + améliore le tap
        style={{ touchAction: 'manipulation' }}
      >
        {isDisabled ? 'En attente…' : 'BUZZ !'}
      </button>
    </div>
  );
}
