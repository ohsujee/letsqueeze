"use client";

import { useEffect, useState, useRef } from "react";
import { db, ref, onValue, update, runTransaction, increment, remove, get } from "@/lib/firebase";
import { useSound } from "@/lib/hooks/useSound";
import { hueScenariosService } from "@/lib/hue-module";

const BUZZ_WINDOW_MS = 150;
const POINTS_PER_QUESTION = 100;

/**
 * useQuizActions — Encapsulates all quiz host game logic:
 * buzz resolution system, sounds, and action handlers
 * (validate, wrong, skip, resetBuzzers, end).
 *
 * Scoring: 100 points fixes par bonne réponse.
 */
export function useQuizActions({
  code, state, meta, quiz, players, conf, canControl,
  total, onAdvanceAsker, onAnnounceAsker, serverOffset,
}) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");

  // Refs
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({});
  const isResolving = useRef(false);
  const isValidatingRef = useRef(false);

  // Buzz resolution listener
  useEffect(() => {
    if (!canControl || !code) return;

    const pendingBuzzesRef = ref(db, `rooms/${code}/state/pendingBuzzes`);

    const resolveBuzzes = async () => {
      isResolving.current = true;
      buzzWindowTimeout.current = null;

      try {
        const buzzesToResolve = { ...buzzCache.current };
        if (Object.keys(buzzesToResolve).length === 0) return;

        const lockSnap = await get(ref(db, `rooms/${code}/state/lockUid`));
        if (lockSnap.val()) return;

        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        const lockResult = await runTransaction(ref(db, `rooms/${code}/state/lockUid`), (currentLock) => {
          if (currentLock) return currentLock;
          return winner.uid;
        });

        if (lockResult.snapshot.val() !== winner.uid) return;

        await update(ref(db, `rooms/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
        });

        await remove(pendingBuzzesRef).catch(() => {});

        playBuzz();
        hueScenariosService.trigger('gigglz', 'buzz');
      } catch (error) {
        console.error('[Buzz] Erreur resolution:', error);
      } finally {
        isResolving.current = false;
        buzzCache.current = {};
      }
    };

    const unsubscribe = onValue(pendingBuzzesRef, (snapshot) => {
      const pendingBuzzes = snapshot.val() || {};
      buzzCache.current = pendingBuzzes;
      if (Object.keys(pendingBuzzes).length === 0) return;
      if (buzzWindowTimeout.current || isResolving.current) return;
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
  }, [canControl, code, playBuzz]);

  const removePendingBuzzes = async () => {
    await remove(ref(db, `rooms/${code}/state/pendingBuzzes`)).catch(() => {});
  };

  // ── Actions ──

  async function resetBuzzers() {
    if (!canControl) return;
    isResolving.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    await update(ref(db, `rooms/${code}/state`), {
      lockUid: null, buzzBanner: "", buzz: null,
    });
    await removePendingBuzzes();
  }

  async function validate() {
    if (isValidatingRef.current || !canControl || !state?.lockUid) return;
    isValidatingRef.current = true;

    try {
      hueScenariosService.trigger('gigglz', 'goodAnswer');
      playCorrect();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (onAdvanceAsker) setIsTransitioning(true);

      const uid = state.lockUid;
      const next = (state.currentIndex || 0) + 1;
      const updates = {};

      updates[`rooms/${code}/players/${uid}/score`] = increment(POINTS_PER_QUESTION);

      if (meta?.mode === "équipes") {
        const player = players.find(p => p.uid === uid);
        if (player?.teamId) {
          updates[`rooms/${code}/meta/teams/${player.teamId}/score`] = increment(POINTS_PER_QUESTION);
        }
      }

      if (next >= total) {
        updates[`rooms/${code}/state/phase`] = "ended";
        await update(ref(db), updates);
        return;
      }

      players.forEach(p => { updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0; });
      updates[`rooms/${code}/state/currentIndex`] = next;
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/buzz`] = null;

      isResolving.current = false;
      await update(ref(db), updates);
      await removePendingBuzzes();

      // Party Mode: pré-annonce l'asker suivant pour transition fluide
      if (onAnnounceAsker) {
        await onAnnounceAsker();
        // Laisse la transition tourner avant le swap effectif
        await new Promise(r => setTimeout(r, 1600));
      }
      if (onAdvanceAsker) await onAdvanceAsker();
    } finally {
      isValidatingRef.current = false;
      setIsTransitioning(false);
    }
  }

  async function wrong() {
    if (isValidatingRef.current || !canControl || !state?.lockUid) return;
    isValidatingRef.current = true;

    try {
      hueScenariosService.trigger('gigglz', 'badAnswer');
      playWrong();

      const uid = state.lockUid;
      const wrongPenalty = conf?.wrongAnswerPenalty || 25;
      const lockoutMs = conf?.lockoutMs || 8000;
      const until = Date.now() + serverOffset + lockoutMs;

      // Single atomic update: score penalty + lockout + buzz reset
      const updates = {};

      // Score penalty (increment négatif — clampé à 0 côté affichage)
      updates[`rooms/${code}/players/${uid}/score`] = increment(-wrongPenalty);

      // Team score penalty
      if (meta?.mode === "équipes") {
        const player = players.find(p => p.uid === uid);
        if (player?.teamId) {
          updates[`rooms/${code}/meta/teams/${player.teamId}/score`] = increment(-wrongPenalty);
          // Bloquer toute l'équipe
          players.filter(p => p.teamId === player.teamId).forEach(p => {
            updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = until;
          });
        } else {
          updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
        }
      } else {
        updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
      }

      // Reset buzz state
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/buzz`] = null;

      isResolving.current = false;
      await update(ref(db), updates);
      await removePendingBuzzes();
    } finally {
      isValidatingRef.current = false;
    }
  }

  async function skip() {
    if (!canControl || total === 0) return;
    const next = (state?.currentIndex || 0) + 1;
    if (next >= total) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
      return;
    }

    if (onAdvanceAsker) setIsTransitioning(true);

    const updates = {};
    players.forEach(p => { updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0; });
    updates[`rooms/${code}/state/currentIndex`] = next;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    isResolving.current = false;
    await update(ref(db), updates);
    await removePendingBuzzes();

    if (onAnnounceAsker) {
      await onAnnounceAsker();
      await new Promise(r => setTimeout(r, 1600));
    }
    if (onAdvanceAsker) await onAdvanceAsker();
    setIsTransitioning(false);
  }

  async function end() {
    if (canControl) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
    }
  }

  return { resetBuzzers, validate, wrong, skip, end, isTransitioning };
}
