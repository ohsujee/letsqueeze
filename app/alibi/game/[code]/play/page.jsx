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
import { CountdownOverlay } from "@/components/shared/CountdownOverlay";
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { PhaseTransition } from "@/components/transitions/PhaseTransition";
import { VerdictTransition } from "@/components/alibi/VerdictTransition";
import { hueScenariosService } from "@/lib/hue-module";

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

  // Fonction pour quitter et retourner au lobby
  async function exitGame() {
    if (isHost && code) {
      // Si c'est l'hôte, ramener tout le monde au lobby
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
      // Redirection vers le lobby si l'hôte quitte
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
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

    // Trigger Hue pour début d'interrogatoire
    hueScenariosService.trigger('alibi', 'roundStart');

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
  };

  // Fonction pour passer à la question suivante (appelée par le bouton dans le modal)
  const handleNextQuestion = async () => {
    if (myTeam !== "inspectors") return;

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

  // Déclencher les effets visuels et Hue selon le verdict
  useEffect(() => {
    if (verdict === "correct") {
      ParticleEffects.celebrate('high');
      hueScenariosService.trigger('alibi', 'goodAnswer');
    } else if (verdict === "incorrect") {
      ParticleEffects.wrongAnswer();
      hueScenariosService.trigger('alibi', 'badAnswer');
    } else if (verdict === "timeout") {
      // Effet subtil pour timeout
      ParticleEffects.wrongAnswer();
      hueScenariosService.trigger('alibi', 'timeUp');
    }
  }, [verdict]);

  // Ambiance Hue au chargement + cleanup
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

  const formatTime = (seconds) => {
    return `${seconds}s`;
  };

  const currentQuestionData = questions[currentQuestion];

  return (
    <div className="alibi-theme">
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
              confirmMessage="Voulez-vous vraiment quitter ? Tout le monde retournera au lobby."
              onExit={exitGame}
            />
          </div>
        </div>
      </header>

      {/* Contenu avec padding-top */}
      <main className="player-game-content">
        <div className="game-container">
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

      {/* État: ANSWERING - Suspects répondent - Version AAA */}
      {questionState === "answering" && myTeam === "suspects" && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            boxShadow: timeLeft <= 5
              ? ['0 0 0 rgba(239, 68, 68, 0)', '0 0 40px rgba(239, 68, 68, 0.8)', '0 0 0 rgba(239, 68, 68, 0)']
              : timeLeft <= 10
              ? '0 0 20px rgba(251, 191, 36, 0.5)'
              : '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          transition={{
            delay: 0.1,
            duration: 0.5,
            boxShadow: timeLeft <= 5 ? { duration: 1, repeat: Infinity } : {}
          }}
          style={{
            background: timeLeft <= 5
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))'
              : timeLeft <= 10
              ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))'
              : undefined,
            border: timeLeft <= 5
              ? '2px solid rgba(239, 68, 68, 0.5)'
              : timeLeft <= 10
              ? '2px solid rgba(251, 191, 36, 0.3)'
              : undefined
          }}
        >
          <div className="text-center">
            <motion.h2
              className="text-3xl font-black mb-2"
              animate={timeLeft <= 5 ? {
                scale: [1, 1.1, 1],
                color: ['#EF4444', '#FCA5A5', '#EF4444']
              } : timeLeft <= 10 ? {
                scale: [1, 1.05, 1]
              } : {}}
              transition={timeLeft <= 5 ? {
                duration: 0.8,
                repeat: Infinity
              } : timeLeft <= 10 ? {
                duration: 1,
                repeat: Infinity
              } : {}}
              style={{
                color: timeLeft <= 5 ? '#EF4444' : timeLeft <= 10 ? '#F59E0B' : 'white',
                textShadow: timeLeft <= 5
                  ? '0 0 20px rgba(239, 68, 68, 0.8)'
                  : timeLeft <= 10
                  ? '0 0 15px rgba(245, 158, 11, 0.6)'
                  : 'none'
              }}
            >
              {timeLeft <= 5 ? "🚨" : timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
            </motion.h2>
            {timeLeft <= 10 && (
              <motion.p
                className="font-bold"
                animate={{
                  opacity: [0.7, 1, 0.7],
                  scale: timeLeft <= 5 ? [1, 1.05, 1] : [1, 1.02, 1]
                }}
                transition={{ duration: timeLeft <= 5 ? 0.5 : 1, repeat: Infinity }}
                style={{
                  color: timeLeft <= 5 ? '#EF4444' : '#F59E0B',
                  fontSize: timeLeft <= 5 ? '1.1rem' : '1rem'
                }}
              >
                {timeLeft <= 5 ? '⚡ DÉPÊCHE-TOI ! ⚡' : 'Dépêche-toi !'}
              </motion.p>
            )}
          </div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              boxShadow: [
                '0 0 40px rgba(255, 109, 0, 0.4)',
                '0 0 60px rgba(255, 109, 0, 0.6)',
                '0 0 40px rgba(255, 109, 0, 0.4)'
              ]
            }}
            transition={{
              scale: { duration: 0.3 },
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.15), rgba(245, 158, 11, 0.1))',
              border: '2px solid rgba(255, 109, 0, 0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Spotlight effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255, 109, 0, 0.15) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  display: 'inline-block',
                  background: 'rgba(255, 109, 0, 0.3)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--letter-spacing-wide)'
                }}
              >
                🎯 Question {currentQuestion + 1} / 10
              </motion.div>
              <motion.p
                className="text-2xl font-bold leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  color: 'white',
                  textShadow: '0 2px 20px rgba(255, 109, 0, 0.5)',
                  lineHeight: 'var(--line-height-relaxed)'
                }}
              >
                {currentQuestionData?.text}
              </motion.p>
            </div>
          </motion.div>

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
            <div className="bg-green-500/20 border border-green-500 rounded-lg text-center" style={{ padding: 'var(--space-4)' }}>
              <div className="text-green-400 text-5xl" style={{ marginBottom: 'var(--space-4)' }}>✓</div>
              <p className="text-xl font-bold text-green-400">Réponse envoyée !</p>
              <p className="text-lg opacity-70" style={{ marginTop: 'var(--space-2)' }}>En attente du jugement des inspecteurs...</p>
            </div>
          )}
        </motion.div>
      )}

      {questionState === "answering" && myTeam === "inspectors" && (
        <div className="space-y-6">
          {/* Timer et question - Version AAA avec stress progressif */}
          <motion.div
            className="card text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: timeLeft <= 5
                ? ['0 0 0 rgba(239, 68, 68, 0)', '0 0 40px rgba(239, 68, 68, 0.8)', '0 0 0 rgba(239, 68, 68, 0)']
                : timeLeft <= 10
                ? '0 0 20px rgba(251, 191, 36, 0.5)'
                : '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
            transition={{
              delay: 0.1,
              duration: 0.5,
              boxShadow: timeLeft <= 5 ? { duration: 1, repeat: Infinity } : {}
            }}
            style={{
              background: timeLeft <= 5
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))'
                : timeLeft <= 10
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))'
                : undefined,
              border: timeLeft <= 5
                ? '2px solid rgba(239, 68, 68, 0.5)'
                : timeLeft <= 10
                ? '2px solid rgba(251, 191, 36, 0.3)'
                : undefined
            }}
          >
            <motion.h2
              className="text-3xl font-black"
              animate={timeLeft <= 5 ? {
                scale: [1, 1.1, 1],
                color: ['#EF4444', '#FCA5A5', '#EF4444']
              } : timeLeft <= 10 ? {
                scale: [1, 1.05, 1]
              } : {}}
              transition={timeLeft <= 5 ? {
                duration: 0.8,
                repeat: Infinity
              } : timeLeft <= 10 ? {
                duration: 1,
                repeat: Infinity
              } : {}}
              style={{
                color: timeLeft <= 5 ? '#EF4444' : timeLeft <= 10 ? '#F59E0B' : 'white',
                textShadow: timeLeft <= 5
                  ? '0 0 20px rgba(239, 68, 68, 0.8)'
                  : timeLeft <= 10
                  ? '0 0 15px rgba(245, 158, 11, 0.6)'
                  : 'none'
              }}
            >
              {timeLeft <= 5 ? "🚨" : timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
            </motion.h2>
            {timeLeft <= 10 && !allAnswered && (
              <motion.p
                className="font-bold"
                animate={{
                  opacity: [0.7, 1, 0.7],
                  scale: timeLeft <= 5 ? [1, 1.05, 1] : [1, 1.02, 1]
                }}
                transition={{ duration: timeLeft <= 5 ? 0.5 : 1, repeat: Infinity }}
                style={{
                  color: timeLeft <= 5 ? '#EF4444' : '#F59E0B',
                  fontSize: timeLeft <= 5 ? '1.1rem' : '1rem'
                }}
              >
                {timeLeft <= 5 ? '⚡ DÉPÊCHEZ-VOUS ! ⚡' : 'Temps presque écoulé !'}
              </motion.p>
            )}
            {allAnswered && (
              <p className="text-green-400 font-bold animate-pulse">✓ Toutes les réponses reçues !</p>
            )}
          </motion.div>

          {/* Question Spotlight - Inspecteurs */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              boxShadow: [
                '0 0 40px rgba(255, 109, 0, 0.4)',
                '0 0 60px rgba(255, 109, 0, 0.6)',
                '0 0 40px rgba(255, 109, 0, 0.4)'
              ]
            }}
            transition={{
              scale: { duration: 0.3 },
              boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.15), rgba(245, 158, 11, 0.1))',
              border: '2px solid rgba(255, 109, 0, 0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Spotlight effect */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255, 109, 0, 0.15) 0%, transparent 50%)',
              pointerEvents: 'none',
              zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  display: 'inline-block',
                  background: 'rgba(255, 109, 0, 0.3)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--letter-spacing-wide)'
                }}
              >
                🎯 Question {currentQuestion + 1} / 10
              </motion.div>
              <motion.p
                className="text-2xl font-bold leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  color: 'white',
                  textShadow: '0 2px 20px rgba(255, 109, 0, 0.5)',
                  lineHeight: 'var(--line-height-relaxed)'
                }}
              >
                {currentQuestionData?.text}
              </motion.p>
            </div>
          </motion.div>

          {/* Compteur de réponses */}
          <motion.div
            className="card text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
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

      {/* Transition de verdict fullscreen spectaculaire */}
      <VerdictTransition
        isVisible={questionState === "verdict" && verdict !== null}
        verdict={verdict}
        showButton={myTeam === "inspectors"}
        onButtonClick={handleNextQuestion}
        duration={3500}
      />
      </main>

      <PhaseTransition
        isVisible={showCountdown}
        title="Enquête Terminée"
        subtitle="Découvrez les résultats..."
        icon="📊"
        theme="end"
        onComplete={handleCountdownComplete}
        duration={3500}
      />

      <style jsx>{`
        /* ===== ALIBI PLAY PAGE - Guide UI Compliant ===== */

        /* Alibi Theme Variables */
        .alibi-theme {
          --alibi-primary: #f59e0b;
          --alibi-glow: #fbbf24;
          --alibi-dark: #b45309;
          --bg-primary: #0a0a0f;
          --bg-secondary: #12121a;
          --bg-card: rgba(20, 20, 30, 0.8);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.7);
          --text-muted: rgba(255, 255, 255, 0.5);
          --success: #22c55e;
          --danger: #ef4444;
        }

        .game-container {
          position: relative;
          min-height: 100dvh;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* Animated Background - Alibi Theme (Amber/Gold) */
        .game-container::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 60%),
            var(--bg-primary);
          pointer-events: none;
        }

        .game-content {
          position: relative;
          z-index: 1;
        }

        /* Header - Guide Compliant */
        .player-game-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          padding: 12px 16px;
        }

        .player-game-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 800px;
          margin: 0 auto;
        }

        .player-game-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .player-progress-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .player-progress-center :global(.bg-gray-700) {
          background: rgba(255, 255, 255, 0.1);
        }

        .player-progress-center :global(.bg-accent) {
          background: linear-gradient(90deg, var(--alibi-primary), var(--alibi-glow));
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
        }

        .player-header-exit {
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .player-header-exit:hover {
          opacity: 1;
        }

        /* Main Content */
        .player-game-content {
          position: relative;
          z-index: 1;
          padding-top: 60px;
        }

        /* Cards - Glassmorphism Alibi */
        .alibi-theme :global(.card) {
          background: rgba(20, 20, 30, 0.8);
          border-radius: 16px;
          padding: 1.25rem;
          border: 1px solid rgba(245, 158, 11, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Section Titles - Guide Compliant */
        .alibi-theme :global(.game-section-title) {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--alibi-glow);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
        }

        /* Buttons - Alibi Theme */
        .alibi-theme :global(.btn) {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--text-primary);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .alibi-theme :global(.btn:hover) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .alibi-theme :global(.btn:active) {
          transform: translateY(1px) scale(0.98);
        }

        .alibi-theme :global(.btn-primary) {
          background: linear-gradient(135deg, var(--alibi-primary), var(--alibi-dark));
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(245, 158, 11, 0.4),
            0 0 30px rgba(245, 158, 11, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-primary:hover) {
          box-shadow:
            0 6px 20px rgba(245, 158, 11, 0.5),
            0 0 40px rgba(245, 158, 11, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: translateY(-2px) scale(1.02);
        }

        .alibi-theme :global(.btn-primary:disabled) {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .alibi-theme :global(.btn-accent) {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(59, 130, 246, 0.4),
            0 0 30px rgba(59, 130, 246, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-accent:hover) {
          box-shadow:
            0 6px 20px rgba(59, 130, 246, 0.5),
            0 0 40px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px) scale(1.02);
        }

        .alibi-theme :global(.btn-success) {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(34, 197, 94, 0.4),
            0 0 30px rgba(34, 197, 94, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-success:hover) {
          box-shadow:
            0 6px 20px rgba(34, 197, 94, 0.5),
            0 0 40px rgba(34, 197, 94, 0.3);
          transform: translateY(-2px) scale(1.02);
        }

        .alibi-theme :global(.btn-danger) {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(239, 68, 68, 0.4),
            0 0 30px rgba(239, 68, 68, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-danger:hover) {
          box-shadow:
            0 6px 20px rgba(239, 68, 68, 0.5),
            0 0 40px rgba(239, 68, 68, 0.3);
          transform: translateY(-2px) scale(1.02);
        }

        /* Textarea - Alibi Theme */
        .alibi-theme :global(.game-textarea) {
          width: 100%;
          min-height: 120px;
          padding: 16px 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          line-height: 1.6;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .alibi-theme :global(.game-textarea:focus) {
          outline: none;
          border-color: var(--alibi-primary);
          background: rgba(245, 158, 11, 0.08);
          box-shadow:
            0 0 0 4px rgba(245, 158, 11, 0.15),
            0 0 20px rgba(245, 158, 11, 0.1);
        }

        .alibi-theme :global(.game-textarea::placeholder) {
          color: var(--text-muted);
        }

        .alibi-theme :global(.game-textarea-accent) {
          border-color: rgba(245, 158, 11, 0.2);
        }

        /* Response cards */
        .alibi-theme :global(.text-primary) {
          color: var(--alibi-glow) !important;
        }

        /* Animation pulsante pour les alertes */
        @keyframes alibi-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(245, 158, 11, 0.5);
          }
        }

        /* Animation de flottement */
        @keyframes alibi-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        /* Urgence animation */
        .alibi-theme :global(.animate-pulse) {
          animation: alibi-pulse 2s ease-in-out infinite;
        }

        /* Grid layout for judgment buttons */
        .alibi-theme :global(.grid) {
          display: grid;
        }

        .alibi-theme :global(.grid-cols-2) {
          grid-template-columns: repeat(2, 1fr);
        }

        .alibi-theme :global(.gap-4) {
          gap: 1rem;
        }

        /* Border accent */
        .alibi-theme :global(.border-accent\\/50) {
          border-color: rgba(245, 158, 11, 0.5);
        }
      `}</style>
    </div>
  );
}
