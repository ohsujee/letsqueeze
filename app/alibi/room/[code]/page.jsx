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
import { motion, AnimatePresence } from 'framer-motion';
import Qr from "@/components/Qr";
import QrModal from "@/lib/components/QrModal";
import BottomNav from "@/lib/components/BottomNav";
import PaywallModal from "@/components/PaywallModal";
import AlibiSelectorModal from "@/components/AlibiSelectorModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { canAccessPack, isPro } from "@/lib/subscription";

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAlibiSelector, setShowAlibiSelector] = useState(false);
  const [lockedAlibiName, setLockedAlibiName] = useState('');

  // Get user profile for subscription check
  const { user: currentUser, subscription } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

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

  const handleAutoBalance = async () => {
    if (!isHost) return;

    // Get all players
    const allPlayers = players;
    const inspectorCount = allPlayers.filter(p => p.team === 'inspectors').length;
    const suspectCount = allPlayers.filter(p => p.team === 'suspects').length;
    const unassignedPlayers = allPlayers.filter(p => !p.team);

    if (unassignedPlayers.length === 0) return;

    // Distribute unassigned players to balance teams
    const updates = {};
    unassignedPlayers.forEach((player, index) => {
      // Alternate assignment starting with the smaller team
      const currentInspectorCount = inspectorCount + updates[`rooms_alibi/${code}/players/${player.uid}/team`] === 'inspectors' ? 1 : 0;
      const currentSuspectCount = suspectCount + updates[`rooms_alibi/${code}/players/${player.uid}/team`] === 'suspects' ? 1 : 0;

      // Assign to the team with fewer members
      const assignTo = currentInspectorCount <= currentSuspectCount ? 'inspectors' : 'suspects';
      updates[`rooms_alibi/${code}/players/${player.uid}/team`] = assignTo;
    });

    await update(ref(db), updates);
  };

  const handleStartGame = async () => {
    if (!isHost || !selectedAlibiId) return;

    // Check if user can access the selected alibi
    const alibiIndex = alibiOptions.findIndex(a => a.id === selectedAlibiId);

    // Check freemium access
    if (currentUser && !userIsPro && alibiIndex >= 0) {
      const hasAccess = canAccessPack(
        { ...currentUser, subscription },
        'alibi',
        alibiIndex
      );

      if (!hasAccess) {
        // Show paywall
        const selectedAlibi = alibiOptions.find(a => a.id === selectedAlibiId);
        setLockedAlibiName(selectedAlibi?.title || selectedAlibiId);
        setShowPaywall(true);
        return;
      }
    }

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
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="alibi"
        contentName={lockedAlibiName}
      />

      {/* Alibi Selector Modal */}
      <AlibiSelectorModal
        isOpen={showAlibiSelector}
        onClose={() => setShowAlibiSelector(false)}
        alibiOptions={alibiOptions}
        selectedAlibiId={selectedAlibiId}
        onSelectAlibi={handleSelectAlibi}
        userIsPro={userIsPro}
      />

      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-4 md:p-6 max-w-5xl mx-auto space-y-4 md:space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
        {/* Header - Glassmorphic Style */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex-1">
            <motion.h1
              className="game-page-title"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              🕵️ Lobby Alibi
            </motion.h1>
            <div className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
              {selectedAlibiId ? alibiOptions.find(a => a.id === selectedAlibiId)?.title || 'Alibi' : 'Aucun alibi sélectionné'} • Code: <span className="font-bold text-base" style={{color: '#FF6D00'}}>{code}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {!isHost && (
              <motion.button
                className="btn btn-secondary"
                onClick={() => router.push(`/spectate/${code}`)}
                title="Regarder la partie sans jouer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                👁️ Spectateur
              </motion.button>
            )}
            {isHost && (
              <motion.button
                className="btn btn-danger self-start md:self-auto"
                onClick={() => router.push('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Quitter
              </motion.button>
            )}
          </div>
        </motion.div>

      {/* Invite des joueurs */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        <div className="text-center space-y-4">
          <h3 className="text-lg font-bold mb-2">📲 Invite des joueurs</h3>
          <motion.div
            className="text-sm opacity-80 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.3 }}
          >
            {joinUrl || "Génération du lien..."}
          </motion.div>

          <div className="flex gap-2 justify-center flex-wrap">
            <motion.button
              className="btn copy-btn"
              onClick={async () => {
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
              }}
              disabled={!joinUrl}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📋 Copier le lien
            </motion.button>
            {joinUrl && <QrModal text={joinUrl} buttonText="📱 Voir QR Code" />}
          </div>
        </div>
      </motion.div>

      {/* Section des contrôles - visible seulement pour l'host */}
      {isHost && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Primary Action - Démarrer la partie */}
          <motion.button
            className="btn btn-accent w-full h-14 text-lg font-bold"
            onClick={handleStartGame}
            disabled={!canStart}
            whileHover={canStart ? { scale: 1.02, boxShadow: '0 0 30px rgba(255, 109, 0, 0.5)' } : {}}
            whileTap={canStart ? { scale: 0.98 } : {}}
            style={{
              background: canStart ? 'linear-gradient(135deg, #FF6D00, #E56200)' : undefined,
              border: canStart ? '2px solid rgba(255, 109, 0, 0.5)' : undefined,
              boxShadow: canStart ? '0 0 20px rgba(255, 109, 0, 0.3)' : undefined
            }}
          >
            🚀 Démarrer la partie
          </motion.button>

          {/* Settings Grid - 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sélection de l'alibi - Card cliquable */}
            <motion.div
              className="card"
              onClick={() => setShowAlibiSelector(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.15), rgba(245, 158, 11, 0.1))',
                border: '2px solid rgba(255, 109, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Shine effect */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                  pointerEvents: 'none'
                }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 className="font-bold text-base mb-3 flex items-center justify-between">
                  <span>🕵️ Alibi Sélectionné</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ fontSize: '1.25rem' }}
                  >
                    →
                  </motion.span>
                </h3>

                {/* Alibi actuel affiché */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                    {selectedAlibiId ? (
                      {
                        "match-equipe-locale": "⚽",
                        "terrain-basket": "🏀",
                        "karting-competition": "🏎️",
                        "paintball-equipes": "🎯",
                        "comedie-club": "🎭",
                        "escape-game": "🔐",
                        "japan-expo": "🎌",
                        "restaurant-italien": "🍝",
                        "pub-karaoke": "🎤",
                        "studio-enregistrement": "🎙️",
                        "tournage-clip": "🎬",
                        "session-teamspeak": "🎮",
                        "salle-de-sport": "💪",
                        "seance-cinema": "🎥",
                        "visite-musee": "🖼️",
                        "degustation-vins": "🍷",
                        "marche-producteurs": "🥬",
                        "studio-photo": "📸"
                      }[selectedAlibiId] || '🎭'
                    ) : '📚'}
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    marginBottom: '0.25rem',
                    color: 'white'
                  }}>
                    {selectedAlibiId ? alibiOptions.find(a => a.id === selectedAlibiId)?.title : 'Choisir un alibi'}
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    {selectedAlibiId ? '10 questions • Interrogatoire' : 'Cliquer pour parcourir'}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rejoindre en tant qu'hôte */}
            {!hostJoined && (
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(255, 109, 0, 0.1)',
                  border: '2px solid rgba(255, 109, 0, 0.3)'
                }}
              >
                <h3 className="font-bold text-base mb-3">🎮 Rejoindre la partie</h3>
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
                    ✓
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {!canStart && (
            <motion.div
              className="text-sm text-yellow-400 text-center p-3 rounded-lg"
              style={{ background: 'rgba(251, 191, 36, 0.1)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ⚠️ Sélectionne un alibi et assigne au moins 1 inspecteur et 1 suspect pour démarrer
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Assignation des équipes (Host seulement) */}
      {isHost && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Assigner les équipes</h2>
            {unassigned.length > 0 && (
              <button
                className="btn btn-sm btn-accent"
                onClick={handleAutoBalance}
              >
                ⚖️ Équilibrer auto
              </button>
            )}
          </div>

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
        </motion.div>
      )}

      {/* Vue joueur : voir son équipe */}
      {!isHost && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
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
        </motion.div>
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
