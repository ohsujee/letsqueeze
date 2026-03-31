"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import { Users, Shuffle, Microphone, Keyboard, ArrowRight, Info, CaretDown, ShieldStar, Clock } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import MindLinkSettingsPanel from './_components/MindLinkSettingsPanel';
import './mindlink-lobby.css';

const ACCENT = '#ec4899';
const ACCENT_DARK = '#db2777';
const ROOM_PREFIX = 'rooms_mindlink';

export function MindLinkLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [isHost, setIsHost] = useState(devIsHost || false);
  const [myUid, setMyUid] = useState(devUid || null);
  const [joinUrl, setJoinUrl] = useState("");
  const [selectedDefenders, setSelectedDefenders] = useState([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const isHostRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const [mode, setMode] = useState('oral');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [nbDefenders, setNbDefenders] = useState(1);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  const hostJoined = myUid && players.some(p => p.uid === myUid);

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
  useEffect(() => { if (typeof window !== "undefined" && code) setJoinUrl(`${window.location.origin}/join?code=${code}`); }, [code]);

  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setMyUid(user.uid); const host = meta?.hostUid === user.uid; setIsHost(host); isHostRef.current = host; }
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [devUid, meta?.hostUid]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, skipKickRedirect: true, enabled: !devUid });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });
  usePresence({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid && !devUid });

  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    phase: 'lobby', playerName: userPseudo,
    getPlayerData: (uid, name) => ({ uid, name, score: 0, role: 'attacker', joinedAt: Date.now() }),
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
          if (m.nbDefenders) setNbDefenders(m.nbDefenders);
          if (m.selectedDefenders) setSelectedDefenders(m.selectedDefenders);
        }
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "choosing" && !countdownTriggeredRef.current) {
        countdownTriggeredRef.current = true;
        setShowCountdown(true);
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, router, players, myUid]);

  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${auth.currentUser.uid}`), {
      uid: auth.currentUser.uid, name: userPseudo, score: 0, role: 'attacker', joinedAt: Date.now()
    });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  useEffect(() => {
    if (players.length > 1) {
      const maxDef = players.length - 1;
      if (nbDefenders > maxDef) { setNbDefenders(maxDef); setSelectedDefenders(prev => prev.slice(0, maxDef)); }
    }
  }, [players.length, nbDefenders]);

  const maxDefenders = Math.max(1, players.length - 1);

  const toggleDefender = (uid) => {
    setSelectedDefenders(prev => {
      let next;
      if (prev.includes(uid)) next = prev.filter(id => id !== uid);
      else if (prev.length < nbDefenders) next = [...prev, uid];
      else next = [...prev.slice(1), uid];
      if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { selectedDefenders: next });
      return next;
    });
  };

  const handleRandomDefenders = () => {
    const next = [...players].sort(() => Math.random() - 0.5).slice(0, nbDefenders).map(p => p.uid);
    setSelectedDefenders(next);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { selectedDefenders: next });
  };

  const handleSetCount = (delta) => {
    const next = Math.max(1, Math.min(maxDefenders, nbDefenders + delta));
    setNbDefenders(next);
    const trimmed = selectedDefenders.slice(0, next);
    setSelectedDefenders(trimmed);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { nbDefenders: next, selectedDefenders: trimmed });
  };

  const handleModeChange = (newMode) => { setMode(newMode); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: newMode }); };
  const handleTimerChange = (newTimer) => { setTimerMinutes(newTimer); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { timerMinutes: newTimer }); };

  const handleStartGame = async () => {
    if (!isHost || selectedDefenders.length === 0) return;
    consumeHeart();
    try {
      const updates = {};
      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/role`] = selectedDefenders.includes(p.uid) ? 'defender' : 'attacker';
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = 0;
      });
      const wordChooserUid = selectedDefenders[Math.floor(Math.random() * selectedDefenders.length)];
      updates[`${ROOM_PREFIX}/${code}/meta/mode`] = mode;
      updates[`${ROOM_PREFIX}/${code}/meta/timerMinutes`] = timerMinutes;
      updates[`${ROOM_PREFIX}/${code}/meta/nbDefenders`] = nbDefenders;
      updates[`${ROOM_PREFIX}/${code}/meta/selectedDefenders`] = selectedDefenders;
      updates[`${ROOM_PREFIX}/${code}/meta/wordChooserUid`] = wordChooserUid;
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'choosing', secretWord: null, revealedLetters: 1, wordLength: 0,
        timerEndAt: null, timerPaused: false, timeLeftWhenPaused: null, penaltySeconds: 0,
        activeLink: null, linkHistory: [], wordGuess: null, winner: null, winReason: null,
      };
      await update(ref(db), updates);
    } catch (error) {
      console.error('Erreur lors du lancement:', error);
      toast.error('Erreur lors du lancement de la partie');
    }
  };

  const handleHostExit = async () => { if (isHost) await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { closed: true }); router.push('/home'); };
  const handlePlayerExit = async () => { markVoluntaryLeave?.(); await leaveRoom?.(); router.push('/home'); };

  const canStart = isHost && players.length >= 3 && selectedDefenders.length >= nbDefenders;
  const stillNeedDefenders = selectedDefenders.length < nbDefenders;
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : stillNeedDefenders ? <ShieldStar size={18} weight="bold" /> : <Users size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : stillNeedDefenders ? `Choisis ${nbDefenders - selectedDefenders.length} défenseur${nbDefenders - selectedDefenders.length > 1 ? 's' : ''}` : '3 joueurs minimum';

  if (!meta) {
    return (<div className="ml-lobby-loading"><div className="ml-lobby-spinner" /><p className="ml-lobby-loading-text">Chargement...</p></div>);
  }

  return (
    <div className="ml-lobby">
      <div aria-hidden className="ml-lobby-bg">
        <div className="ml-lobby-bg-dots" /><div className="ml-lobby-bg-glow-top" /><div className="ml-lobby-bg-glow-bottom" />
      </div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown gameColor={ACCENT} onComplete={() => {
            const myPlayer = players.find(p => p.uid === myUid);
            router.push(myPlayer?.role === 'defender' ? `/mindlink/game/${code}/defend` : `/mindlink/game/${code}/play`);
          }} />
        )}
      </AnimatePresence>

      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining} onRejoin={attemptRejoin} onGoHome={() => router.push('/home')} error={rejoinError} gameColor={ACCENT} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader ref={shareModalRef} variant="mindlink" code={code} isHost={isHost} players={players} hostUid={meta?.hostUid} onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl} />
      </div>

      <main className="ml-lobby-main">
        <AnimatePresence>
          {isHost && (
            <MindLinkSettingsPanel
              mode={mode} timerMinutes={timerMinutes} nbDefenders={nbDefenders} maxDefenders={maxDefenders}
              onModeChange={handleModeChange} onTimerChange={handleTimerChange} onSetCount={handleSetCount}
            />
          )}
        </AnimatePresence>

        {!isHost && (
          <motion.div className="ml-settings-panel ml-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="ml-player-settings-mode">
              {mode === 'oral' ? <Microphone size={14} weight="bold" /> : <Keyboard size={14} weight="bold" />}
              {mode === 'oral' ? 'Mode oral' : 'Mode écrit'}
            </div>
            <div className="ml-player-settings-timer"><Clock size={13} weight="bold" />{timerMinutes} min</div>
          </motion.div>
        )}

        <div className="ml-players-section">
          <div className="ml-players-header">
            <div className="ml-players-header-left">
              <span className="ml-players-label">Joueurs</span>
              <div className="ml-players-count">{players.length}</div>
            </div>
            {isHost && (
              <motion.button className="ml-random-btn" onClick={handleRandomDefenders} disabled={players.length < 2} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Shuffle size={12} weight="bold" /> Aléatoire
              </motion.button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {isHost && !canStart && (
              <motion.div key="hint" initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }} exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} style={{ overflow: 'hidden', flexShrink: 0 }}>
                <div className="ml-hint-callout">
                  <div className="ml-hint-icon"><Info size={13} color="rgba(236,72,153,0.8)" weight="bold" /></div>
                  <span className="ml-hint-text">
                    {stillNeedDefenders ? `Sélectionne ${nbDefenders - selectedDefenders.length} défenseur${nbDefenders - selectedDefenders.length > 1 ? 's' : ''} dans la liste` : 'Il faut au moins 3 joueurs pour démarrer'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isHost && (
            <motion.div className="ml-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
              <span className="ml-player-hint-text">En attente que l'hôte démarre la partie…</span>
            </motion.div>
          )}

          <div className="ml-players-list-wrapper">
            <div ref={listRef} onScroll={checkScroll} className="ml-players-list">
              {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                <motion.div key={player.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }} whileHover={isHost ? { y: -1, scale: 1.005 } : {}} whileTap={isHost ? { scale: 0.99 } : {}} style={{ overflow: 'visible', cursor: isHost ? 'pointer' : 'default' }}>
                  <PlayerBanner player={player} isMe={player.uid === myUid} isSelected={selectedDefenders.includes(player.uid)} selectedLabel="Défenseur" onSelect={isHost ? toggleDefender : null} accentColor={ACCENT} accentDark={ACCENT_DARK} />
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {canScrollDown && (
                <motion.div className="ml-scroll-fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ color: 'rgba(236,72,153,0.4)' }}>
                    <CaretDown size={14} weight="bold" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="ml-lobby-footer">
        {isHost && <LobbyStartButton gameColor={ACCENT} icon={startIcon} label={startLabel} disabled={!canStart} onClick={handleStartGame} />}
        {!isHost && (<div className="ml-footer-player-card"><div className="ml-footer-player-text">Partage le code pour inviter des amis</div></div>)}
      </div>
    </div>
  );
}

export default function MindLinkLobby() {
  const { code } = useParams();
  return <MindLinkLobbyContent code={code} />;
}
