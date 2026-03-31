"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/game/Buzzer";
import Leaderboard from "@/components/game/Leaderboard";
import AskerTransition from "@/components/game/AskerTransition";
import QuizHostView from "@/components/game/QuizHostView";
import { motion, AnimatePresence } from "framer-motion";

import GamePlayHeader from "@/components/game/GamePlayHeader";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useServerTime } from "@/lib/hooks/useServerTime";
import { useSound } from "@/lib/hooks/useSound";
import { useAskerRotation } from "@/lib/hooks/useAskerRotation";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { storage } from "@/lib/utils/storage";
import { FitText } from "@/lib/hooks/useFitText";
import { GameEndTransition } from "@/components/transitions";
import './quiz-play.css';

export function QuizPlayContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [conf, setConf] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showAskerTransition, setShowAskerTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const prevAskerUidRef = useRef(null);

  // Centralized players hook
  const { players, me } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Party Mode: Asker rotation hook
  const {
    isPartyMode,
    currentAsker,
    currentAskerUid,
    isCurrentAsker,
    canBuzz,
    advanceToNextAsker,
    handleAskerDisconnect
  } = useAskerRotation({
    roomCode: code,
    roomPrefix: 'rooms',
    meta,
    state,
    players
  });

  // Am I the current asker in party mode?
  const amIAsker = isPartyMode && isCurrentAsker(myUid);

  // Server time sync (300ms tick for score updates)
  const { serverNow, offset } = useServerTime(300);

  // Auth
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        storage.set('last_game', {
          roomCode: code,
          roomPrefix: 'rooms',
          joinedAt: Date.now()
        });
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code, devUid]);

  // Player cleanup hook
  const { leaveRoom, markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    phase: 'playing'
  });

  // Inactivity detection
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Mark player as active on reconnection
  useEffect(() => {
    if (myUid && code) {
      markActive();
    }
  }, [myUid, code, markActive]);

  // Am I the actual host (room creator)?
  const isActualHost = meta?.hostUid === myUid;

  // Room guard
  const { markVoluntaryLeave, isValidating, isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost: isActualHost
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  // Désactivé quand amIAsker (QuizHostView gère son propre useHostDisconnect)
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms',
    hostUid: amIAsker ? null : meta?.hostUid
  });

  // Keep screen awake

  // Config scoring
  useEffect(() => {
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  }, []);

  // DB listeners
  useEffect(() => {
    if (isValidating) return;

    const u1 = onValue(ref(db, `rooms/${code}/state`), s => {
      const v = s.val();
      setState(v);
      if (v?.phase === "ended" && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
      if (v?.phase === "lobby") router.replace("/room/" + code);
    });
    const u2 = onValue(ref(db, `rooms/${code}/meta`), s => {
      const m = s.val();
      setMeta(m);
    });
    const u3 = onValue(ref(db, `rooms/${code}/quiz`), s => setQuiz(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code, router, isValidating]);

  const revealed = !!state?.revealed;
  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex + 1, total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Penalty server
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Points sync
  const elapsedEffective = useMemo(() => {
    if (!revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu } = useMemo(() => {
    if (!conf || !q) return { pointsEnJeu: 0 };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.round(c.floor + (c.start - c.floor) * ratio);
    return { pointsEnJeu: pts };
  }, [conf, q, elapsedEffective]);

  // Sounds
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);

  useEffect(() => {
    if (state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current) {
      playReveal();
      prevRevealAt.current = state.lastRevealAt;
    }
  }, [state?.revealed, state?.lastRevealAt, playReveal]);

  useEffect(() => {
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) playBuzz();
    prevLock.current = cur;
  }, [state?.lockUid, playBuzz]);

  // Confetti for correct answer
  const prevQuestionIndex = useRef(-1);
  const wasLockedByMe = useRef(false);
  useEffect(() => {
    const currentIndex = state?.currentIndex || 0;
    const isLockedByMe = state?.lockUid === auth.currentUser?.uid;

    if (currentIndex !== prevQuestionIndex.current && prevQuestionIndex.current >= 0 && wasLockedByMe.current) {
      // Confetti removed (caused white squares on Android)
    }

    prevQuestionIndex.current = currentIndex;
    wasLockedByMe.current = isLockedByMe;
  }, [state?.currentIndex, state?.lockUid]);

  const isMyTurn = state?.lockUid === me?.uid;

  // Party Mode: Si le poseur actuel a quitté, passer au suivant (host uniquement pour éviter race conditions)
  useEffect(() => {
    if (!isPartyMode || !isActualHost || !currentAskerUid) return;
    handleAskerDisconnect();
  }, [players, currentAskerUid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Party Mode: Show transition when asker changes (including first asker)
  useEffect(() => {
    if (!isPartyMode || !currentAskerUid) return;

    if (prevAskerUidRef.current !== currentAskerUid) {
      setShowAskerTransition(true);
    }
    prevAskerUidRef.current = currentAskerUid;
  }, [isPartyMode, currentAskerUid]);

  // Loading state
  if (isValidating) {
    return (
      <div className="player-game-page game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <div className="quiz-play-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // ===== PARTY MODE: ASKER VIEW - Use shared QuizHostView component =====
  if (amIAsker) {
    return (
      <>
        <AskerTransition
          show={showAskerTransition}
          asker={currentAsker}
          isMe={true}
          onComplete={() => setShowAskerTransition(false)}
          duration={2500}
        />
        <QuizHostView
          code={code}
          isActualHost={false}
          onAdvanceAsker={advanceToNextAsker}
          onExit={async () => {
            if (isActualHost) {
              await import('@/lib/firebase').then(({ update, ref: dbRef }) => {
                update(dbRef(db, `rooms/${code}/state`), { phase: 'ended' });
                update(dbRef(db, `rooms/${code}/meta`), { closed: true });
              });
            } else {
              await leaveRoom();
            }
            router.push('/home');
          }}
        />
      </>
    );
  }

  // ===== PLAYER VIEW (Buzzer) =====
  return (
    <div className={`player-game-page game-page ${isMyTurn ? 'my-turn' : ''}`}>
      {/* End transition */}
      <AnimatePresence>
        {showEndTransition && !meta?.closed && (
          <GameEndTransition
            variant="quiz"
            onComplete={() => router.replace(`/end/${code}`)}
          />
        )}
      </AnimatePresence>

      {/* Party Mode: Transition when asker changes */}
      <AskerTransition
        show={showAskerTransition}
        asker={currentAsker}
        isMe={false}
        onComplete={() => setShowAskerTransition(false)}
        duration={2500}
      />

      {/* Green glow when it's my turn */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 60px 5px rgba(34, 197, 94, 0.25)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <GamePlayHeader
        game="quiz"
        progress={progressLabel}
        title={title}
        score={me?.score || 0}
        showScore={true}
        onExit={async () => {
          if (isActualHost) {
            // Host quitte -> fermer la room
            const { update, ref: dbRef } = await import('@/lib/firebase');
            await update(dbRef(db, `rooms/${code}/state`), { phase: 'ended' });
            await update(dbRef(db, `rooms/${code}/meta`), { closed: true });
          } else {
            await leaveRoom();
          }
          router.push('/home');
        }}
        exitMessage={isActualHost
          ? "Voulez-vous vraiment quitter ? La partie sera terminée pour tous."
          : "Voulez-vous vraiment quitter ? Votre score sera conservé."
        }
      />

      {/* Buzz notification */}
      <AnimatePresence>
        {state?.buzzBanner && state?.lockUid !== me?.uid && (
          <div className="buzz-notification-wrapper">
            <motion.div
              className="buzz-notification"
              initial={{ opacity: 0, scale: 0.9, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="buzz-notification-icon">🔔</div>
              <div className="buzz-notification-content">
                <span className="buzz-notification-label">Quelqu'un a buzzé !</span>
                <span className="buzz-notification-name">
                  {players.find(p => p.uid === state.lockUid)?.name || 'Joueur'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="game-content">
        {/* Question Card */}
        <div className="question-card">
          <div className="points-badge">
            <span className="points-value">{pointsEnJeu}</span>
            <span className="points-label">points</span>
          </div>

          <div className="question-content">
            {q ? (
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <FitText minFontSize={12} maxFontSize={24} className="question-text">
                      {q.question}
                    </FitText>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="waiting-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <div className="waiting-label">
                      {isPartyMode && currentAsker
                        ? `${currentAsker.name} lit la question...`
                        : `${meta?.hostName || 'L\'animateur'} lit la question...`
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <div className="waiting-label">Chargement...</div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard players={players} currentPlayerUid={me?.uid} mode={meta?.mode} teams={meta?.teams} />
      </main>

      {/* Buzzer footer */}
      <footer className="buzzer-footer">
        <Buzzer
          roomCode={code}
          playerUid={auth.currentUser?.uid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          serverOffset={offset}
          disabled={isPartyMode && !canBuzz(myUid, me?.teamId)}
        />
      </footer>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={false}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

    </div>
  );
}

export default function PlayerGame() {
  const { code } = useParams();
  return <QuizPlayContent code={code} />;
}
