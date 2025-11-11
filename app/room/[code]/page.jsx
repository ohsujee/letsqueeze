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
import QrModal from "@/lib/components/QrModal";
import BottomNav from "@/lib/components/BottomNav";
import TeamTabs from "@/lib/components/TeamTabs";
import PlayerTeamView from "@/lib/components/PlayerTeamView";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]);

  // Calculer joinUrl seulement côté client et quand on a le code
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  // Charger le manifest des quiz
  useEffect(() => {
    fetch("/data/manifest.json")
      .then(r => r.json())
      .then(data => {
        setQuizOptions(data.quizzes || []);
      })
      .catch(err => {
        console.error("Erreur chargement manifest:", err);
        setQuizOptions([{ id: "general", title: "Général" }]);
      });
  }, []);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsHost(meta?.hostUid === user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
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

    // Écouter les changements d'état pour rediriger quand la partie commence
    const stateUnsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing") {
        // Rediriger selon le rôle
        if (isHost) {
          router.push(`/game/${code}/host`);
        } else {
          router.push(`/game/${code}/play`);
        }
      }
    });

    return () => {
      metaUnsub();
      playersUnsub();
      stateUnsub();
    };
  }, [code, router, isHost]);

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
    // La redirection se fera automatiquement via le listener d'état
  };

  const handleModeToggle = async () => {
    if (!isHost) return;
    const newMode = meta?.mode === "équipes" ? "individuel" : "équipes";

    // Si on passe en mode équipe, créer les équipes si elles n'existent pas
    if (newMode === "équipes" && (!teams || Object.keys(teams).length === 0)) {
      const defaultTeams = {
        team1: { name: "Équipe Rouge", color: teamColors[0], score: 0 },
        team2: { name: "Équipe Bleue", color: teamColors[1], score: 0 },
        team3: { name: "Équipe Verte", color: teamColors[2], score: 0 },
        team4: { name: "Équipe Orange", color: teamColors[3], score: 0 }
      };
      await update(ref(db, `rooms/${code}/meta`), { mode: newMode, teams: defaultTeams });
    } else if (newMode === "individuel") {
      // Si on passe en mode individuel, retirer tous les joueurs des équipes
      const updates = {};
      players.forEach(p => {
        updates[`rooms/${code}/players/${p.uid}/teamId`] = "";
      });
      updates[`rooms/${code}/meta/mode`] = newMode;
      await update(ref(db), updates);
    } else {
      await update(ref(db, `rooms/${code}/meta`), { mode: newMode });
    }
  };

  const handleQuizChange = async (e) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/meta`), { quizId: e.target.value });
  };

  const handleQuit = () => {
    router.push("/");
  };

  const copyLink = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && joinUrl) {
      try {
        await navigator.clipboard.writeText(joinUrl);
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

  const selectedQuizTitle = quizOptions.find(q => q.id === (meta?.quizId || "general"))?.title || "Général";

  // Fonctions de gestion des équipes
  const handleAssignToTeam = async (playerUid, teamId) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/players/${playerUid}`), { teamId });
  };

  const handleRemoveFromTeam = async (playerUid) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/players/${playerUid}`), { teamId: "" });
  };

  const handleAutoBalance = async () => {
    if (!isHost || !teams || Object.keys(teams).length === 0) return;

    const teamIds = Object.keys(teams);
    const updates = {};

    // Mélanger aléatoirement les joueurs (algorithme Fisher-Yates)
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }

    // Répartir les joueurs mélangés équitablement dans les équipes
    shuffledPlayers.forEach((player, index) => {
      const teamIndex = index % teamIds.length;
      updates[`rooms/${code}/players/${player.uid}/teamId`] = teamIds[teamIndex];
    });

    await update(ref(db), updates);
  };

  const handleResetTeams = async () => {
    if (!isHost) return;
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/teamId`] = "";
    });
    await update(ref(db), updates);
  };

  if (!meta) {
    return (
      <div className="game-container">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
        <main className="game-content p-6 max-w-5xl mx-auto min-h-screen">
          <div className="card text-center">
            <h1 className="game-section-title mb-4">Chargement...</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1">
          <h1 className="game-page-title">
            Lobby
          </h1>
          <div className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
            {selectedQuizTitle} • Code: <span className="font-bold text-base">{code}</span>
          </div>
        </div>
        {isHost && (
          <button className="btn btn-danger self-start md:self-auto" onClick={handleQuit}>
            Quitter
          </button>
        )}
      </div>

      <div className="card">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-bold mb-2">Invite des joueurs</h3>
          <div className="text-sm opacity-80 mb-3">{joinUrl || "Génération du lien..."}</div>

          <div className="flex gap-2 justify-center flex-wrap">
            <button className="btn copy-btn" onClick={copyLink} disabled={!joinUrl}>
              Copier le lien
            </button>
            {joinUrl && <QrModal text={joinUrl} buttonText="Voir QR Code" />}
          </div>
        </div>
      </div>

      {/* Section des contrôles - visible seulement pour l'host - Mobile First */}
      {isHost && (
        <div className="space-y-4">
          {/* Primary Action - Always Visible */}
          <button
            className="btn btn-primary w-full h-14 text-lg font-bold"
            onClick={handleStartGame}
          >
            🚀 Démarrer la partie
          </button>

          {/* Settings Grid - Mobile: Stack, Tablet+: 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quiz Selection */}
            <div className="card">
              <h3 className="font-bold text-base mb-3">📚 Quiz</h3>
              <select
                value={meta.quizId || "general"}
                onChange={handleQuizChange}
                className="game-select"
              >
                {quizOptions.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode de jeu */}
            <div className="card">
              <h3 className="font-bold text-base mb-3">👥 Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`btn ${meta.mode === "individuel" ? "btn-accent" : ""}`}
                  onClick={handleModeToggle}
                >
                  Solo
                </button>
                <button
                  className={`btn ${meta.mode === "équipes" ? "btn-accent" : ""}`}
                  onClick={handleModeToggle}
                >
                  Équipes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {meta.mode === "équipes" && isHost && (
        <div className="card">
          <TeamTabs
            teams={teams}
            players={players}
            onAssignToTeam={handleAssignToTeam}
            onRemoveFromTeam={handleRemoveFromTeam}
            onAutoBalance={handleAutoBalance}
            onResetTeams={handleResetTeams}
          />
        </div>
      )}

      {meta.mode === "équipes" && !isHost && (
        <div className="card">
          <PlayerTeamView
            teams={teams}
            players={players}
            currentPlayerUid={auth.currentUser?.uid}
          />
        </div>
      )}

      {/* Players List - Mobile Optimized */}
      {meta.mode !== "équipes" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">👥 Joueurs</h3>
            <span className="px-3 py-1 bg-blue-500/20 rounded-full text-sm font-bold">
              {players.length}
            </span>
          </div>
          {players.length === 0 ? (
            <div className="text-center opacity-85 py-8 text-base">
              En attente de joueurs...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((player) => (
                <div
                  key={player.uid}
                  className="card text-base font-medium p-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  {player.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>

    <BottomNav />

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
    </div>
  );
}
