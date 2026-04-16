"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import PartyAlibiPreviewModal from "@/components/game-alibi/PartyAlibiPreviewModal";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import { useAlibiGroups } from "@/lib/hooks/useAlibiGroups";
import { useAlibiGroupRotation } from "@/lib/hooks/useAlibiGroupRotation";
import { canAccessPack, isPro, PRO_CONTENT } from "@/lib/subscription";
import { useHearts } from "@/lib/hooks/useHearts";
import { useHeartsLobbyGuard } from "@/lib/hooks/useHeartsLobbyGuard";
import HeartsModal from "@/components/ui/HeartsModal";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { ALIBI_GROUP_CONFIG } from "@/lib/config/rooms";
import { ALIBI_EMOJIS } from "@/lib/config/alibi-emojis";
import { usePresence } from "@/lib/hooks/usePresence";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { getAlibiManifest } from "@/lib/utils/manifestCache";
import { CaretRight, ArrowRight, Crown } from "@phosphor-icons/react";
import { storage } from "@/lib/utils/storage";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { GameLaunchCountdown } from "@/components/transitions";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import TeamCard from "@/components/game/TeamCard";
import TeamTabs from "@/lib/components/TeamTabs";
import { getFlatCSSVars, GAME_COLORS } from "@/lib/config/colors";
import LobbyStartButton from "@/components/game/LobbyStartButton";
import '@/components/game/lobby-base.css';
import './alibi-lobby.css';
import '@/app/alibi/alibi-selector.css';

const ROLE_TEAMS = {
  inspectors: { name: 'Inspecteurs', color: '#d97706', score: 0 },
  suspects: { name: 'Suspects', color: '#7c3aed', score: 0 },
};

export function AlibiLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  // Safe-area color continuity with the lobby dark background
  useAppShellBg('#0e0e1a');

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [myUid, setMyUid] = useState(devUid || null);
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
  const [showPartyPreview, setShowPartyPreview] = useState(false);
  const [lockedAlibiName, setLockedAlibiName] = useState('');
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);

  // Get user profile for subscription check and pseudo
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

  // Get pseudo from profile or fallback
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

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

  // Auth (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
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
  }, [meta?.hostUid, players, devUid]);

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

  // Fallback: ensure groups exist in Party Mode
  // createExtra writes them at room creation, but navigateBeforeCreate
  // means the lobby can load before the write lands in Firebase
  useEffect(() => {
    if (!code || !isPartyMode || !meta?.groupCount || Object.keys(groups).length > 0) return;
    const count = meta.groupCount;
    const newGroups = {};
    for (let i = 0; i < count; i++) {
      const gId = `group${i + 1}`;
      newGroups[gId] = { id: gId, name: ALIBI_GROUP_CONFIG.DEFAULT_NAMES[i], color: ALIBI_GROUP_CONFIG.DEFAULT_COLORS[i], score: { correct: 0, total: 0 } };
    }
    set(ref(db, `rooms_alibi/${code}/groups`), newGroups).catch(() => {});
  }, [code, isPartyMode, meta?.groupCount, groups]);

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
    consumeHeart();

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
          : alibiOptions.slice(0, PRO_CONTENT.alibi.free);

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
  const myPlayer = players.find(p => p.uid === myUid);

  const playersWithTeamId = players.map(p => ({ ...p, teamId: p.team || '' }));

  const canStartGameMaster = isHost && selectedAlibiId && inspectors.length > 0 && suspects.length > 0;
  const canStartParty = isHost && isPartyMode && alibiGroupsHook.allGroupsValid;
  const canStart = isPartyMode ? canStartParty : canStartGameMaster;

  const selectedAlibi = alibiOptions.find(a => a.id === selectedAlibiId);

  // Loading state
  if (!meta) {
    return (
      <div className="lobby-flat alibi-lobby game-page" style={getFlatCSSVars('alibi')}>
        <div className="lobby-loading">
          <div className="loading-spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-flat alibi-lobby game-page" style={getFlatCSSVars('alibi')}>
      {/* Modals */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        contentType="alibi"
        contentName={lockedAlibiName}
        gameColor={GAME_COLORS.alibi.primary}
        gameColorDark={GAME_COLORS.alibi.secondary}
      />
      <AlibiSelectorModal
        isOpen={showAlibiSelector}
        onClose={() => setShowAlibiSelector(false)}
        alibiOptions={alibiOptions}
        selectedAlibiId={selectedAlibiId}
        onSelectAlibi={handleSelectAlibi}
        userIsPro={userIsPro}
      />
      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <PartyAlibiPreviewModal
        isOpen={showPartyPreview}
        onClose={() => setShowPartyPreview(false)}
        alibiOptions={alibiOptions}
        userIsPro={userIsPro}
        onUpgrade={() => setShowPaywall(true)}
      />

      {/* Hearts Guard */}
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />

      {/* Lobby Disconnect Alert */}
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost}
        isRejoining={isRejoining}
        onRejoin={attemptRejoin}
        onGoHome={() => router.push('/home')}
        error={rejoinError}
        gameColor="#f59e0b"
      />

      {/* Countdown */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor="#f59e0b"
            onComplete={() => router.push(`/alibi/game/${code}/prep`)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader
          ref={shareModalRef}
          variant="alibi"
          code={code}
          isHost={isHost}
          players={players}
          hostUid={meta?.hostUid}
          onHostExit={handleHostExit}
          onPlayerExit={handlePlayerExit}
          joinUrl={joinUrl}
          gameMode={isPartyMode ? 'party' : 'gamemaster'}
        />
      </div>

      {/* Main content */}
      <main className="lobby-main-flat">

        {/* ─── HOST: Alibi Settings (GM mode) ─── */}
        {isHost && !isPartyMode && (
          <motion.div
            className="lobby-settings-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div className="lobby-selector-row" onClick={() => setShowAlibiSelector(true)} whileTap={{ scale: 0.98 }}>
              <span className="lobby-selector-emoji">{ALIBI_EMOJIS[selectedAlibiId] || '🕵️'}</span>
              <div className="lobby-selector-info">
                <div className="lobby-selector-name">{selectedAlibi?.title || 'Choisis un alibi'}</div>
                {!userIsPro ? (
                  <button className="lobby-selector-detail" onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}>
                    {PRO_CONTENT.alibi.free}/{PRO_CONTENT.alibi.total} alibis • <span style={{ color: 'var(--game-color)', fontWeight: 700 }}>+{PRO_CONTENT.alibi.proOnly} avec Pro</span>
                  </button>
                ) : (
                  <span className="lobby-selector-detail">🎲 {PRO_CONTENT.alibi.total} alibis</span>
                )}
              </div>
              <div className="lobby-selector-action">
                <span className="lobby-selector-action-label">Changer</span>
                <CaretRight size={14} weight="bold" />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── HOST: Party Mode Settings + Teams ─── */}
        {isHost && isPartyMode && (() => {
          const count = meta?.groupCount || 2;
          const partyTeams = {};
          for (let i = 0; i < count; i++) {
            const gId = `group${i + 1}`;
            const g = groups[gId];
            partyTeams[gId] = { name: g?.name || ALIBI_GROUP_CONFIG.DEFAULT_NAMES[i], color: g?.color || ALIBI_GROUP_CONFIG.DEFAULT_COLORS[i], score: 0 };
          }
          const playersWithGroupAsTeam = players.map(p => ({ ...p, teamId: p.groupId || '' }));

          return (
            <>
              {/* Alibi tag + stacked upgrade — outside settings panel, own wrapper */}
              <motion.div className="party-alibi-wrapper" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <div
                  className="party-alibi-tag"
                  onClick={() => setShowPartyPreview(true)}
                >
                  <div className="party-alibi-tag-left">
                    <span className="party-alibi-tag-emoji">🎲</span>
                    <span className="party-alibi-tag-text">
                      {userIsPro
                        ? `${alibiOptions.length} alibis aléatoires`
                        : `${PRO_CONTENT.alibi.free} alibis gratuits`
                      }
                    </span>
                  </div>
                  <div className="party-alibi-tag-action">
                    <span className="party-alibi-tag-label">{userIsPro ? 'Voir' : 'Détails'}</span>
                    <CaretRight size={14} weight="bold" />
                  </div>
                </div>

                {!userIsPro && (
                  <div className="party-upgrade-stacked-tag" onClick={() => setShowPaywall(true)}>
                    <div className="party-upgrade-stacked-left">
                      <Crown size={14} weight="fill" />
                      <span>Débloquer les {alibiOptions.length} alibis</span>
                    </div>
                    <span className="party-upgrade-stacked-badge">PRO</span>
                  </div>
                )}
              </motion.div>

              {/* Team count selector — in settings panel */}
              <motion.div className="lobby-settings-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="lobby-team-count-row">
                  <span className="lobby-team-count-label">Nombre d'équipes</span>
                  <div className="lobby-team-count-btns">
                    {[2, 3, 4].map(count => (
                      <button
                        key={count}
                        className={`lobby-team-count-btn ${alibiGroupsHook.groupCount === count ? 'active' : ''}`}
                        onClick={() => alibiGroupsHook.setGroupCount(count)}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="lobby-team-panel">
                <TeamTabs
                  label="Équipes"
                  teams={partyTeams}
                  players={playersWithGroupAsTeam}
                  teamCount={alibiGroupsHook.groupCount}
                  onAssignToTeam={(uid, groupId) => alibiGroupsHook.assignToGroup(uid, groupId)}
                  onRemoveFromTeam={(uid) => alibiGroupsHook.removeFromGroup(uid)}
                  onAutoBalance={alibiGroupsHook.autoAssignPlayers}
                  onResetTeams={alibiGroupsHook.resetAssignments}
                  onUpdateTeamName={(groupId, name) => alibiGroupsHook.updateGroupName(groupId, name)}
                />
              </div>
            </>
          );
        })()}

        {/* ─── PLAYER: Settings info card ─── */}
        {!isHost && !isPartyMode && (
          <motion.div className="lobby-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="lobby-player-settings-info">
              <span className="lobby-player-settings-emoji">{ALIBI_EMOJIS[selectedAlibiId] || '🕵️'}</span>
              <div className="lobby-player-settings-name">{selectedAlibi?.title || 'Alibi en attente'}</div>
            </div>
          </motion.div>
        )}

        {/* ─── HOST GM: Roles management (TeamTabs — same as Quiz teams) ─── */}
        {isHost && !isPartyMode && (
          <div className="lobby-team-panel">
            <TeamTabs
              label="Rôles"
              teams={ROLE_TEAMS}
              players={playersWithTeamId}
              teamCount={2}
              onAssignToTeam={(uid, teamId) => handleAssignTeam(uid, teamId)}
              onRemoveFromTeam={(uid) => handleAssignTeam(uid, null)}
              onAutoBalance={handleAutoAssign}
              onResetTeams={handleResetTeams}
            />
          </div>
        )}

        {/* ─── PLAYER GM: Role banner ─── */}
        {!isHost && !isPartyMode && (
          myPlayer?.team ? (
            <div className={`my-role-banner ${myPlayer.team}`}>
              <div className="banner-color-bar" />
              <span className="banner-label">Ton rôle</span>
              <span className="banner-role-name">
                {myPlayer.team === 'inspectors' ? '🕵️ Inspecteur' : '🎭 Suspect'}
              </span>
              <span className="banner-description">
                {myPlayer.team === 'inspectors' ? 'Tu devras interroger les suspects' : 'Tu devras défendre ton alibi'}
              </span>
            </div>
          ) : (
            <div className="pending-banner alibi">
              <span className="pending-icon">⏳</span>
              <span className="pending-text">L'hôte va t'assigner un rôle...</span>
            </div>
          )
        )}

        {/* ─── PLAYER Party: Group banner ─── */}
        {!isHost && isPartyMode && (
          alibiGroupsHook.myGroup ? (
            <div className="pending-banner alibi">
              <span className="pending-icon" style={{ color: alibiGroupsHook.myGroup.color }}>●</span>
              <span className="pending-text">{alibiGroupsHook.myGroup.name} — Chaque groupe défend son propre alibi</span>
            </div>
          ) : (
            <div className="pending-banner alibi">
              <span className="pending-icon">⏳</span>
              <span className="pending-text">L'hôte va t'assigner un groupe...</span>
            </div>
          )
        )}

        {/* ─── PLAYER GM: Roles grid (read-only TeamCards) ─── */}
        {!isHost && !isPartyMode && (
          <div className="alibi-roles-grid">
            <TeamCard
              team={{ id: 'inspectors', ...ROLE_TEAMS.inspectors }} teamPlayers={inspectors}
              isMyTeam={myPlayer?.team === 'inspectors'} myUid={myUid} canManage={false} canEdit={false}
            />
            <TeamCard
              team={{ id: 'suspects', ...ROLE_TEAMS.suspects }} teamPlayers={suspects}
              isMyTeam={myPlayer?.team === 'suspects'} myUid={myUid} canManage={false} canEdit={false}
            />
          </div>
        )}

        {/* ─── PLAYER Party: Groups grid (read-only TeamCards) ─── */}
        {!isHost && isPartyMode && (
          <div className="alibi-roles-grid">
            {alibiGroupsHook.groupIds.map(groupId => {
              const group = groups[groupId];
              const groupPlayers = (alibiGroupsHook.playersByGroup[groupId] || []);
              return (
                <TeamCard
                  key={groupId}
                  team={{ id: groupId, name: group?.name || `Groupe ${groupId}`, color: group?.color || '#8b5cf6' }}
                  teamPlayers={groupPlayers}
                  isMyTeam={alibiGroupsHook.myGroup?.id === groupId}
                  myUid={myUid}
                  canManage={false}
                  canEdit={alibiGroupsHook.myGroup?.id === groupId}
                  onUpdateName={alibiGroupsHook.myGroup?.id === groupId ? (name) => alibiGroupsHook.updateGroupName(groupId, name) : undefined}
                />
              );
            })}
          </div>
        )}


      </main>

      {/* Footer */}
      <div className="lobby-footer-flat">
        {isHost && (
          <LobbyStartButton
            gameColor="#f59e0b"
            icon={<ArrowRight weight="bold" />}
            label={
              canStart
                ? "Commencer"
                : isPartyMode
                  ? `${Object.values(groups).filter(g => alibiGroupsHook.isGroupValid(g.id)).length}/${alibiGroupsHook.groupCount} groupes prêts`
                  : "Assigne les rôles"
            }
            disabled={!canStart}
            onClick={handleStartGame}
          />
        )}
        {!isHost && (
          <button className="lobby-footer-player-card" onClick={() => shareModalRef.current?.open()}>
            <span className="lobby-footer-player-text">Partage le code pour inviter des amis</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function AlibiLobby() {
  const { code } = useParams();
  return <AlibiLobbyContent code={code} />;
}
