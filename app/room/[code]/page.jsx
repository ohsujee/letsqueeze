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
          <button className="btn btn-danger" onClick={handleQuit}>
            Quitter
          </button>
        </div>
      </div>

      <div className="text-sm opacity-80">
        Code: <span className="font-bold text-lg">{code}</span>
      </div>

      <div className="card">
        <div className="text-center space-y-4">
          {/* N'afficher le QR que si on a l'URL */}
          {joinUrl && <Qr text={joinUrl} size={200} />}
          
          <div>
            <h3 className="text-lg font-bold mb-2">Invite des joueurs</h3>
            <div className="text-sm opacity-80 mb-3">{joinUrl || "Génération du lien..."}</div>
            
            <div className="flex gap-2 justify-center">
              <button className="btn copy-btn" onClick={copyLink} disabled={!joinUrl}>
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section des contrôles - visible seulement pour l'host */}
      {isHost && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-bold mb-3">Mode de jeu</h3>
            <div className="space-y-2">
              <button
                className={`btn w-full ${meta.mode === "individuel" ? "btn-accent" : ""}`}
                onClick={handleModeToggle}
              >
                Individuel
              </button>
              <button
                className={`btn w-full ${meta.mode === "équipes" ? "btn-accent" : ""}`}
                onClick={handleModeToggle}
              >
                Équipes
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold mb-3">Quiz</h3>
            <select
              value={meta.quizId || "general"}
              onChange={handleQuizChange}
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

          <div className="card">
            <h3 className="font-bold mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                className="btn btn-primary w-full"
                onClick={handleStartGame}
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
      )}

      {meta.mode === "équipes" && isHost && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Gestion des équipes</h3>
            <div className="flex gap-2">
              <button className="btn btn-sm" onClick={handleAutoBalance}>
                ⚖️ Auto-répartir
              </button>
              <button className="btn btn-sm btn-danger" onClick={handleResetTeams}>
                🔄 Réinitialiser tout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamsSorted.map((team) => {
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const unassignedPlayers = players.filter(p => !p.teamId || p.teamId === "");

              return (
                <div
                  key={team.id}
                  className="card p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: team.color, boxShadow: `0 0 10px ${team.color}80` }}
                    />
                    <h4 className="font-bold text-lg">{team.name}</h4>
                    <span className="text-xs opacity-60">({teamPlayers.length})</span>
                  </div>

                  {/* Joueurs de cette équipe */}
                  <div className="space-y-1 min-h-[60px]">
                    {teamPlayers.length === 0 ? (
                      <div className="text-xs opacity-60 italic">Aucun joueur</div>
                    ) : (
                      teamPlayers.map(player => (
                        <div key={player.uid} className="flex items-center justify-between bg-slate-700 px-2 py-1 rounded text-sm">
                          <span>{player.name}</span>
                          <button
                            className="text-xs opacity-70 hover:opacity-100"
                            onClick={() => handleRemoveFromTeam(player.uid)}
                            title="Retirer de l'équipe"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Sélecteur pour ajouter un joueur */}
                  {unassignedPlayers.length > 0 && (
                    <select
                      className="w-full mt-2 p-1 text-sm rounded bg-slate-700 border border-slate-600"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignToTeam(e.target.value, team.id);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Ajouter un joueur</option>
                      {unassignedPlayers.map(p => (
                        <option key={p.uid} value={p.uid}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {/* Joueurs non assignés */}
          {players.filter(p => !p.teamId || p.teamId === "").length > 0 && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded">
              <h4 className="font-bold text-sm mb-2">Joueurs sans équipe ({players.filter(p => !p.teamId || p.teamId === "").length})</h4>
              <div className="flex flex-wrap gap-2">
                {players.filter(p => !p.teamId || p.teamId === "").map(player => (
                  <div key={player.uid} className="bg-slate-600 px-3 py-1 rounded text-sm">
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {meta.mode === "équipes" && !isHost && (
        <div className="card">
          <h3 className="font-bold mb-3">Équipes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamsSorted.map((team) => {
              const teamPlayers = players.filter(p => p.teamId === team.id);
              const currentPlayer = players.find(p => p.uid === auth.currentUser?.uid);
              const isMyTeam = currentPlayer?.teamId === team.id;

              return (
                <div
                  key={team.id}
                  className="card p-4"
                  style={{
                    backgroundColor: isMyTeam ? 'rgba(30, 41, 59, 0.9)' : 'rgba(30, 41, 59, 0.5)',
                    border: isMyTeam ? `5px solid ${team.color}` : '2px solid rgba(100, 116, 139, 0.3)',
                    boxShadow: isMyTeam
                      ? `0 10px 20px rgba(0,0,0,0.5), inset 0 0 0 1px ${team.color}40`
                      : '0 2px 8px rgba(0,0,0,0.2)',
                    position: 'relative',
                    transform: isMyTeam ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Badge "MON ÉQUIPE" */}
                  {isMyTeam && (
                    <div
                      className="absolute -top-3 -right-3 px-4 py-1.5 rounded-full text-sm font-black"
                      style={{
                        backgroundColor: team.color,
                        color: 'white',
                        boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
                        animation: 'pulse 2s ease-in-out infinite'
                      }}
                    >
                      ⭐ C'EST TOI !
                    </div>
                  )}

                  {/* En-tête de l'équipe */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: team.color,
                        boxShadow: isMyTeam
                          ? `0 0 15px ${team.color}DD`
                          : `0 0 10px ${team.color}60`
                      }}
                    >
                      {isMyTeam && <span style={{ fontSize: '0.7rem', color: 'white' }}>⭐</span>}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xl" style={{
                        color: 'white',
                        textShadow: isMyTeam ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)'
                      }}>
                        {team.name}
                      </h4>
                      <span className="text-xs font-semibold" style={{
                        color: 'white',
                        opacity: 0.85
                      }}>
                        {teamPlayers.length} joueur{teamPlayers.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Liste des joueurs */}
                  <div className="space-y-1.5">
                    {teamPlayers.length === 0 ? (
                      <div className="text-sm opacity-60 italic" style={{ color: 'white' }}>
                        Aucun joueur
                      </div>
                    ) : (
                      teamPlayers.map(player => {
                        const isMe = player.uid === auth.currentUser?.uid;
                        return (
                          <div
                            key={player.uid}
                            className="px-3 py-2 rounded text-sm"
                            style={{
                              backgroundColor: isMyTeam
                                ? (isMe ? team.color : 'rgba(255, 255, 255, 0.15)')
                                : 'rgba(100, 116, 139, 0.3)',
                              color: 'white',
                              fontWeight: isMe ? 'bold' : 'normal',
                              border: isMe ? `3px solid ${team.color}` : 'none',
                              boxShadow: isMe && isMyTeam ? `0 0 15px ${team.color}80` : 'none'
                            }}
                          >
                            {isMe ? '👤 ' : ''}{player.name}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message si pas d'équipe assignée */}
          {players.find(p => p.uid === auth.currentUser?.uid && (!p.teamId || p.teamId === "")) && (
            <div className="mt-4 p-3 bg-yellow-500/20 border-2 border-yellow-500 rounded text-center">
              <span className="font-bold text-yellow-300">⚠️ Tu n'es pas encore assigné à une équipe</span>
              <br />
              <span className="text-sm opacity-80">L'animateur va t'assigner bientôt</span>
            </div>
          )}
        </div>
      )}

      {meta.mode !== "équipes" && (
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center text-sm opacity-60">
        Room {code} — {isHost ? "Vous êtes l'animateur" : "En attente..."}
      </div>
    </main>
  );
}
