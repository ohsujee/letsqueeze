"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";

export default function AlibiPrep() {
  const { code } = useParams();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(90);
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [alibi, setAlibi] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [customQuestions, setCustomQuestions] = useState(["", "", ""]);
  const timerRef = useRef(null);

  // Auth et récupération de l'équipe du joueur
  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && code) {
        // Récupérer l'équipe du joueur
        onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
          const player = snap.val();
          if (player) setMyTeam(player.team);
        });
        // Vérifier si c'est l'hôte
        onValue(ref(db, `rooms_alibi/${code}/meta/hostUid`), (snap) => {
          setIsHost(snap.val() === user.uid);
        });
      }
    });
    return () => unsub();
  }, [code]);

  // Écouter les données de la room
  useEffect(() => {
    if (!code) return;

    const alibiUnsub = onValue(ref(db, `rooms_alibi/${code}/alibi`), (snap) => {
      setAlibi(snap.val());
    });

    const questionsUnsub = onValue(ref(db, `rooms_alibi/${code}/questions`), (snap) => {
      const q = snap.val() || [];
      setQuestions(q);
      // Initialiser les questions custom
      setCustomQuestions([
        q[7]?.text || "",
        q[8]?.text || "",
        q[9]?.text || ""
      ]);
    });

    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "interrogation") {
        router.push(`/alibi/game/${code}/play`);
      }
      if (state?.prepTimeLeft !== undefined) {
        setTimeLeft(state.prepTimeLeft);
      }
    });

    return () => {
      alibiUnsub();
      questionsUnsub();
      stateUnsub();
    };
  }, [code, router]);

  // Timer countdown (seulement pour l'hôte)
  useEffect(() => {
    if (!isHost) return;

    if (timeLeft <= 0) {
      // Temps écoulé, passer à la phase interrogation
      if (timerRef.current) clearInterval(timerRef.current);
      update(ref(db, `rooms_alibi/${code}/state`), {
        phase: "interrogation",
        currentQuestion: 0
      });
      // Initialiser l'état de l'interrogation
      update(ref(db, `rooms_alibi/${code}/interrogation`), {
        currentQuestion: 0,
        state: "waiting",
        timeLeft: 30,
        responses: {},
        verdict: null
      });
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        update(ref(db, `rooms_alibi/${code}/state`), { prepTimeLeft: newTime });
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, code, isHost]);

  const handleSaveCustomQuestion = async (index, text) => {
    const questionId = 7 + index;
    await update(ref(db, `rooms_alibi/${code}/questions/${questionId}`), { text });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fonction pour parser le markdown basique (texte en gras avec **)
  const parseMarkdown = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-yellow-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Fonction pour afficher du HTML (nouveau format)
  const renderHTML = (html) => {
    if (!html) return null;
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="prose prose-invert max-w-none"
        style={{
          // Style pour les éléments en gras dans le HTML
          '--tw-prose-bold': '#fde047', // text-yellow-300
        }}
      />
    );
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Timer */}
      <div className="card text-center">
        <h1 className="text-4xl font-black mb-2">
          {timeLeft > 10 ? "⏱️" : "⚠️"} {formatTime(timeLeft)}
        </h1>
        <p className="text-lg opacity-80">Phase de préparation</p>
        {timeLeft <= 10 && (
          <p className="text-red-400 font-bold mt-2 animate-pulse">
            L'interrogatoire va commencer !
          </p>
        )}
      </div>

      {/* Vue SUSPECTS : Alibi à mémoriser */}
      {myTeam === "suspects" && alibi && (
        <div className="card space-y-4">
          <h2 className="text-2xl font-bold text-primary">🎭 Ton Alibi</h2>
          <p className="text-sm opacity-70">
            Mémorise les éléments en <strong className="text-yellow-300">gras</strong> - tu n'auras plus accès à ce texte pendant l'interrogatoire !
          </p>

          {alibi.isNewFormat ? (
            // Nouveau format : Context + Accused Document
            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg border-l-4 border-primary">
                <p className="text-sm font-bold opacity-90">{alibi.context}</p>
              </div>
              {renderHTML(alibi.accused_document)}
            </div>
          ) : (
            // Ancien format : Scenario avec markdown
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed">
                {parseMarkdown(alibi.scenario)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vue INSPECTEURS : Contexte + Questions */}
      {myTeam === "inspectors" && (
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-2xl font-bold text-accent">🕵️ Contexte de l'alibi</h2>
            <p className="text-sm opacity-70">
              Les suspects vont devoir défendre cet alibi. Prépare tes questions !
            </p>
            {alibi && (
              alibi.isNewFormat ? (
                // Nouveau format : Context + Inspector Summary
                <div className="space-y-4">
                  <div className="p-3 bg-slate-700/50 rounded-lg border-l-4 border-accent">
                    <p className="text-sm font-bold opacity-90">{alibi.context}</p>
                  </div>
                  <p className="text-sm opacity-80 italic">{alibi.inspector_summary}</p>
                </div>
              ) : (
                // Ancien format : Scenario complet
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-sm opacity-90">
                    {parseMarkdown(alibi.scenario)}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="card space-y-4">
            <h2 className="text-xl font-bold">
              Questions prédéfinies ({alibi?.isNewFormat ? '10' : '7'})
            </h2>
            <ol className="space-y-2 list-decimal list-inside">
              {questions.slice(0, alibi?.isNewFormat ? 10 : 7).map((q, i) => (
                <li key={i} className="text-sm opacity-90">{q.text}</li>
              ))}
            </ol>
          </div>

          {/* Questions personnalisées seulement pour l'ancien format */}
          {!alibi?.isNewFormat && (
            <div className="card space-y-4">
              <h2 className="text-xl font-bold">Questions personnalisées (3)</h2>
              <p className="text-sm opacity-70">
                Ajoute 3 questions basées sur l'alibi pour piéger les suspects !
              </p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <label className="block text-sm font-bold mb-1 opacity-80">
                      Question {8 + index}
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-lg bg-slate-700 border-2 border-accent text-white"
                      placeholder="Ex: Quelle était la couleur exacte du café que vous avez commandé ?"
                      value={customQuestions[index]}
                      onChange={(e) => {
                        const newCustom = [...customQuestions];
                        newCustom[index] = e.target.value;
                        setCustomQuestions(newCustom);
                        handleSaveCustomQuestion(index, e.target.value);
                      }}
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aucune équipe assignée */}
      {!myTeam && (
        <div className="card text-center">
          <p className="opacity-70">Tu n'es assigné à aucune équipe...</p>
        </div>
      )}
    </main>
  );
}
