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
import Qr from "@/components/Qr";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]); // État pour les quiz du manifest

  // Charger le manifest des quiz
  useEffect(() => {
    fetch("/data/manifest.json")
      .then(r => r.json())
      .then(data => {
        setQuizOptions(data.quizzes || []);
      })
      .catch(err => {
        console.error("Erreur chargement manifest:", err);
        // Fallback en cas d'erreur
        setQuizOptions([{ id: "general", title: "Général" }]);
      });
  }, []);

  // Auth
  useEffect(() => {
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setIsHost(meta?.hostUid === user.uid);
    });
    return () => unsub();
  }, [meta?.hostUid]);

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms/${code}/meta`), (snap) => {
      const m = snap.val();
      setMeta(m);
      setTeams(m?.teams || {});
    });

    const playersUnsub = onValue(ref(db, `rooms/${code}/players`), (snap) => {
      const p = snap.val() || {};
      setPlayers(Object.values(p));
    });

    return () => {
      metaUnsub();
      playersUnsub();
    };
  }, [code]);

  const handleStartGame = async () => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/state`), {
      phase: "playing",
      currentIndex: 0,
      revealed: false,
      lockUid: null,
      buzzBanner: "",
      elapsedAcc: 0,
      lastRevealAt: 0,
      pausedAt: null,
      lockedAt: null,
    });
    router.push(`/game/${code}/host`);
  };

  const handleModeToggle = async () => {
    if (!isHost) return;
    const newMode = meta?.mode === "équipes" ? "individuel" : "équipes";
    await update(ref(db, `rooms/${code}/meta`), { mode: newMode });
  };

  const handleQuizChange = async (e) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/meta`), { quizId: e.target.value });
  };

  const handleQuit = () => {
    router.push("/");
  };

  const joinUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join?code=${code}` 
    : "";

  const copyLink = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(joinUrl);
        // Feedback visuel basique
        const btn = document.querySelector('.copy-btn');
        if (btn) {
          const original = btn.textContent;
          btn.textContent = 'Copié !';
          setTimeout(() => { btn.textContent = original; }, 2000);
        }
      } catch (err) {
        console.error("Erreur copie:", err);
      }
    }
  };

  const teamColors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4"];
  const teamsSorted = Object.keys(teams).map(id => ({ id, ...teams[id] }));

  // Trouver le titre du quiz sélectionné
  const selectedQuizTitle = quizOptions.find(q => q.id === (meta?.quizId || "general"))?.title || "Général";

  if (!meta) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-black mb-4">Chargement...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black">
          Lobby — {selectedQuizTitle}
        </h1>
        <div className="flex gap-3">
          {isHost && (
            <button className="btn" onClick={() => router.push("/")}>
              Masquer l'invitation
            </button>
          )}
          <button className="btn btn-danger" onClick={handleQuit}>
            Quitter
          </button>
        </div>
      </div>

      <div className="text-sm opacity-80">
        Code: <span className="font-bold text-lg">{code}</span>
      </div>

      {/* Section invitation */}
      <div className="card">
        <div className="text-center space-y-4">
          <Qr text={joinUrl} size={200} />
          
          <div>
            <h3 className="text-lg font-bold mb-2">Invite des joueurs</h3>
            <div className="text-sm opacity-80 mb-3">{joinUrl}</div>
            
            <div className="flex gap-2 justify-center">
              <button className="btn btn-primary" onClick={handleStartGame} disabled={!isHost}>
                Partager
              </button>
              <button className="btn copy-btn" onClick={copyLink}>
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration du jeu */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Mode de jeu */}
        <div className="card">
          <h3 className="font-bold mb-3">Mode de jeu</h3>
          <div className="space-y-2">
            <button
              className={`btn w-full ${meta.mode === "individuel" ? "btn-accent" : ""}`}
              onClick={handleModeToggle}
              disabled={!isHost}
            >
              Individuel
            </button>
            <button
              className={`btn w-full ${meta.mode === "équipes" ? "btn-accent" : ""}`}
              onClick={handleModeToggle}
              disabled={!isHost}
            >
              Équipes
            </button>
          </div>
        </div>

        {/* Quiz */}
        <div className="card">
          <h3 className="font-bold mb-3">Quiz</h3>
          <select
            value={meta.quizId || "general"}
            onChange={handleQuizChange}
            disabled={!isHost}
            className="w-full p-3 rounded-lg bg-slate-700 border-2 border-blue-500 text-white"
          >
            {quizOptions.map(quiz => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
          <div className="text-xs opacity-70 mt-2">
            Choisis un quiz, puis démarre la partie.
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <h3 className="font-bold mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleStartGame}
              disabled={!isHost}
            >
              Démarrer la partie
            </button>
            <button
              className="btn w-full"
              onClick={() => router.push("/")}
            >
              Retour accueil
            </button>
          </div>
        </div>
      </div>

      {/* Équipes (si mode équipes) */}
      {meta.mode === "équipes" && (
        <div className="card">
          <h3 className="font-bold mb-3">Équipes</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teamsSorted.map((team, index) => (
              <div
                key={team.id}
                className="card"
                style={{ 
                  backgroundColor: team.color,
                  color: '#1E293B',
                  fontWeight: 'bold'
                }}
              >
                {team.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Joueurs */}
      <div className="card">
        <h3 className="font-bold mb-3">Joueurs ({players.length})</h3>
        {players.length === 0 ? (
          <div className="text-center opacity-60 py-8">
            En attente de joueurs...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {players.map((player) => (
              <div key={player.uid} className="card text-sm">
                {player.name}
                {meta.mode === "équipes" && player.teamId && (
                  <div
                    className="mt-1 px-2 py-1 rounded text-xs font-bold"
                    style={{
                      backgroundColor: teams[player.teamId]?.color || "#64748B",
                      color: '#1E293B'
                    }}
                  >
                    {teams[player.teamId]?.name || "Équipe"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-sm opacity-60">
        Room {code} — {isHost ? "Vous êtes l'animateur" : "En attente..."}
      </div>
    </main>
  );
}
