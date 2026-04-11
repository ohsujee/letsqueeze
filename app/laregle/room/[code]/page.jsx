"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, update, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
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
import { Users, Shuffle, House, Globe, MagnifyingGlass, ArrowRight, Info, CaretDown, Clock } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { getRandomRulesForVoting } from "@/data/laregle-rules";
import LaRegleSettingsPanel from './_components/LaRegleSettingsPanel';
import './laregle-lobby.css';

const ROOM_PREFIX = 'rooms_laregle';
const ACCENT = '#00e5ff';
const ACCENT_DARK = '#00b8d9';

export function LaRegleLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  useAppShellBg('#04060f');
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [myUid, setMyUid] = useState(devUid || null);
  const [joinUrl, setJoinUrl] = useState("");
  const [hostJoined, setHostJoined] = useState(false);
  const [selectedInvestigators, setSelectedInvestigators] = useState([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const isHostRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const [mode, setMode] = useState('meme_piece');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [nbInvestigators, setNbInvestigators] = useState(1);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();
  const userPseudo = profile?.pseudo || currentUser?.displayName?.split(' ')[0] || 'Joueur';
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;
  const { consumeHeart, canPlay, heartsRemaining, canRecharge, rechargeHearts, isRecharging } = useHearts({ isPro: userIsPro });
  const { showHeartsModal, heartsModalProps } = useHeartsLobbyGuard({ isPro: userIsPro, canPlay, canRecharge, rechargeHearts, isRecharging });

  useATTPromptInLobby(isHost);

  const checkScroll = () => { const el = listRef.current; if (!el) return; setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8); };
  useEffect(() => { checkScroll(); }, [players.length]);
  useEffect(() => { if (typeof window !== "undefined" && code) setJoinUrl(`${window.location.origin}/join?code=${code}`); }, [code]);

  // Auth (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setMyUid(user.uid); const host = meta?.hostUid === user.uid; setIsHost(host); isHostRef.current = host; setHostJoined(players.some(p => p.uid === user.uid)); }
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [meta?.hostUid, players, devUid]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, skipKickRedirect: true });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: meta?.hostUid });
  usePresence({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid && !devUid });

  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    phase: 'lobby', playerName: userPseudo,
    getPlayerData: (uid, name) => ({ uid, name, score: 0, role: 'player', joinedAt: Date.now() }),
    onPlayerRemoved: () => { if (!isHost) setIsPlayerMissing(true); },
    onRejoinSuccess: () => { setIsPlayerMissing(false); setRejoinError(null); },
    onRejoinFailed: (err) => { setRejoinError(err?.message || 'Impossible de rejoindre'); },
  });

  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m); roomWasValidRef.current = true;
        if (!isHostRef.current) {
          if (m.mode) setMode(m.mode);
          if (m.timerMinutes) setTimerMinutes(m.timerMinutes);
          if (m.nbInvestigators) setNbInvestigators(m.nbInvestigators);
          if (m.selectedInvestigators) setSelectedInvestigators(m.selectedInvestigators);
        }
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "choosing" && !countdownTriggeredRef.current) { countdownTriggeredRef.current = true; setShowCountdown(true); }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, router, players, myUid]);

  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${auth.currentUser.uid}`), { uid: auth.currentUser.uid, name: userPseudo, score: 0, role: 'player', joinedAt: Date.now() });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  useEffect(() => {
    if (players.length > 1) { const maxInv = players.length - 1; if (nbInvestigators > maxInv) { setNbInvestigators(maxInv); setSelectedInvestigators(prev => prev.slice(0, maxInv)); } }
  }, [players.length, nbInvestigators]);

  const maxInvestigators = Math.max(1, players.length - 1);

  const toggleInvestigator = (uid) => {
    setSelectedInvestigators(prev => {
      let next;
      if (prev.includes(uid)) next = prev.filter(id => id !== uid);
      else if (prev.length < nbInvestigators) next = [...prev, uid];
      else next = [...prev.slice(1), uid];
      if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { selectedInvestigators: next });
      return next;
    });
  };

  const handleRandomInvestigators = () => {
    const next = [...players].sort(() => Math.random() - 0.5).slice(0, nbInvestigators).map(p => p.uid);
    setSelectedInvestigators(next);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { selectedInvestigators: next });
  };

  const handleSetCount = (delta) => {
    const next = Math.max(1, Math.min(maxInvestigators, nbInvestigators + delta));
    setNbInvestigators(next);
    const trimmed = selectedInvestigators.slice(0, next);
    setSelectedInvestigators(trimmed);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { nbInvestigators: next, selectedInvestigators: trimmed });
  };

  const handleModeChange = (v) => { setMode(v); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: v }); };
  const handleTimerChange = (v) => { setTimerMinutes(v); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { timerMinutes: v }); };

  const handleStartGame = async () => {
    if (!isHost || selectedInvestigators.length === 0) return;
    consumeHeart();
    try {
      const updates = {};
      players.forEach(p => { updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/role`] = selectedInvestigators.includes(p.uid) ? 'investigator' : 'player'; updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = 0; });
      updates[`${ROOM_PREFIX}/${code}/eliminations`] = null;
      updates[`${ROOM_PREFIX}/${code}/meta/mode`] = mode;
      updates[`${ROOM_PREFIX}/${code}/meta/timerMinutes`] = timerMinutes;
      const ruleOptions = getRandomRulesForVoting({ onlineOnly: mode === 'a_distance', excludeIds: [] });
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'choosing', investigatorUids: selectedInvestigators, currentRule: null,
        ruleOptions: ruleOptions.map(r => ({ id: r.id, text: r.text, category: r.category, difficulty: r.difficulty })),
        votes: {}, rerollsUsed: 0, guessAttempts: 0, guesses: [], roundNumber: 1,
      };
      await update(ref(db), updates);
    } catch (error) { console.error('Erreur:', error); toast.error('Erreur lors du lancement'); }
  };

  const handleHostExit = async () => { if (isHost) await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { closed: true }); router.push('/home'); };
  const handlePlayerExit = async () => { markVoluntaryLeave?.(); await leaveRoom?.(); router.push('/home'); };

  const canStart = isHost && players.length >= 2 && selectedInvestigators.length >= nbInvestigators;
  const stillNeedInvestigators = selectedInvestigators.length < nbInvestigators;
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : stillNeedInvestigators ? <MagnifyingGlass size={18} weight="bold" /> : <Users size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : stillNeedInvestigators ? `Choisis ${nbInvestigators - selectedInvestigators.length} enquêteur${nbInvestigators - selectedInvestigators.length > 1 ? 's' : ''}` : '2 joueurs minimum';

  if (!meta) return (<div className="lr-lobby-loading"><div className="lr-lobby-spinner" /><p className="lr-lobby-loading-text">Chargement...</p></div>);

  return (
    <div className="lr-lobby game-page">
      <div aria-hidden className="lr-lobby-bg"><div className="lr-lobby-bg-dots" /><div className="lr-lobby-bg-glow-top" /><div className="lr-lobby-bg-glow-bottom" /></div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown gameColor={ACCENT} onComplete={() => {
            const myPlayer = players.find(p => p.uid === myUid);
            router.push(myPlayer?.role === 'investigator' ? `/laregle/game/${code}/investigate` : `/laregle/game/${code}/play`);
          }} />
        )}
      </AnimatePresence>

      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining} onRejoin={attemptRejoin} onGoHome={() => router.push('/home')} error={rejoinError} gameColor={ACCENT} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader ref={shareModalRef} variant="laregle" code={code} isHost={isHost} players={players} hostUid={meta?.hostUid} onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl} />
      </div>

      <main className="lr-lobby-main">
        <AnimatePresence>
          {isHost && (
            <LaRegleSettingsPanel mode={mode} timerMinutes={timerMinutes} nbInvestigators={nbInvestigators} maxInvestigators={maxInvestigators} onModeChange={handleModeChange} onTimerChange={handleTimerChange} onSetCount={handleSetCount} />
          )}
        </AnimatePresence>

        {!isHost && (
          <motion.div className="lr-settings-panel lr-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="lr-player-settings-mode">{mode === 'meme_piece' ? <House size={14} weight="bold" /> : <Globe size={14} weight="bold" />}{mode === 'meme_piece' ? ' Même pièce' : ' À distance'}</div>
            <div className="lr-player-settings-timer"><Clock size={13} weight="bold" />{timerMinutes} min</div>
          </motion.div>
        )}

        <div className="lr-players-section">
          <div className="lr-players-header">
            <div className="lr-players-header-left">
              <span className="lr-players-label">Joueurs</span>
              <div className="lr-players-count">{players.length}</div>
            </div>
            {isHost && (
              <motion.button className="lr-random-btn" onClick={handleRandomInvestigators} disabled={players.length < 2} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Shuffle size={12} weight="bold" /> Aléatoire
              </motion.button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {isHost && !canStart && (
              <motion.div key="hint" initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }} exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} style={{ overflow: 'hidden', flexShrink: 0 }}>
                <div className="lr-hint-callout">
                  <div className="lr-hint-icon"><Info size={13} color="rgba(0,229,255,0.8)" weight="bold" /></div>
                  <span className="lr-hint-text">{stillNeedInvestigators ? `Sélectionne ${nbInvestigators - selectedInvestigators.length} enquêteur${nbInvestigators - selectedInvestigators.length > 1 ? 's' : ''} dans la liste` : 'Il faut au moins 2 joueurs pour démarrer'}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isHost && (
            <motion.div className="lr-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
              <span className="lr-player-hint-text">En attente que l'hôte démarre la partie…</span>
            </motion.div>
          )}

          <div className="lr-players-list-wrapper">
            <div ref={listRef} onScroll={checkScroll} className="lr-players-list">
              {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                <motion.div key={player.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }} whileHover={isHost ? { y: -1, scale: 1.005 } : {}} whileTap={isHost ? { scale: 0.99 } : {}} style={{ overflow: 'visible', cursor: isHost ? 'pointer' : 'default' }}>
                  <PlayerBanner player={player} isMe={player.uid === myUid} isSelected={selectedInvestigators.includes(player.uid)} selectedLabel="Enquêteur" onSelect={isHost ? toggleInvestigator : null} accentColor={ACCENT} accentDark={ACCENT_DARK} />
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {canScrollDown && (
                <motion.div className="lr-scroll-fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ color: 'rgba(0,229,255,0.4)' }}><CaretDown size={14} weight="bold" /></motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="lr-lobby-footer">
        {isHost && <LobbyStartButton gameColor={ACCENT} icon={startIcon} label={startLabel} disabled={!canStart} onClick={handleStartGame} />}
        {!isHost && (<div className="lr-footer-player-card"><div className="lr-footer-player-text">Partage le code pour inviter des amis</div></div>)}
      </div>
    </div>
  );
}

export default function LaLoiLobby() {
  const { code } = useParams();
  return <LaRegleLobbyContent code={code} />;
}
