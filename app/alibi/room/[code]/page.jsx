"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  remove,
  set,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import Qr from "@/components/Qr";
import QrModal from "@/lib/components/QrModal";
import BottomNav from "@/lib/components/BottomNav";

export default function AlibiLobby() {
  const { code } = useParams();
  const router = useRouter();

  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [alibiOptions, setAlibiOptions] = useState([]);
  const [selectedAlibiId, setSelectedAlibiId] = useState(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostPseudo, setHostPseudo] = useState("");
  const [hostJoined, setHostJoined] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/alibi/join?code=${code}`);
    }
  }, [code]);

  // Charger le manifest des alibis
  useEffect(() => {
    fetch("/data/alibis/manifest.json")
      .then(r => r.json())
      .then(data => {
        setAlibiOptions(data.alibis || []);
      })
      .catch(err => {
        console.error("Erreur chargement manifest alibis:", err);
        setAlibiOptions([]);
      });
  }, []);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsHost(meta?.hostUid === user.uid);
        // Vérifier si l'hôte a déjà rejoint
        setHostJoined(players.some(p => p.uid === user.uid));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, players]);

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
      const m = snap.val();
      setMeta(m);
      setSelectedAlibiId(m?.alibiId || null);
    });

    const playersUnsub = onValue(ref(db, `rooms_alibi/${code}/players`), (snap) => {
      const p = snap.val() || {};
      setPlayers(Object.values(p));
    });

    // Écouter les changements d'état pour rediriger quand la préparation commence
    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "prep") {
        router.push(`/alibi/game/${code}/prep`);
      }
    });

    return () => {
      metaUnsub();
      playersUnsub();
      stateUnsub();
    };
  }, [code, router]);

  const handleHostJoin = async () => {
    if (!isHost || !hostPseudo || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await set(ref(db, `rooms_alibi/${code}/players/${uid}`), {
      uid,
      name: hostPseudo,
      team: null,
      joinedAt: Date.now()
    });
  };

  const handleSelectAlibi = async (alibiId) => {
    if (!isHost) return;
    await update(ref(db, `rooms_alibi/${code}/meta`), { alibiId });
  };

  const handleAssignTeam = async (uid, team) => {
    if (!isHost) return;
    await update(ref(db, `rooms_alibi/${code}/players/${uid}`), { team });
  };

  const handleKickPlayer = async (uid) => {
    if (!isHost) return;
    await remove(ref(db, `rooms_alibi/${code}/players/${uid}`));
  };

  const handleStartGame = async () => {
    if (!isHost || !selectedAlibiId) return;

    // Charger l'alibi sélectionné
    const alibiData = await fetch(`/data/alibis/${selectedAlibiId}.json`).then(r => r.json());

    // Déterminer si c'est le nouveau format ou l'ancien
    const isNewFormat = alibiData.accused_document !== undefined;

    // Préparer les questions selon le format
    let questions;
    if (isNewFormat) {
      // Nouveau format : 10 questions prédéfinies (pas de questions custom)
      questions = alibiData.inspector_questions.map((q, i) => ({
        id: i,
        text: q,
        custom: false
      }));
    } else {
      // Ancien format : 7 prédéfinies + 3 custom
      questions = [
        ...alibiData.predefinedQuestions.map((q, i) => ({ id: i, text: q, custom: false })),
        { id: 7, text: "", custom: true },
        { id: 8, text: "", custom: true },
        { id: 9, text: "", custom: true }
      ];
    }

    // Initialiser les données du jeu avec score réinitialisé
    await update(ref(db, `rooms_alibi/${code}`), {
      alibi: {
        // Nouveau format
        context: alibiData.context || null,
        accused_document: alibiData.accused_document || null,
        inspector_summary: alibiData.inspector_summary || null,
        // Ancien format (pour compatibilité)
        scenario: alibiData.scenario || null,
        keyElements: alibiData.keyElements || null,
        // Commun
        title: alibiData.title,
        isNewFormat
      },
      questions,
      state: {
        phase: "prep",
        currentQuestion: 0,
        prepTimeLeft: alibiData.reading_time_seconds || 90,
        questionTimeLeft: 30,
        allAnswered: false
      },
      score: {
        correct: 0,
        total: 10
      }
    });
  };

  const inspectors = players.filter(p => p.team === "inspectors");
  const suspects = players.filter(p => p.team === "suspects");
  const unassigned = players.filter(p => !p.team);

  const canStart = isHost && selectedAlibiId && inspectors.length > 0 && suspects.length > 0;

  return (
    <div className="game-container">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-6 max-w-4xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
        <h1 className="game-page-title">🕵️ ALIBI - Lobby</h1>

      {/* QR Code et partage (Host seulement) */}
      {isHost && joinUrl && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Inviter des joueurs</h2>
          <div className="space-y-3">
            <p className="text-sm"><b>Code :</b> <span className="text-2xl font-black">{code}</span></p>
            <p className="text-sm break-all"><b>URL :</b> {joinUrl}</p>
            <div className="flex gap-2 flex-wrap">
              {joinUrl && <QrModal text={joinUrl} buttonText="Voir QR Code" />}
            </div>
          </div>
        </div>
      )}

      {/* Rejoindre en tant qu'hôte */}
      {isHost && !hostJoined && (
        <div className="card space-y-4 bg-accent/10 border-2 border-accent">
          <h2 className="font-bold text-lg">🎮 Rejoindre la partie</h2>
          <p className="text-sm opacity-80">Entre ton pseudo pour participer au jeu !</p>
          <div className="flex gap-2">
            <input
              className="game-input game-input-accent flex-1"
              placeholder="Ton pseudo"
              value={hostPseudo}
              onChange={(e) => setHostPseudo(e.target.value)}
              maxLength={20}
              autoComplete="name"
            />
            <button
              className="btn btn-accent px-6"
              onClick={handleHostJoin}
              disabled={!hostPseudo}
            >
              Rejoindre
            </button>
          </div>
        </div>
      )}

      {/* Sélection de l'alibi (Host seulement) */}
      {isHost && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Choisir un alibi</h2>
          <select
            className="game-select game-select-accent"
            value={selectedAlibiId || ""}
            onChange={(e) => handleSelectAlibi(e.target.value)}
          >
            <option value="">-- Sélectionner un alibi --</option>
            {alibiOptions.map(alibi => (
              <option key={alibi.id} value={alibi.id}>{alibi.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Assignation des équipes (Host seulement) */}
      {isHost && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Assigner les équipes</h2>

          {/* Non assignés */}
          {unassigned.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold opacity-70">Non assignés ({unassigned.length})</h3>
              <div className="space-y-2">
                {unassigned.map(player => (
                  <div key={player.uid} className="flex items-center gap-2 p-2 bg-slate-700 rounded">
                    <span className="flex-1">{player.name}</span>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => handleAssignTeam(player.uid, "inspectors")}
                    >
                      → Inspecteur
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleAssignTeam(player.uid, "suspects")}
                    >
                      → Suspect
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => handleKickPlayer(player.uid)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Inspecteurs */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-accent">🕵️ Inspecteurs ({inspectors.length})</h3>
              <div className="space-y-2">
                {inspectors.map(player => (
                  <div key={player.uid} className="flex items-center gap-2 p-2 bg-accent/10 rounded border border-accent">
                    <span className="flex-1">{player.name}</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleAssignTeam(player.uid, null)}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {inspectors.length === 0 && <p className="text-sm opacity-50 italic">Aucun inspecteur</p>}
              </div>
            </div>

            {/* Suspects */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-primary">🎭 Suspects ({suspects.length})</h3>
              <div className="space-y-2">
                {suspects.map(player => (
                  <div key={player.uid} className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary">
                    <span className="flex-1">{player.name}</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleAssignTeam(player.uid, null)}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {suspects.length === 0 && <p className="text-sm opacity-50 italic">Aucun suspect</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue joueur : voir son équipe */}
      {!isHost && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">En attente de démarrage...</h2>
          {players.find(p => p.uid === auth.currentUser?.uid)?.team === "inspectors" && (
            <div className="p-4 bg-accent/10 border border-accent rounded-lg text-center">
              <p className="text-2xl font-bold text-accent">🕵️ Tu es INSPECTEUR</p>
              <p className="text-sm opacity-70 mt-2">Tu devras interroger les suspects et trouver les incohérences</p>
            </div>
          )}
          {players.find(p => p.uid === auth.currentUser?.uid)?.team === "suspects" && (
            <div className="p-4 bg-primary/10 border border-primary rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">🎭 Tu es SUSPECT</p>
              <p className="text-sm opacity-70 mt-2">Tu devras mémoriser ton alibi et répondre aux questions</p>
            </div>
          )}
          {!players.find(p => p.uid === auth.currentUser?.uid)?.team && (
            <p className="text-center opacity-70">L'animateur va t'assigner à une équipe...</p>
          )}
        </div>
      )}

      {/* Bouton démarrer (Host seulement) */}
      {isHost && (
        <div className="card">
          {!canStart && (
            <p className="text-sm text-yellow-400 mb-3">
              ⚠️ Sélectionne un alibi et assigne au moins 1 inspecteur et 1 suspect pour démarrer
            </p>
          )}
          <button
            className="btn btn-accent w-full h-14 text-xl"
            onClick={handleStartGame}
            disabled={!canStart}
          >
            Démarrer la partie
          </button>
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
