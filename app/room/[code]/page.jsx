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
  get,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import TeamTabs from "@/lib/components/TeamTabs";
import PaywallModal from "@/components/ui/PaywallModal";
import QuizSelectorModal from "@/components/ui/QuizSelectorModal";
import LobbyHeader from "@/components/game/LobbyHeader";
import PlayerBanner from "@/components/game/PlayerBanner";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePresence } from "@/lib/hooks/usePresence";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { canAccessPack, isPro } from "@/lib/subscription";
import { useHearts } from "@/lib/hooks/useHearts";
import { useHeartsLobbyGuard } from "@/lib/hooks/useHeartsLobbyGuard";
import HeartsModal from "@/components/ui/HeartsModal";
import { useToast } from "@/lib/hooks/useToast";
import { getQuizManifest } from "@/lib/utils/manifestCache";
import { calculatePartyModeQuestions } from "@/lib/config/rooms";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import LobbyStartButton from "@/components/game/LobbyStartButton";
import { storage } from "@/lib/utils/storage";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { GameLaunchCountdown } from "@/components/transitions";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { CaretDown, CaretRight, Info, Lightning, UsersThree, ArrowRight, Users } from '@phosphor-icons/react';

const ACCENT = '#8b5cf6';
const ACCENT_DARK = '#7c3aed';
const ROOM_PREFIX = 'rooms';

export function QuizLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [teams, setTeams] = useState({});
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [categories, setCategories] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [lockedQuizName, setLockedQuizName] = useState('');
  const [joinUrl, setJoinUrl] = useState("");
  const roomWasValidRef = useRef(false);
  const [myUid, setMyUid] = useState(devUid || null);
  const [showCountdown, setShowCountdown] = useState(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const isHostRef = useRef(false);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

  useWakeLock({ enabled: true });
  useATTPromptInLobby(isHost);

  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };

  useEffect(() => { checkScroll(); }, [players.length]);

  useEffect(() => {
    if (typeof window !== "undefined" && code) setJoinUrl(`${window.location.origin}/join?code=${code}`);
  }, [code]);

  useEffect(() => {
    getQuizManifest()
      .then(cats => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        const host = meta?.hostUid === user.uid;
        setIsHost(host);
        isHostRef.current = host;
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [devUid, meta?.hostUid]);

  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';

  usePresence({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid && !devUid });

  const { leaveRoom, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: ROOM_PREFIX,
    playerUid: myUid,
    phase: 'lobby',
    playerName: userPseudo,
    isHost,
    getPlayerData: (uid, name) => ({
      uid, name, score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now()
    }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); },
  });

  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    skipKickRedirect: true, enabled: !devUid,
  });

  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });

  // Mark player location
  useEffect(() => {
    if (!myUid || !code || devUid) return;
    update(ref(db), { [`${ROOM_PREFIX}/${code}/players/${myUid}/location`]: 'lobby' });
  }, [myUid, code, devUid]);

  // Listen to meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        if (m.closed) return;
        setMeta(m);
        setTeams(m?.teams || {});
        roomWasValidRef.current = true;
      } else if (roomWasValidRef.current) {
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, router, isHost]);

  // ── Handlers (all preserved) ──

  const handleStartGame = async () => {
    if (!isHost || !meta?.quizSelection?.themeIds?.length) return;
    consumeHeart();
    try {
      const { themeIds, categoryName } = meta.quizSelection;
      const isPartyMode = meta?.gameMasterMode === 'party';

      if (isPartyMode && myUid) {
        const hostAsPlayer = players.find(p => p.uid === myUid);
        if (!hostAsPlayer) {
          await set(ref(db, `${ROOM_PREFIX}/${code}/players/${myUid}`), {
            uid: myUid, name: meta?.hostName || userPseudo,
            score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now(), status: 'active'
          });
        }
      }

      const allQuestions = [];
      for (const themeId of themeIds) {
        try {
          const response = await fetch(`/data/quiz/${themeId}.json`);
          const database = await response.json();
          if (database?.items?.length) allQuestions.push(...database.items);
        } catch (err) { console.warn(`Failed to load ${themeId}:`, err); }
      }

      if (allQuestions.length === 0) { toast.error('Erreur: Aucune question disponible'); return; }

      const unavailableSnap = await get(ref(db, 'unavailable_questions'));
      const unavailable = unavailableSnap.val() || {};
      const available = allQuestions.filter(q => !q.id || !unavailable[q.id]);

      const shuffled = [...(available.length > 0 ? available : allQuestions)];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let questionCount = 20;
      let activePlayers = [];

      if (isPartyMode) {
        activePlayers = [...players.filter(p => p.status !== 'left')];
        if (myUid && !activePlayers.find(p => p.uid === myUid)) {
          activePlayers.push({ uid: myUid, name: meta?.hostName || userPseudo, teamId: "" });
        }
        questionCount = calculatePartyModeQuestions(activePlayers.length);
      }

      const selectedQuestions = shuffled.slice(0, questionCount);

      let askerRotationFields = {};
      if (isPartyMode) {
        if (meta?.mode === 'équipes') {
          const teamIds = Object.keys(meta?.teams || {}).filter(teamId => {
            return activePlayers.filter(p => p.teamId === teamId).length > 0;
          });
          for (let i = teamIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
          }
          const firstTeamPlayers = activePlayers.filter(p => p.teamId === teamIds[0]);
          const firstAsker = firstTeamPlayers[Math.floor(Math.random() * firstTeamPlayers.length)];
          askerRotationFields = {
            askerRotation: teamIds, askerIndex: 0,
            currentAskerUid: firstAsker?.uid || null, currentAskerTeamId: teamIds[0] || null
          };
        } else {
          const shuffledPlayers = [...activePlayers];
          for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
          }
          const rotation = shuffledPlayers.map(p => p.uid);
          askerRotationFields = {
            askerRotation: rotation, askerIndex: 0,
            currentAskerUid: rotation[0] || null, currentAskerTeamId: null
          };
        }
      }

      await update(ref(db, `${ROOM_PREFIX}/${code}`), {
        'quiz': { id: themeIds.join('+'), title: categoryName, items: selectedQuestions },
        'state': {
          phase: "playing", currentIndex: 0, revealed: false, lockUid: null,
          buzzBanner: "", elapsedAcc: 0, lastRevealAt: 0, pausedAt: null, lockedAt: null,
          ...askerRotationFields
        }
      });
    } catch (error) {
      console.error('Erreur lors du lancement de la partie:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  const teamColors = ["#FF2D55", "#00D4FF", "#32FF7E", "#FFB800", "#BF5AF2", "#FF6B2C"];
  const teamNames = ["Team Blaze", "Team Frost", "Team Venom", "Team Solar"];

  const createTeamsForCount = (count) => {
    const newTeams = {};
    for (let i = 0; i < count; i++) {
      newTeams[`team${i + 1}`] = { name: teamNames[i], color: teamColors[i], score: 0 };
    }
    return newTeams;
  };

  const handleModeToggle = async () => {
    if (!isHost) return;
    const newMode = meta?.mode === "équipes" ? "individuel" : "équipes";
    if (newMode === "équipes" && (!teams || Object.keys(teams).length === 0)) {
      const count = meta?.teamCount || 2;
      const defaultTeams = createTeamsForCount(count);
      await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: newMode, teams: defaultTeams, teamCount: count });
    } else if (newMode === "individuel") {
      const updates = {};
      players.forEach(p => { updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/teamId`] = ""; });
      updates[`${ROOM_PREFIX}/${code}/meta/mode`] = newMode;
      updates[`${ROOM_PREFIX}/${code}/meta/teams`] = {};
      updates[`${ROOM_PREFIX}/${code}/meta/teamCount`] = 0;
      await update(ref(db), updates);
    } else {
      await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: newMode });
    }
  };

  const handleTeamCountChange = async (count) => {
    if (!isHost) return;
    const newTeams = createTeamsForCount(count);
    const updates = {};
    const validTeamIds = Object.keys(newTeams);
    players.forEach(p => {
      if (p.teamId && !validTeamIds.includes(p.teamId))
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/teamId`] = "";
    });
    updates[`${ROOM_PREFIX}/${code}/meta/teamCount`] = count;
    updates[`${ROOM_PREFIX}/${code}/meta/teams`] = newTeams;
    await update(ref(db), updates);
  };

  const handleQuizChange = async (selection) => {
    if (!isHost) return;
    await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { quizSelection: selection });
    setShowQuizSelector(false);
  };

  const handleAssignToTeam = async (playerUid, teamId) => {
    if (!isHost) return;
    await update(ref(db, `${ROOM_PREFIX}/${code}/players/${playerUid}`), { teamId });
  };

  const handleRemoveFromTeam = async (playerUid) => {
    if (!isHost) return;
    await update(ref(db, `${ROOM_PREFIX}/${code}/players/${playerUid}`), { teamId: "" });
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
      updates[`${ROOM_PREFIX}/${code}/players/${player.uid}/teamId`] = teamIds[index % teamIds.length];
    });
    await update(ref(db), updates);
  };

  const handleResetTeams = async () => {
    if (!isHost) return;
    const updates = {};
    players.forEach(p => { updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/teamId`] = ""; });
    await update(ref(db), updates);
  };

  const handleHostExit = async () => {
    if (isHost) await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { closed: true });
    router.push('/home');
  };

  const handlePlayerExit = async () => {
    markVoluntaryLeave();
    await leaveRoom();
    router.push('/home');
  };

  // ── Derived state ──
  const quizSelection = meta?.quizSelection;
  const hasSelection = quizSelection?.themeIds?.length > 0;
  const selectedThemeNames = quizSelection?.themes?.map(t => t.title).join(', ') || '';
  const totalQuestions = quizSelection?.themes?.reduce((sum, t) => sum + t.questionCount, 0) || 0;
  const canStart = isHost && hasSelection;
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : <Users size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : 'Choisis un quiz';

  // ── Loading ──
  if (!meta) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#04060f', alignItems: 'center', justifyContent: 'center', gap: '14px',
      }}>
        <div style={{
          width: 30, height: 30,
          border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: '#5a5a72', fontSize: '0.85rem' }}>Chargement...</p>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render ──
  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>

      {/* ── Background layers ── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.09) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* ── Modals ── */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} contentType="quiz" contentName={lockedQuizName} />
      <QuizSelectorModal
        isOpen={showQuizSelector} onClose={() => setShowQuizSelector(false)}
        categories={categories} currentSelection={meta?.quizSelection || null}
        onSelectQuiz={handleQuizChange} userIsPro={userIsPro}
      />
      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining}
        onRejoin={attemptRejoin} onGoHome={() => router.push('/home')}
        error={rejoinError} gameColor={ACCENT}
      />

      {/* ── Countdown ── */}
      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => {
              if (meta?.gameMasterMode === 'party') router.push(`/game/${code}/play`);
              else if (isHost) router.push(`/game/${code}/host`);
              else router.push(`/game/${code}/play`);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader
          ref={shareModalRef} variant="quiz" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit}
          joinUrl={joinUrl} gameMode={meta?.gameMasterMode}
        />
      </div>

      {/* ── Main content ── */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '16px 16px 8px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>

        {/* ── Settings panel (host) ── */}
        <AnimatePresence>
          {isHost && (
            <LayoutGroup>
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: 'rgba(8,14,32,0.92)',
                  border: '1px solid rgba(139,92,246,0.12)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {/* Quiz selector row */}
                <motion.div
                  onClick={() => setShowQuizSelector(true)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '12px',
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    cursor: 'pointer', marginBottom: '14px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>
                    {quizSelection?.categoryEmoji || '🧠'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700, color: '#eef2ff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {quizSelection?.categoryName || 'Choisis un quiz'}
                    </div>
                    {hasSelection && (
                      <div style={{
                        fontSize: '0.65rem', fontWeight: 600,
                        color: 'rgba(139,92,246,0.6)', marginTop: '2px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {selectedThemeNames} &bull; {totalQuestions} questions
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                  }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, color: ACCENT,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {hasSelection ? 'Changer' : 'Choisir'}
                    </span>
                    <CaretRight size={14} weight="bold" color={ACCENT} />
                  </div>
                </motion.div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Mode segmented control */}
                <div style={{
                  position: 'relative', display: 'flex',
                  borderRadius: '12px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(238,242,255,0.07)',
                  padding: '4px', gap: '4px',
                }}>
                  {[
                    { val: 'individuel', label: 'Solo', icon: <Lightning size={14} weight="bold" /> },
                    { val: 'équipes', label: 'Équipes', icon: <UsersThree size={14} weight="bold" /> },
                  ].map(({ val, label, icon }) => {
                    const active = meta?.mode === val;
                    return (
                      <motion.button
                        key={val}
                        onClick={handleModeToggle}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1, position: 'relative', zIndex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '7px', padding: '10px 12px', borderRadius: '9px',
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          transition: 'color 0.2s ease, text-shadow 0.2s ease',
                          color: active ? ACCENT : 'rgba(238,242,255,0.4)',
                          fontSize: '0.82rem', fontWeight: 700,
                          textShadow: active ? '0 0 12px rgba(139,92,246,0.5)' : 'none',
                        }}
                      >
                        {active && (
                          <motion.div
                            layoutId="mode-pill"
                            style={{
                              position: 'absolute', inset: 0, borderRadius: '9px',
                              background: 'rgba(139,92,246,0.1)',
                              border: '1px solid rgba(139,92,246,0.3)',
                              zIndex: -1,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        {icon}
                        {label}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Team count selector */}
                <AnimatePresence>
                  {meta?.mode === 'équipes' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{
                          fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                        }}>
                          Nombre d'équipes
                        </span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {[2, 3, 4].map(count => {
                            const active = (meta?.teamCount || 2) === count;
                            return (
                              <motion.button
                                key={count}
                                onClick={() => handleTeamCountChange(count)}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.92 }}
                                style={{
                                  position: 'relative', width: '42px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '7px 0', borderRadius: '10px',
                                  border: active ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(238,242,255,0.08)',
                                  background: active ? 'rgba(139,92,246,0.1)' : 'rgba(238,242,255,0.03)',
                                  cursor: 'pointer', overflow: 'hidden',
                                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                                  fontSize: '1rem', lineHeight: 1,
                                  color: active ? ACCENT : 'rgba(238,242,255,0.5)',
                                  textShadow: active ? '0 0 10px rgba(139,92,246,0.55)' : 'none',
                                  transition: 'border-color 0.15s ease, background 0.15s ease, color 0.15s ease',
                                }}
                              >
                                {count}
                                {active && (
                                  <motion.div
                                    layoutId="team-count-bar"
                                    style={{
                                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px',
                                      background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)',
                                      boxShadow: '0 0 4px rgba(139,92,246,0.35)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          )}
        </AnimatePresence>

        {/* ── Settings display (player) ── */}
        {!isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'rgba(8,14,32,0.92)',
              border: '1px solid rgba(139,92,246,0.12)',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
                {quizSelection?.categoryEmoji || '🧠'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 700, color: '#ffffff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {quizSelection?.categoryName || 'Quiz en attente'}
                </div>
                {hasSelection && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(238,242,255,0.35)' }}>
                    {totalQuestions} questions
                  </span>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.85rem', fontWeight: 700, color: 'rgba(238,242,255,0.6)',
              flexShrink: 0,
            }}>
              {meta?.mode === 'équipes'
                ? <><UsersThree size={14} weight="bold" /> Équipes</>
                : <><Lightning size={14} weight="bold" /> Solo</>
              }
            </div>
          </motion.div>
        )}

        {/* ── Team management (host, team mode) ── */}
        {isHost && meta?.mode === 'équipes' && (
          <div style={{
            background: 'rgba(8,14,32,0.92)',
            border: '1px solid rgba(139,92,246,0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
            boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            flexShrink: 0,
          }}>
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

        {/* ── Player team view ── */}
        {!isHost && meta?.mode === 'équipes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* My Team Banner */}
            {players.find(p => p.uid === myUid)?.teamId ? (
              <div className="my-team-banner" style={{
                '--team-color': teams[players.find(p => p.uid === myUid)?.teamId]?.color
              }}>
                <div className="banner-glow" />
                <span className="banner-label">Ton équipe</span>
                <span className="banner-team-name">
                  {teams[players.find(p => p.uid === myUid)?.teamId]?.name}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 16px',
                background: 'rgba(238,242,255,0.04)',
                border: '1px solid rgba(238,242,255,0.07)',
                borderRadius: '14px',
              }}>
                <span style={{ fontSize: '1.1rem' }}>&#x23F3;</span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.45)', fontWeight: 600 }}>
                  L'hôte va t'assigner à une équipe...
                </span>
              </div>
            )}

            {/* Teams Grid */}
            <div className={`teams-grid-player teams-${meta?.teamCount || 2}`}>
              {Object.entries(teams).slice(0, meta?.teamCount || 2).map(([id, team]) => {
                const teamPlayers = players.filter(p => p.teamId === id);
                const isMyTeam = players.find(p => p.uid === myUid)?.teamId === id;
                return (
                  <div key={id} className={`team-card-player ${isMyTeam ? 'my-team' : ''}`}
                    style={{ '--team-color': team.color }}>
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
                          <span key={player.uid}
                            className={`player-tag ${player.uid === myUid ? 'is-me' : ''}`}>
                            {player.uid === myUid && '👤 '}{player.name}
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
          </div>
        )}

        {/* ── Players section (solo mode) ── */}
        {meta?.mode !== 'équipes' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.13em', color: 'rgba(238,242,255,0.35)',
                  textTransform: 'uppercase',
                }}>Joueurs</span>
                <div style={{
                  padding: '2px 9px',
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '6px',
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.7rem', color: ACCENT, letterSpacing: '0.04em',
                }}>{players.length}</div>
              </div>
            </div>

            {/* Hint callouts */}
            <AnimatePresence initial={false}>
              {isHost && !canStart && (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }}
                  exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.12)',
                    borderRadius: '12px',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                      background: 'rgba(139,92,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Info size={13} color={`${ACCENT}cc`} weight="bold" />
                    </div>
                    <span style={{
                      fontSize: '0.78rem', color: `${ACCENT}cc`, fontWeight: 600, lineHeight: 1.3,
                    }}>
                      {!hasSelection
                        ? 'Sélectionne un quiz pour pouvoir lancer la partie'
                        : 'En attente de joueurs...'
                      }
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player view hint */}
            {!isHost && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 12px',
                  background: 'rgba(238,242,255,0.04)',
                  border: '1px solid rgba(238,242,255,0.07)',
                  borderRadius: '10px',
                  marginBottom: '12px', flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.9rem' }}>&#x23F3;</span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.45)', fontWeight: 600 }}>
                  En attente que l'hôte démarre la partie…
                </span>
              </motion.div>
            )}

            {/* Players list */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              <div
                ref={listRef}
                onScroll={checkScroll}
                style={{
                  height: '100%', overflowY: 'auto', overflowX: 'visible',
                  WebkitOverflowScrolling: 'touch',
                  display: 'flex', flexDirection: 'column', gap: '0px',
                }}
              >
                {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                  <motion.div
                    key={player.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    style={{ overflow: 'visible' }}
                  >
                    <PlayerBanner
                      player={player}
                      isMe={player.uid === myUid}
                      accentColor={ACCENT}
                      accentDark={ACCENT_DARK}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Scroll fade + chevron */}
              <AnimatePresence>
                {canScrollDown && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: '56px',
                      background: 'linear-gradient(to bottom, transparent, rgba(4,6,15,0.96))',
                      pointerEvents: 'none',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      paddingBottom: '4px', zIndex: 2,
                    }}
                  >
                    <motion.div
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ color: `${ACCENT}66` }}
                    >
                      <CaretDown size={14} weight="bold" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(238,242,255,0.05)',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: '10px',
        background: 'rgba(4,6,15,0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        {isHost && (
          <LobbyStartButton
            gameColor={ACCENT}
            icon={startIcon}
            label={startLabel}
            disabled={!canStart}
            onClick={handleStartGame}
          />
        )}

        {!isHost && (
          <div style={{
            padding: '14px',
            background: 'rgba(238,242,255,0.03)',
            border: '1px solid rgba(238,242,255,0.07)',
            borderRadius: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(238,242,255,0.35)', fontWeight: 600 }}>
              Partage le code pour inviter des amis
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Room() {
  const { code } = useParams();
  return <QuizLobbyContent code={code} />;
}
