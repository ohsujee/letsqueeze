"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import ExitButton from "@/lib/components/ExitButton";
import Leaderboard from "@/components/game/Leaderboard";
import PlayerManager from "@/components/game/PlayerManager";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { hueScenariosService } from "@/lib/hue-module";
import { GameEndTransition } from "@/components/transitions";
import QuestionCard from "@/components/game/QuestionCard";
import HostActionFooter from "@/components/game/HostActionFooter";

/**
 * QuizHostView - Shared component for Quiz host view
 * Used by both the host page and the play page (when player is the asker in Party Mode)
 *
 * @param {string} code - Room code
 * @param {boolean} isActualHost - True if this is the actual host (Game Master mode), false for Party Mode asker
 * @param {function} onAdvanceAsker - Callback to advance to next asker (Party Mode only)
 */
export default function QuizHostView({ code, isActualHost = true, onAdvanceAsker }) {
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [conf, setConf] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Server time sync (300ms tick for score updates)
  const { serverNow } = useServerTime(300);

  const myUid = auth.currentUser?.uid;

  // Can this user control the game? (actual host OR party mode asker)
  const canControl = isActualHost || (meta?.gameMasterMode === 'party' && state?.currentAskerUid === myUid);

  // Load scoring config
  useEffect(() => {
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  }, []);

  // DB listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms/${code}/meta`), s => setMeta(s.val()));
    const u2 = onValue(ref(db, `rooms/${code}/state`), s => setState(s.val()));
    const u3 = onValue(ref(db, `rooms/${code}/quiz`), s => setQuiz(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  // Actual host: Redirect to play page in Party Mode (no separate host)
  useEffect(() => {
    if (isActualHost && meta?.gameMasterMode === 'party') {
      router.replace(`/game/${code}/play`);
    }
  }, [isActualHost, meta?.gameMasterMode, code, router]);

  // Redirect when phase changes
  useEffect(() => {
    if (state?.phase === "ended" && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state?.phase === "lobby") router.replace(`/room/${code}`);
  }, [state?.phase, router, code]);

  // Hue ambiance on load (actual host only)
  useEffect(() => {
    if (isActualHost) {
      hueScenariosService.trigger('gigglz', 'ambiance');
    }
  }, [isActualHost]);

  // Room guard (actual host only)
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost: isActualHost
  });

  // Host disconnect (actual host only)
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms',
    isHost: isActualHost
  });

  // Keep screen awake
  useWakeLock({ enabled: true });

  // Exit and end game (actual host only)
  async function exitAndEndGame() {
    if (code && isActualHost) {
      await update(ref(db, `rooms/${code}/meta`), { closed: true });
    }
    router.push('/home');
  }

  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex + 1, total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Points calculation (server sync + pause)
  const elapsedEffective = useMemo(() => {
    if (!state?.revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [state?.revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(() => {
    if (!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.round(c.floor + (c.start - c.floor) * ratio);
    return { pointsEnJeu: pts, ratioRemain: ratio, cfg: c };
  }, [conf, q, elapsedEffective]);

  // Sounds
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const playCorrect = useSound("/sounds/quiz-good-answer.wav");
  const playWrong = useSound("/sounds/quiz-bad-answer.wav");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  const timeUpTriggered = useRef(false);

  // Buzz system
  const BUZZ_WINDOW_MS = 150;
  const buzzWindowTimeout = useRef(null);
  const buzzCache = useRef({});
  const isResolving = useRef(false);

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
        const buzzCount = Object.keys(buzzesToResolve).length;

        if (buzzCount === 0) {
          console.log('[Buzz] Aucun buzz a resoudre');
          return;
        }

        console.log(`[Buzz] Resolution de ${buzzCount} buzz(es)...`);

        const { get: fbGet } = await import('firebase/database');
        const lockSnap = await fbGet(ref(db, `rooms/${code}/state/lockUid`));
        if (lockSnap.val()) {
          console.log('[Buzz] lockUid deja defini, abandon');
          return;
        }

        const buzzArray = Object.values(buzzesToResolve);
        buzzArray.sort((a, b) => a.adjustedTime - b.adjustedTime);
        const winner = buzzArray[0];

        console.log(`[Buzz] Gagnant: ${winner.name} (adjustedTime: ${winner.adjustedTime})`);

        const { runTransaction: fbTransaction } = await import('firebase/database');
        const lockResult = await fbTransaction(ref(db, `rooms/${code}/state/lockUid`), (currentLock) => {
          if (currentLock) return currentLock;
          return winner.uid;
        });

        if (lockResult.snapshot.val() !== winner.uid) {
          console.log('[Buzz] Transaction perdue, quelqu\'un d\'autre a ecrit lockUid');
          return;
        }

        await update(ref(db, `rooms/${code}/state`), {
          buzz: { uid: winner.uid, at: winner.localTime },
          buzzBanner: `🔔 ${winner.name} a buzze !`,
          pausedAt: serverTimestamp(),
          lockedAt: serverTimestamp()
        });

        const { remove: fbRemove } = await import('firebase/database');
        await fbRemove(pendingBuzzesRef).catch(() => {});

        playBuzz();
        hueScenariosService.trigger('gigglz', 'buzz');

        console.log('[Buzz] Resolution terminee');

      } catch (error) {
        console.error('[Buzz] Erreur resolution:', error);
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

      if (buzzWindowTimeout.current) {
        console.log(`[Buzz] +1 buzz ajoute au cache (total: ${buzzCount})`);
        return;
      }

      if (isResolving.current) {
        console.log('[Buzz] Resolution en cours, buzz ajoute au cache');
        return;
      }

      console.log(`[Buzz] Premier buzz detecte, demarrage fenetre ${BUZZ_WINDOW_MS}ms`);
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
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      prevLock.current = cur;
    }
    prevLock.current = cur;
  }, [canControl, state?.lockUid]);

  const computeResumeFields = useCallback(() => {
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || state?.lockedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null, lockedAt: null };
  }, [state]);

  // Actions
  async function revealToggle() {
    if (!canControl || !q) return;

    if (!state?.revealed) {
      hueScenariosService.trigger('gigglz', 'roundStart');
      await update(ref(db, `rooms/${code}/state`), {
        revealed: true,
        lastRevealAt: serverTimestamp(),
        elapsedAcc: 0
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
      lockUid: null,
      buzzBanner: "",
      buzz: null,
      ...resume
    });
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }

  async function validate() {
    if (!canControl || !q || !state?.lockUid || !conf) return;

    hueScenariosService.trigger('gigglz', 'goodAnswer');
    playCorrect();

    // Petit délai pour laisser le son jouer
    await new Promise(resolve => setTimeout(resolve, 300));

    const uid = state.lockUid;
    const pts = pointsEnJeu;

    await runTransaction(ref(db, `rooms/${code}/players/${uid}/score`), (cur) => (cur || 0) + pts);

    if (meta?.mode === "equipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms/${code}/meta/teams/${teamId}/score`), (cur) => (cur || 0) + pts);
      }
    }

    const next = (state.currentIndex || 0) + 1;
    if (next >= total) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
      return;
    }

    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
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
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});

    // Party Mode: advance to next asker
    if (onAdvanceAsker) {
      await onAdvanceAsker();
    }
  }

  async function wrong() {
    if (!canControl || !state?.lockUid || !conf) return;

    hueScenariosService.trigger('gigglz', 'badAnswer');
    playWrong();

    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;
    const wrongPenalty = conf.wrongAnswerPenalty || 25;

    await runTransaction(ref(db, `rooms/${code}/players/${uid}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));

    if (meta?.mode === "equipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db, `rooms/${code}/meta/teams/${teamId}/score`), (cur) => Math.max(0, (cur || 0) - wrongPenalty));
      }
    }

    const updates = {};
    const until = serverNow + ms;

    if (meta?.mode === "equipes") {
      const player = players.find(p => p.uid === uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p => p.teamId === teamId).forEach(p => {
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
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});
  }

  async function skip() {
    if (!canControl || total === 0) return;
    const next = (state?.currentIndex || 0) + 1;
    if (next >= total) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
      return;
    }

    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
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
    await import('firebase/database').then(m =>
      m.remove(m.ref(db, `rooms/${code}/state/pendingBuzzes`))
    ).catch(() => {});

    // Party Mode: advance to next asker
    if (onAdvanceAsker) {
      await onAdvanceAsker();
    }
  }

  async function end() {
    if (canControl) {
      await update(ref(db, `rooms/${code}/state`), { phase: "ended" });
    }
  }

  const lockedName = state?.lockUid ? (players.find(p => p.uid === state.lockUid)?.name || state.lockUid) : "-";

  return (
    <div className="host-game-page game-page">
      {/* End transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="quiz"
            onComplete={() => router.replace(`/end/${code}`)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="game-header">
        <div className="game-header-content">
          <div className="game-header-left">
            <div className="game-header-progress">{progressLabel}</div>
            <div className="game-header-title">{title}</div>
          </div>

          <div className="game-header-right">
            {isActualHost && (
              <PlayerManager
                players={players}
                roomCode={code}
                roomPrefix="rooms"
                hostUid={meta?.hostUid}
                variant="quiz"
                phase="playing"
              />
            )}
            <ExitButton
              variant="header"
              confirmMessage={isActualHost
                ? "Voulez-vous vraiment quitter ? La partie sera abandonnee pour tous les joueurs."
                : "Voulez-vous vraiment quitter ?"
              }
              onExit={isActualHost ? exitAndEndGame : () => router.push('/home')}
            />
          </div>
        </div>
      </header>

      {/* Buzz validation modal */}
      <AnimatePresence>
        {state?.lockUid && (
          <>
            <motion.div
              className="buzz-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <div className="buzz-modal-container">
              <motion.div
                className="buzz-card"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="buzz-icon-wrapper">
                  <div className="buzz-icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" className="buzz-bell-icon">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                <div className="buzz-points-badge">
                  <span className="buzz-points-value">{pointsEnJeu}</span>
                  <span className="buzz-points-label">pts</span>
                </div>

                <div className="buzz-player-section">
                  <span className="buzz-player-name">{lockedName}</span>
                  <span className="buzz-player-action">a buzze</span>
                </div>

                {q && (
                  <div className="buzz-answer-section">
                    <span className="buzz-answer-label">Reponse attendue</span>
                    <span className="buzz-answer-value">{q.answer}</span>
                  </div>
                )}

                <div className="buzz-actions">
                  <button className="buzz-btn buzz-btn-wrong" onClick={wrong}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Faux
                  </button>
                  <button className="buzz-btn buzz-btn-correct" onClick={validate}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Correct
                  </button>
                </div>

                <button className="buzz-cancel" onClick={resetBuzzers}>
                  Annuler
                </button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="game-content">
        <QuestionCard
          question={q?.question}
          answer={q?.answer}
          points={pointsEnJeu}
          questionIndex={qIndex}
          isEmpty={!q}
        />

        <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Footer actions */}
      <HostActionFooter
        revealed={state?.revealed}
        onRevealToggle={revealToggle}
        onReset={resetBuzzers}
        onSkip={skip}
        onEnd={end}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={isActualHost}
        isHostTemporarilyDisconnected={false}
        hostDisconnectedAt={null}
      />

      <style jsx>{`
        .host-game-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          position: relative;
        }

        .host-game-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(239, 68, 68, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        .game-header {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
          padding: 12px 16px;
        }

        .game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 600px;
          margin: 0 auto;
          gap: 16px;
        }

        .game-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .game-header-progress {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: var(--quiz-glow, #a78bfa);
          text-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
          flex-shrink: 0;
        }

        .game-header-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .game-content {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 12px;
          overflow: hidden;
          min-height: 0;
        }

        .game-content > :global(.leaderboard-card) {
          flex: 1;
          min-height: 0;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        :global(.buzz-overlay) {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 9998;
        }

        .buzz-modal-container {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        :global(.buzz-card) {
          position: relative;
          width: 100%;
          max-width: 340px;
          background: linear-gradient(180deg, rgb(22, 18, 35) 0%, rgb(14, 12, 22) 100%);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 24px;
          padding: 50px 24px 24px 24px;
          margin-top: 30px;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.7),
            0 0 80px rgba(139, 92, 246, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .buzz-icon-wrapper {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }

        .buzz-icon-circle {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          border: 3px solid rgba(139, 92, 246, 0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 4px 20px rgba(139, 92, 246, 0.5),
            0 0 30px rgba(139, 92, 246, 0.3);
          animation: bell-entrance 0.5s ease-out;
        }

        :global(.buzz-bell-icon) {
          width: 28px;
          height: 28px;
          color: white;
          filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.5));
        }

        @keyframes bell-entrance {
          0% { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(10deg); }
          70% { transform: scale(0.95) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .buzz-points-badge {
          position: absolute;
          top: -15px;
          right: -8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 55px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          box-shadow:
            0 4px 15px rgba(34, 197, 94, 0.5),
            0 0 20px rgba(34, 197, 94, 0.3);
          transform: rotate(8deg);
          z-index: 10;
        }

        .buzz-points-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.3rem;
          color: white;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .buzz-points-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .buzz-player-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .buzz-player-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.6rem;
          color: #ffffff;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
          text-align: center;
          word-break: break-word;
        }

        .buzz-player-action {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }

        .buzz-answer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .buzz-answer-section .buzz-answer-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted, rgba(255, 255, 255, 0.5));
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .buzz-answer-section .buzz-answer-value {
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--success, #22c55e);
          text-shadow: 0 0 12px rgba(34, 197, 94, 0.5);
          text-align: center;
          line-height: 1.3;
        }

        .buzz-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .buzz-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .buzz-btn svg {
          width: 22px;
          height: 22px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .buzz-btn-wrong {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1));
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .buzz-btn-wrong:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.2));
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
          transform: translateY(-2px);
        }

        .buzz-btn-wrong:active {
          transform: translateY(0);
        }

        .buzz-btn-correct {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1));
          border-color: rgba(34, 197, 94, 0.4);
          color: #4ade80;
        }

        .buzz-btn-correct:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.35), rgba(34, 197, 94, 0.2));
          border-color: rgba(34, 197, 94, 0.6);
          box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
          transform: translateY(-2px);
        }

        .buzz-btn-correct:active {
          transform: translateY(0);
        }

        .buzz-cancel {
          width: 100%;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .buzz-cancel:hover {
          color: rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
