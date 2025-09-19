'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Props:
 * - roomCode: string
 * - playerUid: string
 */
export default function Buzzer({ roomCode, playerUid }) {
  const [state, setState] = useState({});

  // 1) Écouter l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // 2) Déterminer si le buzzer est "armé"
  const armed = useMemo(() => {
    const s = state || {};

    // Acceptons tous les signaux possibles d'armement pour être tolérant
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

    // Ton schéma de lock principal
    const locked =
      s.lockUid != null && s.lockUid !== '' ? s.lockUid : null;

    // Beaucoup de parties arment simplement en "phase: question"
    const phaseSignal = s.phase === 'question';

    // Buzzer armé si (un des signaux) ET pas déjà lock
    return !locked && (canBuzzSignal || revealedSignal || phaseSignal);
  }, [state]);

  // Disabled si pas armé OU si on n'a pas les infos minimales
  const isDisabled = !armed || !roomCode || !playerUid;

  // 3) Clic buzzer : tentative de lock + trace
  const handleBuzz = async () => {
    if (isDisabled) return;
    const code = String(roomCode).toUpperCase();

    const rootUpdates = {};
    // -> lock (ton schéma)
    rootUpdates[`rooms/${code}/state/lockUid`] = playerUid;
    // -> trace du buzz (optionnelle mais pratique)
    rootUpdates[`rooms/${code}/state/buzz`] = {
      uid: playerUid,
      at: serverTimestamp(),
    };
    // -> petite bannière (si autorisée par tes rules)
    rootUpdates[`rooms/${code}/state/buzzBanner`] = '';

    try {
      await update(ref(db), rootUpdates);
      try {
        navigator?.vibrate?.(15);
      } catch {}
    } catch {
      // no-op si les rules refusent (mais elles sont ok avec la dernière version)
    }
  };

  const ready = !isDisabled;
  const label = ready ? 'BUZZ !' : 'En attente…';

  return (
    <>
      {/* spacer pour que le dock ne masque rien */}
      <div className="h-28" />

      <div className="sticky bottom-0 left-0 right-0 z-40">
        <div className="flex items-center justify-center pb-[env(safe-area-inset-bottom)] pt-2">
          <button
            onClick={handleBuzz}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            aria-label={label}
            className={[
              'transition-all duration-150 ease-out',
              'h-28 w-28 rounded-full shadow-lg',
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
