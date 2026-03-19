"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, set,
  signInAnonymously, onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { Users, Clock, Shuffle, Microphone, Keyboard, ArrowRight, Info, CaretDown, ShieldStar } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";

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

  // Settings
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

  // Listen to meta
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
        roomWasValidRef.current = true;
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

  // Host auto-join
  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${uid}`), { uid, name: userPseudo, score: 0, role: 'attacker', joinedAt: Date.now() });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  // Clamp defenders count when players leave
  useEffect(() => {
    if (players.length > 1) {
      const maxDef = players.length - 1;
      if (nbDefenders > maxDef) {
        setNbDefenders(maxDef);
        setSelectedDefenders(prev => prev.slice(0, maxDef));
      }
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
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const next = shuffled.slice(0, nbDefenders).map(p => p.uid);
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

  const handleStartGame = async () => {
    if (!isHost || selectedDefenders.length === 0) return;
    consumeHeart();
    try {
      const updates = {};

      // Assign roles
      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/role`] = selectedDefenders.includes(p.uid) ? 'defender' : 'attacker';
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = 0;
      });

      // Pick a random word chooser among defenders
      const wordChooserUid = selectedDefenders[Math.floor(Math.random() * selectedDefenders.length)];

      // Update meta
      updates[`${ROOM_PREFIX}/${code}/meta/mode`] = mode;
      updates[`${ROOM_PREFIX}/${code}/meta/timerMinutes`] = timerMinutes;
      updates[`${ROOM_PREFIX}/${code}/meta/nbDefenders`] = nbDefenders;
      updates[`${ROOM_PREFIX}/${code}/meta/selectedDefenders`] = selectedDefenders;
      updates[`${ROOM_PREFIX}/${code}/meta/wordChooserUid`] = wordChooserUid;

      // Set state to choosing
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'choosing',
        secretWord: null,
        revealedLetters: 1,
        wordLength: 0,
        timerEndAt: null,
        timerPaused: false,
        timeLeftWhenPaused: null,
        penaltySeconds: 0,
        activeLink: null,
        linkHistory: [],
        wordGuess: null,
        winner: null,
        winReason: null,
      };

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

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { mode: newMode });
  };

  const handleTimerChange = (newTimer) => {
    setTimerMinutes(newTimer);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta`), { timerMinutes: newTimer });
  };

  const canStart = isHost && players.length >= 3 && selectedDefenders.length >= nbDefenders;
  const stillNeedDefenders = selectedDefenders.length < nbDefenders;

  const startIcon = canStart
    ? <ArrowRight size={20} weight="bold" />
    : stillNeedDefenders
      ? <ShieldStar size={18} weight="bold" />
      : <Users size={20} weight="bold" />;
  const startLabel = canStart
    ? 'Commencer'
    : stillNeedDefenders
      ? `Choisis ${nbDefenders - selectedDefenders.length} défenseur${nbDefenders - selectedDefenders.length > 1 ? 's' : ''}`
      : '3 joueurs minimum';

  // Loading state
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
          backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.09) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(236,72,153,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => {
              const myPlayer = players.find(p => p.uid === myUid);
              router.push(myPlayer?.role === 'defender'
                ? `/mindlink/game/${code}/defend`
                : `/mindlink/game/${code}/play`
              );
            }}
          />
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
          ref={shareModalRef} variant="mindlink" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl}
        />
      </div>

      {/* ── Main content ── */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '16px 16px 8px',
        position: 'relative', zIndex: 1,
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
                  border: '1px solid rgba(236,72,153,0.12)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {/* Mode selector — Oral vs Écrit */}
                <div style={{
                  position: 'relative', display: 'flex',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(238,242,255,0.07)',
                  padding: '4px', gap: '4px',
                  marginBottom: '14px',
                }}>
                  {[
                    { val: 'oral', label: 'Oral', icon: <Microphone size={14} weight="bold" /> },
                    { val: 'ecrit', label: 'Écrit', icon: <Keyboard size={14} weight="bold" /> },
                  ].map(({ val, label, icon }) => {
                    const active = mode === val;
                    return (
                      <motion.button
                        key={val}
                        onClick={() => handleModeChange(val)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1, position: 'relative', zIndex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '7px', padding: '10px 12px', borderRadius: '9px',
                          border: 'none', background: 'transparent',
                          color: active ? ACCENT : 'rgba(238,242,255,0.4)',
                          fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          textShadow: active ? `0 0 12px ${ACCENT}80` : 'none',
                          transition: 'color 0.2s ease, text-shadow 0.2s ease',
                        }}
                      >
                        {active && (
                          <motion.div
                            layoutId="mode-pill"
                            style={{
                              position: 'absolute', inset: 0, borderRadius: '9px',
                              background: 'rgba(236,72,153,0.1)',
                              border: '1px solid rgba(236,72,153,0.3)',
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

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Timer stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '14px',
                }}>
                  <div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff', marginBottom: '2px',
                    }}>
                      <Clock size={13} weight="bold" color={ACCENT} />
                      Timer
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.35)' }}>
                      Temps pour trouver le mot
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      onClick={() => handleTimerChange(Math.max(2, timerMinutes - 1))}
                      disabled={timerMinutes <= 2}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: timerMinutes <= 2 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: timerMinutes <= 2 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >−</button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', minWidth: '50px', justifyContent: 'center' }}>
                      <span style={{
                        fontFamily: "var(--font-title, 'Bungee'), cursive",
                        fontSize: '1.4rem', color: ACCENT,
                        textShadow: `0 0 16px ${ACCENT}66`,
                      }}>{timerMinutes}</span>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: `${ACCENT}99`,
                        textTransform: 'uppercase',
                      }}>min</span>
                    </div>
                    <button
                      onClick={() => handleTimerChange(Math.min(20, timerMinutes + 1))}
                      disabled={timerMinutes >= 20}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: timerMinutes >= 20 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: timerMinutes >= 20 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >+</button>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Defenders stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff', marginBottom: '2px' }}>
                      Défenseurs
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.35)' }}>
                      Protègent le mot secret
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      onClick={() => handleSetCount(-1)}
                      disabled={nbDefenders <= 1}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: nbDefenders <= 1 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: nbDefenders <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >−</button>
                    <span style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1.4rem', color: ACCENT,
                      minWidth: '24px', textAlign: 'center',
                      textShadow: `0 0 16px ${ACCENT}66`,
                    }}>{nbDefenders}</span>
                    <button
                      onClick={() => handleSetCount(1)}
                      disabled={nbDefenders >= maxDefenders}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: nbDefenders >= maxDefenders ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: nbDefenders >= maxDefenders ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >+</button>
                  </div>
                </div>
              </motion.div>
            </LayoutGroup>
          )}
        </AnimatePresence>

        {/* Settings display (player view) */}
        {!isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'rgba(8,14,32,0.92)',
              border: '1px solid rgba(236,72,153,0.12)',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
              {mode === 'oral' ? <Microphone size={14} weight="bold" /> : <Keyboard size={14} weight="bold" />}
              {mode === 'oral' ? 'Mode oral' : 'Mode écrit'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(238,242,255,0.6)' }}>
              <Clock size={13} weight="bold" />
              {timerMinutes} min
            </div>
          </motion.div>
        )}

        {/* ── Players section ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.13em',
                color: 'rgba(238,242,255,0.35)',
                textTransform: 'uppercase',
              }}>Joueurs</span>
              <div style={{
                padding: '2px 9px',
                background: 'rgba(236,72,153,0.1)',
                border: '1px solid rgba(236,72,153,0.25)',
                borderRadius: '6px',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.7rem',
                color: ACCENT,
                letterSpacing: '0.04em',
              }}>{players.length}</div>
            </div>

            {isHost && (
              <motion.button
                onClick={handleRandomDefenders}
                disabled={players.length < 2}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', borderRadius: '8px',
                  border: '1px solid rgba(238,242,255,0.1)',
                  background: 'rgba(238,242,255,0.04)',
                  color: 'rgba(238,242,255,0.5)',
                  fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  letterSpacing: '0.04em',
                  opacity: players.length < 2 ? 0.3 : 1,
                }}
              >
                <Shuffle size={12} weight="bold" />
                Aléatoire
              </motion.button>
            )}
          </div>

          {/* Hint callout */}
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
                  background: 'rgba(236,72,153,0.06)',
                  border: '1px solid rgba(236,72,153,0.12)',
                  borderRadius: '12px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                    background: 'rgba(236,72,153,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info size={13} color={`${ACCENT}cc`} weight="bold" />
                  </div>
                  <span style={{
                    fontSize: '0.78rem', color: `${ACCENT}cc`, fontWeight: 600, lineHeight: 1.3,
                  }}>
                    {stillNeedDefenders
                      ? `Sélectionne ${nbDefenders - selectedDefenders.length} défenseur${nbDefenders - selectedDefenders.length > 1 ? 's' : ''} dans la liste`
                      : 'Il faut au moins 3 joueurs pour démarrer'}
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
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
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
                  whileHover={isHost ? { y: -1, scale: 1.005 } : {}}
                  whileTap={isHost ? { scale: 0.99 } : {}}
                  style={{ overflow: 'visible', cursor: isHost ? 'pointer' : 'default' }}
                >
                  <PlayerBanner
                    player={player}
                    isMe={player.uid === myUid}
                    isSelected={selectedDefenders.includes(player.uid)}
                    selectedLabel="Défenseur"
                    onSelect={isHost ? toggleDefender : null}
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

export default function MindLinkLobby() {
  const { code } = useParams();
  return <MindLinkLobbyContent code={code} />;
}
