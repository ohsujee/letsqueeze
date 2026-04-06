"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, signInAnonymously, onAuthStateChanged
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
import { BellRinging } from '@phosphor-icons/react';
import { storage } from "@/lib/utils/storage";
import { getFlatCSSVars } from "@/lib/config/colors";
import { GameEndTransition } from "@/components/transitions";
import './quiz-play.css';
import '@/app/game/quiz-guide-styles.css';

export function QuizPlayContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  const [state, setState] = useState(null);
  const [meta, setMeta] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showAskerTransition, setShowAskerTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const prevAskerUidRef = useRef(null);

  // Centralized players hook
  const { players, me: authMe } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });
  // In dev simulation, devUid differs from auth uid — find the right player
  const me = devUid ? players.find(p => p.uid === devUid) || authMe : authMe;

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

  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const progressLabel = total ? `Q${Math.min(qIndex + 1, total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Penalty server
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Sounds
  const playBuzz = useSound("/sounds/quiz-buzzer.wav");
  const prevLock = useRef(null);

  useEffect(() => {
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) playBuzz();
    prevLock.current = cur;
  }, [state?.lockUid, playBuzz]);



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

  // Sorted players for leaderboard ribbon (must be before ALL conditional returns)
  const sortedPlayers = useMemo(() =>
    [...players].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [players]
  );

  const myRank = useMemo(() => {
    const idx = sortedPlayers.findIndex(p => p.uid === me?.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedPlayers, me?.uid]);

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
              await update(ref(db, `rooms/${code}/state`), { phase: 'ended' });
              await update(ref(db, `rooms/${code}/meta`), { closed: true });
            } else {
              await leaveRoom();
            }
            router.push('/home');
          }}
        />
      </>
    );
  }

  // ===== PLAYER VIEW (Buzzer-centric redesign) =====
  return (
    <div className="player-game-page game-page" style={getFlatCSSVars('quiz')}>
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

      {/* ── Header ── */}
      <GamePlayHeader
        game="quiz"
        progress={progressLabel}
        title={title}
        score={Math.max(0, me?.score || 0)}
        showScore={true}
        onExit={async () => {
          if (isActualHost) {
            await update(ref(db, `rooms/${code}/state`), { phase: 'ended' });
            await update(ref(db, `rooms/${code}/meta`), { closed: true });
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

      {/* ── Main content (scrollable) ── */}
      <main className="quiz-play-main">

        {/* Status card — flip entre "lit la question" et "a buzzé" */}
        <div className="quiz-play-status-wrapper">
          <AnimatePresence mode="wait">
            {state?.buzzBanner && state?.lockUid !== myUid ? (
              <motion.div
                key="buzz"
                className="quiz-play-status buzz-active"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="buzz-notif-label">
                  <BellRinging size={14} weight="fill" />
                  <span>Buzz de</span>
                </div>
                <span className="buzz-notif-name">
                  {players.find(p => p.uid === state.lockUid)?.name || 'Joueur'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                className="quiz-play-status"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="quiz-play-status-text">
                  {isPartyMode && currentAsker
                    ? `${currentAsker.name} lit la question...`
                    : `${meta?.hostName || 'L\'hôte'} lit la question...`
                  }
                </span>
                <div className="waiting-dots"><span /><span /><span /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Leaderboard */}
        <div className="quiz-play-leaderboard">
          <Leaderboard players={players} mode={meta?.mode} teams={meta?.teams} />
        </div>

      </main>

      {/* ── Buzzer ── */}
      <footer className="buzzer-footer">
        <Buzzer
          roomCode={code}
          playerUid={myUid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          serverOffset={offset}
          disabled={isPartyMode && !canBuzz(myUid, me?.teamId)}
          teamColor={(me?.teamId && meta?.teams?.[me.teamId]?.color) || null}
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
