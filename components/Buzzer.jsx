'use client';

import { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function Buzzer({ roomCode, playerUid }) {
  const [state, setState] = useState({});

  // 1) Écoute l'état de la room
  useEffect(() => {
    if (!roomCode) return;
    const code = String(roomCode).toUpperCase();
    const unsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      setState(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // 2) Détermine si le buzzer est "armé" (prêt) en tolérant plusieurs schémas
  const armed = useMemo(() => {
    const s = state || {};

    // Signaux possibles dans différents codes
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

    // Noms possibles de "lock"
    const lockedBy =
      s.lockedBy ??
      s.locked ??
      (s.buzz && s.buzz.uid) ??
      '';

    const lockFree = !lockedBy || lockedBy === '';

    // -> buzzer armé si (révélé ou "canBuzz") ET pas déjà lock
    return (canBuzzSignal || revealedSignal) && lockFree;
  }, [state]);

  // Pas de contrainte dure sur phase : on suit le signal d'armement
  const isDisabled = !armed;

  // 3) Clic buzzer : on tente le lock direct + un fallback "buzzes/{uid}"
  const handleBuzz = async () => {
    if (isDisabled) return;
    const code = String(roomCode).toUpperCase();

    // Prépare les updates atomiques (root update évite 2 allers/retours)
    const rootUpdates = {};
    rootUpdates[`rooms/${code}/state/lockedBy`] = playerUid;
    rootUpdates[`rooms/${code}/state/buzz`] = { uid: playerUid, at: serverTimestamp() };
    // Fallback si tes rules n'autorisent pas l'écriture dans /state :
    rootUpdates[`rooms/${code}/buzzes/${playerUid}`] = { at: serverTimestamp() };

    try {
      await update(ref(db), rootUpdates);
      try { navigator?.vibrate?.(15); } catch {} // haptique léger
    } catch {
      // no-op: si ça échoue complètement, l'UI restera grise (aucun lock)
    }
  };

  // 4) Version "sticky" (pas "fixed") pour ne rien masquer + spacer intégré
  //    -> le bouton reste accroché au bas de la fenêtre sans recouvrir le contenu
  return (
    <>
      {/* Spacer: réserve un espace pour que le contenu ne soit jamais caché */}
      <div aria-hidden className="h-[22rem] md:h-[18rem]" />

      {/* Dock sticky bas d'écran, safe-area iOS incluse */}
      <div
        className="sticky bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <button
          onClick={handleBuzz}
          disabled={isDisabled}
          className={[
            'pointer-events-auto select-none rounded-full font-extrabold',
            'shadow-2xl focus:outline-none focus-visible:ring-8',
            'transition-all duration-200 ease-out active:scale-95',
            // tailles : massif sur mobile, un peu moins sur md+
            'w-[18rem] h-[18rem] text-3xl md:w-[16rem] md:h-[16rem] md:text-3xl',
            // léger décalage vers le haut pour tomber naturellement sous le pouce
            'translate-y-[-8px]',
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
