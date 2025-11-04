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
  const [hasAnswered, setHasAnswered] = useState(false);
  const [responses, setResponses] = useState({});
  const [verdict, setVerdict] = useState(null); // null | "correct" | "incorrect" | "timeout"
  const timerRef = useRef(null);
  const timeoutTriggeredRef = useRef(false);

  // Auth
  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
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
      if (state?.phase === "end") {
        router.push(`/alibi/game/${code}/end`);
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
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Progression */}
      <div className="card">
        <h1 className="text-2xl font-bold">
          Question {currentQuestion + 1} / 10
        </h1>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-accent h-2 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* État: WAITING - Inspecteurs lancent la question */}
      {questionState === "waiting" && myTeam === "inspectors" && (
        <div className="card space-y-4 text-center">
          <h2 className="text-xl font-bold">Question {currentQuestion + 1}</h2>
          <p className="text-lg">{currentQuestionData?.text}</p>
          <button
            className="btn btn-accent w-full h-16 text-xl"
            onClick={startQuestion}
          >
            ⏱️ Lancer le timer (30s)
          </button>
        </div>
      )}

      {questionState === "waiting" && myTeam === "suspects" && (
        <div className="card text-center">
          <p className="text-lg opacity-70">
            En attente que les inspecteurs lancent la question...
          </p>
        </div>
      )}

      {/* État: ANSWERING - Suspects répondent */}
      {questionState === "answering" && myTeam === "suspects" && (
        <div className="card space-y-4">
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
                className="w-full p-4 rounded-lg bg-slate-700 border-2 border-primary text-white min-h-[120px]"
                placeholder="Ta réponse..."
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                maxLength={500}
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
        </div>
      )}

      {questionState === "answering" && myTeam === "inspectors" && (
        <div className="space-y-6">
          {/* Timer et question */}
          <div className="card text-center space-y-4">
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
          </div>

          {/* Réponses en temps réel */}
          <div className="card space-y-4">
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
          </div>
        </div>
      )}

      {/* État: VERDICT - Affichage du verdict */}
      {questionState === "verdict" && (
        <div className="space-y-6">
          {/* Animation de verdict */}
          {verdict === "correct" && (
            <div className="min-h-[500px] flex items-center justify-center rounded-lg bg-gradient-to-br from-green-400 via-green-500 to-green-600 animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_50%)] animate-ping"></div>
              <div className="text-center z-10 space-y-6 p-8">
                <div className="text-9xl mb-4 animate-bounce">✅</div>
                <p className="text-5xl font-black text-white drop-shadow-2xl animate-pulse">
                  BONNE RÉPONSE !
                </p>
                <p className="text-2xl text-white/90 font-bold">
                  Les suspects sont convaincants ! 🎉
                </p>
                <div className="flex gap-4 justify-center mt-8">
                  <span className="text-4xl animate-bounce" style={{animationDelay: '0s'}}>🎊</span>
                  <span className="text-4xl animate-bounce" style={{animationDelay: '0.1s'}}>⭐</span>
                  <span className="text-4xl animate-bounce" style={{animationDelay: '0.2s'}}>🎉</span>
                  <span className="text-4xl animate-bounce" style={{animationDelay: '0.3s'}}>✨</span>
                </div>
                <p className="text-xl text-white/80 mt-4">
                  {currentQuestion >= 9 ? "Fin de l'interrogatoire..." : "Question suivante dans 4s..."}
                </p>
              </div>
            </div>
          )}

          {verdict === "incorrect" && (
            <div className="min-h-[500px] flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500 via-red-600 to-red-700 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-1 bg-white animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white animate-pulse"></div>
              </div>
              <div className="text-center z-10 space-y-6 p-8">
                <div className="text-9xl mb-4 animate-shake">❌</div>
                <p className="text-5xl font-black text-white drop-shadow-2xl">
                  MAUVAISE RÉPONSE
                </p>
                <p className="text-2xl text-white/90 font-bold">
                  Les inspecteurs détectent l'incohérence ! 🕵️
                </p>
                <div className="flex gap-4 justify-center mt-8">
                  <span className="text-4xl animate-pulse" style={{animationDelay: '0s'}}>⚠️</span>
                  <span className="text-4xl animate-pulse" style={{animationDelay: '0.2s'}}>💥</span>
                  <span className="text-4xl animate-pulse" style={{animationDelay: '0.4s'}}>⚠️</span>
                </div>
                <p className="text-xl text-white/80 mt-4">
                  {currentQuestion >= 9 ? "Fin de l'interrogatoire..." : "Question suivante dans 4s..."}
                </p>
              </div>
            </div>
          )}

          {verdict === "timeout" && (
            <div className="min-h-[500px] flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-red-500 to-red-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20 animate-pulse"></div>
              <div className="text-center z-10 space-y-6 p-8">
                <div className="text-9xl mb-4 animate-spin" style={{animationDuration: '2s'}}>⏰</div>
                <p className="text-5xl font-black text-white drop-shadow-2xl animate-pulse">
                  TEMPS ÉCOULÉ !
                </p>
                <p className="text-2xl text-white/90 font-bold">
                  Les suspects n'ont pas répondu à temps ! ⏱️
                </p>
                <div className="bg-red-700/50 p-4 rounded-lg border-2 border-white/50 mt-6">
                  <p className="text-xl text-white font-bold">
                    ⚠️ Échec automatique - Pas de point marqué
                  </p>
                </div>
                <p className="text-xl text-white/80 mt-4">
                  {currentQuestion >= 9 ? "Fin de l'interrogatoire..." : "Question suivante dans 4s..."}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
