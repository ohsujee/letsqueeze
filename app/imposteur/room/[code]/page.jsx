"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, set,
  signInAnonymously, onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import LobbyStartButton from '@/components/game/LobbyStartButton';
import { GameLaunchCountdown } from "@/components/transitions";
import LobbyHeader from "@/components/game/LobbyHeader";
import PlayerBanner from "@/components/game/PlayerBanner";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { useHearts } from "@/lib/hooks/useHearts";
import { useHeartsLobbyGuard } from "@/lib/hooks/useHeartsLobbyGuard";
import HeartsModal from "@/components/ui/HeartsModal";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { usePresence } from "@/lib/hooks/usePresence";
import LobbyDisconnectAlert from "@/components/game/LobbyDisconnectAlert";
import { useToast } from "@/lib/hooks/useToast";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import { ArrowRight, Users, Info, CaretDown } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { getRandomWordPair } from "@/data/imposteur-words";
import ImposteurSettingsPanel from './_components/ImposteurSettingsPanel';
import './imposteur-lobby.css';

const ACCENT = '#84cc16';
const ACCENT_DARK = '#65a30d';
const ROOM_PREFIX = 'rooms_imposteur';

function distributeRoles(playerUids, mrWhiteEnabled, customNbImposteurs = 1) {
  const shuffled = [...playerUids].sort(() => Math.random() - 0.5);
  const count = shuffled.length;
  const nbMrWhite = mrWhiteEnabled ? 1 : 0;
  const maxImposteurs = Math.max(1, count - nbMrWhite - 2);
  const nbUndercover = Math.min(customNbImposteurs, maxImposteurs);
  const undercover = shuffled.slice(0, nbUndercover);
  const mrwhite = shuffled.slice(nbUndercover, nbUndercover + nbMrWhite);
  const civilians = shuffled.slice(nbUndercover + nbMrWhite);
  return { undercover, mrwhite, civilians };
}

export default function ImposteurLobby() {
  const { code } = useParams();
  return <ImposteurLobbyContent code={code} />;
}

export function ImposteurLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  useAppShellBg('#04060f');

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [myUid, setMyUid] = useState(devUid || null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostJoined, setHostJoined] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const isHostRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Settings
  const [totalRounds, setTotalRounds] = useState(1);
  const [nbImposteurs, setNbImposteurs] = useState(1);
  const [mrWhiteEnabled, setMrWhiteEnabled] = useState(false);
  const [clueMode, setClueMode] = useState('oral');
  const [descriptionTimer, setDescriptionTimer] = useState(30);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

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
    if (devUid) {
      if (devIsHost) { setIsHost(true); isHostRef.current = true; }
      setHostJoined(players.some(p => p.uid === devUid));
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setMyUid(user.uid);
        const host = meta?.hostUid === user.uid;
        setIsHost(host);
        isHostRef.current = host;
        setHostJoined(players.some(p => p.uid === user.uid));
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid, players, devUid, devIsHost]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, skipKickRedirect: true, enabled: !devUid });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });
  usePresence({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid && !devUid });

  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    phase: 'lobby', playerName: userPseudo,
    getPlayerData: (uid, name) => ({
      uid, name, score: 0, alive: true, hasSeenRole: false,
      status: 'active', activityStatus: 'active', joinedAt: Date.now(),
    }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); },
  });

  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
        roomWasValidRef.current = true;
        if (!isHostRef.current) {
          if (m.settings?.totalRounds) setTotalRounds(m.settings.totalRounds);
          if (m.settings?.nbImposteurs) setNbImposteurs(m.settings.nbImposteurs);
          if (m.settings?.mrWhiteEnabled !== undefined) setMrWhiteEnabled(m.settings.mrWhiteEnabled);
          if (m.settings?.clueMode) setClueMode(m.settings.clueMode);
          if (m.settings?.descriptionTimer) setDescriptionTimer(m.settings.descriptionTimer);
        }
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "roles" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code]);

  // Host auto-join
  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${uid}`), {
      uid, name: userPseudo, score: 0, alive: true, hasSeenRole: false,
      status: 'active', activityStatus: 'active', joinedAt: Date.now(),
    });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  const updateSetting = useCallback((key, value) => {
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { [key]: value });
  }, [isHost, code]);

  const handleTotalRoundsChange = (val) => { setTotalRounds(val); updateSetting('totalRounds', val); };
  const handleNbImposteursChange = (val) => { setNbImposteurs(val); updateSetting('nbImposteurs', val); };
  const handleMrWhiteToggle = () => { const next = !mrWhiteEnabled; setMrWhiteEnabled(next); updateSetting('mrWhiteEnabled', next); };
  const handleClueModeChange = (mode) => { setClueMode(mode); updateSetting('clueMode', mode); };
  const handleTimerChange = (val) => { setDescriptionTimer(val); updateSetting('descriptionTimer', val); };

  const handleStartGame = async () => {
    if (!isHost || players.length < 3) return;
    consumeHeart();
    try {
      const playerUids = players.map(p => p.uid);
      const actualNbImposteurs = meta?.settings?.nbImposteurs || nbImposteurs || 1;
      const { undercover, mrwhite, civilians } = distributeRoles(playerUids, mrWhiteEnabled && players.length >= 5, actualNbImposteurs);
      const wordPair = getRandomWordPair([]);
      if (!wordPair) { toast.error('Aucune paire de mots disponible'); return; }

      const updates = {};
      undercover.forEach(uid => { updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'undercover', word: wordPair.undercover }; });
      mrwhite.forEach(uid => { updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'mrwhite', word: null }; });
      civilians.forEach(uid => { updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'civilian', word: wordPair.civilian }; });

      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/alive`] = true;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/hasSeenRole`] = false;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = p.score || 0;
      });

      const turnOrder = [...playerUids].sort(() => Math.random() - 0.5);
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'roles', currentRound: 1, currentSubRound: 1,
        turnOrder, currentTurnIndex: 0, currentTurnUid: turnOrder[0],
        wordPair: { civilian: wordPair.civilian, undercover: wordPair.undercover, pairId: wordPair.id },
        usedPairIds: [wordPair.id], eliminatedThisRound: [],
        winner: null, winReason: null,
        mrWhiteGuessing: false, mrWhiteGuess: null, mrWhiteGuessCorrect: null,
      };
      updates[`${ROOM_PREFIX}/${code}/descriptions`] = null;
      updates[`${ROOM_PREFIX}/${code}/votes`] = null;
      updates[`${ROOM_PREFIX}/${code}/revealedRoles`] = null;

      await update(ref(db), updates);
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  const handleHostExit = async () => {
    if (isHost) await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { closed: true });
    router.push('/home');
  };

  const handlePlayerExit = async () => {
    markVoluntaryLeave?.();
    await leaveRoom?.();
    router.push('/home');
  };

  const canStart = isHost && players.length >= 3;
  const canEnableMrWhite = players.length >= 5;
  const maxImposteurs = Math.max(1, players.length - 2);
  const startLabel = canStart ? 'Commencer' : players.length < 3 ? '3 joueurs minimum' : 'Commencer';
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : <Users size={20} weight="bold" />;

  if (!meta) {
    return (
      <div className="imp-lobby-loading">
        <div className="imp-lobby-spinner" />
        <p className="imp-lobby-loading-text">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="imp-lobby game-page">
      <div aria-hidden className="imp-lobby-bg">
        <div className="imp-lobby-bg-dots" />
        <div className="imp-lobby-bg-glow-top" />
        <div className="imp-lobby-bg-glow-bottom" />
      </div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown gameColor={ACCENT} onComplete={() => router.push(`/imposteur/game/${code}/play`)} />
        )}
      </AnimatePresence>

      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert
        isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining}
        onRejoin={attemptRejoin} onGoHome={() => router.push('/home')}
        error={rejoinError} gameColor={ACCENT}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader
          ref={shareModalRef} variant="imposteur" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl}
        />
      </div>

      <main className="imp-lobby-main">
        {/* Host settings */}
        <AnimatePresence>
          {isHost && (
            <ImposteurSettingsPanel
              totalRounds={totalRounds} nbImposteurs={nbImposteurs}
              mrWhiteEnabled={mrWhiteEnabled} clueMode={clueMode} descriptionTimer={descriptionTimer}
              canEnableMrWhite={canEnableMrWhite} maxImposteurs={maxImposteurs}
              onTotalRoundsChange={handleTotalRoundsChange} onNbImposteursChange={handleNbImposteursChange}
              onMrWhiteToggle={handleMrWhiteToggle} onClueModeChange={handleClueModeChange}
              onTimerChange={handleTimerChange}
            />
          )}
        </AnimatePresence>

        {/* Player settings */}
        {!isHost && (
          <motion.div className="imp-settings-panel imp-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="imp-player-settings-info">🎯 {totalRounds} manche{totalRounds > 1 ? 's' : ''}</div>
            <div className="imp-player-settings-tags">
              {mrWhiteEnabled && <div className="imp-player-settings-tag">👻 Mr. White</div>}
              <div className="imp-player-settings-tag">{clueMode === 'oral' ? '🗣️ Oral' : '✏️ Écrit'}</div>
            </div>
          </motion.div>
        )}

        {/* Players */}
        <div className="imp-players-section">
          <div className="imp-players-header">
            <div className="imp-players-header-left">
              <span className="imp-players-label">Joueurs</span>
              <div className="imp-players-count">{players.length}</div>
            </div>
          </div>

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
                <div className="imp-hint-callout">
                  <div className="imp-hint-icon">
                    <Info size={13} color="rgba(163,230,53,0.8)" weight="bold" />
                  </div>
                  <span className="imp-hint-text">Il faut au moins 3 joueurs pour démarrer</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isHost && (
            <motion.div className="imp-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
              <span className="imp-player-hint-text">En attente que l'hôte démarre la partie…</span>
            </motion.div>
          )}

          <div className="imp-players-list-wrapper">
            <div ref={listRef} onScroll={checkScroll} className="imp-players-list">
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
                <motion.div className="imp-scroll-fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ color: 'rgba(132,204,22,0.4)' }}>
                    <CaretDown size={14} weight="bold" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="imp-lobby-footer">
        {isHost && (
          <LobbyStartButton gameColor={ACCENT} icon={startIcon} label={startLabel} disabled={!canStart} onClick={handleStartGame} />
        )}
        {!isHost && (
          <div className="imp-footer-player-card">
            <div className="imp-footer-player-text">Partage le code pour inviter des amis</div>
          </div>
        )}
      </div>
    </div>
  );
}
