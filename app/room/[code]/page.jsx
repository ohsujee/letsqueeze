"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, remove, set, get,
  signInAnonymously, onAuthStateChanged,
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
import { motion, AnimatePresence } from "framer-motion";
import LobbyStartButton from "@/components/game/LobbyStartButton";
import { storage } from "@/lib/utils/storage";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { GameLaunchCountdown } from "@/components/transitions";
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { CaretDown, Info, Lightning, UsersThree, ArrowRight, Users } from '@phosphor-icons/react';
import { getFlatCSSVars, GAME_COLORS } from '@/lib/config/colors';
import HostSettingsPanel from './_components/HostSettingsPanel';
import './quiz-lobby.css';
import './quiz-lobby-globals.css';
import './quiz-selector-modal.css';
import './quiz-selector-v2.css';
import './team-tabs.css';

const ACCENT = GAME_COLORS.quiz.primary;
const ACCENT_DARK = GAME_COLORS.quiz.secondary;
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
    getQuizManifest().then(cats => setCategories(cats)).catch(() => setCategories([]));
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
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, phase: 'lobby',
    playerName: userPseudo, isHost,
    getPlayerData: (uid, name) => ({ uid, name, score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now() }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); },
  });

  const { markVoluntaryLeave } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    skipKickRedirect: true, enabled: !devUid,
  });

  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });

  useEffect(() => {
    if (!myUid || !code || devUid) return;
    update(ref(db), { [`${ROOM_PREFIX}/${code}/players/${myUid}/location`]: 'lobby' });
  }, [myUid, code, devUid]);

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

  // ── Handlers ──

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
          const teamIds = Object.keys(meta?.teams || {}).filter(teamId =>
            activePlayers.filter(p => p.teamId === teamId).length > 0
          );
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
    for (let i = 0; i < count; i++) newTeams[`team${i + 1}`] = { name: teamNames[i], color: teamColors[i], score: 0 };
    return newTeams;
  };

  const handleModeToggle = async () => {
    if (!isHost) return;
    const newMode = meta?.mode === "équipes" ? "individuel" : "équipes";
    if (newMode === "équipes" && (!teams || Object.keys(teams).length === 0)) {
      const count = meta?.teamCount || 2;
      await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: newMode, teams: createTeamsForCount(count), teamCount: count });
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
      <div className="quiz-lobby-loading">
        <div className="quiz-lobby-spinner" />
        <p className="quiz-lobby-loading-text">Chargement...</p>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="quiz-lobby" style={getFlatCSSVars('quiz')}>

      {/* Background — solid color via CSS */}

      {/* Modals */}
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

      {/* Countdown */}
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

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader
          ref={shareModalRef} variant="quiz" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit}
          joinUrl={joinUrl} gameMode={meta?.gameMasterMode}
        />
      </div>

      {/* Main content */}
      <main className="quiz-lobby-main">

        {/* Host settings panel */}
        <AnimatePresence>
          {isHost && (
            <HostSettingsPanel
              meta={meta}
              quizSelection={quizSelection}
              hasSelection={hasSelection}
              selectedThemeNames={selectedThemeNames}
              totalQuestions={totalQuestions}
              onOpenQuizSelector={() => setShowQuizSelector(true)}
              onModeToggle={handleModeToggle}
              onTeamCountChange={handleTeamCountChange}
            />
          )}
        </AnimatePresence>

        {/* Player settings (non-host) */}
        {!isHost && (
          <motion.div className="quiz-settings-panel quiz-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="quiz-player-settings-info">
              <span className="quiz-player-settings-emoji">{quizSelection?.categoryEmoji || '🧠'}</span>
              <div style={{ minWidth: 0 }}>
                <div className="quiz-player-settings-name">
                  {quizSelection?.categoryName || 'Quiz en attente'}
                </div>
                {hasSelection && (
                  <span className="quiz-player-settings-questions">{totalQuestions} questions</span>
                )}
              </div>
            </div>
            <div className="quiz-player-settings-mode">
              {meta?.mode === 'équipes'
                ? <><UsersThree size={14} weight="bold" /> Équipes</>
                : <><Lightning size={14} weight="bold" /> Solo</>
              }
            </div>
          </motion.div>
        )}

        {/* Team management (host, team mode) */}
        {isHost && meta?.mode === 'équipes' && (
          <div className="quiz-team-management">
            <TeamTabs
              teams={teams} players={players} teamCount={meta?.teamCount || 2}
              onAssignToTeam={handleAssignToTeam} onRemoveFromTeam={handleRemoveFromTeam}
              onAutoBalance={handleAutoBalance} onResetTeams={handleResetTeams}
            />
          </div>
        )}

        {/* Player team view (non-host) */}
        {!isHost && meta?.mode === 'équipes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {players.find(p => p.uid === myUid)?.teamId ? (
              <div className="my-team-banner" style={{ '--team-color': teams[players.find(p => p.uid === myUid)?.teamId]?.color }}>
                <div className="banner-glow" />
                <span className="banner-label">Ton équipe</span>
                <span className="banner-team-name">{teams[players.find(p => p.uid === myUid)?.teamId]?.name}</span>
              </div>
            ) : (
              <div className="quiz-no-team-banner">
                <span className="quiz-no-team-emoji">&#x23F3;</span>
                <span className="quiz-no-team-text">L'hôte va t'assigner à une équipe...</span>
              </div>
            )}
            <div className={`teams-grid-player teams-${meta?.teamCount || 2}`}>
              {Object.entries(teams).slice(0, meta?.teamCount || 2).map(([id, team]) => {
                const teamPlayers = players.filter(p => p.teamId === id);
                const isMyTeam = players.find(p => p.uid === myUid)?.teamId === id;
                return (
                  <div key={id} className={`team-card-player ${isMyTeam ? 'my-team' : ''}`} style={{ '--team-color': team.color }}>
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
                          <span key={player.uid} className={`player-tag ${player.uid === myUid ? 'is-me' : ''}`}>
                            {player.uid === myUid && '👤 '}{player.name}
                          </span>
                        ))
                      )}
                      {teamPlayers.length > 4 && <span className="player-tag more">+{teamPlayers.length - 4}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Players section (solo mode) */}
        {meta?.mode !== 'équipes' && (
          <div className="quiz-players-section">
            <div className="quiz-players-header">
              <div className="quiz-players-header-left">
                <span className="quiz-players-label">Joueurs</span>
                <div className="quiz-players-count">{players.length}</div>
              </div>
            </div>

            {/* Host hint */}
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
                  <div className="quiz-hint-callout">
                    <div className="quiz-hint-icon">
                      <Info size={13} color="rgba(139,92,246,0.8)" weight="bold" />
                    </div>
                    <span className="quiz-hint-text">
                      {!hasSelection ? 'Sélectionne un quiz pour pouvoir lancer la partie' : 'En attente de joueurs...'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player hint */}
            {!isHost && (
              <motion.div className="quiz-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <span className="quiz-player-hint-emoji">&#x23F3;</span>
                <span className="quiz-player-hint-text">En attente que l'hôte démarre la partie…</span>
              </motion.div>
            )}

            {/* Players list */}
            <div className="quiz-players-list-wrapper">
              <div ref={listRef} onScroll={checkScroll} className="quiz-players-list">
                {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                  <motion.div
                    key={player.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    style={{ overflow: 'visible' }}
                  >
                    <PlayerBanner player={player} isMe={player.uid === myUid} accentColor={ACCENT} accentDark={ACCENT_DARK} />
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {canScrollDown && (
                  <motion.div className="quiz-scroll-fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ color: 'rgba(139,92,246,0.4)' }}>
                      <CaretDown size={14} weight="bold" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="quiz-lobby-footer">
        {isHost && (
          <LobbyStartButton gameColor={ACCENT} icon={startIcon} label={startLabel} disabled={!canStart} onClick={handleStartGame} />
        )}
        {!isHost && (
          <div className="quiz-footer-player-card">
            <div className="quiz-footer-player-text">Partage le code pour inviter des amis</div>
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
