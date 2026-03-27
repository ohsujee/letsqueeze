"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { Clock, ArrowRight, Users, Info, CaretDown, Eye, EyeSlash, PencilSimple, SpeakerHigh } from '@phosphor-icons/react';
import GuestAccountPromptModal from "@/components/ui/GuestAccountPromptModal";
import { getRandomWordPair } from "@/data/imposteur-words";

const ACCENT = '#84cc16';
const ACCENT_DARK = '#65a30d';
const ACCENT_LIGHT = '#a3e635';

const ROOM_PREFIX = 'rooms_imposteur';

/**
 * Distributes roles based on player count
 * @returns {{ undercover: string[], mrwhite: string[], civilians: string[] }}
 */
function distributeRoles(playerUids, mrWhiteEnabled, customNbImposteurs = 1) {
  const shuffled = [...playerUids].sort(() => Math.random() - 0.5);
  const count = shuffled.length;
  const nbMrWhite = mrWhiteEnabled ? 1 : 0;

  // Ensure at least 2 civilians remain
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
      // In dev simulation, set host state from props
      if (devIsHost) {
        setIsHost(true);
        isHostRef.current = true;
      }
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

  // Listen to meta + state
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
    if (isHost && code) {
      update(ref(db, `${ROOM_PREFIX}/${code}/meta/settings`), { [key]: value });
    }
  }, [isHost, code]);

  const handleTotalRoundsChange = (val) => {
    setTotalRounds(val);
    updateSetting('totalRounds', val);
  };

  const handleNbImposteursChange = (val) => {
    setNbImposteurs(val);
    updateSetting('nbImposteurs', val);
  };

  const handleMrWhiteToggle = () => {
    const next = !mrWhiteEnabled;
    setMrWhiteEnabled(next);
    updateSetting('mrWhiteEnabled', next);
  };

  const handleClueModeChange = (mode) => {
    setClueMode(mode);
    updateSetting('clueMode', mode);
  };

  const handleTimerChange = (val) => {
    setDescriptionTimer(val);
    updateSetting('descriptionTimer', val);
  };

  const handleStartGame = async () => {
    if (!isHost || players.length < 3) return;
    consumeHeart();
    try {
      const playerUids = players.map(p => p.uid);
      // Read nbImposteurs from both local state and Firebase meta to be safe
      const actualNbImposteurs = meta?.settings?.nbImposteurs || nbImposteurs || 1;
      const { undercover, mrwhite, civilians } = distributeRoles(playerUids, mrWhiteEnabled && players.length >= 5, actualNbImposteurs);
      const wordPair = getRandomWordPair([]);

      if (!wordPair) {
        toast.error('Aucune paire de mots disponible');
        return;
      }

      const updates = {};

      // Write roles (restricted per-uid reads will be handled by Firebase rules)
      undercover.forEach(uid => {
        updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'undercover', word: wordPair.undercover };
      });
      mrwhite.forEach(uid => {
        updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'mrwhite', word: null };
      });
      civilians.forEach(uid => {
        updates[`${ROOM_PREFIX}/${code}/roles/${uid}`] = { role: 'civilian', word: wordPair.civilian };
      });

      // Reset player state
      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/alive`] = true;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/hasSeenRole`] = false;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = p.score || 0;
      });

      // Randomized turn order
      const turnOrder = [...playerUids].sort(() => Math.random() - 0.5);

      // Set game state
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'roles',
        currentRound: 1,
        currentSubRound: 1,
        turnOrder,
        currentTurnIndex: 0,
        currentTurnUid: turnOrder[0],
        wordPair: {
          civilian: wordPair.civilian,
          undercover: wordPair.undercover,
          pairId: wordPair.id,
        },
        usedPairIds: [wordPair.id],
        eliminatedThisRound: [],
        winner: null,
        winReason: null,
        mrWhiteGuessing: false,
        mrWhiteGuess: null,
        mrWhiteGuessCorrect: null,
      };

      // Clean previous round data
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

  const startLabel = canStart
    ? 'Commencer'
    : players.length < 3
      ? '3 joueurs minimum'
      : 'Commencer';

  const startIcon = canStart
    ? <ArrowRight size={20} weight="bold" />
    : <Users size={20} weight="bold" />;

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
          backgroundImage: 'radial-gradient(circle, rgba(132,204,22,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(132,204,22,0.09) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(132,204,22,0.05) 0%, transparent 70%)',
        }} />
      </div>

      <AnimatePresence>
        {showCountdown && (
          <GameLaunchCountdown
            gameColor={ACCENT}
            onComplete={() => {
              router.push(`/imposteur/game/${code}/play`);
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
          ref={shareModalRef} variant="imposteur" code={code} isHost={isHost}
          players={players} hostUid={meta?.hostUid}
          onHostExit={handleHostExit} onPlayerExit={handlePlayerExit} joinUrl={joinUrl}
        />
      </div>

      {/* ── Main content ── */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '16px 16px 8px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
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
                  border: `1px solid rgba(132,204,22,0.12)`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                  flexShrink: 0,
                }}
              >
                {/* Manches selector */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '14px',
                }}>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    🎯 Manches
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[1, 2, 3].map(val => {
                      const active = totalRounds === val;
                      return (
                        <motion.button
                          key={val}
                          onClick={() => handleTotalRoundsChange(val)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.92 }}
                          style={{
                            position: 'relative', width: '44px',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '1px', padding: '7px 0 8px',
                            borderRadius: '10px',
                            border: active ? `1px solid ${ACCENT}55` : '1px solid rgba(238,242,255,0.08)',
                            background: active ? 'rgba(132,204,22,0.1)' : 'rgba(238,242,255,0.03)',
                            cursor: 'pointer', overflow: 'hidden',
                            transition: 'border-color 0.15s ease, background 0.15s ease',
                          }}
                        >
                          <span style={{
                            fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '1rem', lineHeight: 1,
                            color: active ? ACCENT_LIGHT : 'rgba(238,242,255,0.5)',
                            textShadow: active ? `0 0 10px ${ACCENT}88` : 'none',
                            transition: 'color 0.15s ease, text-shadow 0.15s ease',
                          }}>{val}</span>
                          {active && (
                            <motion.div
                              layoutId="rounds-bar"
                              style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: '2px',
                                background: `linear-gradient(90deg, transparent, ${ACCENT}99, transparent)`,
                                boxShadow: `0 0 4px ${ACCENT}55`,
                              }}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Nombre d'imposteurs */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '14px',
                }}>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    🕵️ Imposteurs
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      onClick={() => handleNbImposteursChange(Math.max(1, nbImposteurs - 1))}
                      disabled={nbImposteurs <= 1}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: nbImposteurs <= 1 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: nbImposteurs <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >−</button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', minWidth: '30px', justifyContent: 'center' }}>
                      <span style={{
                        fontFamily: "var(--font-title, 'Bungee'), cursive",
                        fontSize: '1.4rem', color: ACCENT,
                        textShadow: `0 0 16px ${ACCENT}66`,
                      }}>{nbImposteurs}</span>
                    </div>
                    <button
                      onClick={() => handleNbImposteursChange(Math.min(Math.max(1, players.length - 2), nbImposteurs + 1))}
                      disabled={nbImposteurs >= Math.max(1, players.length - 2)}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        border: '1px solid rgba(238,242,255,0.1)',
                        background: 'rgba(238,242,255,0.06)',
                        color: nbImposteurs >= Math.max(1, players.length - 2) ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                        fontSize: '1.1rem', fontWeight: 300,
                        cursor: nbImposteurs >= Math.max(1, players.length - 2) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease', lineHeight: 1, paddingBottom: '1px',
                      }}
                    >+</button>
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Mr. White toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '14px',
                  opacity: canEnableMrWhite ? 1 : 0.4,
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👻 Mr. White
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.35)', marginTop: '2px' }}>
                      {canEnableMrWhite ? 'Un joueur sans mot qui doit bluffer' : '5 joueurs minimum'}
                    </div>
                  </div>
                  <motion.button
                    onClick={canEnableMrWhite ? handleMrWhiteToggle : undefined}
                    whileTap={canEnableMrWhite ? { scale: 0.9 } : {}}
                    style={{
                      width: '48px', height: '28px', borderRadius: '14px',
                      background: mrWhiteEnabled && canEnableMrWhite ? 'rgba(132,204,22,0.3)' : 'rgba(238,242,255,0.08)',
                      border: mrWhiteEnabled && canEnableMrWhite ? `1px solid ${ACCENT}55` : '1px solid rgba(238,242,255,0.1)',
                      cursor: canEnableMrWhite ? 'pointer' : 'not-allowed',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <motion.div
                      animate={{ x: mrWhiteEnabled && canEnableMrWhite ? 20 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: mrWhiteEnabled && canEnableMrWhite ? ACCENT_LIGHT : 'rgba(238,242,255,0.25)',
                        position: 'absolute', top: '2px',
                        boxShadow: mrWhiteEnabled && canEnableMrWhite ? `0 0 8px ${ACCENT}66` : 'none',
                      }}
                    />
                  </motion.button>
                </div>

                <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />

                {/* Clue mode — segmented control */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff', marginBottom: '10px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    💬 Mode indices
                  </div>
                  <div style={{
                    position: 'relative', display: 'flex',
                    borderRadius: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(238,242,255,0.07)',
                    padding: '4px', gap: '4px',
                  }}>
                    {[
                      { val: 'oral', label: 'Oral', icon: <SpeakerHigh size={14} weight="bold" /> },
                      { val: 'written', label: 'Écrit', icon: <PencilSimple size={14} weight="bold" /> },
                    ].map(({ val, label, icon }) => {
                      const active = clueMode === val;
                      return (
                        <motion.button
                          key={val}
                          onClick={() => handleClueModeChange(val)}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            flex: 1, position: 'relative', zIndex: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '7px', padding: '10px 12px', borderRadius: '9px',
                            border: 'none', background: 'transparent',
                            color: active ? ACCENT_LIGHT : 'rgba(238,242,255,0.4)',
                            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                            textShadow: active ? `0 0 12px ${ACCENT}80` : 'none',
                            transition: 'color 0.2s ease, text-shadow 0.2s ease',
                          }}
                        >
                          {active && (
                            <motion.div
                              layoutId="clue-pill"
                              style={{
                                position: 'absolute', inset: 0, borderRadius: '9px',
                                background: 'rgba(132,204,22,0.1)',
                                border: `1px solid ${ACCENT}4d`,
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
                </div>

                {/* Timer row — only for written mode */}
                <AnimatePresence>
                  {clueMode === 'written' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ height: '1px', background: 'rgba(238,242,255,0.05)', marginBottom: '14px' }} />
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                        }}>
                          <Clock size={13} weight="bold" color={ACCENT_LIGHT} />
                          Timer
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {[30, 45, 60, 0].map(secs => {
                            const active = descriptionTimer === secs;
                            const label = secs === 0 ? 'Off' : `${secs}s`;
                            return (
                              <motion.button
                                key={secs}
                                onClick={() => handleTimerChange(secs)}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.92 }}
                                style={{
                                  position: 'relative', minWidth: '40px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '7px 8px',
                                  borderRadius: '10px',
                                  border: active ? `1px solid ${ACCENT}55` : '1px solid rgba(238,242,255,0.08)',
                                  background: active ? 'rgba(132,204,22,0.1)' : 'rgba(238,242,255,0.03)',
                                  cursor: 'pointer', overflow: 'hidden',
                                  transition: 'border-color 0.15s ease, background 0.15s ease',
                                }}
                              >
                                <span style={{
                                  fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '0.75rem', lineHeight: 1,
                                  color: active ? ACCENT_LIGHT : 'rgba(238,242,255,0.5)',
                                  textShadow: active ? `0 0 10px ${ACCENT}88` : 'none',
                                  transition: 'color 0.15s ease, text-shadow 0.15s ease',
                                }}>{label}</span>
                                {active && (
                                  <motion.div
                                    layoutId="timer-bar"
                                    style={{
                                      position: 'absolute', bottom: 0, left: 0, right: 0,
                                      height: '2px',
                                      background: `linear-gradient(90deg, transparent, ${ACCENT}99, transparent)`,
                                      boxShadow: `0 0 4px ${ACCENT}55`,
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

        {/* Settings display (player view) */}
        {!isHost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'rgba(8,14,32,0.92)',
              border: `1px solid rgba(132,204,22,0.12)`,
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
              🎯 {totalRounds} manche{totalRounds > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {mrWhiteEnabled && (
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(238,242,255,0.6)' }}>
                  👻 Mr. White
                </div>
              )}
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(238,242,255,0.6)' }}>
                {clueMode === 'oral' ? '🗣️ Oral' : '✏️ Écrit'}
              </div>
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
                background: 'rgba(132,204,22,0.1)',
                border: `1px solid ${ACCENT}40`,
                borderRadius: '6px',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.7rem',
                color: ACCENT_LIGHT,
                letterSpacing: '0.04em',
              }}>{players.length}</div>
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
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(132,204,22,0.06)',
                  border: `1px solid rgba(132,204,22,0.12)`,
                  borderRadius: '12px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                    background: 'rgba(132,204,22,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Info size={13} color={`${ACCENT_LIGHT}cc`} weight="bold" />
                  </div>
                  <span style={{
                    fontSize: '0.78rem', color: `${ACCENT_LIGHT}cc`, fontWeight: 600, lineHeight: 1.3,
                  }}>
                    Il faut au moins 3 joueurs pour démarrer
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

// ImposteurLobbyContent is already exported as a named export above
