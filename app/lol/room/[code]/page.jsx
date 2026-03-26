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
import { useATTPromptInLobby } from "@/lib/hooks/useATTPromptInLobby";
import { Clock, ArrowRight, Users, Info, CaretDown, ShieldStar, Skull } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";

const ACCENT = '#EF4444';
const ACCENT_DARK = '#DC2626';
const ROOM_PREFIX = 'rooms_lol';

export function LolLobbyContent({ code, myUid: devUid, isHost: devIsHost }) {
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

  // Settings
  const [duration, setDuration] = useState(30);
  const [eliminationMode, setEliminationMode] = useState('classique');

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
    if (devUid) return;
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

  // Listen to meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m && !m.closed) {
        setMeta(m);
        roomWasValidRef.current = true;
        if (!isHostRef.current) {
          if (m.settings?.duration) setDuration(m.settings.duration);
          if (m.settings?.eliminationMode) setEliminationMode(m.settings.eliminationMode);
        }
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
  }, [code]);

  // Host auto-join
  useEffect(() => {
    if (!isHost || !userPseudo || !auth.currentUser || hostJoined || profileLoading) return;
    const uid = auth.currentUser.uid;
    set(ref(db, `${ROOM_PREFIX}/${code}/players/${uid}`), {
      uid, name: userPseudo, status: 'active', activityStatus: 'active',
      joinedAt: Date.now(), yellowCards: 0, redCard: false, jokersRemaining: 1,
      accusationsMade: 0, accusationsReceived: 0, jokersPlayed: 0,
    });
  }, [isHost, userPseudo, hostJoined, code, profileLoading]);

  // Settings handlers
  const handleDurationChange = (newDuration) => {
    setDuration(newDuration);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { duration: newDuration });
  };

  const handleEliminationChange = (newMode) => {
    setEliminationMode(newMode);
    if (isHost && code) update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { eliminationMode: newMode });
  };

  const handleStartGame = async () => {
    if (!isHost || players.length < 2) return;
    consumeHeart();
    try {
      const now = Date.now();
      const durationMs = duration * 60 * 1000;
      const updates = {};

      // Reset all players
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
        phase: 'playing',
        startedAt: now,
        timerEndAt: now + durationMs,
        pausedAt: null,
        totalPausedMs: 0,
        currentVote: null,
        currentJoker: null,
        eliminationOrder: [],
      };

      // Store isPro for joker content gating
      updates[`${ROOM_PREFIX}/${code}/meta/isPro`] = userIsPro;

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

  const canStart = isHost && players.length >= 2;

  const startIcon = canStart
    ? <ArrowRight size={20} weight="bold" />
    : <Users size={20} weight="bold" />;
  const startLabel = canStart ? 'Commencer' : '2 joueurs minimum';

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
          backgroundImage: 'radial-gradient(circle, rgba(239,68,68,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.09) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(239,68,68,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => router.push(`/lol/game/${code}/play`)}
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
          ref={shareModalRef} variant="lol" code={code} isHost={isHost}
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
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {/* Elimination mode — segmented control */}
                <div style={{
                  position: 'relative', display: 'flex',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(238,242,255,0.07)',
                  padding: '4px', gap: '4px',
                  marginBottom: '14px',
                }}>
                  {[
                    { val: 'classique', label: 'Classique', desc: '2 cartons jaunes = éliminé', icon: <ShieldStar size={14} weight="bold" /> },
                    { val: 'severe', label: 'Impitoyable', desc: '1 seul carton = éliminé', icon: <Skull size={14} weight="bold" /> },
                  ].map(({ val, label, desc, icon }) => {
                    const active = eliminationMode === val;
                    return (
                      <motion.button
                        key={val}
                        onClick={() => handleEliminationChange(val)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1, position: 'relative', zIndex: 1,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '3px', padding: '10px 12px', borderRadius: '9px',
                          border: 'none', background: 'transparent',
                          cursor: 'pointer',
                          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                          transition: 'color 0.2s ease, text-shadow 0.2s ease',
                        }}
                      >
                        {active && (
                          <motion.div
                            layoutId="elim-pill"
                            style={{
                              position: 'absolute', inset: 0, borderRadius: '9px',
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              zIndex: -1,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          color: active ? ACCENT : 'rgba(238,242,255,0.4)',
                          fontSize: '0.82rem', fontWeight: 700,
                          textShadow: active ? `0 0 12px rgba(239,68,68,0.5)` : 'none',
                        }}>
                          {icon}
                          {label}
                        </div>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 600,
                          color: active ? 'rgba(239,68,68,0.55)' : 'rgba(238,242,255,0.25)',
                          transition: 'color 0.2s ease',
                        }}>
                          {desc}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Duration selector */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                  }}>
                    <Clock size={13} weight="bold" color={ACCENT} />
                    Durée
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      onClick={() => handleDurationChange(Math.max(5, duration - 5))}
                      disabled={duration <= 5}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: duration <= 5 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: duration <= 5 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >−</button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', minWidth: '50px', justifyContent: 'center' }}>
                      <span style={{
                        fontFamily: "var(--font-title, 'Bungee'), cursive",
                        fontSize: '1.4rem', color: ACCENT,
                        textShadow: `0 0 16px rgba(239,68,68,0.55)`,
                      }}>{duration}</span>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: 'rgba(239,68,68,0.7)',
                        textTransform: 'uppercase',
                      }}>min</span>
                    </div>
                    <button
                      onClick={() => handleDurationChange(Math.min(60, duration + 5))}
                      disabled={duration >= 60}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: duration >= 60 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: duration >= 60 ? 'not-allowed' : 'pointer',
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
              border: '1px solid rgba(239,68,68,0.12)',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                {eliminationMode === 'classique' ? <ShieldStar size={14} weight="bold" /> : <Skull size={14} weight="bold" />}
                {eliminationMode === 'classique' ? 'Classique' : 'Impitoyable'}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(238,242,255,0.35)' }}>
                {eliminationMode === 'classique' ? '2 cartons jaunes = éliminé' : '1 seul carton = éliminé'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'rgba(238,242,255,0.6)' }}>
              <Clock size={13} weight="bold" />
              {duration} min
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
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '6px',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.7rem',
                color: ACCENT,
                letterSpacing: '0.04em',
              }}>{players.length}</div>
            </div>
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
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: '12px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info size={13} color={`${ACCENT}cc`} weight="bold" />
                  </div>
                  <span style={{
                    fontSize: '0.78rem', color: `${ACCENT}cc`, fontWeight: 600, lineHeight: 1.3,
                  }}>
                    Il faut au moins 2 joueurs pour lancer la partie
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

export default function LolLobby() {
  const { code } = useParams();
  return <LolLobbyContent code={code} />;
}
