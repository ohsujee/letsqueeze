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
import { Send, Clock, CheckCircle, XCircle, Users, AlertTriangle, Eye } from 'lucide-react';
import ExitButton from "@/lib/components/ExitButton";
import PlayerManager from "@/components/game/PlayerManager";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { VerdictTransition } from "@/components/game-alibi/VerdictTransition";
import { AlibiRoundTransition, AlibiSpectatorView } from "@/components/game-alibi";
import { GameEndTransition } from "@/components/transitions";
import { hueScenariosService } from "@/lib/hue-module";
import { useAlibiGroupRotation } from "@/lib/hooks/useAlibiGroupRotation";

import './alibi-play.css';
import '@/app/alibi/alibi-theme.css';

export function AlibiPlayContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

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
  const { markVoluntaryLeave, isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost
  });

  // Keep screen awake during game

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

  // Qui VOIT la vue inspecteur — basé sur le rôle/team, pas sur le statut d'hôte
  const canSeeInspectorView = useMemo(() => {
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
  }, [timeLeft, allAnswered, questionState, canControl, code, currentQuestion]);

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

  const formatTime = (seconds) => `${seconds}s`;

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

  return (
    <div className="interro-screen game-page">
      {/* Animated Background */}
      <div className="interro-bg" />

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

      {/* Main Content */}
      <main className="interro-content">
        <div className="interro-wrapper">

          {/* ========== WAITING STATE ========== */}
          {questionState === "waiting" && (
            <>
              {/* INSPECTORS / Inspector Group - Waiting */}
              {canSeeInspectorView && (
                <motion.div
                  className="interro-waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="interro-phase-header">
                    {isPartyMode && inspectorGroup && (
                      <div className="interro-group-badge" style={{ '--group-color': inspectorGroup.color }}>
                        <span className="group-dot" style={{ background: inspectorGroup.color }} />
                        <span>🔍 {inspectorGroup.name} interroge</span>
                      </div>
                    )}
                    <h1 className="interro-title">Interrogatoire</h1>
                    <p className="interro-subtitle">
                      {isPartyMode
                        ? `Posez cette question à ${accusedGroup?.name || 'l\'équipe accusée'}`
                        : 'Posez cette question aux suspects'}
                    </p>
                  </div>

                  {/* Hint for inspector - reference passage */}
                  {currentQuestionData?.hint && (
                    <motion.div
                      className="interro-hint-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <div className="interro-hint-label">📖 Passage de référence</div>
                      <p className="interro-hint-text">{currentQuestionData.hint}</p>
                    </motion.div>
                  )}

                  <motion.div
                    className="interro-question-card spotlight"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="interro-card-glow" />
                    <div className="interro-question-badge">Question {isPartyMode ? currentRound + 1 : currentQuestion + 1}</div>
                    <p className="interro-question-text">{currentQuestionData?.text}</p>
                  </motion.div>

                  {canControl && (
                    <motion.button
                      className="interro-btn-start"
                      onClick={startQuestion}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Clock size={20} />
                      <span>Lancer le timer (30s)</span>
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* SUSPECTS / Accused Group - Waiting */}
              {canAnswer && (
                <motion.div
                  className="interro-waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="interro-phase-header">
                    {isPartyMode && accusedGroup && (
                      <div className="interro-group-badge accused" style={{ '--group-color': accusedGroup.color }}>
                        <span className="group-dot" style={{ background: accusedGroup.color }} />
                        <span>🎭 {accusedGroup.name}</span>
                      </div>
                    )}
                    <h1 className="interro-title">En attente...</h1>
                    <p className="interro-subtitle">
                      {isPartyMode
                        ? `${inspectorGroup?.name || 'Les inspecteurs'} préparent la question`
                        : 'Les inspecteurs préparent la question'}
                    </p>
                  </div>

                  <motion.div
                    className="interro-waiting-card"
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(245, 158, 11, 0.2)',
                        '0 0 40px rgba(245, 158, 11, 0.4)',
                        '0 0 20px rgba(245, 158, 11, 0.2)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="interro-card-glow" />
                    <motion.div
                      className="interro-waiting-icon"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock size={48} />
                    </motion.div>
                    <p className="interro-waiting-text">Prépare-toi à répondre...</p>
                  </motion.div>
                </motion.div>
              )}

              {/* SPECTATORS - Party Mode only */}
              {isPartyMode && myRole === 'spectator' && (
                <AlibiSpectatorView
                  inspectorGroup={inspectorGroup}
                  accusedGroup={accusedGroup}
                  question={currentQuestionData}
                  interrogation={{ state: questionState, responses, verdict }}
                  progress={gameProgress}
                  timeLeft={timeLeft}
                />
              )}
            </>
          )}

          {/* ========== ANSWERING STATE ========== */}
          {questionState === "answering" && (
            <>
              {/* SPECTATORS - Party Mode only */}
              {isPartyMode && myRole === 'spectator' && (
                <AlibiSpectatorView
                  inspectorGroup={inspectorGroup}
                  accusedGroup={accusedGroup}
                  question={currentQuestionData}
                  interrogation={{ state: questionState, responses, verdict }}
                  progress={gameProgress}
                  timeLeft={timeLeft}
                />
              )}

              {/* SUSPECTS / Accused Group - Answering */}
              {canAnswer && (
                <motion.div
                  className="interro-answering"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Timer prominent */}
                  <motion.div
                    className={`interro-timer-card ${allAnswered ? 'all-answered' : isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}
                    animate={!allAnswered && isCritical ? {
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 20px rgba(239, 68, 68, 0.4)',
                        '0 0 40px rgba(239, 68, 68, 0.7)',
                        '0 0 20px rgba(239, 68, 68, 0.4)'
                      ]
                    } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    {allAnswered ? (
                      <>
                        <CheckCircle size={32} className="timer-check-icon" />
                        <span className="interro-timer-success">Toutes les réponses envoyées !</span>
                      </>
                    ) : (
                      <>
                        <span className="interro-timer-big">{formatTime(timeLeft)}</span>
                        {isCritical && <span className="interro-timer-warning">DÉPÊCHE-TOI !</span>}
                      </>
                    )}
                  </motion.div>

                  {/* Question */}
                  <motion.div
                    className="interro-question-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="interro-card-glow" />
                    <div className="interro-question-badge">Question {isPartyMode ? currentRound + 1 : currentQuestion + 1}</div>
                    <p className="interro-question-text">{currentQuestionData?.text}</p>
                  </motion.div>

                  {/* Answer input or confirmation */}
                  {!hasAnswered ? (
                    <motion.div
                      className="interro-answer-section"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <textarea
                        className="interro-textarea"
                        placeholder="Ta réponse..."
                        value={myAnswer}
                        onChange={(e) => setMyAnswer(e.target.value)}
                        maxLength={500}
                        autoComplete="off"
                        autoFocus
                      />
                      <motion.button
                        className="interro-btn-submit"
                        onClick={submitAnswer}
                        disabled={!myAnswer.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Send size={20} />
                        <span>Valider ma réponse</span>
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="interro-answered-card"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <CheckCircle size={48} />
                      <p className="interro-answered-title">Réponse envoyée !</p>
                      <p className="interro-answered-subtitle">
                        {allAnswered ? "En attente du verdict des inspecteurs..." : "En attente des autres suspects..."}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* INSPECTORS / Inspector Group - Answering */}
              {canSeeInspectorView && (
                <motion.div
                  className="interro-answering"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Timer */}
                  <motion.div
                    className={`interro-timer-card ${allAnswered ? 'all-answered' : isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}
                    animate={!allAnswered && isCritical ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    {allAnswered ? (
                      <>
                        <CheckCircle size={32} className="timer-check-icon" />
                        <span className="interro-timer-success">Toutes les réponses reçues !</span>
                      </>
                    ) : (
                      <span className="interro-timer-big">{formatTime(timeLeft)}</span>
                    )}
                  </motion.div>

                  {/* Hint for inspector - reference passage */}
                  {currentQuestionData?.hint && (
                    <motion.div
                      className="interro-hint-card compact"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="interro-hint-label">📖 Référence</div>
                      <p className="interro-hint-text">{currentQuestionData.hint}</p>
                    </motion.div>
                  )}

                  {/* Question reminder */}
                  <motion.div
                    className="interro-question-card compact"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="interro-card-glow" />
                    <div className="interro-question-badge">Question {isPartyMode ? currentRound + 1 : currentQuestion + 1}</div>
                    <p className="interro-question-text">{currentQuestionData?.text}</p>
                  </motion.div>

                  {/* Responses counter */}
                  <div className="interro-responses-counter">
                    <Users size={16} />
                    <span>{Object.keys(responses).length} / {suspects.length} réponses</span>
                  </div>

                  {/* Responses list */}
                  <div className="interro-responses-list">
                    {suspects.map((suspect, index) => {
                      const response = responses[suspect.uid];
                      return (
                        <motion.div
                          key={suspect.uid}
                          className={`interro-response-card ${response ? 'answered' : 'waiting'}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="interro-response-header">
                            <span className="interro-response-name">{suspect.name}</span>
                            {response ? (
                              <CheckCircle size={18} className="status-success" />
                            ) : (
                              <Clock size={18} className="status-waiting" />
                            )}
                          </div>
                          {response ? (
                            <p className="interro-response-text">{response.answer}</p>
                          ) : (
                            <p className="interro-response-pending">En attente de réponse...</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Judgment buttons */}
                  <AnimatePresence>
                    {allAnswered && canControl && (
                      <motion.div
                        className="interro-judgment"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <p className="interro-judgment-label">Les réponses sont-elles cohérentes ?</p>
                        <div className="interro-judgment-buttons">
                          <motion.button
                            className="interro-btn-judge reject"
                            onClick={() => judgeAnswers(false)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <XCircle size={24} />
                            <span>Refuser</span>
                          </motion.button>
                          <motion.button
                            className="interro-btn-judge accept"
                            onClick={() => judgeAnswers(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <CheckCircle size={24} />
                            <span>Valider</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </>
          )}

          {/* No team / No group */}
          {((!isPartyMode && !myTeam) || (isPartyMode && !myGroupId)) && (
            <motion.div
              className="interro-no-team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={48} />
              <p>{isPartyMode ? "Tu n'es assigné à aucun groupe..." : "Tu n'es assigné à aucune équipe..."}</p>
            </motion.div>
          )}
        </div>
      </main>

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
