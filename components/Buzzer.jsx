'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Props:
 * - roomCode: string
 * - playerUid: string
 * - playerName: string
 */
export default function Buzzer({ roomCode, playerUid, playerName }) {
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

    // Signaux d'armement
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

    // Vérifier si déjà locké
    const locked = s.lockUid != null && s.lockUid !== '';

    // Phase de jeu
    const phaseSignal = s.phase === 'question' || s.phase === 'playing';

    // Buzzer armé si révélé ET pas déjà locké
    return !locked && (canBuzzSignal || revealedSignal || phaseSignal);
  }, [state]);

  // Disabled si pas armé OU si on n'a pas les infos minimales
  const isDisabled = !armed || !roomCode || !playerUid;

  // 3) Clic buzzer : tentative de lock avec transaction atomique
  const handleBuzz = async () => {
    if (isDisabled) return;
    const code = String(roomCode).toUpperCase();

    try {
      // Transaction atomique pour prendre le lock
      const lockRef = ref(db, `rooms/${code}/state/lockUid`);
      const result = await runTransaction(lockRef, (currentValue) => {
        // Si pas de lock actuel, on prend le lock
        if (currentValue === null || currentValue === undefined) {
          return playerUid;
        }
        // Sinon on garde l'existant
        return currentValue;
      });

      // Si on a réussi à prendre le lock, on met à jour les autres infos
      if (result.committed && result.snapshot.val() === playerUid) {
        const updates = {};
        updates[`rooms/${code}/state/buzzBanner`] = `🔔 ${playerName || 'Un joueur'} a buzzé !`;
        updates[`rooms/${code}/state/buzz`] = {
          uid: playerUid,
          at: serverTimestamp(),
        };
        
        await update(ref(db), updates);
        
        try {
          navigator?.vibrate?.(200);
        } catch {}
      }
    } catch (error) {
      console.error('Erreur lors du buzz:', error);
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
