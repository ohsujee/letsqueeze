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
import { motion, AnimatePresence } from 'framer-motion';
import ShareModal from "@/lib/components/ShareModal";
import ExitButton from "@/lib/components/ExitButton";
import PaywallModal from "@/components/ui/PaywallModal";
import AlibiSelectorModal from "@/components/alibi/AlibiSelectorModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { canAccessPack, isPro } from "@/lib/subscription";
import { useToast } from "@/lib/hooks/useToast";
import { getAlibiManifest } from "@/lib/utils/manifestCache";
import { ChevronRight, Eye, Shuffle, RotateCcw, X, UserPlus, HelpCircle } from "lucide-react";
import HowToPlayModal from "@/components/ui/HowToPlayModal";

export default function AlibiLobby() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

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
  const [expandedRole, setExpandedRole] = useState(null);
  const [hostRole, setHostRole] = useState('inspectors'); // Default: host is inspector
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const roomWasValidRef = useRef(false);

  // Get user profile for subscription check
  const { user: currentUser, subscription } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/alibi/join?code=${code}`);
    }
  }, [code]);

  // Load alibi manifest (cached)
  useEffect(() => {
    getAlibiManifest()
      .then(alibis => setAlibiOptions(alibis))
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
      if (m) {
        // Check if room was closed by host
        if (m.closed) {
          // Only show toast if not the host (host already knows they're leaving)
          const currentUid = auth.currentUser?.uid;
          if (currentUid !== m.hostUid) {
            toast.warning("L'hôte a quitté la partie");
          }
          router.push('/home');
          return;
        }
        setMeta(m);
        setSelectedAlibiId(m?.alibiId || null);
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        // Room was deleted (host left) - show toast only for non-hosts
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });

    const playersUnsub = onValue(ref(db, `rooms_alibi/${code}/players`), (snap) => {
      const p = snap.val() || {};
      setPlayers(Object.values(p));
    });

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
      team: hostRole,
      joinedAt: Date.now()
    });
    toast.success(`Tu as rejoint en tant qu'${hostRole === 'inspectors' ? 'inspecteur' : 'suspect'} !`);
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

  // Auto-assign with randomization
  const handleAutoAssign = async () => {
    if (!isHost) return;

    const allPlayers = [...players].sort(() => Math.random() - 0.5);
    const updates = {};
    allPlayers.forEach((player, index) => {
      const team = index % 2 === 0 ? 'inspectors' : 'suspects';
      updates[`rooms_alibi/${code}/players/${player.uid}/team`] = team;
    });

    await update(ref(db), updates);
    toast.success('Rôles assignés !');
  };

  // Reset all teams
  const handleResetTeams = async () => {
    if (!isHost) return;
    const updates = {};
    players.forEach(p => {
      updates[`rooms_alibi/${code}/players/${p.uid}/team`] = null;
    });
    await update(ref(db), updates);
  };

  const handleStartGame = async () => {
    if (!isHost || !selectedAlibiId) return;

    const alibiIndex = alibiOptions.findIndex(a => a.id === selectedAlibiId);

    if (currentUser && !userIsPro && alibiIndex >= 0) {
      const hasAccess = canAccessPack(
        { ...currentUser, subscription },
        'alibi',
        alibiIndex
      );

      if (!hasAccess) {
        const selectedAlibi = alibiOptions.find(a => a.id === selectedAlibiId);
        setLockedAlibiName(selectedAlibi?.title || selectedAlibiId);
        setShowPaywall(true);
        return;
      }
    }

    try {
      const alibiData = await fetch(`/data/alibis/${selectedAlibiId}.json`).then(r => r.json());
      const isNewFormat = alibiData.accused_document !== undefined;

      let questions;
      if (isNewFormat) {
        // Support both string format and object format { text, hint }
        questions = alibiData.inspector_questions.map((q, i) => ({
          id: i,
          text: typeof q === 'string' ? q : q.text,
          hint: typeof q === 'object' ? q.hint : null,
          custom: false
        }));
      } else {
        questions = [
          ...alibiData.predefinedQuestions.map((q, i) => ({ id: i, text: q, custom: false })),
          { id: 7, text: "", custom: true },
          { id: 8, text: "", custom: true },
          { id: 9, text: "", custom: true }
        ];
      }

      await update(ref(db, `rooms_alibi/${code}`), {
        alibi: {
          context: alibiData.context || null,
          accused_document: alibiData.accused_document || null,
          inspector_summary: alibiData.inspector_summary || null,
          scenario: alibiData.scenario || null,
          keyElements: alibiData.keyElements || null,
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

      toast.success('Partie lancée !');
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  // Host exit handler - mark room as closed so all players are notified
  const handleHostExit = async () => {
    if (isHost) {
      // Mark room as closed - triggers redirect for all players
      await update(ref(db, `rooms_alibi/${code}/meta`), { closed: true });
    }
    router.push('/home');
  };

  const inspectors = players.filter(p => p.team === "inspectors");
  const suspects = players.filter(p => p.team === "suspects");
  const unassigned = players.filter(p => !p.team);

  const canStart = isHost && selectedAlibiId && inspectors.length > 0 && suspects.length > 0;

  // Get selected alibi info
  const selectedAlibi = alibiOptions.find(a => a.id === selectedAlibiId);
  const alibiEmojis = {
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
  };

  // Loading state
  if (!meta) {
    return (
      <div className="alibi-lobby-container">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alibi-lobby-container">
      {/* Modals */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="alibi"
        contentName={lockedAlibiName}
      />
      <AlibiSelectorModal
        isOpen={showAlibiSelector}
        onClose={() => setShowAlibiSelector(false)}
        alibiOptions={alibiOptions}
        selectedAlibiId={selectedAlibiId}
        onSelectAlibi={handleSelectAlibi}
        userIsPro={userIsPro}
      />
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType="alibi"
      />

      {/* Header */}
      <header className="alibi-lobby-header">
        <div className="header-left">
          <ExitButton
            variant="header"
            onExit={isHost ? handleHostExit : undefined}
            confirmMessage={isHost ? "Voulez-vous vraiment quitter ? La partie sera fermée pour tous les joueurs." : undefined}
          />
          <div className="header-title-row">
            <h1 className="alibi-lobby-title">Lobby</h1>
            <span className="lobby-divider">•</span>
            <span className="alibi-room-code">{code}</span>
          </div>
        </div>
        <div className="header-right">
          <motion.button
            className="help-btn alibi-accent"
            onClick={() => setShowHowToPlay(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Comment jouer"
          >
            <HelpCircle size={18} />
          </motion.button>
          {!isHost && (
            <motion.button
              className="spectator-btn alibi-accent"
              onClick={() => router.push(`/spectate/${code}`)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Mode spectateur"
            >
              <Eye size={18} />
            </motion.button>
          )}
          <ShareModal roomCode={code} joinUrl={joinUrl} />
        </div>
      </header>

      {/* Main Content */}
      <main className="alibi-lobby-main">
        {isHost ? (
          // HOST VIEW
          <>
            <div className="alibi-lobby-content">
              {/* Alibi Selector Card */}
              <motion.div
                className="alibi-lobby-card alibi-selector"
                onClick={() => setShowAlibiSelector(true)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="alibi-card-content">
                  <div className="alibi-card-left">
                    <span className="alibi-card-emoji">
                      {alibiEmojis[selectedAlibiId] || '🕵️'}
                    </span>
                  </div>
                  <div className="alibi-card-center">
                    <span className="alibi-card-label">Alibi</span>
                    <h3 className="alibi-card-title">
                      {selectedAlibi?.title || 'Choisir un alibi'}
                    </h3>
                    <p className="alibi-card-meta">
                      {selectedAlibiId ? '10 questions • Interrogatoire' : 'Appuyer pour choisir'}
                    </p>
                  </div>
                  <div className="alibi-card-right">
                    <span className="alibi-change-hint">{selectedAlibiId ? 'Changer' : 'Choisir'}</span>
                    <ChevronRight size={20} className="alibi-card-arrow" />
                  </div>
                </div>
              </motion.div>

              {/* Host Join Card - Compact */}
              {!hostJoined && (
                <div className="host-join-compact">
                  <div className="host-join-row">
                    <input
                      className="host-join-input-compact"
                      placeholder="Ton pseudo"
                      value={hostPseudo}
                      onChange={(e) => setHostPseudo(e.target.value)}
                      maxLength={20}
                      autoComplete="name"
                      onKeyDown={(e) => e.key === 'Enter' && hostPseudo && handleHostJoin()}
                    />
                    <div className="host-role-toggle">
                      <button
                        className={`role-toggle-btn ${hostRole === 'inspectors' ? 'active' : ''}`}
                        onClick={() => setHostRole('inspectors')}
                        type="button"
                      >
                        🕵️
                      </button>
                      <button
                        className={`role-toggle-btn ${hostRole === 'suspects' ? 'active' : ''}`}
                        onClick={() => setHostRole('suspects')}
                        type="button"
                      >
                        🎭
                      </button>
                    </div>
                    <motion.button
                      className="host-join-btn-compact"
                      onClick={handleHostJoin}
                      disabled={!hostPseudo}
                      whileHover={hostPseudo ? { scale: 1.05 } : {}}
                      whileTap={hostPseudo ? { scale: 0.95 } : {}}
                    >
                      Rejoindre
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Roles Management Card */}
              <div className="alibi-lobby-card alibi-roles-card">
                {/* Header with Quick Actions */}
                <div className="roles-header">
                  <span className="roles-label">Rôles</span>
                  <div className="roles-actions">
                    <motion.button
                      className="action-chip alibi-accent"
                      onClick={handleAutoAssign}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Répartir automatiquement"
                    >
                      <Shuffle size={14} />
                      Auto
                    </motion.button>
                    <motion.button
                      className="action-chip danger"
                      onClick={handleResetTeams}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Réinitialiser"
                    >
                      <RotateCcw size={14} />
                    </motion.button>
                  </div>
                </div>

                {/* Roles Grid - 2 columns */}
                <div className="alibi-roles-grid">
                  {/* Inspectors */}
                  <motion.div
                    className={`alibi-role-card inspectors ${expandedRole === 'inspectors' ? 'expanded' : ''}`}
                    onClick={() => setExpandedRole(expandedRole === 'inspectors' ? null : 'inspectors')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-color-bar inspectors" />
                    <div className="role-info">
                      <span className="role-icon">🕵️</span>
                      <span className="role-name">Inspecteurs</span>
                      <span className="role-count">{inspectors.length}</span>
                    </div>
                    <div className="role-players-preview">
                      {inspectors.length === 0 ? (
                        <span className={`no-players ${unassigned.length > 0 ? 'add-hint' : ''}`}>
                          {unassigned.length > 0 ? '+ Ajouter' : 'Vide'}
                        </span>
                      ) : (
                        <>
                          {inspectors.slice(0, 3).map((player) => (
                            <span key={player.uid} className="player-name-chip inspectors">
                              {player.name?.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                            </span>
                          ))}
                          {inspectors.length > 3 && (
                            <span className="player-name-chip more">+{inspectors.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* Suspects */}
                  <motion.div
                    className={`alibi-role-card suspects ${expandedRole === 'suspects' ? 'expanded' : ''}`}
                    onClick={() => setExpandedRole(expandedRole === 'suspects' ? null : 'suspects')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-color-bar suspects" />
                    <div className="role-info">
                      <span className="role-icon">🎭</span>
                      <span className="role-name">Suspects</span>
                      <span className="role-count">{suspects.length}</span>
                    </div>
                    <div className="role-players-preview">
                      {suspects.length === 0 ? (
                        <span className={`no-players ${unassigned.length > 0 ? 'add-hint' : ''}`}>
                          {unassigned.length > 0 ? '+ Ajouter' : 'Vide'}
                        </span>
                      ) : (
                        <>
                          {suspects.slice(0, 3).map((player) => (
                            <span key={player.uid} className="player-name-chip suspects">
                              {player.name?.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                            </span>
                          ))}
                          {suspects.length > 3 && (
                            <span className="player-name-chip more">+{suspects.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Expanded Role Detail Modal */}
                <AnimatePresence>
                  {expandedRole && (
                    <motion.div
                      className="role-detail-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setExpandedRole(null)}
                    >
                      <motion.div
                        className={`role-detail-card ${expandedRole}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="detail-header">
                          <span className="detail-icon">
                            {expandedRole === 'inspectors' ? '🕵️' : '🎭'}
                          </span>
                          <h4 className="detail-title">
                            {expandedRole === 'inspectors' ? 'Inspecteurs' : 'Suspects'}
                          </h4>
                          <button className="detail-close" onClick={() => setExpandedRole(null)}>
                            <X size={18} />
                          </button>
                        </div>

                        {/* Players in this role */}
                        <div className="detail-players">
                          {(expandedRole === 'inspectors' ? inspectors : suspects).map(player => (
                            <div key={player.uid} className={`detail-player ${expandedRole}`}>
                              <div className={`player-dot ${expandedRole}`}>
                                {player.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="player-name">{player.name}</span>
                              <button
                                className="remove-player-btn"
                                onClick={() => handleAssignTeam(player.uid, null)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {(expandedRole === 'inspectors' ? inspectors : suspects).length === 0 && (
                            <p className="empty-role">Aucun joueur dans ce rôle</p>
                          )}
                        </div>

                        {/* Add Player from unassigned */}
                        {unassigned.length > 0 && (
                          <div className="detail-add">
                            <span className="add-label">
                              <UserPlus size={14} /> Ajouter
                            </span>
                            <div className="add-chips">
                              {unassigned.map(p => (
                                <button
                                  key={p.uid}
                                  className={`add-player-chip ${expandedRole}`}
                                  onClick={() => handleAssignTeam(p.uid, expandedRole)}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unassigned Players Row */}
                {unassigned.length > 0 && !expandedRole && (
                  <div className="unassigned-row alibi">
                    <span className="unassigned-label">Sans rôle</span>
                    <div className="unassigned-chips">
                      {unassigned.slice(0, 4).map(p => (
                        <span key={p.uid} className="unassigned-chip">
                          {p.name?.slice(0, 8)}{p.name?.length > 8 ? '…' : ''}
                        </span>
                      ))}
                      {unassigned.length > 4 && (
                        <span className="unassigned-chip more">+{unassigned.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning if can't start */}
                {!canStart && (
                  <div className="alibi-warning">
                    ⚠️ Sélectionne un alibi et assigne au moins 1 inspecteur et 1 suspect
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Start Button */}
            <div className="alibi-lobby-footer">
              <motion.button
                className="alibi-start-btn"
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">Démarrer l'interrogatoire</span>
              </motion.button>
            </div>
          </>
        ) : (
          // PLAYER VIEW
          <div className="alibi-player-view">
            {/* My Role Banner */}
            {players.find(p => p.uid === auth.currentUser?.uid)?.team ? (
              <div className={`my-role-banner ${players.find(p => p.uid === auth.currentUser?.uid)?.team}`}>
                <div className="banner-glow" />
                <span className="banner-label">Ton rôle</span>
                <span className="banner-role-name">
                  {players.find(p => p.uid === auth.currentUser?.uid)?.team === 'inspectors'
                    ? '🕵️ Inspecteur'
                    : '🎭 Suspect'}
                </span>
                <span className="banner-description">
                  {players.find(p => p.uid === auth.currentUser?.uid)?.team === 'inspectors'
                    ? 'Tu devras interroger les suspects'
                    : 'Tu devras défendre ton alibi'}
                </span>
              </div>
            ) : (
              <div className="pending-banner alibi">
                <span className="pending-icon">⏳</span>
                <span className="pending-text">L'hôte va t'assigner un rôle...</span>
              </div>
            )}

            {/* Roles Grid with Players */}
            <div className="alibi-roles-grid-player">
              {/* Inspectors */}
              <div className={`role-card-player inspectors ${players.find(p => p.uid === auth.currentUser?.uid)?.team === 'inspectors' ? 'my-role' : ''}`}>
                <div className="role-card-bar inspectors" />
                <div className="role-card-header">
                  <span className="role-card-icon">🕵️</span>
                  <span className="role-card-name">Inspecteurs</span>
                  <span className="role-card-count">{inspectors.length}</span>
                </div>
                <div className="role-card-players">
                  {inspectors.length === 0 ? (
                    <span className="no-players-text">Vide</span>
                  ) : (
                    inspectors.slice(0, 4).map((player) => (
                      <span
                        key={player.uid}
                        className={`player-tag inspectors ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                      >
                        {player.uid === auth.currentUser?.uid && '👤 '}
                        {player.name}
                      </span>
                    ))
                  )}
                  {inspectors.length > 4 && (
                    <span className="player-tag more">+{inspectors.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Suspects */}
              <div className={`role-card-player suspects ${players.find(p => p.uid === auth.currentUser?.uid)?.team === 'suspects' ? 'my-role' : ''}`}>
                <div className="role-card-bar suspects" />
                <div className="role-card-header">
                  <span className="role-card-icon">🎭</span>
                  <span className="role-card-name">Suspects</span>
                  <span className="role-card-count">{suspects.length}</span>
                </div>
                <div className="role-card-players">
                  {suspects.length === 0 ? (
                    <span className="no-players-text">Vide</span>
                  ) : (
                    suspects.slice(0, 4).map((player) => (
                      <span
                        key={player.uid}
                        className={`player-tag suspects ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                      >
                        {player.uid === auth.currentUser?.uid && '👤 '}
                        {player.name}
                      </span>
                    ))
                  )}
                  {suspects.length > 4 && (
                    <span className="player-tag more">+{suspects.length - 4}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Waiting Animation */}
            <div className="waiting-compact alibi">
              <div className="waiting-pulse alibi" />
              <span className="waiting-label">En attente du lancement...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
