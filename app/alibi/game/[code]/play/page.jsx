"use client";

import { useEffect, useState, useRef } from "react";
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
import ExitButton from "@/lib/components/ExitButton";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ParticleEffects } from "@/components/ParticleEffects";

export default function AlibiInterrogation() {
  const { code } = useParams();
  const router = useRouter();

  const [myUid, setMyUid] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [suspects, setSuspects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionState, setQuestionState] = useState("waiting"); // waiting | answering | verdict
  const [timeLeft, setTimeLeft] = useState(30);
  const [allAnswered, setAllAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState("");
  const [showCountdown, setShowCountdown] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [responses, setResponses] = useState({});
  const [verdict, setVerdict] = useState(null); // null | "correct" | "incorrect" | "timeout"
  const timerRef = useRef(null);
  const timeoutTriggeredRef = useRef(false);

  // Fonction pour quitter et terminer la partie si hôte
  async function exitGame() {
    if (isHost && code) {
      // Si c'est l'hôte, terminer la partie pour tout le monde
      await update(ref(db, `rooms_alibi/${code}/state`), { phase: "ended" });
    }
    router.push('/home');
  }

  // Fonction appelée quand le countdown est terminé
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
          // Vérifier si c'est l'hôte
          onValue(ref(db, `rooms_alibi/${code}/meta/hostUid`), (snap) => {
            setIsHost(snap.val() === user.uid);
          });
        }
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  // Écouter les suspects
  useEffect(() => {
    if (!code) return;
    const playersUnsub = onValue(ref(db, `rooms_alibi/${code}/players`), (snap) => {
      const players = snap.val() || {};
      setSuspects(Object.values(players).filter(p => p.team === "suspects"));
    });
    return () => playersUnsub();
  }, [code]);

  // Écouter les questions
  useEffect(() => {
    if (!code) return;
    const questionsUnsub = onValue(ref(db, `rooms_alibi/${code}/questions`), (snap) => {
      setQuestions(snap.val() || []);
    });
    return () => questionsUnsub();
  }, [code]);

  // Écouter l'état de la phase interrogation
  useEffect(() => {
    if (!code) return;

    const interroUnsub = onValue(ref(db, `rooms_alibi/${code}/interrogation`), (snap) => {
      const data = snap.val() || {};
      setCurrentQuestion(data.currentQuestion || 0);
      setQuestionState(data.state || "waiting");

      // L'hôte ne doit PAS écouter les mises à jour du timer pendant answering
      // pour éviter la boucle : hôte écrit -> Firebase notifie -> hôte met à jour -> double décompte
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
    });

    return () => {
      interroUnsub();
      stateUnsub();
    };
  }, [code, router, isHost]);

  // Démarrer/arrêter le timer selon l'état
  useEffect(() => {
    // Conditions pour arrêter le timer
    if (!isHost || questionState !== "answering" || allAnswered) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Démarrer le timer seulement s'il n'existe pas déjà
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

    // Cleanup : arrêter le timer quand l'effet se nettoie
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [questionState, isHost, allAnswered, code]);

  // Détecter le timeout (séparé du timer)
  useEffect(() => {
    if (!isHost || questionState !== "answering") {
      timeoutTriggeredRef.current = false;
      return;
    }

    // Si le timer atteint 0 et que tous n'ont pas répondu
    if (timeLeft <= 0 && !allAnswered && !timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = true;

      // Arrêter le timer immédiatement
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Déclencher le timeout
      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        state: "verdict",
        verdict: "timeout"
      });

      // Attendre 4 secondes puis passer à la question suivante ou fin
      setTimeout(async () => {
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
      }, 4000);
    }
  }, [timeLeft, allAnswered, questionState, isHost, code, currentQuestion]);

  // Actions INSPECTEURS
  const startQuestion = async () => {
    if (myTeam !== "inspectors") return;

    // Réinitialiser l'état de la question
    await set(ref(db, `rooms_alibi/${code}/interrogation`), {
      currentQuestion,
      state: "answering",
      timeLeft: 30,
      responses: {},
      verdict: null
    });

    // Réinitialiser l'état local (l'hôte doit initialiser son timer à 30)
    setTimeLeft(30);
    setHasAnswered(false);
    setMyAnswer("");
  };

  const judgeAnswers = async (isCorrect) => {
    if (myTeam !== "inspectors") return;

    // Enregistrer le verdict
    await update(ref(db, `rooms_alibi/${code}/interrogation`), {
      state: "verdict",
      verdict: isCorrect ? "correct" : "incorrect"
    });

    // Mettre à jour le score si correct
    if (isCorrect) {
      const scoreRef = ref(db, `rooms_alibi/${code}/score/correct`);
      onValue(scoreRef, (snap) => {
        const current = snap.val() || 0;
        update(ref(db, `rooms_alibi/${code}/score`), { correct: current + 1 });
      }, { onlyOnce: true });
    }

    // Attendre 4 secondes puis passer à la question suivante ou fin
    setTimeout(async () => {
      if (currentQuestion >= 9) {
        // Dernière question, aller à la page de fin
        await update(ref(db, `rooms_alibi/${code}/state`), { phase: "end" });
      } else {
        // Question suivante
        await update(ref(db, `rooms_alibi/${code}/interrogation`), {
          currentQuestion: currentQuestion + 1,
          state: "waiting",
          timeLeft: 30,
          responses: {},
          verdict: null
        });
      }
    }, 4000);
  };

  // Réinitialiser l'état local quand on change de question
  useEffect(() => {
    if (questionState === "waiting") {
      setHasAnswered(false);
      setMyAnswer("");
      setAllAnswered(false);
      timeoutTriggeredRef.current = false;
      // Réinitialiser le timer à 30 secondes
      setTimeLeft(30);
    }
  }, [currentQuestion, questionState]);

  // Détecter quand tous les suspects ont répondu
  useEffect(() => {
    if (questionState === "answering" && suspects.length > 0) {
      const allHaveAnswered = suspects.every(s => responses[s.uid]);
      setAllAnswered(allHaveAnswered);
    }
  }, [questionState, suspects, responses]);

  // Déclencher les effets visuels selon le verdict
  useEffect(() => {
    if (verdict === "correct") {
      ParticleEffects.celebrate('high');
    } else if (verdict === "incorrect") {
      ParticleEffects.wrongAnswer();
    } else if (verdict === "timeout") {
      // Effet subtil pour timeout
      ParticleEffects.wrongAnswer();
    }
  }, [verdict]);

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

  const formatTime = (seconds) => {
    return `${seconds}s`;
  };

  const currentQuestionData = questions[currentQuestion];

  return (
    <>
      {/* Header Fixe */}
      <header className="player-game-header">
        <div className="player-game-header-content">
          <div className="player-game-title">Question {currentQuestion + 1} / 10</div>
          <div className="player-progress-center">
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestion + 1) / 10) * 100}%` }}
              />
            </div>
          </div>
          <div className="player-header-exit">
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ?"
              onExit={() => router.push('/home')}
            />
          </div>
        </div>
      </header>

      {/* Contenu avec padding-top */}
      <main className="player-game-content">
        <div className="game-container">
          {/* Background orbs */}
          <div className="bg-orb orb-1"></div>
          <div className="bg-orb orb-2"></div>
          <div className="bg-orb orb-3"></div>

          <div className="game-content p-6 max-w-4xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>

      {/* État: WAITING - Inspecteurs lancent la question */}
      {questionState === "waiting" && myTeam === "inspectors" && (
        <motion.div
          className="card space-y-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2 className="game-section-title">Question {currentQuestion + 1}</h2>
          <p className="text-lg">{currentQuestionData?.text}</p>
          <button
            className="btn btn-accent w-full h-16 text-xl"
            onClick={startQuestion}
          >
            ⏱️ Lancer le timer (30s)
          </button>
        </motion.div>
      )}

      {questionState === "waiting" && myTeam === "suspects" && (
        <motion.div
          className="card text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <p className="text-lg opacity-70">
            En attente que les inspecteurs lancent la question...
          </p>
        </motion.div>
      )}

      {/* État: ANSWERING - Suspects répondent */}
      {questionState === "answering" && myTeam === "suspects" && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="text-center">
            <h2 className="text-3xl font-black mb-2">
              {timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
            </h2>
            {timeLeft <= 10 && (
              <p className="text-red-400 font-bold animate-pulse">Dépêche-toi !</p>
            )}
          </div>

          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-lg font-bold mb-2">Question {currentQuestion + 1} :</p>
            <p className="text-xl">{currentQuestionData?.text}</p>
          </div>

          {!hasAnswered ? (
            <div className="space-y-3">
              <textarea
                className="game-textarea game-textarea-accent"
                placeholder="Ta réponse..."
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                maxLength={500}
                autoComplete="off"
              />
              <button
                className="btn btn-primary w-full h-14 text-xl"
                onClick={submitAnswer}
                disabled={!myAnswer.trim()}
              >
                Valider ma réponse
              </button>
            </div>
          ) : (
            <div className="bg-green-500/20 border border-green-500 p-4 rounded-lg text-center">
              <div className="text-green-400 text-5xl mb-4">✓</div>
              <p className="text-xl font-bold text-green-400">Réponse envoyée !</p>
              <p className="text-lg opacity-70 mt-2">En attente du jugement des inspecteurs...</p>
            </div>
          )}
        </motion.div>
      )}

      {questionState === "answering" && myTeam === "inspectors" && (
        <div className="space-y-6">
          {/* Timer et question */}
          <motion.div
            className="card text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h2 className="text-3xl font-black">
              {timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
            </h2>
            {timeLeft <= 10 && !allAnswered && (
              <p className="text-red-400 font-bold animate-pulse">Temps presque écoulé !</p>
            )}
            {allAnswered && (
              <p className="text-green-400 font-bold animate-pulse">✓ Toutes les réponses reçues !</p>
            )}
            <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-accent">
              <p className="text-lg font-bold mb-2">Question {currentQuestion + 1} :</p>
              <p className="text-xl">{currentQuestionData?.text}</p>
            </div>
            <p className="text-sm opacity-70">
              {Object.keys(responses).length} / {suspects.length} suspect(s) ont répondu
            </p>
          </motion.div>

          {/* Réponses en temps réel */}
          <motion.div
            className="card space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="text-xl font-bold">Réponses des suspects :</h2>
            <div className="space-y-3">
              {suspects.map(suspect => {
                const response = responses[suspect.uid];
                return (
                  <div
                    key={suspect.uid}
                    className={`p-4 rounded-lg transition-all ${
                      response
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-slate-700/50 border-2 border-slate-600 opacity-50"
                    }`}
                  >
                    <p className="font-bold text-primary mb-2">
                      🎭 {suspect.name}
                      {response && <span className="text-green-400 ml-2">✓</span>}
                    </p>
                    {response ? (
                      <p className="text-lg">{response.answer}</p>
                    ) : (
                      <p className="text-sm italic opacity-50">En attente de réponse...</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Boutons de jugement - Affichés seulement quand toutes les réponses sont reçues */}
            {allAnswered && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-accent/50 mt-6">
                <button
                  className="btn btn-danger h-20 text-xl"
                  onClick={() => judgeAnswers(false)}
                >
                  ❌ Refuser
                </button>
                <button
                  className="btn btn-success h-20 text-xl"
                  onClick={() => judgeAnswers(true)}
                >
                  ✅ Valider
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

          </div>
        </div>

      {/* Modal de verdict - Version spectaculaire */}
      <AnimatePresence>
        {questionState === "verdict" && verdict && (
          <>
            {/* Overlay avec effet de flash */}
            <motion.div
              className="buzz-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                backgroundColor: verdict === "correct"
                  ? ["rgba(0, 0, 0, 0.7)", "rgba(16, 185, 129, 0.3)", "rgba(0, 0, 0, 0.7)"]
                  : verdict === "incorrect"
                  ? ["rgba(0, 0, 0, 0.7)", "rgba(239, 68, 68, 0.3)", "rgba(0, 0, 0, 0.7)"]
                  : "rgba(0, 0, 0, 0.7)"
              }}
              exit={{ opacity: 0 }}
              transition={{
                backgroundColor: { duration: 0.8, times: [0, 0.3, 1] }
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* Modal */}
            <div className="buzz-modal" style={{ zIndex: 2000 }}>
              <motion.div
                className="buzz-modal-content"
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{
                  opacity: 1,
                  scale: [0.5, 1.1, 1],
                  y: 0,
                  rotate: [0, -5, 5, 0]
                }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                  scale: { times: [0, 0.6, 1] }
                }}
                style={{
                  background: verdict === "correct"
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))'
                    : verdict === "incorrect"
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))'
                    : 'linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95))',
                  border: verdict === "correct"
                    ? '4px solid #10B981'
                    : verdict === "incorrect"
                    ? '4px solid #EF4444'
                    : '4px solid #F59E0B',
                  boxShadow: verdict === "correct"
                    ? '0 0 80px rgba(16, 185, 129, 0.6), 0 20px 60px rgba(0, 0, 0, 0.5)'
                    : verdict === "incorrect"
                    ? '0 0 80px rgba(239, 68, 68, 0.6), 0 20px 60px rgba(0, 0, 0, 0.5)'
                    : '0 0 80px rgba(245, 158, 11, 0.6), 0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Icône géante avec animation de pulsation */}
                <motion.div
                  className="buzz-modal-icon"
                  style={{
                    fontSize: '8rem',
                    marginBottom: '1rem',
                    filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))'
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: verdict === "correct" ? [0, 360] : [0, -10, 10, 0]
                  }}
                  transition={{
                    scale: { duration: 0.6, repeat: Infinity, repeatDelay: 0.3 },
                    rotate: { duration: verdict === "correct" ? 0.8 : 0.5 }
                  }}
                >
                  {verdict === "correct" && "🎉"}
                  {verdict === "incorrect" && "💥"}
                  {verdict === "timeout" && "⏰"}
                </motion.div>

                {/* Message principal */}
                <motion.div
                  className="buzz-modal-player"
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    marginBottom: '1rem',
                    color: 'white',
                    textShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)',
                    letterSpacing: '-0.02em'
                  }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {verdict === "correct" && "VALIDÉ ! ✨"}
                  {verdict === "incorrect" && "REFUSÉ ! ⚡"}
                  {verdict === "timeout" && "TEMPS ÉCOULÉ ! ⚠️"}
                </motion.div>

                {/* Description */}
                <motion.p
                  style={{
                    fontSize: '1.25rem',
                    opacity: 0.95,
                    marginBottom: '2rem',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 600,
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                  }}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.95 }}
                  transition={{ delay: 0.3 }}
                >
                  {verdict === "correct" && "Les suspects sont convaincants ! 🎭"}
                  {verdict === "incorrect" && "Les inspecteurs détectent l'incohérence ! 🕵️"}
                  {verdict === "timeout" && "Les suspects n'ont pas répondu à temps ! ⌛"}
                </motion.p>

                {/* Compteur de points/questions */}
                <motion.div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '2rem',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '1.5rem'
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  Question {currentQuestion + 1} / 10
                </motion.div>

                {/* Auto-close indication */}
                <motion.p
                  style={{
                    fontSize: '0.875rem',
                    opacity: 0.7,
                    color: 'white',
                    fontWeight: 500
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.5 }}
                >
                  {currentQuestion >= 9 ? "🏁 Fin de l'interrogatoire..." : "⏭️ Question suivante..."}
                </motion.p>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      </main>

      <CountdownOverlay
        isVisible={showCountdown}
        message="Résultats de l'enquête !"
        onComplete={handleCountdownComplete}
        countFrom={3}
      />

      <style jsx>{`
        .game-container {
          position: relative;
          min-height: 100vh;
          background: #000000;
          overflow: hidden;
        }

        .game-content {
          position: relative;
          z-index: 1;
        }

        /* Background orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #4299E1 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #48BB78 0%, transparent 70%);
          bottom: -100px;
          left: -150px;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #9F7AEA 0%, transparent 70%);
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>
    </>
  );
}
