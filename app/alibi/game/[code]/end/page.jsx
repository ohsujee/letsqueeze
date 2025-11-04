"use client";

import { useEffect, useState } from "react";
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

export default function AlibiEnd() {
  const { code } = useParams();
  const router = useRouter();

  const [score, setScore] = useState({ correct: 0, total: 10 });
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && code) {
        onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
          const player = snap.val();
          if (player) setMyTeam(player.team);
        });
        onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
          const m = snap.val();
          setMeta(m);
          setIsHost(m?.hostUid === user.uid);
        });
      }
    });
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (!code) return;

    const scoreUnsub = onValue(ref(db, `rooms_alibi/${code}/score`), (snap) => {
      const s = snap.val() || { correct: 0, total: 10 };
      setScore(s);
    });

    // Redirection automatique quand l'hôte retourne au lobby
    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      scoreUnsub();
      stateUnsub();
    };
  }, [code, router]);

  const handleReturnToLobby = async () => {
    if (!isHost) return;

    // Retourner au lobby SANS réinitialiser les scores
    // Les scores seront réinitialisés au prochain démarrage de partie
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

    router.push(`/alibi/room/${code}`);
  };

  const percentage = Math.round((score.correct / score.total) * 100);
  const isSuccess = percentage >= 50;

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton ! 🏆";
    if (percentage >= 80) return "Excellent ! Très crédible ! 🌟";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant ! 👍";
    if (percentage >= 50) return "Passable... Quelques failles... 🤔";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences ! ⚠️";
    return "Alibi effondré ! Trop d'erreurs ! ❌";
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Score principal */}
      <div className={`card text-center space-y-6 ${isSuccess ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"}`}>
        <h1 className="text-4xl font-black">🕵️ Fin de l'interrogatoire</h1>

        <div className="space-y-4">
          <p className="text-6xl font-black">
            {score.correct} / {score.total}
          </p>
          <p className="text-2xl opacity-80">{percentage}%</p>
        </div>

        <div className={`p-6 rounded-lg ${isSuccess ? "bg-green-500/20" : "bg-red-500/20"}`}>
          <p className="text-2xl font-bold">{getMessage()}</p>
        </div>
      </div>

      {/* Détails par équipe */}
      {myTeam === "suspects" && (
        <div className="card space-y-4">
          <h2 className="text-2xl font-bold text-primary">🎭 Suspects</h2>
          {isSuccess ? (
            <div className="space-y-2">
              <p className="text-lg">Bravo ! Vous avez défendu votre alibi avec succès.</p>
              <p className="opacity-70">Les inspecteurs ont validé {score.correct} de vos réponses sur {score.total}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">Les inspecteurs ont trouvé trop d'incohérences...</p>
              <p className="opacity-70">Seulement {score.correct} réponses validées sur {score.total}.</p>
            </div>
          )}
        </div>
      )}

      {myTeam === "inspectors" && (
        <div className="card space-y-4">
          <h2 className="text-2xl font-bold text-accent">🕵️ Inspecteurs</h2>
          {!isSuccess ? (
            <div className="space-y-2">
              <p className="text-lg">Excellent travail ! Vous avez démasqué les suspects.</p>
              <p className="opacity-70">Vous avez détecté {score.total - score.correct} incohérence(s) sur {score.total} questions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">Les suspects s'en sortent plutôt bien...</p>
              <p className="opacity-70">Vous avez validé {score.correct} de leurs réponses sur {score.total}.</p>
            </div>
          )}
        </div>
      )}

      {/* Bouton retour au lobby (Host seulement) */}
      {isHost && (
        <div className="card space-y-4">
          <button
            className="btn btn-accent w-full h-14 text-xl"
            onClick={handleReturnToLobby}
          >
            Retour au lobby
          </button>
          <p className="text-sm text-center opacity-70">
            Vous pourrez choisir un nouvel alibi et relancer une partie
          </p>
        </div>
      )}

      {/* Bouton retour au lobby pour les joueurs */}
      {!isHost && (
        <div className="card space-y-4">
          <button
            className="btn btn-primary w-full h-14 text-xl"
            onClick={() => router.push(`/alibi/room/${code}`)}
          >
            Retour au lobby
          </button>
          <p className="text-sm text-center opacity-70">
            Retourne au lobby pour la prochaine partie
          </p>
        </div>
      )}
    </main>
  );
}
