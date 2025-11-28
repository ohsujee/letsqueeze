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
import Qr from "@/components/ui/Qr";
import QrModal from "@/lib/components/QrModal";
import BottomNav from "@/lib/components/BottomNav";
import TeamTabs from "@/lib/components/TeamTabs";
import PlayerTeamView from "@/lib/components/PlayerTeamView";
import PaywallModal from "@/components/ui/PaywallModal";
import QuizSelectorModal from "@/components/ui/QuizSelectorModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { canAccessPack, isPro } from "@/lib/subscription";
import { useToast } from "@/lib/hooks/useToast";
import { motion } from "framer-motion";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [lockedQuizName, setLockedQuizName] = useState('');

  // Calculer joinUrl seulement côté client et quand on a le code
  const [joinUrl, setJoinUrl] = useState("");

  // Get user profile for subscription check
  const { user: currentUser, stats, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

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

    try {
      // Check if user can access the selected quiz
      const selectedQuizId = meta?.quizId || "general";
      const quizIndex = quizOptions.findIndex(q => q.id === selectedQuizId);

      // Check freemium access
      if (currentUser && !userIsPro && quizIndex >= 0) {
        const hasAccess = canAccessPack(
          { ...currentUser, subscription },
          'quiz',
          quizIndex
        );

        if (!hasAccess) {
          // Show paywall
          const selectedQuiz = quizOptions.find(q => q.id === selectedQuizId);
          setLockedQuizName(selectedQuiz?.title || selectedQuizId);
          setShowPaywall(true);
          return;
        }
      }

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

      toast.success('Partie lancée !');
      // La redirection se fera automatiquement via le listener d'état
    } catch (error) {
      console.error('Erreur lors du lancement de la partie:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
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

  const handleQuizChange = async (quizId) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/meta`), { quizId });
    setShowQuizSelector(false);
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
      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="quiz"
        contentName={lockedQuizName}
      />

      {/* Quiz Selector Modal */}
      <QuizSelectorModal
        isOpen={showQuizSelector}
        onClose={() => setShowQuizSelector(false)}
        quizOptions={quizOptions}
        selectedQuizId={meta?.quizId || "general"}
        onSelectQuiz={handleQuizChange}
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
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
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
            🎮 Lobby
          </motion.h1>
          <div className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
            {selectedQuizTitle} • Code: <span className="font-bold text-base" style={{color: '#60A5FA'}}>{code}</span>
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
              onClick={handleQuit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Quitter
            </motion.button>
          )}
        </div>
      </motion.div>

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
              onClick={copyLink}
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

      {/* Section des contrôles - visible seulement pour l'host - Mobile First */}
      {isHost && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Primary Action - Always Visible */}
          <motion.button
            className="btn btn-primary w-full h-14 text-lg font-bold"
            onClick={handleStartGame}
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              border: '2px solid rgba(99, 102, 241, 0.5)',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
            }}
          >
            🚀 Démarrer la partie
          </motion.button>

          {/* Settings Grid - Mobile: Stack, Tablet+: 2 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quiz Selection - Encart cliquable */}
            <motion.div
              className="card"
              onClick={() => setShowQuizSelector(true)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.1))',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Shine effect - static */}
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
                  <span>📚 Quiz Sélectionné</span>
                  <span style={{ fontSize: '1.25rem', opacity: 0.6 }}>
                    →
                  </span>
                </h3>

                {/* Quiz actuel affiché */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: 'var(--font-size-4xl)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
                    {quizOptions.find(q => q.id === (meta?.quizId || "general"))?.emoji || '📝'}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 700,
                    textAlign: 'center',
                    marginBottom: 'var(--space-2)',
                    color: 'white'
                  }}>
                    {selectedQuizTitle}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    <span>
                      {quizOptions.find(q => q.id === (meta?.quizId || "general"))?.difficulty || 'Normal'}
                    </span>
                    <span>•</span>
                    <span>
                      {quizOptions.find(q => q.id === (meta?.quizId || "general"))?.questionCount || 0} Questions
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: 'var(--space-3)',
                  textAlign: 'center',
                  fontSize: 'var(--font-size-sm)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 600
                }}>
                  Cliquez pour changer ✨
                </div>
              </div>
            </motion.div>

            {/* Mode de jeu */}
            <div className="card">
              <h3 className="font-bold text-base mb-3">👥 Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  className={`btn ${meta.mode === "individuel" ? "btn-accent" : ""}`}
                  onClick={handleModeToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎯 Solo
                </motion.button>
                <motion.button
                  className={`btn ${meta.mode === "équipes" ? "btn-accent" : ""}`}
                  onClick={handleModeToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  👥 Équipes
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {meta.mode === "équipes" && isHost && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <TeamTabs
            teams={teams}
            players={players}
            onAssignToTeam={handleAssignToTeam}
            onRemoveFromTeam={handleRemoveFromTeam}
            onAutoBalance={handleAutoBalance}
            onResetTeams={handleResetTeams}
          />
        </motion.div>
      )}

      {meta.mode === "équipes" && !isHost && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <PlayerTeamView
            teams={teams}
            players={players}
            currentPlayerUid={auth.currentUser?.uid}
          />
        </motion.div>
      )}

      {/* Players List - Mobile Optimized */}
      {meta.mode !== "équipes" && (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base">👥 Joueurs</h3>
            <span
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(59, 130, 246, 0.3))',
                border: '1px solid rgba(99, 102, 241, 0.5)'
              }}
            >
              {players.length}
            </span>
          </div>
          {players.length === 0 ? (
            <motion.div
              className="text-center opacity-85 py-8 text-base"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ delay: 0.5 }}
            >
              En attente de joueurs...
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((player, index) => (
                <motion.div
                  key={player.uid}
                  className="card text-base font-medium px-5 py-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  {player.name}
                </motion.div>
              ))}
            </div>
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
    `}</style>
    </div>
  );
}
