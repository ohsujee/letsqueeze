"use client";

import { useEffect, useState, useRef } from "react";
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
import TeamTabs from "@/lib/components/TeamTabs";
import PaywallModal from "@/components/ui/PaywallModal";
import QuizSelectorModal from "@/components/ui/QuizSelectorModal";
import LobbyHeader from "@/components/game/LobbyHeader";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { canAccessPack, isPro } from "@/lib/subscription";
import { useToast } from "@/lib/hooks/useToast";
import { getQuizManifest } from "@/lib/utils/manifestCache";
import { motion } from "framer-motion";
import { ChevronRight, Users, Zap } from "lucide-react";
import { storage } from "@/lib/utils/storage";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";

export default function Room() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [lockedQuizName, setLockedQuizName] = useState('');
  const [joinUrl, setJoinUrl] = useState("");
  const roomWasValidRef = useRef(false);
  const [myUid, setMyUid] = useState(null);

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Interstitial ad (unified hook)
  useInterstitialAd({ context: 'QuizRoom' });

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
    }
  }, [code]);

  useEffect(() => {
    getQuizManifest()
      .then(cats => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        setIsHost(meta?.hostUid === user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid]);

  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

  // Player cleanup hook with auto-rejoin for hard refresh
  const { leaveRoom } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    phase: 'lobby',
    playerName: userPseudo,
    isHost,
    getPlayerData: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    }),
    onRejoinFailed: () => router.push('/home')
  });

  // Room guard - détecte kick et fermeture room (pour joueurs non-hôte)
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost
  });

  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        // Check if room was closed by host (legacy - now handled by useRoomGuard too)
        if (m.closed) {
          return; // useRoomGuard handles this
        }
        setMeta(m);
        setTeams(m?.teams || {});
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        // Room was deleted (host left) - show toast only for non-hosts
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });

    const stateUnsub = onValue(ref(db, `rooms/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing") {
        if (isHost) {
          router.push(`/game/${code}/host`);
        } else {
          router.push(`/game/${code}/play`);
        }
      }
    });

    return () => {
      metaUnsub();
      stateUnsub();
    };
  }, [code, router, isHost]);

  const handleStartGame = async () => {
    if (!isHost || !meta?.quizSelection?.themeIds?.length) return;

    try {
      const { themeIds, categoryName } = meta.quizSelection;

      // Charger toutes les bases de données sélectionnées
      const allQuestions = [];
      for (const themeId of themeIds) {
        try {
          const response = await fetch(`/data/${themeId}.json`);
          const database = await response.json();
          if (database?.items?.length) {
            allQuestions.push(...database.items);
          }
        } catch (err) {
          console.warn(`Failed to load ${themeId}:`, err);
        }
      }

      if (allQuestions.length === 0) {
        toast.error('Erreur: Aucune question disponible');
        return;
      }

      // Mélanger les questions avec Fisher-Yates
      const shuffled = [...allQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Prendre 20 questions (ou moins si la base en contient moins)
      const selectedQuestions = shuffled.slice(0, 20);

      // Stocker les questions sélectionnées dans Firebase
      await update(ref(db, `rooms/${code}`), {
        'quiz': {
          id: themeIds.join('+'),
          title: categoryName,
          items: selectedQuestions
        },
        'state': {
          phase: "playing",
          currentIndex: 0,
          revealed: false,
          lockUid: null,
          buzzBanner: "",
          elapsedAcc: 0,
          lastRevealAt: 0,
          pausedAt: null,
          lockedAt: null,
        }
      });

      // Partie lancée - pas besoin de toast, redirection automatique
    } catch (error) {
      console.error('Erreur lors du lancement de la partie:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  // Couleurs vibrantes style "jeu mobile" avec glow
  const teamColors = [
    "#FF2D55", // Rose-rouge vif (style gaming)
    "#00D4FF", // Cyan électrique
    "#32FF7E", // Vert néon
    "#FFB800", // Or/Ambre lumineux
    "#BF5AF2", // Violet vif
    "#FF6B2C"  // Orange feu
  ];

  // Team names
  const teamNames = ["Team Blaze", "Team Frost", "Team Venom", "Team Solar"];

  const createTeamsForCount = (count) => {
    const newTeams = {};
    for (let i = 0; i < count; i++) {
      newTeams[`team${i + 1}`] = {
        name: teamNames[i],
        color: teamColors[i],
        score: 0
      };
    }
    return newTeams;
  };

  const handleModeToggle = async () => {
    if (!isHost) return;
    const newMode = meta?.mode === "équipes" ? "individuel" : "équipes";

    if (newMode === "équipes" && (!teams || Object.keys(teams).length === 0)) {
      const count = meta?.teamCount || 2;
      const defaultTeams = createTeamsForCount(count);
      await update(ref(db, `rooms/${code}/meta`), { mode: newMode, teams: defaultTeams, teamCount: count });
    } else if (newMode === "individuel") {
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

  const handleTeamCountChange = async (count) => {
    if (!isHost) return;

    // Create new teams with the selected count
    const newTeams = createTeamsForCount(count);

    // Reset players team assignments for teams that no longer exist
    const updates = {};
    const validTeamIds = Object.keys(newTeams);

    players.forEach(p => {
      if (p.teamId && !validTeamIds.includes(p.teamId)) {
        updates[`rooms/${code}/players/${p.uid}/teamId`] = "";
      }
    });

    updates[`rooms/${code}/meta/teamCount`] = count;
    updates[`rooms/${code}/meta/teams`] = newTeams;

    await update(ref(db), updates);
  };

  const handleQuizChange = async (selection) => {
    if (!isHost) return;
    await update(ref(db, `rooms/${code}/meta`), { quizSelection: selection });
    setShowQuizSelector(false);
  };

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
    const shuffledPlayers = [...players];

    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }

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

  // Host exit handler - mark room as closed so all players are notified
  const handleHostExit = async () => {
    if (isHost) {
      // Mark room as closed - triggers redirect for all players
      await update(ref(db, `rooms/${code}/meta`), { closed: true });
    }
    router.push('/home');
  };

  // Player exit handler (non-host)
  const handlePlayerExit = async () => {
    markVoluntaryLeave(); // Évite le toast "expulsé par l'hôte"
    await leaveRoom();
    router.push('/home');
  };

  const quizSelection = meta?.quizSelection;
  const hasSelection = quizSelection?.themeIds?.length > 0;
  const selectedThemeNames = quizSelection?.themes?.map(t => t.title).join(', ') || '';
  const totalQuestions = quizSelection?.themes?.reduce((sum, t) => sum + t.questionCount, 0) || 0;
  const canStart = isHost && hasSelection;

  // Loading state
  if (!meta) {
    return (
      <div className="lobby-container game-page">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container game-page">
      {/* Modals */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="quiz"
        contentName={lockedQuizName}
      />
      <QuizSelectorModal
        isOpen={showQuizSelector}
        onClose={() => setShowQuizSelector(false)}
        categories={categories}
        currentSelection={meta?.quizSelection || null}
        onSelectQuiz={handleQuizChange}
        userIsPro={userIsPro}
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType="quiz"
      />

      {/* Header */}
      <LobbyHeader
        variant="quiz"
        code={code}
        isHost={isHost}
        players={players}
        hostUid={meta?.hostUid}
        onHostExit={handleHostExit}
        onPlayerExit={handlePlayerExit}
        onShowHowToPlay={() => setShowHowToPlay(true)}
        joinUrl={joinUrl}
      />

      {/* Main Content */}
      <main className="lobby-main">
        {isHost ? (
          // HOST VIEW
          <>
            {/* Scrollable Content Area */}
            <div className="lobby-content">
              {/* Quiz Selector Card */}
              <motion.div
                className="lobby-card quiz-selector"
                onClick={() => setShowQuizSelector(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="quiz-card-content">
                  <div className="quiz-card-left">
                    <span className="quiz-card-emoji">{quizSelection?.categoryEmoji || '🧠'}</span>
                  </div>
                  <div className="quiz-card-center">
                    <span className="quiz-card-label">Quiz</span>
                    <h3 className="quiz-card-title">{quizSelection?.categoryName || 'Choisir un quiz'}</h3>
                    <p className="quiz-card-meta">
                      {hasSelection ? `${selectedThemeNames} • ${totalQuestions} questions` : 'Appuyer pour choisir'}
                    </p>
                  </div>
                  <div className="quiz-card-right">
                    <span className="quiz-change-hint">{hasSelection ? 'Changer' : 'Choisir'}</span>
                    <ChevronRight size={20} className="quiz-card-arrow" />
                  </div>
                </div>
              </motion.div>

              {/* Mode Selector Card */}
              <div className="lobby-card mode-selector">
                <div className="card-header">
                  <span className="card-icon">👥</span>
                  <span className="card-label">Mode de jeu</span>
                </div>
                <div className="mode-controls">
                  <div className="mode-toggle">
                    <motion.button
                      className={`mode-btn ${meta.mode === "individuel" ? "active" : ""}`}
                      onClick={handleModeToggle}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Zap size={18} />
                      Solo
                    </motion.button>
                    <motion.button
                      className={`mode-btn ${meta.mode === "équipes" ? "active" : ""}`}
                      onClick={handleModeToggle}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Users size={18} />
                      Équipes
                    </motion.button>
                  </div>

                  {/* Team Count Selector - appears when team mode */}
                  {meta.mode === "équipes" && (
                    <motion.div
                      className="team-count-selector"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="team-count-label">Nombre d'équipes</span>
                      <div className="team-count-toggle">
                        {[2, 3, 4].map(count => (
                          <motion.button
                            key={count}
                            className={`count-btn ${(meta?.teamCount || 2) === count ? "active" : ""}`}
                            onClick={() => handleTeamCountChange(count)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {count}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Teams Management (if team mode) */}
              {meta.mode === "équipes" && (
                <div className="lobby-card lobby-card-flex">
                  <TeamTabs
                    teams={teams}
                    players={players}
                    teamCount={meta?.teamCount || 2}
                    onAssignToTeam={handleAssignToTeam}
                    onRemoveFromTeam={handleRemoveFromTeam}
                    onAutoBalance={handleAutoBalance}
                    onResetTeams={handleResetTeams}
                  />
                </div>
              )}

              {/* Players Card (if solo mode) */}
              {meta.mode !== "équipes" && (
                <div className="lobby-card lobby-players lobby-card-flex">
                  <div className="card-header">
                    <span className="card-icon">🎮</span>
                    <span className="card-label">Joueurs</span>
                    <span className="player-count-badge">{players.length}</span>
                  </div>
                  {players.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">👋</span>
                      <p className="empty-text">En attente de joueurs...</p>
                      <p className="empty-hint">Partagez le code pour inviter</p>
                    </div>
                  ) : (
                    <div className="players-chips">
                      {players.map((player, index) => (
                        <motion.div
                          key={player.uid}
                          className="player-chip"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="chip-avatar">
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="chip-name">{player.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fixed Start Button - Always at bottom */}
            <div className="lobby-footer">
              <motion.button
                className="lobby-start-btn"
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">Démarrer la partie</span>
              </motion.button>
            </div>
          </>
        ) : (
          // PLAYER VIEW - Compact centered layout
          <div className="lobby-player-view">
            {meta.mode === "équipes" ? (
              // TEAM MODE - Show my team banner + all teams with players
              <>
                {/* My Team Banner */}
                {players.find(p => p.uid === auth.currentUser?.uid)?.teamId ? (
                  <div
                    className="my-team-banner"
                    style={{
                      '--team-color': teams[players.find(p => p.uid === auth.currentUser?.uid)?.teamId]?.color
                    }}
                  >
                    <div className="banner-glow" />
                    <span className="banner-label">Ton équipe</span>
                    <span className="banner-team-name">
                      {teams[players.find(p => p.uid === auth.currentUser?.uid)?.teamId]?.name}
                    </span>
                  </div>
                ) : (
                  <div className="pending-banner">
                    <span className="pending-icon">⏳</span>
                    <span className="pending-text">L'hôte va t'assigner à une équipe...</span>
                  </div>
                )}

                {/* Teams Grid with Players */}
                <div className={`teams-grid-player teams-${meta?.teamCount || 2}`}>
                  {Object.entries(teams).slice(0, meta?.teamCount || 2).map(([id, team]) => {
                    const teamPlayers = players.filter(p => p.teamId === id);
                    const isMyTeam = players.find(p => p.uid === auth.currentUser?.uid)?.teamId === id;
                    return (
                      <div
                        key={id}
                        className={`team-card-player ${isMyTeam ? 'my-team' : ''}`}
                        style={{ '--team-color': team.color }}
                      >
                        <div className="team-card-bar" style={{ backgroundColor: team.color }} />
                        <div className="team-card-header">
                          <span className="team-card-name">{team.name.replace('Équipe ', '')}</span>
                          <span className="team-card-count">{teamPlayers.length}</span>
                        </div>
                        <div className="team-card-players">
                          {teamPlayers.length === 0 ? (
                            <span className="no-players-text">Vide</span>
                          ) : (
                            teamPlayers.slice(0, 4).map((player) => (
                              <span
                                key={player.uid}
                                className={`player-tag ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                              >
                                {player.uid === auth.currentUser?.uid && '👤 '}
                                {player.name}
                              </span>
                            ))
                          )}
                          {teamPlayers.length > 4 && (
                            <span className="player-tag more">+{teamPlayers.length - 4}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              // SOLO MODE - Show all players with full names
              <>
                {/* Players Header */}
                <div className="players-header-card">
                  <span className="players-icon">🎮</span>
                  <span className="players-count">{players.length}</span>
                  <span className="players-label">joueurs connectés</span>
                </div>

                {/* Players List with Full Names */}
                <div className="players-list-player">
                  {players.map((player, index) => (
                    <motion.div
                      key={player.uid}
                      className={`player-chip-full ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div className="chip-avatar-glow">
                        {player.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="chip-name-full">
                        {player.name}
                        {player.uid === auth.currentUser?.uid && ' (toi)'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Waiting Animation */}
            <div className="waiting-compact">
              <div className="waiting-pulse" />
              <span className="waiting-label">En attente du lancement...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
