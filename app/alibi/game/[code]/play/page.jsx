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
import { Send, Clock, CheckCircle, XCircle, Users, AlertTriangle } from 'lucide-react';
import ExitButton from "@/lib/components/ExitButton";
import PlayerManager from "@/components/game/PlayerManager";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { AlibiPhaseTransition } from "@/components/alibi/AlibiPhaseTransition";
import { VerdictTransition } from "@/components/alibi/VerdictTransition";
import { hueScenariosService } from "@/lib/hue-module";

export default function AlibiInterrogation() {
  const { code } = useParams();
  const router = useRouter();

  const [myUid, setMyUid] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [hostUid, setHostUid] = useState(null);
  const [questions, setQuestions] = useState([]);

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost
  });

  // Player cleanup - gère déconnexion pendant le jeu
  usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost,
    phase: 'playing'
  });

  // Derive suspects from players
  const suspects = useMemo(() => {
    return players.filter(p => p.team === "suspects");
  }, [players]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionState, setQuestionState] = useState("waiting");
  const [timeLeft, setTimeLeft] = useState(30);
  const [allAnswered, setAllAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [responses, setResponses] = useState({});
  const [verdict, setVerdict] = useState(null);
  const timerRef = useRef(null);
  const timeoutTriggeredRef = useRef(null);

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

  const handleCountdownComplete = () => {
    router.push(`/alibi/game/${code}/end`);
  };

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        if (code) {
          onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
            const player = snap.val();
            if (player) setMyTeam(player.team);
          });
          onValue(ref(db, `rooms_alibi/${code}/meta/hostUid`), (snap) => {
            const hUid = snap.val();
            setHostUid(hUid);
            setIsHost(hUid === user.uid);
          });
        }
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Écouter les questions
  useEffect(() => {
    if (!code) return;
    const questionsUnsub = onValue(ref(db, `rooms_alibi/${code}/questions`), (snap) => {
      setQuestions(snap.val() || []);
    });
    return () => questionsUnsub();
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
      if (state?.phase === "end" && !showCountdown) {
        setShowCountdown(true);
      }
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      interroUnsub();
      stateUnsub();
    };
  }, [code, router, isHost, showCountdown]);

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

  // Actions INSPECTEURS
  const startQuestion = async () => {
    if (myTeam !== "inspectors") return;

    hueScenariosService.trigger('alibi', 'roundStart');

    await set(ref(db, `rooms_alibi/${code}/interrogation`), {
      currentQuestion,
      state: "answering",
      timeLeft: 30,
      responses: {},
      verdict: null
    });

    setTimeLeft(30);
    setHasAnswered(false);
    setMyAnswer("");
  };

  const judgeAnswers = async (isCorrect) => {
    if (myTeam !== "inspectors") return;

    await update(ref(db, `rooms_alibi/${code}/interrogation`), {
      state: "verdict",
      verdict: isCorrect ? "correct" : "incorrect"
    });

    if (isCorrect) {
      const scoreRef = ref(db, `rooms_alibi/${code}/score/correct`);
      onValue(scoreRef, (snap) => {
        const current = snap.val() || 0;
        update(ref(db, `rooms_alibi/${code}/score`), { correct: current + 1 });
      }, { onlyOnce: true });
    }
  };

  const handleNextQuestion = async () => {
    if (myTeam !== "inspectors") return;

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

  // Actions SUSPECTS
  const submitAnswer = async () => {
    if (myTeam !== "suspects" || !myUid || hasAnswered) return;

    await update(ref(db, `rooms_alibi/${code}/interrogation/responses/${myUid}`), {
      answer: myAnswer,
      uid: myUid,
      name: suspects.find(s => s.uid === myUid)?.name || "Inconnu"
    });

    setHasAnswered(true);
  };

  const formatTime = (seconds) => `${seconds}s`;

  const currentQuestionData = questions[currentQuestion];
  const progressPercent = ((currentQuestion + 1) / 10) * 100;
  const isUrgent = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div className="interro-screen">
      {/* Animated Background */}
      <div className="interro-bg" />

      {/* Header */}
      <header className="interro-header">
        <div className="interro-header-content">
          <div className="interro-header-title">Question {currentQuestion + 1}/10</div>

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
              {/* INSPECTORS - Waiting */}
              {myTeam === "inspectors" && (
                <motion.div
                  className="interro-waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="interro-phase-header">
                    <h1 className="interro-title">Interrogatoire</h1>
                    <p className="interro-subtitle">Posez cette question aux suspects</p>
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

              {/* SUSPECTS - Waiting */}
              {myTeam === "suspects" && (
                <motion.div
                  className="interro-waiting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="interro-phase-header">
                    <h1 className="interro-title">En attente...</h1>
                    <p className="interro-subtitle">Les inspecteurs préparent la question</p>
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
            </>
          )}

          {/* ========== ANSWERING STATE ========== */}
          {questionState === "answering" && (
            <>
              {/* SUSPECTS - Answering */}
              {myTeam === "suspects" && (
                <motion.div
                  className="interro-answering"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Timer prominent */}
                  <motion.div
                    className={`interro-timer-card ${isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}
                    animate={isCritical ? {
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 20px rgba(239, 68, 68, 0.4)',
                        '0 0 40px rgba(239, 68, 68, 0.7)',
                        '0 0 20px rgba(239, 68, 68, 0.4)'
                      ]
                    } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <span className="interro-timer-big">{formatTime(timeLeft)}</span>
                    {isCritical && <span className="interro-timer-warning">DÉPÊCHE-TOI !</span>}
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
                      <p className="interro-answered-subtitle">En attente du jugement...</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* INSPECTORS - Answering */}
              {myTeam === "inspectors" && (
                <motion.div
                  className="interro-answering"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Timer */}
                  <motion.div
                    className={`interro-timer-card ${isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}
                    animate={isCritical ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <span className="interro-timer-big">{formatTime(timeLeft)}</span>
                    {allAnswered && <span className="interro-timer-success">Toutes les réponses reçues !</span>}
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

          {/* No team */}
          {!myTeam && (
            <motion.div
              className="interro-no-team"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={48} />
              <p>Tu n'es assigné à aucune équipe...</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Verdict Transition */}
      <VerdictTransition
        isVisible={questionState === "verdict" && verdict !== null}
        verdict={verdict}
        showButton={myTeam === "inspectors"}
        onButtonClick={handleNextQuestion}
        duration={3500}
      />

      {/* Phase Transition to End */}
      <AlibiPhaseTransition
        isVisible={showCountdown}
        title="Enquête Terminée"
        subtitle="Découvrez les résultats..."
        type="end"
        onComplete={handleCountdownComplete}
        duration={3500}
      />

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

        .interro-progress {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .interro-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
          position: relative;
          border-radius: 0 2px 2px 0;
        }

        .interro-progress-fill::after {
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
          margin: 12px 0 4px 0 !important;
        }

        .interro-answered-subtitle {
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          color: rgba(255, 255, 255, 0.6) !important;
          margin: 0 !important;
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
