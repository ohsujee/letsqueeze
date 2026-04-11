"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  set,
  serverTimestamp,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import { useToast } from "@/lib/hooks/useToast";
import { motion, AnimatePresence } from 'framer-motion';
import ExitButton from "@/lib/components/ExitButton";
import PlayerManager from "@/components/game/PlayerManager";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { VerdictTransition } from "@/components/game-alibi/VerdictTransition";
import { AlibiRoundTransition } from "@/components/game-alibi";
import InterrogationScene from "@/components/game-alibi/InterrogationScene";
import { GameEndTransition } from "@/components/transitions";
import { hueScenariosService } from "@/lib/hue-module";
import { useAlibiGroupRotation } from "@/lib/hooks/useAlibiGroupRotation";

import './alibi-play.css';

export function AlibiPlayContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  // Safe-area color continuity with the dark interrogation scene
  useAppShellBg('#0a0605');

  const [myUid, setMyUid] = useState(devUid || null);
  const [myTeam, setMyTeam] = useState(null);
  const [myGroupId, setMyGroupId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [hostUid, setHostUid] = useState(null);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [groups, setGroups] = useState({});
  const [questions, setQuestions] = useState([]);
  const [showRoundTransition, setShowRoundTransition] = useState(false);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Room guard - détecte kick et fermeture room
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    hostUid: meta?.hostUid
  });

  // Player cleanup - gère déconnexion pendant le jeu
  const { markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Inactivity detection - marque le joueur inactif après 30s
  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    inactivityTimeout: 30000
  });

  // Party Mode detection and rotation
  const isPartyMode = meta?.gameMasterMode === 'party';

  // Use the group rotation hook for Party Mode
  const {
    myRole,
    inspectorGroup,
    accusedGroup,
    spectatorGroups,
    currentRound,
    totalRounds,
    gameProgress,
    advanceToNextRound
  } = useAlibiGroupRotation({
    roomCode: code,
    meta,
    state,
    groups,
    players,
    myUid,
    isHost
  });

  // My team color for header styling in Party Mode
  const myGroupColor = useMemo(() => {
    if (!isPartyMode || !myGroupId) return null;
    return groups[myGroupId]?.color || null;
  }, [isPartyMode, myGroupId, groups]);

  // Derive suspects - in Party Mode, it's the accused group members
  const suspects = useMemo(() => {
    if (isPartyMode && accusedGroup) {
      return players.filter(p => p.groupId === accusedGroup.id);
    }
    return players.filter(p => p.team === "suspects");
  }, [players, isPartyMode, accusedGroup]);

  // Derive inspectors — opposing side, for the scene display
  const inspectors = useMemo(() => {
    if (isPartyMode && inspectorGroup) {
      return players.filter(p => p.groupId === inspectorGroup.id);
    }
    return players.filter(p => p.team === "inspectors");
  }, [players, isPartyMode, inspectorGroup]);

  // Spectators — party mode only: players who are neither inspector nor accused this round
  const spectators = useMemo(() => {
    if (!isPartyMode) return [];
    return players.filter(p =>
      p.groupId && p.groupId !== inspectorGroup?.id && p.groupId !== accusedGroup?.id
    );
  }, [players, isPartyMode, inspectorGroup, accusedGroup]);

  // Get questions for current context
  // In Party Mode: questions come from accused group's alibi
  const currentQuestions = useMemo(() => {
    if (isPartyMode && accusedGroup?.alibiData?.questions) {
      return accusedGroup.alibiData.questions;
    }
    return questions;
  }, [isPartyMode, accusedGroup, questions]);
  const toast = useToast();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionState, setQuestionState] = useState("waiting");
  const [timeLeft, setTimeLeft] = useState(30);
  const [startedAt, setStartedAt] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [allAnswered, setAllAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [responses, setResponses] = useState({});
  const [verdict, setVerdict] = useState(null);
  const timerRef = useRef(null);
  const timeoutTriggeredRef = useRef(null);
  const endTransitionTriggeredRef = useRef(false);

  // Fonction pour quitter et retourner au lobby
  async function exitGame() {
    if (isHost && code) {
      if (timerRef.current) clearInterval(timerRef.current);
      await update(ref(db, `rooms_alibi/${code}`), {
        state: {
          phase: "lobby",
          currentQuestion: 0,
          prepTimeLeft: 90,
          questionTimeLeft: 30,
          allAnswered: false
        },
        interrogation: null,
        questions: null,
        alibi: null
      });
    }
    router.push(`/alibi/room/${code}`);
  }

  const handleEndTransitionComplete = () => {
    router.replace(`/alibi/game/${code}/end`);
  };

  // Server time offset for accurate timer computation
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(offsetRef, snap => setServerOffset(snap.val() || 0));
    return () => unsub();
  }, []);

  // Auth - only set myUid (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [devUid]);

  // Listen to player team/group - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !myUid) return;

    const playerRef = ref(db, `rooms_alibi/${code}/players/${myUid}`);
    const unsub = onValue(playerRef, (snap) => {
      const player = snap.val();
      if (player) {
        setMyTeam(player.team);
        setMyGroupId(player.groupId || null);
      }
    });

    return () => unsub();
  }, [code, myUid]);

  // Listen to host - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !myUid) return;

    const hostRef = ref(db, `rooms_alibi/${code}/meta/hostUid`);
    const unsub = onValue(hostRef, (snap) => {
      const hUid = snap.val();
      setHostUid(hUid);
      setIsHost(hUid === myUid);
    });

    return () => unsub();
  }, [code, myUid]);

  // Écouter les questions (Game Master Mode)
  useEffect(() => {
    if (!code) return;
    const questionsUnsub = onValue(ref(db, `rooms_alibi/${code}/questions`), (snap) => {
      setQuestions(snap.val() || []);
    });
    return () => questionsUnsub();
  }, [code]);

  // Listen to meta (for Party Mode detection)
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
      setMeta(snap.val());
    });
    return () => metaUnsub();
  }, [code]);

  // Listen to state (for Party Mode rotation)
  useEffect(() => {
    if (!code) return;
    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      setState(snap.val());
    });
    return () => stateUnsub();
  }, [code]);

  // Listen to groups (Party Mode)
  useEffect(() => {
    if (!code) return;
    const groupsUnsub = onValue(ref(db, `rooms_alibi/${code}/groups`), (snap) => {
      setGroups(snap.val() || {});
    });
    return () => groupsUnsub();
  }, [code]);

  // Écouter l'état de l'interrogation
  useEffect(() => {
    if (!code) return;

    const interroUnsub = onValue(ref(db, `rooms_alibi/${code}/interrogation`), (snap) => {
      const data = snap.val() || {};
      setCurrentQuestion(data.currentQuestion || 0);
      setQuestionState(data.state || "waiting");
      setStartedAt(data.startedAt || null);
      setResponses(data.responses || {});
      setVerdict(data.verdict || null);
    });

    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "end" && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      interroUnsub();
      stateUnsub();
    };
  }, [code, router, isHost]);

  // Qui CONTRÔLE (peut écrire Firebase)
  // GMM: membres de l'équipe inspecteurs (pas seulement l'hôte)
  // Party Mode: membres du groupe inspecteur
  const canControl = useMemo(() => {
    if (isPartyMode) return myRole === 'inspector';
    return myTeam === 'inspectors';
  }, [isPartyMode, myRole, myTeam]);


  // Timer - calculé depuis le timestamp serveur, tourne sur tous les clients
  useEffect(() => {
    if (questionState !== "answering" || !startedAt) {
      return;
    }

    const tick = () => {
      const serverNow = Date.now() + serverOffset;
      const elapsed = Math.floor((serverNow - startedAt) / 1000);
      setTimeLeft(Math.max(0, 30 - elapsed));
    };

    tick(); // mise à jour immédiate
    timerRef.current = setInterval(tick, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [questionState, startedAt, serverOffset]);

  // Timeout - déclenché par l'inspecteur (canControl), pas uniquement l'hôte
  useEffect(() => {
    if (!canControl || questionState !== "answering") {
      timeoutTriggeredRef.current = false;
      return;
    }

    if (timeLeft <= 0 && !allAnswered && !timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        state: "verdict",
        verdict: "timeout"
      });
    }
  }, [timeLeft, allAnswered, questionState, canControl, code]);

  // Actions INSPECTEURS
  const startQuestion = async () => {
    if (!canControl) return;

    hueScenariosService.trigger('alibi', 'roundStart');

    try {
      await set(ref(db, `rooms_alibi/${code}/interrogation`), {
        currentQuestion,
        state: "answering",
        startedAt: serverTimestamp(),
        responses: {},
        verdict: null,
        ...(isPartyMode && { targetGroupId: accusedGroup?.id })
      });
    } catch (err) {
      console.error('[Alibi] startQuestion failed:', err);
      toast.error('Impossible de lancer le timer. Réessaie.');
      return;
    }

    setHasAnswered(false);
    setMyAnswer("");
  };

  const judgeAnswers = async (isCorrect) => {
    if (!canControl) return;

    await update(ref(db, `rooms_alibi/${code}/interrogation`), {
      state: "verdict",
      verdict: isCorrect ? "correct" : "incorrect"
    });

    if (isPartyMode && accusedGroup) {
      // Party Mode: update accused group's score
      const currentScore = accusedGroup.score || { correct: 0, total: 0 };
      await update(ref(db, `rooms_alibi/${code}/groups/${accusedGroup.id}/score`), {
        correct: currentScore.correct + (isCorrect ? 1 : 0),
        total: currentScore.total + 1
      });
    } else if (isCorrect) {
      // Game Master Mode: update global score
      const scoreRef = ref(db, `rooms_alibi/${code}/score/correct`);
      onValue(scoreRef, (snap) => {
        const current = snap.val() || 0;
        update(ref(db, `rooms_alibi/${code}/score`), { correct: current + 1 });
      }, { onlyOnce: true });
    }
  };

  const handleNextQuestion = async () => {
    if (!canControl) return;

    if (isPartyMode) {
      // Party Mode: chaque round = 1 question, la rotation gère l'alternance
      if (currentRound >= totalRounds - 1) {
        // Dernière question — fin de partie
        await update(ref(db, `rooms_alibi/${code}/state`), { phase: "end" });
      } else {
        // Avancer au round suivant (= prochaine question avec alternance)
        await advanceToNextRound();
        setShowRoundTransition(true);
        // Reset interrogation pour le nouveau round
        await update(ref(db, `rooms_alibi/${code}/interrogation`), {
          currentQuestion: 0,
          state: "waiting",
          startedAt: null,
          responses: {},
          verdict: null
        });
      }
    } else {
      // Game Master Mode: original logic
      if (currentQuestion >= 9) {
        await update(ref(db, `rooms_alibi/${code}/state`), { phase: "end" });
      } else {
        await update(ref(db, `rooms_alibi/${code}/interrogation`), {
          currentQuestion: currentQuestion + 1,
          state: "waiting",
          startedAt: null,
          responses: {},
          verdict: null
        });
      }
    }
  };

  // Reset local state on question change
  useEffect(() => {
    if (questionState === "waiting") {
      setHasAnswered(false);
      setMyAnswer("");
      setAllAnswered(false);
      timeoutTriggeredRef.current = false;
      setTimeLeft(30);
      setStartedAt(null);
    }
  }, [currentQuestion, questionState]);

  // Detect when all suspects answered
  useEffect(() => {
    if (questionState === "answering" && suspects.length > 0) {
      const allHaveAnswered = suspects.every(s => responses[s.uid]);
      setAllAnswered(allHaveAnswered);
    }
  }, [questionState, suspects, responses]);

  // Visual effects on verdict (Hue only, confetti removed)
  useEffect(() => {
    if (verdict === "correct") {
      hueScenariosService.trigger('alibi', 'goodAnswer');
    } else if (verdict === "incorrect") {
      hueScenariosService.trigger('alibi', 'badAnswer');
    } else if (verdict === "timeout") {
      hueScenariosService.trigger('alibi', 'timeUp');
    }
  }, [verdict]);

  // Hue ambiance
  useEffect(() => {
    hueScenariosService.trigger('alibi', 'ambiance');
    return () => {
      hueScenariosService.testScenario('reset');
    };
  }, []);

  // Check if I can answer (suspect in Game Master Mode OR accused group in Party Mode)
  const canAnswer = useMemo(() => {
    if (isPartyMode) {
      return myRole === 'accused';
    }
    return myTeam === 'suspects';
  }, [isPartyMode, myRole, myTeam]);

  // View role for InterrogationScene
  const sceneViewRole = useMemo(() => {
    if (isPartyMode && myRole === 'spectator') return 'spectator';
    if (canControl) return 'inspector';
    if (canAnswer) return 'suspect';
    return 'spectator';
  }, [isPartyMode, myRole, canControl, canAnswer]);

  // Actions SUSPECTS / ACCUSED
  const submitAnswer = async () => {
    if (!canAnswer || !myUid || hasAnswered) return;

    const myName = players.find(p => p.uid === myUid)?.name || "Inconnu";

    await update(ref(db, `rooms_alibi/${code}/interrogation/responses/${myUid}`), {
      answer: myAnswer,
      uid: myUid,
      name: myName
    });

    setHasAnswered(true);
  };

  const currentQuestionData = currentQuestions[currentQuestion];

  // Progress calculation
  const progressPercent = useMemo(() => {
    if (isPartyMode) {
      // Party Mode: chaque round = 1 question
      return totalRounds > 0 ? Math.round(((currentRound + 1) / totalRounds) * 100) : 0;
    }
    return ((currentQuestion + 1) / 10) * 100;
  }, [isPartyMode, currentRound, totalRounds, currentQuestion]);

  const isUrgent = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  const sceneQuestion = currentQuestionData ? {
    text: currentQuestionData.text,
    hint: currentQuestionData.hint,
    number: (isPartyMode ? currentRound : currentQuestion) + 1,
  } : null;

  return (
    <div className="interro-screen game-page">

      {/* Header */}
      <header
        className={`interro-header ${isPartyMode && myGroupColor ? 'party-mode' : ''}`}
        style={isPartyMode && myGroupColor ? { '--my-team-color': myGroupColor } : {}}
      >
        <div className="interro-header-content">
          <div className="interro-header-title">
            {isPartyMode ? (
              <>Question {currentRound + 1}/{totalRounds}</>
            ) : (
              <>Question {currentQuestion + 1}/10</>
            )}
          </div>

          <div className="interro-header-actions">
            {isHost && (
              <PlayerManager
                players={players}
                roomCode={code}
                roomPrefix="rooms_alibi"
                hostUid={hostUid}
                variant="alibi"
                phase="playing"
              />
            )}
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? Tout le monde retournera au lobby."
              onExit={exitGame}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="interro-progress">
          <motion.div
            className="interro-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Immersive interrogation scene — renders the full UI */}
      <InterrogationScene
        viewRole={sceneViewRole}
        questionState={questionState}
        inspectors={inspectors}
        suspects={suspects}
        spectators={spectators}
        question={sceneQuestion}
        timeLeft={timeLeft}
        isUrgent={isUrgent}
        isCritical={isCritical}
        hasAnswered={hasAnswered}
        allAnswered={allAnswered}
        myAnswer={myAnswer}
        responses={responses}
        onMyAnswerChange={setMyAnswer}
        onStartQuestion={startQuestion}
        onSubmitAnswer={submitAnswer}
        onJudge={judgeAnswers}
      />

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_alibi"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      {/* Verdict Transition */}
      <VerdictTransition
        isVisible={questionState === "verdict" && verdict !== null}
        verdict={verdict}
        showButton={canControl}
        onButtonClick={handleNextQuestion}
        duration={3500}
      />

      {/* Round Transition - Party Mode only */}
      {isPartyMode && (
        <AlibiRoundTransition
          show={showRoundTransition}
          inspectorGroup={inspectorGroup}
          accusedGroup={accusedGroup}
          myRole={myRole}
          progress={gameProgress}
          duration={4000}
          onComplete={() => setShowRoundTransition(false)}
        />
      )}

      {/* End Transition */}
      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="alibi"
            onComplete={handleEndTransitionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AlibiInterrogation() {
  const { code } = useParams();
  return <AlibiPlayContent code={code} />;
}
