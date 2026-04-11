"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import { ArrowRight, Users, Info, CaretDown, ShieldStar, Skull, Clock } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import LolSettingsPanel from './_components/LolSettingsPanel';
import './lol-lobby.css';

const ACCENT = '#EF4444';
const ACCENT_DARK = '#DC2626';
const ROOM_PREFIX = 'rooms_lol';

export function LolLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
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
  const [showCountdown, setShowCountdown] = useState(false);
  const roomWasValidRef = useRef(false);
  const isHostRef = useRef(false);
  const countdownTriggeredRef = useRef(false);
  const [isPlayerMissing, setIsPlayerMissing] = useState(false);
  const [rejoinError, setRejoinError] = useState(null);
  const shareModalRef = useRef(null);
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const [duration, setDuration] = useState(30);
  const [eliminationMode, setEliminationMode] = useState('classique');

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

  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setMyUid(user.uid); const host = meta?.hostUid === user.uid; setIsHost(host); isHostRef.current = host; setHostJoined(players.some(p => p.uid === user.uid)); }
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [devUid, meta?.hostUid, players]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, skipKickRedirect: true, enabled: !devUid });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });
  usePresence({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, heartbeatInterval: 15000, enabled: !!myUid && !devUid });

  const { leaveRoom, markVoluntaryLeave, attemptRejoin, isRejoining } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
    phase: 'lobby', playerName: userPseudo,
    getPlayerData: (uid, name) => ({
      uid, name, status: 'active', activityStatus: 'active', joinedAt: Date.now(),
      yellowCards: 0, redCard: false, jokersRemaining: 1,
      accusationsMade: 0, accusationsReceived: 0, jokersPlayed: 0,
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
        setMeta(m); roomWasValidRef.current = true;
        if (!isHostRef.current) {
          if (m.settings?.duration) setDuration(m.settings.duration);
          if (m.settings?.eliminationMode) setEliminationMode(m.settings.eliminationMode);
        }
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "playing" && !countdownTriggeredRef.current) { countdownTriggeredRef.current = true; setShowCountdown(true); }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code]);

  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${uid}`), {
      uid, name: userPseudo, status: 'active', activityStatus: 'active', joinedAt: Date.now(),
      yellowCards: 0, redCard: false, jokersRemaining: 1,
      accusationsMade: 0, accusationsReceived: 0, jokersPlayed: 0,
    });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  const handleDurationChange = (v) => { setDuration(v); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { duration: v }); };
  const handleEliminationChange = (v) => { setEliminationMode(v); if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { eliminationMode: v }); };

  const handleStartGame = async () => {
    if (!isHost || players.length < 2) return;
    consumeHeart();
    try {
      const now = Date.now();
      const updates = {};
      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/yellowCards`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/redCard`] = false;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/jokersRemaining`] = 1;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/status`] = 'active';
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/accusationsMade`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/accusationsReceived`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/jokersPlayed`] = 0;
      });
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'playing', startedAt: now, timerEndAt: now + duration * 60 * 1000,
        pausedAt: null, totalPausedMs: 0, currentVote: null, currentJoker: null,
        eliminationOrder: [], usedJokerIds: null,
      };
      updates[`${ROOM_PREFIX}/${code}/meta/isPro`] = userIsPro;
      await update(ref(db), updates);
    } catch (error) { console.error('Erreur:', error); toast.error('Erreur lors du lancement'); }
  };

  const handleHostExit = async () => { if (isHost) await update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { closed: true }); router.push('/home'); };
  const handlePlayerExit = async () => { markVoluntaryLeave?.(); await leaveRoom?.(); router.push('/home'); };

  const canStart = isHost && players.length >= 2;
  const startIcon = canStart ? <ArrowRight size={20} weight="bold" /> : <Users size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : '2 joueurs minimum';

  if (!meta) return (<div className="lol-lobby-loading"><div className="lol-lobby-spinner" /><p className="lol-lobby-loading-text">Chargement...</p></div>);

  return (
    <div className="lol-lobby game-page">
      <div aria-hidden className="lol-lobby-bg"><div className="lol-lobby-bg-dots" /><div className="lol-lobby-bg-glow-top" /><div className="lol-lobby-bg-glow-bottom" /></div>

      <AnimatePresence>
        {showCountdown && <GameLaunchCountdown gameColor={ACCENT} onComplete={() => router.push(`/lol/game/${code}/play`)} />}
      </AnimatePresence>

      <GuestAccountPromptModal currentUser={currentUser} isHost={isHost} />
      <HeartsModal isOpen={showHeartsModal} heartsRemaining={heartsRemaining} {...heartsModalProps} />
      <LobbyDisconnectAlert isVisible={isPlayerMissing && !isHost} isRejoining={isRejoining} onRejoin={attemptRejoin} onGoHome={() => router.push('/home')} error={rejoinError} gameColor={ACCENT} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <LobbyHeader ref={shareModalRef} variant="lol" code={code} isHost={isHost} players={players} hostUid={meta?.hostUid} onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl} />
      </div>

      <main className="lol-lobby-main">
        <AnimatePresence>
          {isHost && <LolSettingsPanel eliminationMode={eliminationMode} duration={duration} onEliminationChange={handleEliminationChange} onDurationChange={handleDurationChange} />}
        </AnimatePresence>

        {!isHost && (
          <motion.div className="lol-settings-panel lol-player-settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="lol-player-settings-info">
              <div className="lol-player-settings-mode">
                {eliminationMode === 'classique' ? <ShieldStar size={14} weight="bold" /> : <Skull size={14} weight="bold" />}
                {eliminationMode === 'classique' ? 'Classique' : 'Impitoyable'}
              </div>
              <span className="lol-player-settings-desc">{eliminationMode === 'classique' ? '2 cartons jaunes = éliminé' : '1 seul carton = éliminé'}</span>
            </div>
            <div className="lol-player-settings-timer"><Clock size={13} weight="bold" />{duration} min</div>
          </motion.div>
        )}

        <div className="lol-players-section">
          <div className="lol-players-header">
            <div className="lol-players-header-left">
              <span className="lol-players-label">Joueurs</span>
              <div className="lol-players-count">{players.length}</div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isHost && !canStart && (
              <motion.div key="hint" initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }} exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} style={{ overflow: 'hidden', flexShrink: 0 }}>
                <div className="lol-hint-callout">
                  <div className="lol-hint-icon"><Info size={13} color="rgba(239,68,68,0.8)" weight="bold" /></div>
                  <span className="lol-hint-text">Il faut au moins 2 joueurs pour lancer la partie</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isHost && (
            <motion.div className="lol-player-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
              <span className="lol-player-hint-text">En attente que l'hôte démarre la partie…</span>
            </motion.div>
          )}

          <div className="lol-players-list-wrapper">
            <div ref={listRef} onScroll={checkScroll} className="lol-players-list">
              {[...players].sort((a, b) => a.uid === myUid ? -1 : b.uid === myUid ? 1 : 0).map((player, index) => (
                <motion.div key={player.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.2 }} style={{ overflow: 'visible' }}>
                  <PlayerBanner player={player} isMe={player.uid === myUid} accentColor={ACCENT} accentDark={ACCENT_DARK} />
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {canScrollDown && (
                <motion.div className="lol-scroll-fade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <motion.div animate={{ y: [0, 3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ color: 'rgba(239,68,68,0.4)' }}><CaretDown size={14} weight="bold" /></motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="lol-lobby-footer">
        {isHost && <LobbyStartButton gameColor={ACCENT} icon={startIcon} label={startLabel} disabled={!canStart} onClick={handleStartGame} />}
        {!isHost && (<div className="lol-footer-player-card"><div className="lol-footer-player-text">Partage le code pour inviter des amis</div></div>)}
      </div>
    </div>
  );
}

export default function LolLobby() {
  const { code } = useParams();
  return <LolLobbyContent code={code} />;
}
