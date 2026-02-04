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
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
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
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { VerdictTransition } from "@/components/game-alibi/VerdictTransition";
import { AlibiRoundTransition, AlibiSpectatorView } from "@/components/game-alibi";
import { GameEndTransition } from "@/components/transitions";
import { hueScenariosService } from "@/lib/hue-module";
import { useAlibiGroupRotation } from "@/lib/hooks/useAlibiGroupRotation";

export default function AlibiInterrogation() {
  const { code } = useParams();
  const router = useRouter();

  const [myUid, setMyUid] = useState(null);
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
  useWakeLock({ enabled: true });

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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionState, setQuestionState] = useState("waiting");
  const [timeLeft, setTimeLeft] = useState(30);
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

  // Auth - only set myUid
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

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

      const shouldListenToTimer = !isHost || data.state !== "answering";
      if (shouldListenToTimer) {
        setTimeLeft(data.timeLeft || 30);
      }

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

  // Timer (host only)
  useEffect(() => {
    if (!isHost || questionState !== "answering" || allAnswered) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = prevTime - 1;
          if (newTime >= 0) {
            update(ref(db, `rooms_alibi/${code}/interrogation`), { timeLeft: newTime });
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [questionState, isHost, allAnswered, code]);

  // Timeout detection
  useEffect(() => {
    if (!isHost || questionState !== "answering") {
      timeoutTriggeredRef.current = false;
      return;
    }

    if (timeLeft <= 0 && !allAnswered && !timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Timeout = verdict, les inspecteurs doivent cliquer pour continuer
      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        state: "verdict",
        verdict: "timeout"
      });
    }
  }, [timeLeft, allAnswered, questionState, isHost, code, currentQuestion]);

  // Check if I can control (inspector in Game Master Mode OR inspector group in Party Mode)
  const canControl = useMemo(() => {
    if (isPartyMode) {
      return myRole === 'inspector';
    }
    return myTeam === 'inspectors';
  }, [isPartyMode, myRole, myTeam]);

  // Actions INSPECTEURS
  const startQuestion = async () => {
    if (!canControl) return;

    hueScenariosService.trigger('alibi', 'roundStart');

    await set(ref(db, `rooms_alibi/${code}/interrogation`), {
      currentQuestion,
      state: "answering",
      timeLeft: 30,
      responses: {},
      verdict: null,
      // Party Mode: track which group is being interrogated
      ...(isPartyMode && { targetGroupId: accusedGroup?.id })
    });

    setTimeLeft(30);
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
      // Party Mode: check if this round is complete
      const questionsPerGroup = state?.questionsPerGroup || 8;
      const questionInRound = currentQuestion % questionsPerGroup;

      if (questionInRound >= questionsPerGroup - 1) {
        // Round complete - check if game is over
        if (currentRound >= totalRounds - 1) {
          await update(ref(db, `rooms_alibi/${code}/state`), { phase: "end" });
        } else {
          // Advance to next round
          await advanceToNextRound();
          setShowRoundTransition(true);
          // Reset interrogation for new round
          await update(ref(db, `rooms_alibi/${code}/interrogation`), {
            currentQuestion: 0,
            state: "waiting",
            timeLeft: 30,
            responses: {},
            verdict: null
          });
        }
      } else {
        // Next question in current round
        await update(ref(db, `rooms_alibi/${code}/interrogation`), {
          currentQuestion: currentQuestion + 1,
          state: "waiting",
          timeLeft: 30,
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
          timeLeft: 30,
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
    }
  }, [currentQuestion, questionState]);

  // Detect when all suspects answered
  useEffect(() => {
    if (questionState === "answering" && suspects.length > 0) {
      const allHaveAnswered = suspects.every(s => responses[s.uid]);
      setAllAnswered(allHaveAnswered);
    }
  }, [questionState, suspects, responses]);

  // Visual effects on verdict
  useEffect(() => {
    if (verdict === "correct") {
      ParticleEffects.celebrate('high');
      hueScenariosService.trigger('alibi', 'goodAnswer');
    } else if (verdict === "incorrect") {
      ParticleEffects.wrongAnswer();
      hueScenariosService.trigger('alibi', 'badAnswer');
    } else if (verdict === "timeout") {
      ParticleEffects.wrongAnswer();
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
      // Party Mode: progress based on rounds
      return gameProgress?.percentage || 0;
    }
    return ((currentQuestion + 1) / 10) * 100;
  }, [isPartyMode, gameProgress, currentQuestion]);

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
              <>Round {currentRound + 1}/{totalRounds} • Q{currentQuestion + 1}</>
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
              {canControl && (
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
                    <div className="interro-question-badge">Question {currentQuestion + 1}</div>
                    <p className="interro-question-text">{currentQuestionData?.text}</p>
                  </motion.div>

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
                    <p className="interro-waiting-text">Préparez-vous à répondre...</p>
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
                    <div className="interro-question-badge">Question {currentQuestion + 1}</div>
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
              {canControl && (
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
                    <div className="interro-question-badge">Question {currentQuestion + 1}</div>
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
                    {allAnswered && (
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

      <style jsx global>{`
        html, body {
          overflow: hidden !important;
          height: 100% !important;
          max-height: 100% !important;
        }
      `}</style>
      <style jsx global>{`
        /* ===== INTERROGATION SCREEN ===== */

        .interro-screen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          background: #0a0a0f !important;
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .interro-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 60%),
            #0a0a0f;
          pointer-events: none;
        }

        /* ===== HEADER ===== */
        .interro-header {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(245, 158, 11, 0.2);
          padding-top: 0;
        }

        .interro-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
        }

        .interro-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .interro-header-title {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 700 !important;
          color: rgba(255, 255, 255, 0.7) !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Party Mode: colored header based on team */
        .interro-header.party-mode {
          border-bottom-color: var(--my-team-color, rgba(245, 158, 11, 0.2));
        }

        .interro-header.party-mode .interro-header-title {
          color: var(--my-team-color, rgba(255, 255, 255, 0.7)) !important;
        }

        .interro-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        :global(.interro-progress-fill) {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          position: relative;
          border-radius: 0 2px 2px 0;
        }

        .interro-header.party-mode :global(.interro-progress-fill) {
          background: linear-gradient(90deg, var(--my-team-color), color-mix(in srgb, var(--my-team-color) 70%, white));
        }

        :global(.interro-progress-fill)::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          animation: interro-shimmer 2s infinite;
        }

        /* ===== MAIN CONTENT ===== */
        .interro-content {
          flex: 1;
          position: relative;
          z-index: 1;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .interro-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 600px;
          margin: 0 auto;
          min-height: 100%;
        }

        /* ===== PHASE HEADER ===== */
        .interro-phase-header {
          text-align: center;
          flex-shrink: 0;
        }

        /* Party Mode: Group Badge */
        .interro-group-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03));
          border: 1.5px solid var(--group-color, #f59e0b);
          border-radius: 20px;
          margin-bottom: 8px;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.8125rem !important;
          font-weight: 600 !important;
          color: var(--group-color, #f59e0b) !important;
        }

        .interro-group-badge .group-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }

        .interro-group-badge.accused {
          border-color: var(--group-color, #6366f1);
          color: var(--group-color, #6366f1) !important;
        }

        .interro-title {
          font-family: 'Bungee', cursive !important;
          font-size: clamp(1.25rem, 5vw, 1.75rem) !important;
          color: #ffffff !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
          text-shadow:
            0 0 10px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3),
            0 0 40px rgba(245, 158, 11, 0.2) !important;
          margin: 0 0 4px 0 !important;
          line-height: 1.2 !important;
        }

        .interro-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0 !important;
        }

        /* ===== CARDS ===== */
        .interro-question-card,
        .interro-waiting-card,
        .interro-timer-card,
        .interro-answered-card,
        .interro-response-card,
        .interro-no-team {
          position: relative;
          background: rgba(20, 20, 30, 0.8) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          margin: 0 !important;
        }

        .interro-card-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
          animation: interro-glow-pulse 4s ease-in-out infinite;
          pointer-events: none;
        }

        /* Hint Card */
        .interro-hint-card {
          position: relative;
          background: rgba(30, 30, 45, 0.6) !important;
          border-radius: 12px !important;
          padding: 14px 16px !important;
          border: 1px solid rgba(99, 102, 241, 0.3) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .interro-hint-card.compact {
          padding: 10px 14px !important;
        }

        .interro-hint-label {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.7rem !important;
          font-weight: 600 !important;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(165, 180, 252, 0.8) !important;
          margin-bottom: 8px;
        }

        .interro-hint-card.compact .interro-hint-label {
          margin-bottom: 4px;
        }

        .interro-hint-text {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          font-style: italic;
          line-height: 1.5 !important;
          color: rgba(255, 255, 255, 0.7) !important;
          margin: 0 !important;
        }

        .interro-hint-card.compact .interro-hint-text {
          font-size: 0.8125rem !important;
        }

        /* Question Card */
        .interro-question-card.spotlight {
          border-color: rgba(245, 158, 11, 0.4) !important;
          box-shadow:
            0 0 30px rgba(245, 158, 11, 0.2),
            0 4px 20px rgba(0, 0, 0, 0.3) !important;
        }

        .interro-question-card.compact {
          padding: 14px 18px !important;
        }

        .interro-question-card.compact .interro-question-text {
          font-size: 1rem !important;
        }

        .interro-question-badge {
          display: inline-block;
          background: rgba(245, 158, 11, 0.25);
          padding: 6px 14px;
          border-radius: 8px;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #fbbf24 !important;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }

        .interro-question-text {
          font-family: 'Inter', sans-serif !important;
          font-size: 1.25rem !important;
          line-height: 1.6 !important;
          color: #ffffff !important;
          margin: 0 !important;
          position: relative;
          z-index: 1;
        }

        /* Timer Card */
        .interro-timer-card {
          text-align: center;
          padding: 16px !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }

        .interro-timer-card.urgent {
          border-color: rgba(245, 158, 11, 0.5) !important;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(20, 20, 30, 0.8)) !important;
        }

        .interro-timer-card.critical {
          border-color: rgba(239, 68, 68, 0.5) !important;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(20, 20, 30, 0.8)) !important;
        }

        .interro-timer-card.all-answered {
          border-color: rgba(34, 197, 94, 0.4) !important;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(20, 20, 30, 0.8)) !important;
          animation: none !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .timer-check-icon {
          color: #22c55e !important;
        }

        .interro-timer-card.all-answered .interro-timer-success {
          margin: 0 !important;
          text-align: center;
        }

        .interro-timer-big {
          font-family: 'Roboto Mono', monospace !important;
          font-size: 2.5rem !important;
          font-weight: 700 !important;
          color: #fbbf24 !important;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          display: block;
          margin: 0 !important;
        }

        .interro-timer-card.urgent .interro-timer-big {
          color: #f59e0b !important;
        }

        .interro-timer-card.critical .interro-timer-big {
          color: #ef4444 !important;
          text-shadow: 0 0 25px rgba(239, 68, 68, 0.6);
        }

        .interro-timer-warning {
          display: block;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 700 !important;
          color: #ef4444 !important;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 4px 0 0 0 !important;
          animation: interro-pulse-text 0.5s ease-in-out infinite;
        }

        .interro-timer-success {
          display: block;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          color: #22c55e !important;
          margin: 4px 0 0 0 !important;
        }

        /* Waiting */
        .interro-waiting {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
          justify-content: center;
        }

        .interro-waiting-card {
          text-align: center;
          padding: 40px 20px !important;
        }

        .interro-waiting-icon {
          color: #fbbf24;
          margin-bottom: 16px;
          opacity: 0.8;
          display: flex;
          justify-content: center;
        }

        .interro-waiting-text {
          font-family: 'Inter', sans-serif !important;
          font-size: 1rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0 !important;
          position: relative;
          z-index: 1;
        }

        /* Answering */
        .interro-answering {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .interro-answer-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .interro-textarea {
          width: 100%;
          min-height: 120px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 2px solid rgba(245, 158, 11, 0.2) !important;
          border-radius: 12px !important;
          color: #ffffff !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 1rem !important;
          line-height: 1.6;
          resize: none;
          transition: all 0.3s ease;
        }

        .interro-textarea:focus {
          outline: none;
          border-color: #f59e0b !important;
          background: rgba(245, 158, 11, 0.08) !important;
          box-shadow:
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 0 20px rgba(245, 158, 11, 0.1);
        }

        .interro-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        /* Buttons */
        .interro-btn-start,
        .interro-btn-submit {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          padding: 16px 28px !important;
          background: linear-gradient(135deg, #f59e0b, #d97706) !important;
          border: none !important;
          border-radius: 12px !important;
          color: white !important;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          cursor: pointer;
          box-shadow:
            0 4px 15px rgba(245, 158, 11, 0.4),
            0 0 30px rgba(245, 158, 11, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .interro-btn-submit:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed;
        }

        /* Answered Card */
        .interro-answered-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 32px 20px !important;
          border-color: rgba(34, 197, 94, 0.4) !important;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(20, 20, 30, 0.8)) !important;
          color: #22c55e !important;
        }

        .interro-answered-title {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #22c55e !important;
          margin: 8px 0 4px 0 !important;
        }

        .interro-answered-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0 !important;
          text-align: center;
        }

        /* Responses */
        .interro-responses-counter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .interro-responses-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .interro-response-card {
          padding: 14px 16px !important;
        }

        .interro-response-card.waiting {
          opacity: 0.6;
          border-style: dashed !important;
        }

        .interro-response-card.answered {
          border-color: rgba(34, 197, 94, 0.4) !important;
        }

        .interro-response-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .interro-response-name {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          color: #fbbf24 !important;
        }

        .interro-response-text {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.9375rem !important;
          line-height: 1.5 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          margin: 0 !important;
        }

        .interro-response-pending {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          font-style: italic;
          color: rgba(255, 255, 255, 0.4) !important;
          margin: 0 !important;
        }

        /* Judgment */
        .interro-judgment {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(245, 158, 11, 0.2);
          margin-top: 8px;
        }

        .interro-judgment-label {
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          color: rgba(255, 255, 255, 0.7) !important;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 !important;
        }

        .interro-judgment-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .interro-btn-judge {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 18px 16px !important;
          border: none !important;
          border-radius: 12px !important;
          font-family: 'Space Grotesk', sans-serif !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .interro-btn-judge.reject {
          background: linear-gradient(135deg, #ef4444, #dc2626) !important;
          color: white !important;
          box-shadow:
            0 4px 15px rgba(239, 68, 68, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        }

        .interro-btn-judge.accept {
          background: linear-gradient(135deg, #22c55e, #16a34a) !important;
          color: white !important;
          box-shadow:
            0 4px 15px rgba(34, 197, 94, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        }

        /* No Team */
        .interro-no-team {
          text-align: center;
          padding: 40px 20px !important;
          color: rgba(255, 255, 255, 0.4) !important;
        }

        .interro-no-team p {
          font-family: 'Inter', sans-serif !important;
          font-size: 1rem !important;
          color: rgba(255, 255, 255, 0.5) !important;
          margin: 12px 0 0 0 !important;
        }

        /* Icons status */
        .interro-screen .status-success {
          color: #22c55e !important;
        }

        .interro-screen .status-waiting {
          color: rgba(255, 255, 255, 0.4) !important;
          animation: interro-pulse-icon 1.5s ease-in-out infinite;
        }

        /* ===== ANIMATIONS ===== */
        @keyframes interro-shimmer {
          100% { left: 100%; }
        }

        @keyframes interro-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        @keyframes interro-pulse-text {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }

        @keyframes interro-pulse-icon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 480px) {
          .interro-title {
            font-size: 1.25rem !important;
          }

          .interro-question-text {
            font-size: 1.1rem !important;
          }

          .interro-timer-big {
            font-size: 2rem !important;
          }

          .interro-btn-judge {
            padding: 14px 12px !important;
            font-size: 0.875rem !important;
          }
        }
      `}</style>
    </div>
  );
}
