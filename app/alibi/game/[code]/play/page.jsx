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
  const [suspects, setSuspects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionState, setQuestionState] = useState("waiting"); // waiting | answering | judging | verdict
  const [timeLeft, setTimeLeft] = useState(30);
  const [myAnswer, setMyAnswer] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [responses, setResponses] = useState({});
  const [verdict, setVerdict] = useState(null); // null | "correct" | "incorrect"
  const timerRef = useRef(null);

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
      setTimeLeft(data.timeLeft || 30);
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
  }, [code, router]);

  // Timer pour la phase answering
  useEffect(() => {
    if (questionState !== "answering") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timeLeft <= 0) {
      // Temps écoulé, passer à judging
      if (timerRef.current) clearInterval(timerRef.current);
      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        state: "judging"
      });
      return;
    }

    timerRef.current = setInterval(() => {
      update(ref(db, `rooms_alibi/${code}/interrogation/timeLeft`), timeLeft - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [questionState, timeLeft, code]);

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

    // Réinitialiser l'état local
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

    // Attendre 3 secondes puis passer à la question suivante ou fin
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
    }, 3000);
  };

  // Actions SUSPECTS
  const submitAnswer = async () => {
    if (myTeam !== "suspects" || !myUid || hasAnswered) return;

    await update(ref(db, `rooms_alibi/${code}/interrogation/responses/${myUid}`), {
      answer: myAnswer,
      uid: myUid,
      name: suspects.find(s => s.uid === myUid)?.name || "Inconnu"
    });

    setHasAnswered(true);

    // Vérifier si tous les suspects ont répondu
    const allSuspectsAnswered = suspects.every(s =>
      responses[s.uid] || s.uid === myUid
    );

    if (allSuspectsAnswered) {
      await update(ref(db, `rooms_alibi/${code}/interrogation`), {
        state: "judging"
      });
    }
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
              <p className="font-bold text-green-400">✓ Réponse envoyée !</p>
              <p className="text-sm opacity-70 mt-2">En attente des autres suspects...</p>
            </div>
          )}
        </div>
      )}

      {questionState === "answering" && myTeam === "inspectors" && (
        <div className="card text-center space-y-4">
          <h2 className="text-3xl font-black">
            ⏱️ {formatTime(timeLeft)}
          </h2>
          <p className="text-lg opacity-70">Les suspects répondent...</p>
          <p className="text-sm opacity-50">
            {Object.keys(responses).length} / {suspects.length} suspect(s) ont répondu
          </p>
        </div>
      )}

      {/* État: JUDGING - Inspecteurs jugent */}
      {questionState === "judging" && myTeam === "inspectors" && (
        <div className="card space-y-6">
          <h2 className="text-2xl font-bold text-center">Réponses des suspects</h2>

          <div className="space-y-4">
            {suspects.map(suspect => {
              const response = responses[suspect.uid];
              return (
                <div key={suspect.uid} className="bg-slate-700 p-4 rounded-lg">
                  <p className="font-bold text-primary mb-2">🎭 {suspect.name}</p>
                  <p className="text-lg">{response?.answer || "Pas de réponse"}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600">
            <button
              className="btn btn-error h-16 text-xl"
              onClick={() => judgeAnswers(false)}
            >
              ❌ Mauvaise réponse
            </button>
            <button
              className="btn btn-success h-16 text-xl"
              onClick={() => judgeAnswers(true)}
            >
              ✅ Bonne réponse
            </button>
          </div>
        </div>
      )}

      {questionState === "judging" && myTeam === "suspects" && (
        <div className="card text-center">
          <p className="text-lg opacity-70">
            Les inspecteurs analysent vos réponses...
          </p>
        </div>
      )}

      {/* État: VERDICT - Affichage du verdict */}
      {questionState === "verdict" && (
        <div
          className={`min-h-[400px] flex items-center justify-center rounded-lg ${
            verdict === "correct" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <div className="text-center">
            <p className="text-6xl mb-4">{verdict === "correct" ? "✅" : "❌"}</p>
            <p className="text-4xl font-black text-white">
              {verdict === "correct" ? "BONNE RÉPONSE" : "MAUVAISE RÉPONSE"}
            </p>
            <p className="text-xl text-white/80 mt-4">
              {currentQuestion >= 9 ? "Fin de l'interrogatoire..." : "Question suivante dans 3s..."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
