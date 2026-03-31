"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { db, ref, onValue, update, runTransaction, serverTimestamp, increment } from "@/lib/firebase";
import { useSound } from "@/lib/hooks/useSound";
import { hueScenariosService } from "@/lib/hue-module";

const BUZZ_WINDOW_MS = 150;

/**
 * useQuizActions — Encapsulates all quiz host game logic:
 * buzz resolution system, sounds, and action handlers
 * (reveal, validate, wrong, skip, resetBuzzers, end).
 */
export function useQuizActions({
  code, state, meta, quiz, players, conf, canControl,
  pointsEnJeu, ratioRemain, total,
  onAdvanceAsker, serverOffset,
}) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Sounds
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");

  // Refs
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  const timeUpTriggered = useRef(false);
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({});
  const isResolving = useRef(false);
  const isValidatingRef = useRef(false);

  // Play reveal sound + reset on new question
  useEffect(() => {
    if (state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current) {
      playReveal();
      prevRevealAt.current = state.lastRevealAt;
      timeUpTriggered.current = false;
      buzzCache.current = {};
      isResolving.current = false;
      if (buzzWindowTimeout.current) {
        clearTimeout(buzzWindowTimeout.current);
        buzzWindowTimeout.current = null;
      }
    }
  }, [state?.revealed, state?.lastRevealAt, playReveal]);

  // Trigger Hue timeUp
  useEffect(() => {
    if (state?.revealed && ratioRemain <= 0 && !timeUpTriggered.current && !state?.lockUid) {
      timeUpTriggered.current = true;
      hueScenariosService.trigger('gigglz', 'timeUp');
    }
  }, [state?.revealed, ratioRemain, state?.lockUid]);

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

        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms/${code}/state/lockUid`));
        if (lockSnap.val()) return;

        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms/${code}/state/lockUid`), (currentLock) => {
          if (currentLock) return currentLock;
          return winner.uid;
        });

        if (lockResult.snapshot.val() !== winner.uid) return;

        await update(ref(db, `rooms/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzzé !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

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

  // Lock tracking
  useEffect(() => {
    if (!canControl) return;
    prevLock.current = state?.lockUid || null;
  }, [canControl, state?.lockUid]);

  const computeResumeFields = useCallback(() => {
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || state?.lockedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null, lockedAt: null };
  }, [state]);

  const removePendingBuzzes = async () => {
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  };

  // ── Actions ──

  async function revealToggle() {
    if (!canControl || !quiz?.items?.[state?.currentIndex]) return;
    if (!state?.revealed) {
      hueScenariosService.trigger('gigglz', 'roundStart');
      await update(ref(db, `rooms/${code}/state`), {
        revealed: true, lastRevealAt: serverTimestamp(), elapsedAcc: 0
      });
    } else {
      await update(ref(db, `rooms/${code}/state`), { revealed: false });
    }
  }

  async function resetBuzzers() {
    if (!canControl) return;
    isResolving.current = false;
    if (buzzWindowTimeout.current) {
      clearTimeout(buzzWindowTimeout.current);
      buzzWindowTimeout.current = null;
    }
    const resume = computeResumeFields();
    await update(ref(db, `rooms/${code}/state`), {
      lockUid: null, buzzBanner: "", buzz: null, ...resume
    });
    await removePendingBuzzes();
  }

  async function validate() {
    if (isValidatingRef.current || !canControl || !state?.lockUid || !conf) return;
    isValidatingRef.current = true;

    try {
      hueScenariosService.trigger('gigglz', 'goodAnswer');
      playCorrect();
      await new Promise(resolve => setTimeout(resolve, 300));

      if (onAdvanceAsker) setIsTransitioning(true);

      const uid = state.lockUid;
      const pts = pointsEnJeu;
      const next = (state.currentIndex || 0) + 1;
      const updates = {};

      updates[`rooms/${code}/players/${uid}/score`] = increment(pts);

      if (meta?.mode === "équipes") {
        const player = players.find(p => p.uid === uid);
        if (player?.teamId) {
          updates[`rooms/${code}/meta/teams/${player.teamId}/score`] = increment(pts);
        }
      }

      if (next >= total) {
        updates[`rooms/${code}/state/phase`] = "ended";
        await update(ref(db), updates);
        return;
      }

      players.forEach(p => { updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0; });
      updates[`rooms/${code}/state/currentIndex`] = next;
      updates[`rooms/${code}/state/revealed`] = false;
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/pausedAt`] = null;
      updates[`rooms/${code}/state/lockedAt`] = null;
      updates[`rooms/${code}/state/elapsedAcc`] = 0;
      updates[`rooms/${code}/state/lastRevealAt`] = 0;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/buzz`] = null;

      isResolving.current = false;
      await update(ref(db), updates);
      await removePendingBuzzes();

      if (onAdvanceAsker) await onAdvanceAsker();
    } finally {
      isValidatingRef.current = false;
    }
  }

  async function wrong() {
    if (isValidatingRef.current || !canControl || !state?.lockUid || !conf) return;
    isValidatingRef.current = true;

    try {
      hueScenariosService.trigger('gigglz', 'badAnswer');
      playWrong();

      const ms = conf.lockoutMs || 8000;
      const uid = state.lockUid;
      const wrongPenalty = conf.wrongAnswerPenalty || 25;

      await runTransaction(ref(db, `rooms/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));

      if (meta?.mode === "équipes") {
        const player = players.find(p => p.uid === uid);
        if (player?.teamId) {
          await runTransaction(ref(db, `rooms/${code}/meta/teams/${player.teamId}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));
        }
      }

      const updates = {};
      const until = Date.now() + serverOffset + ms;

      if (meta?.mode === "équipes") {
        const player = players.find(p => p.uid === uid);
        if (player?.teamId) {
          players.filter(p => p.teamId === player.teamId).forEach(p => {
            updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = until;
          });
        } else {
          updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
        }
      } else {
        updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
      }

      const resume = computeResumeFields();
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/buzz`] = null;
      updates[`rooms/${code}/state/elapsedAcc`] = resume.elapsedAcc;
      updates[`rooms/${code}/state/lastRevealAt`] = resume.lastRevealAt;
      updates[`rooms/${code}/state/pausedAt`] = resume.pausedAt;
      updates[`rooms/${code}/state/lockedAt`] = resume.lockedAt;

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
    updates[`rooms/${code}/state/revealed`] = false;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/pausedAt`] = null;
    updates[`rooms/${code}/state/lockedAt`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = 0;
    updates[`rooms/${code}/state/lastRevealAt`] = 0;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    isResolving.current = false;
    await update(ref(db), updates);
    await removePendingBuzzes();

    if (onAdvanceAsker) await onAdvanceAsker();
  }

  async function end() {
    if (canControl) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
    }
  }

  return { revealToggle, resetBuzzers, validate, wrong, skip, end, isTransitioning };
}
