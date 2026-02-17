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
import LobbyHeader from "@/components/game/LobbyHeader";
import PaywallModal from "@/components/ui/PaywallModal";
import AlibiSelectorModal from "@/components/game-alibi/AlibiSelectorModal";
import { AlibiGroupSelector, AlibiGroupNameEditor } from "@/components/game-alibi";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useAlibiGroups } from "@/lib/hooks/useAlibiGroups";
import { useAlibiGroupRotation } from "@/lib/hooks/useAlibiGroupRotation";
import { canAccessPack, isPro, PRO_CONTENT } from "@/lib/subscription";
import { ALIBI_GROUP_CONFIG } from "@/lib/config/rooms";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePresence } from "@/lib/hooks/usePresence";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { getAlibiManifest } from "@/lib/utils/manifestCache";
import { ChevronRight, ChevronUp, ChevronDown, Shuffle, RotateCcw, X, UserPlus } from "lucide-react";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import { storage } from "@/lib/utils/storage";
import { useInterstitialAd } from "@/lib/hooks/useInterstitialAd";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { GameLaunchCountdown } from "@/components/transitions";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import LobbyWaitingIndicator from "@/components/game/LobbyWaitingIndicator";

export default function AlibiLobby() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [myUid, setMyUid] = useState(null);
  const [groups, setGroups] = useState({});

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Party Mode detection
  const isPartyMode = meta?.gameMasterMode === 'party';

  // Party Mode hooks
  const alibiGroupsHook = useAlibiGroups({
    roomCode: code,
    meta,
    groups,
    players,
    myUid,
    isHost
  });

  const { initializeRotation } = useAlibiGroupRotation({
    roomCode: code,
    meta,
    state: null, // Not needed in lobby
    groups,
    players,
    myUid,
    isHost
  });
  const [alibiOptions, setAlibiOptions] = useState([]);
  const [selectedAlibiId, setSelectedAlibiId] = useState(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostJoined, setHostJoined] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAlibiSelector, setShowAlibiSelector] = useState(false);
  const [lockedAlibiName, setLockedAlibiName] = useState('');
  const [expandedRole, setExpandedRole] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  // Player view scroll indicators
  const playerScrollRef = useRef(null);
  const [canScrollUpPlayer, setCanScrollUpPlayer] = useState(false);
  const [canScrollDownPlayer, setCanScrollDownPlayer] = useState(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);

  // Get user profile for subscription check and pseudo
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get pseudo from profile or fallback
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Hôte';

  // Interstitial ad (unified hook)
  useInterstitialAd({ context: 'Alibi' });

  // Keep screen awake during game
  useWakeLock({ enabled: true });

  // ATT Prompt for hosts (GDPR + ATT)
  useATTPromptInLobby(isHost);

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      setJoinUrl(`${window.location.origin}/join?code=${code}`);
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

  // Get available alibis based on subscription
  const availableAlibis = userIsPro
    ? alibiOptions
    : alibiOptions.slice(0, PRO_CONTENT.alibi.free);

  // Auto-select random alibi when options load (Game Master mode)
  useEffect(() => {
    if (!isPartyMode && isHost && alibiOptions.length > 0 && !selectedAlibiId) {
      const available = userIsPro ? alibiOptions : alibiOptions.slice(0, PRO_CONTENT.alibi.free);
      if (available.length > 0) {
        const randomIndex = Math.floor(Math.random() * available.length);
        setSelectedAlibiId(available[randomIndex].id);
      }
    }
  }, [isPartyMode, isHost, alibiOptions, selectedAlibiId, userIsPro]);

  // Shuffle to pick a different random alibi
  const shuffleAlibi = () => {
    if (availableAlibis.length <= 1) return;
    let newIndex;
    const currentIndex = availableAlibis.findIndex(a => a.id === selectedAlibiId);
    do {
      newIndex = Math.floor(Math.random() * availableAlibis.length);
    } while (newIndex === currentIndex);
    setSelectedAlibiId(availableAlibis[newIndex].id);
  };

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        setIsHost(meta?.hostUid === user.uid);
        setHostJoined(players.some(p => p.uid === user.uid));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, players]);

  // Auto-join host
  useEffect(() => {
    if (isHost && !hostJoined && userPseudo && !profileLoading && auth.currentUser) {
      const uid = auth.currentUser.uid;
      set(ref(db, `rooms_alibi/${code}/players/${uid}`), {
        uid,
        name: userPseudo,
        team: isPartyMode ? null : 'inspectors', // Party Mode: no team, will be assigned to group
        groupId: null,
        status: 'active',
        joinedAt: Date.now()
      });
    }
  }, [isHost, hostJoined, userPseudo, profileLoading, code, isPartyMode]);

  // Initialize groups in Party Mode (host only, once)
  useEffect(() => {
    if (isHost && isPartyMode && meta?.groupCount && Object.keys(groups).length === 0) {
      alibiGroupsHook.initializeGroups(meta.groupCount);
    }
  }, [isHost, isPartyMode, meta?.groupCount, groups, alibiGroupsHook]);

  // Presence hook - real-time connection tracking
  const { isConnected, forceReconnect } = usePresence({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    heartbeatInterval: 15000,
    enabled: !!myUid
  });

  // Player cleanup with auto-rejoin for hard refresh
  const { leaveRoom, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    phase: 'lobby',
    playerName: userPseudo,
    isHost,
    getPlayerData: (uid, name) => ({
      uid,
      name,
      team: null,
      status: 'active',
      joinedAt: Date.now()
    }),
    onPlayerRemoved: () => {
      if (!isHost) setIsPlayerMissing(true);
    },
    onRejoinSuccess: () => {
      setIsPlayerMissing(false);
      setRejoinError(null);
    },
    onRejoinFailed: (err) => {
      setRejoinError(err?.message || 'Impossible de rejoindre');
    }
  });

  // Room guard - détecte kick et fermeture room
  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: myUid,
    isHost,
    skipKickRedirect: true // LobbyDisconnectAlert gère le cas kick en lobby
  });

  // Host disconnect - gère la grace period si l'hôte perd sa connexion
  // UNIVERSAL: Utiliser hostUid - le hook détermine si on est l'hôte
  useHostDisconnect({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    hostUid: meta?.hostUid
  });

  // DB listeners
  useEffect(() => {
    if (!code) return;

    const metaUnsub = onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) {
          return; // useRoomGuard handles this
        }
        setMeta(m);
        setSelectedAlibiId(m?.alibiId || null);
        roomWasValidRef.current = true;
      }
      // Room deletion is now handled by useRoomGuard
    });

    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "prep" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });

    // Listen for groups (Party Mode)
    const groupsUnsub = onValue(ref(db, `rooms_alibi/${code}/groups`), (snap) => {
      setGroups(snap.val() || {});
    });

    return () => {
      metaUnsub();
      stateUnsub();
      groupsUnsub();
    };
  }, [code, router]);

  // Scroll indicators for host view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setCanScrollUp(scrollTop > 10);
      setCanScrollDown(scrollTop < scrollHeight - clientHeight - 10);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);

    // Also check on resize and when content changes
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [isHost, isPartyMode, groups, players]);

  // Scroll indicators for player view
  useEffect(() => {
    if (isHost) return; // Only for players
    const container = playerScrollRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setCanScrollUpPlayer(scrollTop > 10);
      setCanScrollDownPlayer(scrollTop < scrollHeight - clientHeight - 10);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [isHost, isPartyMode, groups, players]);

  const handleSelectAlibi = async (alibiId) => {
    if (!isHost) return;
    // Game Master Mode only: single alibi selection
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
    // Pas besoin de toast, l'UI se met à jour
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
    if (!isHost) return;

    // ========== PARTY MODE ==========
    if (isPartyMode) {
      // Validate all groups have enough players
      if (!alibiGroupsHook.allGroupsValid) {
        toast.error('Tous les groupes doivent avoir au moins 2 joueurs');
        return;
      }

      const groupIds = alibiGroupsHook.groupIds;

      try {
        // Get available alibis (Pro = all, Free = first 4)
        const availableAlibis = userIsPro
          ? alibiOptions
          : alibiOptions.slice(0, 4);

        if (availableAlibis.length < groupIds.length) {
          toast.error(`Pas assez d'alibis disponibles (${availableAlibis.length} pour ${groupIds.length} groupes)`);
          return;
        }

        // Shuffle alibis and assign randomly to groups
        const shuffledAlibis = [...availableAlibis].sort(() => Math.random() - 0.5);

        // Load alibi data for each group
        const groupUpdates = {};
        for (let i = 0; i < groupIds.length; i++) {
          const groupId = groupIds[i];
          const alibi = shuffledAlibis[i];

          const alibiData = await fetch(`/data/alibis/${alibi.id}.json`).then(r => r.json());
          const isNewFormat = alibiData.accused_document !== undefined;

          let questions;
          if (isNewFormat) {
            questions = alibiData.inspector_questions.map((q, idx) => ({
              id: idx,
              text: typeof q === 'string' ? q : q.text,
              hint: typeof q === 'object' ? q.hint : null,
              custom: false
            }));
          } else {
            questions = [
              ...alibiData.predefinedQuestions.map((q, idx) => ({ id: idx, text: q, custom: false })),
              { id: 7, text: "", custom: true },
              { id: 8, text: "", custom: true },
              { id: 9, text: "", custom: true }
            ];
          }

          groupUpdates[`groups/${groupId}/alibiId`] = alibi.id;
          groupUpdates[`groups/${groupId}/alibiData`] = {
            context: alibiData.context || null,
            accused_document: alibiData.accused_document || null,
            inspector_summary: alibiData.inspector_summary || null,
            scenario: alibiData.scenario || null,
            keyElements: alibiData.keyElements || null,
            title: alibiData.title,
            isNewFormat,
            questions
          };
        }

        // Initialize rotation
        const rotationState = await initializeRotation();

        // Calculate questions per group
        const questionsPerGroup = alibiGroupsHook.getQuestionsPerGroup();

        await update(ref(db, `rooms_alibi/${code}`), {
          ...groupUpdates,
          state: {
            phase: "prep",
            currentQuestion: 0,
            prepTimeLeft: 90,
            questionTimeLeft: 30,
            allAnswered: false,
            // Party mode rotation
            ...rotationState,
            questionsPerGroup
          },
          interrogation: {
            currentQuestion: 0,
            state: "waiting",
            responses: null,
            verdict: null
          }
        });

      } catch (error) {
        console.error('Erreur lors du lancement (Party Mode):', error);
        toast.error('Erreur lors du lancement de la partie');
      }
      return;
    }

    // ========== GAME MASTER MODE (existing logic) ==========
    if (!selectedAlibiId) return;

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

      // Partie lancée - pas besoin de toast, redirection automatique
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

  // Player exit handler (non-host)
  const handlePlayerExit = async () => {
    markVoluntaryLeave(); // Évite le toast "expulsé par l'hôte"
    await leaveRoom();
    router.push('/home');
  };

  const inspectors = players.filter(p => p.team === "inspectors");
  const suspects = players.filter(p => p.team === "suspects");
  const unassigned = players.filter(p => !p.team && !p.groupId);

  // Can start conditions depend on mode
  const canStartGameMaster = isHost && selectedAlibiId && inspectors.length > 0 && suspects.length > 0;
  const canStartParty = isHost && isPartyMode && alibiGroupsHook.allGroupsValid;
  const canStart = isPartyMode ? canStartParty : canStartGameMaster;

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
      <div className="alibi-lobby-container game-page">
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alibi-lobby-container game-page">
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
      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />

      {/* Lobby Disconnect Alert */}
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost}
        isRejoining={isRejoining}
        onRejoin={attemptRejoin}
        onGoHome={() => router.push('/home')}
        error={rejoinError}
        gameColor="#f59e0b"
      />

      {/* Header */}
      <LobbyHeader
        ref={shareModalRef}
        variant="alibi"
        code={code}
        isHost={isHost}
        players={players}
        hostUid={meta?.hostUid}
        onHostExit={handleHostExit}
        onPlayerExit={handlePlayerExit}
        onShowHowToPlay={() => setShowHowToPlay(true)}
        joinUrl={joinUrl}
        gameMode={isPartyMode ? 'party' : 'gamemaster'}
      />

      {/* Main Content */}
      <main className="alibi-lobby-main">
        {isHost ? (
          // HOST VIEW
          <>
            <div className="alibi-lobby-content">
              {/* GAME MASTER MODE: Random Alibi Display - Compact */}
              {!isPartyMode && (
                <div className="alibi-lobby-card gm-alibi-card">
                  <div className="gm-alibi-row">
                    <span className="gm-alibi-emoji">{alibiEmojis[selectedAlibiId] || '🕵️'}</span>
                    <div className="gm-alibi-info">
                      <h3 className="gm-alibi-title">{selectedAlibi?.title || 'Chargement...'}</h3>
                      {!userIsPro ? (
                        <button className="gm-upsell-link" onClick={() => setShowPaywall(true)}>
                          {PRO_CONTENT.alibi.free}/{PRO_CONTENT.alibi.total} alibis • <span>+{PRO_CONTENT.alibi.proOnly} avec Pro</span>
                        </button>
                      ) : (
                        <span className="gm-pro-hint">🎲 {PRO_CONTENT.alibi.total} alibis</span>
                      )}
                    </div>
                    <motion.button
                      className="gm-shuffle-btn"
                      onClick={shuffleAlibi}
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Shuffle size={18} />
                    </motion.button>
                  </div>
                </div>
              )}

              {/* PARTY MODE: Group Management */}
              {isPartyMode && (
                <div className="party-groups-wrapper">
                  {/* Scroll indicator - Up */}
                  <div className={`scroll-indicator up ${canScrollUp ? 'visible' : ''}`}>
                    <ChevronUp size={20} />
                  </div>

                  <div className="alibi-lobby-card party-groups-card" ref={scrollContainerRef}>
                    <AlibiGroupSelector
                      groups={groups}
                      players={players}
                      playersByGroup={alibiGroupsHook.playersByGroup}
                      groupCount={alibiGroupsHook.groupCount}
                      onGroupCountChange={alibiGroupsHook.setGroupCount}
                      onAssignPlayer={alibiGroupsHook.assignToGroup}
                      onRemovePlayer={alibiGroupsHook.removeFromGroup}
                      onAutoAssign={alibiGroupsHook.autoAssignPlayers}
                      onReset={alibiGroupsHook.resetAssignments}
                      isGroupValid={alibiGroupsHook.isGroupValid}
                      myUid={myUid}
                    />

                    {/* Pro Upsell Banner OR Simple hint for Pro users */}
                    {!userIsPro ? (
                      <motion.div
                        className="party-free-limit-banner"
                        onClick={() => setShowPaywall(true)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="limit-message">
                          <span className="limit-emoji">🎲</span>
                          <span className="limit-text">
                            Vos groupes tourneront sur <strong>{PRO_CONTENT.alibi.free} alibis</strong> gratuits
                          </span>
                        </div>
                        <div className="unlock-cta">
                          <span>Débloquer les {PRO_CONTENT.alibi.total}</span>
                          <ChevronRight size={16} />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="party-alibi-hint">
                        <span className="hint-icon">🎲</span>
                        <span className="hint-text">Alibis assignés aléatoirement au lancement</span>
                      </div>
                    )}
                  </div>

                  {/* Scroll indicator - Down */}
                  <div className={`scroll-indicator down ${canScrollDown ? 'visible' : ''}`}>
                    <ChevronDown size={20} />
                  </div>
                </div>
              )}

              {/* GAME MASTER MODE: Roles Management Card */}
              {!isPartyMode && (
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

              </div>
              )}
            </div>

            {/* Fixed Start Button */}
            <div className="alibi-lobby-footer">
              <motion.button
                className={`alibi-start-btn ${!canStart ? 'disabled' : ''}`}
                onClick={handleStartGame}
                disabled={!canStart}
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
              >
                <span className="btn-text">
                  {canStart ? (
                    "Démarrer l'interrogatoire"
                  ) : isPartyMode ? (
                    /* Party Mode: show group status */
                    alibiGroupsHook.allGroupsValid
                      ? "Démarrer l'interrogatoire"
                      : `${Object.values(groups).filter(g => alibiGroupsHook.isGroupValid(g.id)).length}/${alibiGroupsHook.groupCount} groupes prêts`
                  ) : (
                    /* Game Master Mode: show checklist */
                    <>
                      <span className={selectedAlibiId ? 'check-done' : ''}>Alibi</span>
                      {' • '}
                      <span className={inspectors.length > 0 ? 'check-done' : ''}>Inspecteur</span>
                      {' • '}
                      <span className={suspects.length > 0 ? 'check-done' : ''}>Suspect</span>
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </>
        ) : (
          // PLAYER VIEW
          <div className="alibi-player-view-wrapper">
            {/* Scroll indicator - Up */}
            <div className={`scroll-indicator up ${canScrollUpPlayer ? 'visible' : ''}`}>
              <ChevronUp size={20} />
            </div>

            <div className="alibi-player-view" ref={playerScrollRef}>
            {/* PARTY MODE: My Group Banner */}
            {isPartyMode ? (
              alibiGroupsHook.myGroup ? (
                <div className="my-group-banner" style={{ '--group-color': alibiGroupsHook.myGroup.color }}>
                  <div className="banner-glow" style={{ background: alibiGroupsHook.myGroup.color }} />
                  <AlibiGroupNameEditor
                    group={alibiGroupsHook.myGroup}
                    onUpdateName={(name) => alibiGroupsHook.updateGroupName(alibiGroupsHook.myGroup.id, name)}
                    canEdit={true}
                  />
                  <span className="banner-description">
                    Chaque groupe aura son propre alibi à défendre
                  </span>
                </div>
              ) : (
                <div className="pending-banner alibi">
                  <span className="pending-icon">⏳</span>
                  <span className="pending-text">L'hôte va t'assigner un groupe...</span>
                </div>
              )
            ) : (
              /* GAME MASTER MODE: My Role Banner */
              players.find(p => p.uid === auth.currentUser?.uid)?.team ? (
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
              )
            )}

            {/* PARTY MODE: Groups Grid */}
            {isPartyMode ? (
              <div className="alibi-groups-grid-player">
                {alibiGroupsHook.groupIds.map(groupId => {
                  const group = groups[groupId];
                  const groupPlayers = alibiGroupsHook.playersByGroup[groupId] || [];
                  const isMyGroup = alibiGroupsHook.myGroup?.id === groupId;

                  return (
                    <div
                      key={groupId}
                      className={`group-card-player ${isMyGroup ? 'my-group' : ''}`}
                      style={{ '--group-color': group?.color }}
                    >
                      <div className="group-card-bar" style={{ background: group?.color }} />
                      <div className="group-card-header">
                        <span className="group-card-name" style={{ color: group?.color }}>
                          {group?.name}
                        </span>
                        <span className="group-card-count">{groupPlayers.length}</span>
                      </div>
                      <div className="group-card-players">
                        {groupPlayers.length === 0 ? (
                          <span className="no-players-text">Vide</span>
                        ) : (
                          groupPlayers.slice(0, 4).map((player) => (
                            <span
                              key={player.uid}
                              className={`player-tag ${player.uid === auth.currentUser?.uid ? 'is-me' : ''}`}
                              style={{ '--group-color': group?.color }}
                            >
                              {player.uid === auth.currentUser?.uid && '👤 '}
                              {player.name}
                            </span>
                          ))
                        )}
                        {groupPlayers.length > 4 && (
                          <span className="player-tag more">+{groupPlayers.length - 4}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GAME MASTER MODE: Roles Grid */
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
            )}

            {/* Waiting Animation */}
            <LobbyWaitingIndicator gameColor="#f59e0b" />
          </div>

            {/* Scroll indicator - Down */}
            <div className={`scroll-indicator down ${canScrollDownPlayer ? 'visible' : ''}`}>
              <ChevronDown size={20} />
            </div>
          </div>
        )}
      </main>

      {/* Game Launch Countdown Transition */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#f59e0b"
            onComplete={() => router.push(`/alibi/game/${code}/prep`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
