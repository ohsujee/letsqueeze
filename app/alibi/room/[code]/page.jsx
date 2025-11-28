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

  // Assignation automatique avec RANDOMISATION à chaque appel
  const handleAutoAssign = async () => {
    if (!isHost) return;

    // Shuffle TOUS les joueurs (même ceux déjà assignés) pour vraie randomisation
    const allPlayers = [...players].sort(() => Math.random() - 0.5);

    // Distribuer en alternance
    const updates = {};
    allPlayers.forEach((player, index) => {
      const team = index % 2 === 0 ? 'inspectors' : 'suspects';
      updates[`rooms_alibi/${code}/players/${player.uid}/team`] = team;
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
    <div className="alibi-theme">
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
        <div className="text-center space-y-3">
          <h3 className="text-base font-bold">📲 Invite des joueurs</h3>
          <motion.div
            className="text-sm opacity-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.3 }}
          >
            {joinUrl || "Génération du lien..."}
          </motion.div>

          <div className="flex gap-2 justify-center flex-wrap pt-1">
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
                overflow: 'hidden',
                isolation: 'isolate',
                contain: 'layout style paint'
              }}
            >
              {/* Shine effect - static gradient */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 className="font-bold text-base mb-3 flex items-center justify-between">
                  <span>🕵️ Alibi Sélectionné</span>
                  <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>
                    →
                  </span>
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
              className="text-sm text-yellow-400 text-center px-4 py-3 rounded-lg mt-4"
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}
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
          {/* Header avec assignation auto */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <h2 className="text-lg font-bold">
              Assigner les rôles
            </h2>
            {players.length > 0 && (
              <button
                className="btn btn-accent px-4 py-2"
                onClick={handleAutoAssign}
              >
                🎲 Assignation auto
              </button>
            )}
          </div>

          {/* Non assignés */}
          {unassigned.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-base font-bold mb-4">En attente d'assignation ({unassigned.length})</h3>
              <div className="space-y-2">
                {unassigned.map(player => (
                  <div key={player.uid} className="flex items-center gap-2 px-5 py-2.5 bg-slate-700/50 rounded-lg">
                    <span className="flex-1 text-base font-medium">{player.name}</span>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-sm btn-accent px-2.5 py-1.5"
                        onClick={() => handleAssignTeam(player.uid, "inspectors")}
                      >
                        🕵️ Inspecteur
                      </button>
                      <button
                        className="btn btn-sm btn-primary px-2.5 py-1.5"
                        onClick={() => handleAssignTeam(player.uid, "suspects")}
                      >
                        🎭 Suspect
                      </button>
                      <button
                        className="btn btn-sm btn-error px-2.5 py-1.5"
                        onClick={() => handleKickPlayer(player.uid)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Équipes - Design moderne thème detective */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Inspecteurs - Thème Orange Detective */}
            <div
              className="card relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.12), rgba(245, 158, 11, 0.08))',
                border: '2px solid rgba(255, 109, 0, 0.3)',
                boxShadow: '0 4px 24px rgba(255, 109, 0, 0.15)'
              }}
            >
              {/* Header avec icône + badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 109, 0, 0.25), rgba(245, 158, 11, 0.15))'
                  }}
                >
                  🕵️
                </div>
                <h3 className="text-base font-bold text-orange-400 flex-1">INSPECTEURS</h3>
                <div
                  className="flex items-center justify-center min-w-[2rem] h-7 px-3 rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    background: 'rgba(255, 109, 0, 0.25)',
                    border: '1px solid rgba(255, 109, 0, 0.5)',
                    color: '#FF6D00'
                  }}
                >
                  {inspectors.length}
                </div>
              </div>

              {/* Liste des joueurs */}
              <div className="space-y-2">
                {inspectors.map((player) => (
                  <div
                    key={player.uid}
                    className="flex items-center gap-3 px-5 py-2.5 rounded-lg group relative"
                    style={{
                      background: 'rgba(255, 109, 0, 0.08)',
                      border: '1px solid rgba(255, 109, 0, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 109, 0, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(255, 109, 0, 0.4)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 109, 0, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 109, 0, 0.2)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span className="font-medium flex-1 text-orange-100">{player.name}</span>
                    <button
                      className="btn btn-sm opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2.5 py-1.5"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 109, 0, 0.3)',
                        color: '#FF9D5C'
                      }}
                      onClick={() => handleAssignTeam(player.uid, null)}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {inspectors.length === 0 && (
                  <div
                    className="text-center py-6 rounded-lg"
                    style={{
                      background: 'rgba(255, 109, 0, 0.05)',
                      border: '1px dashed rgba(255, 109, 0, 0.2)'
                    }}
                  >
                    <p className="text-sm text-orange-400/60 italic">Aucun inspecteur assigné</p>
                  </div>
                )}
              </div>
            </div>

            {/* Suspects - Thème Indigo Mystère */}
            <div
              className="card relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(59, 130, 246, 0.08))',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 4px 24px rgba(99, 102, 241, 0.15)'
              }}
            >
              {/* Header avec icône + badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(59, 130, 246, 0.15))'
                  }}
                >
                  🎭
                </div>
                <h3 className="text-base font-bold text-indigo-400 flex-1">SUSPECTS</h3>
                <div
                  className="flex items-center justify-center min-w-[2rem] h-7 px-3 rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    background: 'rgba(99, 102, 241, 0.25)',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    color: '#818CF8'
                  }}
                >
                  {suspects.length}
                </div>
              </div>

              {/* Liste des joueurs */}
              <div className="space-y-2">
                {suspects.map((player) => (
                  <div
                    key={player.uid}
                    className="flex items-center gap-3 px-5 py-2.5 rounded-lg group relative"
                    style={{
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                      e.currentTarget.style.transform = 'translateX(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span className="font-medium flex-1 text-indigo-100">{player.name}</span>
                    <button
                      className="btn btn-sm opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2.5 py-1.5"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#A5B4FC'
                      }}
                      onClick={() => handleAssignTeam(player.uid, null)}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {suspects.length === 0 && (
                  <div
                    className="text-center py-6 rounded-lg"
                    style={{
                      background: 'rgba(99, 102, 241, 0.05)',
                      border: '1px dashed rgba(99, 102, 241, 0.2)'
                    }}
                  >
                    <p className="text-sm text-indigo-400/60 italic">Aucun suspect assigné</p>
                  </div>
                )}
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
            <div className="px-4 py-3 bg-accent/10 border border-accent rounded-lg text-center">
              <p className="text-2xl font-bold text-accent">🕵️ Tu es INSPECTEUR</p>
              <p className="text-sm opacity-70 mt-2">Tu devras interroger les suspects et trouver les incohérences</p>
            </div>
          )}
          {players.find(p => p.uid === auth.currentUser?.uid)?.team === "suspects" && (
            <div className="px-4 py-3 bg-primary/10 border border-primary rounded-lg text-center">
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
        }

        .game-content {
          position: relative;
          z-index: 1;
        }
      `}</style>
      </div>
    </div>
  );
}
