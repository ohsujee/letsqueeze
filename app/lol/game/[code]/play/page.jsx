"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, set, onValue, update, get,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import { useToast } from "@/lib/hooks/useToast";
import { Warning, HandPalm, Cards, Timer, X, Microphone, MaskHappy, UsersThree, ArrowLeft, Play, Lock } from "@phosphor-icons/react";
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { STANDUP_SCRIPTS } from "@/data/lol/standup";
import { SCENES } from "@/data/lol/scenes";
import { COLLECTIVE_GAMES } from "@/data/lol/collective";
import RenderSceneScript from "./RenderSceneScript";

const ACCENT = '#EF4444';
const ROOM_PREFIX = 'rooms_lol';
const VOTE_DURATION = 15000; // 15 seconds
const ACCUSATION_COOLDOWN = 30000; // 30 seconds

// (RenderSceneScript extracted to ./RenderSceneScript.jsx)
// Safe haptic helpers
const hapticImpact = async (style = ImpactStyle.Medium) => {
  try { await Haptics.impact({ style }); } catch {}
};
const hapticNotification = async (type = NotificationType.Warning) => {
  try { await Haptics.notification({ type }); } catch {}
};

export function LolPlayContent({ code, myUid: devUid }) {
  const realRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : realRouter;
  const toast = useToast();

  const [myUid, setMyUid] = useState(devUid || null);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [lastAccusationAt, setLastAccusationAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [voteTimeLeft, setVoteTimeLeft] = useState(null);
  const prevPhaseRef = useRef(null);

  // Joker states
  const [showJokerModal, setShowJokerModal] = useState(false);
  const [jokerTab, setJokerTab] = useState('standup'); // standup | scene | collective
  // jokerOptions removed — full catalog displayed directly from constants
  const [selectedJoker, setSelectedJoker] = useState(null);
  const [showPartnerSelect, setShowPartnerSelect] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState([]);
  // jokerTimeLeft removed — no timer on jokers
  const usedJokerIdsRef = useRef([]);
  const jokerModalRef = useRef(null);
  const jokerDragState = useRef({ isDragging: false, startY: 0 });

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
  });
  const { markActive } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, phase: 'playing',
  });
  useInactivityDetection({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, inactivityTimeout: 30000 });

  // Auth
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
    });
    return () => unsub();
  }, [devUid]);

  // Listen to meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        setMeta(m);
        if (myUid) setIsHost(m.hostUid === myUid);
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const s = snap.val();
      if (s) {
        setState(s);
        // Phase transitions
        if (s.phase === 'ended' && prevPhaseRef.current !== 'ended') {
          router.push(`/lol/game/${code}/end`);
        }
        if (s.phase === 'lobby' && prevPhaseRef.current && prevPhaseRef.current !== 'lobby') {
          router.push(`/lol/room/${code}`);
        }
        prevPhaseRef.current = s.phase;
      }
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, myUid, router]);

  // Global timer countdown
  useEffect(() => {
    if (!state?.timerEndAt || state?.phase === 'ended') return;

    const tick = () => {
      const now = Date.now();
      // If paused, show frozen time
      if (state.pausedAt) {
        setTimeLeft(Math.max(0, state.timerEndAt - state.pausedAt));
        return;
      }
      const remaining = Math.max(0, state.timerEndAt - now);
      setTimeLeft(remaining);

      // Auto-end: any client can trigger when timer hits 0
      if (remaining <= 0 && state.phase === 'playing') {
        update(ref(db, `${ROOM_PREFIX}/${code}/state`), { phase: 'ended', currentJoker: null, currentVote: null }).catch(() => {});
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [state?.timerEndAt, state?.pausedAt, state?.phase, code]);

  // Vote timer countdown
  useEffect(() => {
    if (!state?.currentVote?.expiresAt) { setVoteTimeLeft(null); return; }

    const tick = () => {
      const remaining = Math.max(0, state.currentVote.expiresAt - Date.now());
      setVoteTimeLeft(remaining);

      // Auto-resolve vote when timer expires
      if (remaining <= 0) {
        resolveVote();
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [state?.currentVote?.expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haptic when vote appears
  useEffect(() => {
    if (state?.currentVote) {
      hapticNotification(NotificationType.Warning);
    }
  }, [state?.currentVote?.accusedId]);

  const me = players.find(p => p.uid === myUid);
  const activePlayers = players.filter(p => p.status === 'active' && !p.redCard);
  const isEliminated = me?.redCard === true;
  const isAccused = state?.currentVote?.accusedId === myUid;
  const hasVoted = state?.currentVote?.votes?.[myUid] !== undefined;
  const currentVote = state?.currentVote;

  // Check if only 1 player left (victory)
  useEffect(() => {
    if (!state || state.phase !== 'playing') return;
    if (activePlayers.length <= 1 && players.length >= 2) {
      update(ref(db, `${ROOM_PREFIX}/${code}/state`), { phase: 'ended', currentJoker: null, currentVote: null }).catch(() => {});
    }
  }, [activePlayers.length, players.length, state?.phase, code]);

  // --- ACCUSATION ---
  const handleAccuse = useCallback(async (accusedUid) => {
    if (!myUid || !state || state.currentVote || state.phase !== 'playing') return;

    const now = Date.now();
    // Cooldown check (unless self-report)
    if (accusedUid !== myUid && now - lastAccusationAt < ACCUSATION_COOLDOWN) {
      const secondsLeft = Math.ceil((ACCUSATION_COOLDOWN - (now - lastAccusationAt)) / 1000);
      toast.error(`Attends ${secondsLeft}s avant d'accuser`);
      return;
    }

    // Self-report: direct card, no vote
    if (accusedUid === myUid) {
      hapticImpact(ImpactStyle.Heavy);
      const accused = players.find(p => p.uid === accusedUid);
      if (!accused) return;

      const newYellow = (accused.yellowCards || 0) + 1;
      const isRedCard = meta?.settings?.eliminationMode === 'severe' || newYellow >= 2;
      const updates = {};

      if (isRedCard) {
        updates[`${ROOM_PREFIX}/${code}/players/${accusedUid}/redCard`] = true;
        updates[`${ROOM_PREFIX}/${code}/players/${accusedUid}/status`] = 'eliminated';
        // Add to elimination order
        const currentOrder = state.eliminationOrder || [];
        updates[`${ROOM_PREFIX}/${code}/state/eliminationOrder`] = [...currentOrder, accusedUid];
      } else {
        updates[`${ROOM_PREFIX}/${code}/players/${accusedUid}/yellowCards`] = newYellow;
      }
      updates[`${ROOM_PREFIX}/${code}/players/${accusedUid}/accusationsReceived`] = (accused.accusationsReceived || 0) + 1;

      await update(ref(db), updates);
      toast.info('Tu t\'es accusé toi-même !');
      setShowAccuseModal(false);
      return;
    }

    // Normal accusation: start vote
    setLastAccusationAt(now);
    hapticImpact(ImpactStyle.Medium);

    const voteData = {
      accuserId: myUid,
      accusedId: accusedUid,
      startedAt: now,
      expiresAt: now + VOTE_DURATION,
      votes: { [myUid]: true }, // Accuser auto-votes YES
    };

    // Pause timer if playing
    const updates = {};
    updates[`${ROOM_PREFIX}/${code}/state/currentVote`] = voteData;
    if (state.phase === 'playing' && !state.pausedAt) {
      updates[`${ROOM_PREFIX}/${code}/state/pausedAt`] = now;
    }
    // If joker is active, pause it too
    if (state.currentJoker?.active) {
      updates[`${ROOM_PREFIX}/${code}/state/currentJoker/paused`] = true;
    }

    // Update accuser stats
    const accuser = players.find(p => p.uid === myUid);
    if (accuser) {
      updates[`${ROOM_PREFIX}/${code}/players/${myUid}/accusationsMade`] = (accuser.accusationsMade || 0) + 1;
    }

    await update(ref(db), updates);
    setShowAccuseModal(false);
  }, [myUid, state, lastAccusationAt, players, meta, code, toast]);

  // --- VOTE ---
  const handleVote = useCallback(async (vote) => {
    if (!myUid || !currentVote || hasVoted || isAccused) return;
    hapticImpact(ImpactStyle.Light);

    await set(ref(db, `${ROOM_PREFIX}/${code}/state/currentVote/votes/${myUid}`), vote);

    // Check if all eligible voters have voted -> resolve immediately
    const eligibleVoters = players.filter(p =>
      p.status === 'active' && !p.redCard && p.uid !== currentVote.accusedId
    );
    // We need fresh vote data, so let's let the effect handle it
  }, [myUid, currentVote, hasVoted, isAccused, players, code]);

  // --- RESOLVE VOTE ---
  const resolveVote = useCallback(async () => {
    if (!currentVote) return;

    // Get fresh vote data
    const voteSnap = await get(ref(db, `${ROOM_PREFIX}/${code}/state/currentVote`));
    const voteData = voteSnap.val();
    if (!voteData) return;

    const votes = voteData.votes || {};
    const yesCount = Object.values(votes).filter(v => v === true).length;
    const noCount = Object.values(votes).filter(v => v === false).length;
    const guilty = yesCount > noCount;

    const updates = {};
    updates[`${ROOM_PREFIX}/${code}/state/currentVote`] = null;

    if (guilty) {
      const accused = players.find(p => p.uid === voteData.accusedId);
      if (accused) {
        const newYellow = (accused.yellowCards || 0) + 1;
        const isRedCard = meta?.settings?.eliminationMode === 'severe' || newYellow >= 2;

        if (isRedCard) {
          updates[`${ROOM_PREFIX}/${code}/players/${voteData.accusedId}/redCard`] = true;
          updates[`${ROOM_PREFIX}/${code}/players/${voteData.accusedId}/status`] = 'eliminated';
          const currentOrder = state?.eliminationOrder || [];
          updates[`${ROOM_PREFIX}/${code}/state/eliminationOrder`] = [...currentOrder, voteData.accusedId];
          hapticNotification(NotificationType.Error);
        } else {
          updates[`${ROOM_PREFIX}/${code}/players/${voteData.accusedId}/yellowCards`] = newYellow;
          hapticNotification(NotificationType.Warning);
        }
        updates[`${ROOM_PREFIX}/${code}/players/${voteData.accusedId}/accusationsReceived`] = (accused.accusationsReceived || 0) + 1;
      }
    }

    // Resume timer
    if (state?.pausedAt) {
      const pausedDuration = Date.now() - state.pausedAt;
      updates[`${ROOM_PREFIX}/${code}/state/timerEndAt`] = (state.timerEndAt || 0) + pausedDuration;
      updates[`${ROOM_PREFIX}/${code}/state/totalPausedMs`] = (state.totalPausedMs || 0) + pausedDuration;
      updates[`${ROOM_PREFIX}/${code}/state/pausedAt`] = null;
    }

    // Resume joker if was paused
    if (state?.currentJoker?.paused) {
      updates[`${ROOM_PREFIX}/${code}/state/currentJoker/paused`] = false;
    }

    await update(ref(db), updates);
  }, [currentVote, players, meta, state, code]);

  // Auto-resolve when all eligible have voted
  useEffect(() => {
    if (!currentVote?.votes) return;
    const eligibleVoters = players.filter(p =>
      p.status === 'active' && !p.redCard && p.uid !== currentVote.accusedId
    );
    const votedCount = Object.keys(currentVote.votes).length;
    if (votedCount >= eligibleVoters.length) {
      resolveVote();
    }
  }, [currentVote?.votes, players]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haptic when joker starts
  useEffect(() => {
    if (state?.currentJoker?.active) {
      hapticImpact(ImpactStyle.Heavy);
    }
  }, [state?.currentJoker?.active]);

  // --- JOKER DRAG-TO-DISMISS ---
  const handleJokerDragDown = (e) => {
    jokerDragState.current = { isDragging: true, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleJokerDragMove = (e) => {
    if (!jokerDragState.current.isDragging) return;
    const dy = Math.max(0, e.clientY - jokerDragState.current.startY);
    if (jokerModalRef.current) {
      jokerModalRef.current.style.transition = 'none';
      jokerModalRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleJokerDragUp = (e) => {
    if (!jokerDragState.current.isDragging) return;
    jokerDragState.current.isDragging = false;
    const dy = Math.max(0, e.clientY - jokerDragState.current.startY);
    if (!jokerModalRef.current) return;
    if (dy > 100) {
      jokerModalRef.current.style.transition = 'transform 0.25s ease-in';
      jokerModalRef.current.style.transform = 'translateY(110%)';
      setTimeout(() => { setShowJokerModal(false); setSelectedJoker(null); }, 250);
    } else {
      jokerModalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      jokerModalRef.current.style.transform = 'translateY(0)';
    }
  };
  const handleJokerDragCancel = () => {
    if (!jokerDragState.current.isDragging) return;
    jokerDragState.current.isDragging = false;
    if (jokerModalRef.current) {
      jokerModalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      jokerModalRef.current.style.transform = 'translateY(0)';
    }
  };

  // --- JOKER OPEN ---
  // Used joker IDs from Firebase (shared across all players)
  const usedJokerIds = useMemo(() => {
    const raw = state?.usedJokerIds;
    const firebaseUsedIds = Array.isArray(raw) ? raw : raw ? Object.values(raw) : [];
    return new Set([...usedJokerIdsRef.current, ...firebaseUsedIds]);
  }, [state?.usedJokerIds]);

  const isPro = meta?.isPro === true;
  const activePCount = players.filter(p => !p.redCard || p.uid === myUid).length;

  const openJokerSelection = useCallback(() => {
    if (!me || me.jokersRemaining <= 0 || state?.currentVote || state?.currentJoker?.active) return;

    setJokerTab('standup');
    setSelectedJoker(null);
    setSelectedPartners([]);
    setShowPartnerSelect(false);
    setShowJokerModal(true);
    // Reset drag transform
    requestAnimationFrame(() => {
      if (jokerModalRef.current) {
        jokerModalRef.current.style.transition = '';
        jokerModalRef.current.style.transform = '';
      }
    });
  }, [me, state]);

  // --- JOKER SELECT ---
  const selectJokerContent = useCallback((content, type) => {
    // Block used or locked jokers
    if (usedJokerIds.has(content.id)) return;
    if (content.pro && !isPro) return;
    // Block scenes that need more players than available
    if (type === 'scene' && content.playerCount > activePCount) return;

    setSelectedJoker({ ...content, type });

    if (type === 'scene' && content.playerCount > 1) {
      setShowPartnerSelect(true);
      setSelectedPartners([]);
    } else {
      setShowPartnerSelect(false);
    }
  }, [usedJokerIds, isPro, activePCount]);

  // --- JOKER LAUNCH ---
  const launchJoker = useCallback(async () => {
    if (!selectedJoker || !myUid) return;

    const now = Date.now();

    const jokerData = {
      playerId: myUid,
      contentId: selectedJoker.id,
      contentType: selectedJoker.type,
      contentTitle: selectedJoker.title,
      startedAt: now,
      paused: false,
      active: true,
    };

    // Add selected players for scenes (shared script — everyone sees the same text)
    if (selectedJoker.type === 'scene' && selectedPartners.length > 0) {
      const selectedPlayersData = {};
      selectedJoker.roles?.forEach((role, idx) => {
        if (idx === 0) {
          selectedPlayersData[myUid] = { role: role.name, description: role.description || '' };
        } else if (selectedPartners[idx - 1]) {
          selectedPlayersData[selectedPartners[idx - 1]] = { role: role.name, description: role.description || '' };
        }
      });
      jokerData.selectedPlayers = selectedPlayersData;
    }

    const updates = {};
    updates[`${ROOM_PREFIX}/${code}/state/currentJoker`] = jokerData;

    // Pause main timer
    if (!state?.pausedAt) {
      updates[`${ROOM_PREFIX}/${code}/state/pausedAt`] = now;
    }

    // Decrement joker count
    updates[`${ROOM_PREFIX}/${code}/players/${myUid}/jokersRemaining`] = 0;
    updates[`${ROOM_PREFIX}/${code}/players/${myUid}/jokersPlayed`] = (me?.jokersPlayed || 0) + 1;

    usedJokerIdsRef.current.push(selectedJoker.id);

    // Deduplication: add to Firebase so other players exclude this joker
    const rawUsed = state?.usedJokerIds;
    const currentUsedIds = Array.isArray(rawUsed) ? rawUsed : rawUsed ? Object.values(rawUsed) : [];
    updates[`${ROOM_PREFIX}/${code}/state/usedJokerIds`] = [...currentUsedIds, selectedJoker.id];

    await update(ref(db), updates);
    hapticImpact(ImpactStyle.Heavy);
    setShowJokerModal(false);
    setSelectedJoker(null);
    setSelectedPartners([]);
  }, [selectedJoker, selectedPartners, myUid, me, state, code]);

  // --- JOKER END ---
  const endJoker = useCallback(async () => {
    if (!state?.currentJoker) return;

    const updates = {};
    updates[`${ROOM_PREFIX}/${code}/state/currentJoker`] = null;

    // Resume timer
    if (state?.pausedAt && !state?.currentVote) {
      const pausedDuration = Date.now() - state.pausedAt;
      updates[`${ROOM_PREFIX}/${code}/state/timerEndAt`] = (state.timerEndAt || 0) + pausedDuration;
      updates[`${ROOM_PREFIX}/${code}/state/totalPausedMs`] = (state.totalPausedMs || 0) + pausedDuration;
      updates[`${ROOM_PREFIX}/${code}/state/pausedAt`] = null;
    }

    await update(ref(db), updates);
  }, [state, code]);

  // Derived joker state
  const currentJoker = state?.currentJoker;
  const isJokerActive = currentJoker?.active === true;
  const isMyJoker = currentJoker?.playerId === myUid;
  const isMyPartnerInJoker = currentJoker?.selectedPlayers?.[myUid] !== undefined;
  const myJokerRole = currentJoker?.selectedPlayers?.[myUid];

  // Can I play a joker?
  const canPlayJoker = me && me.jokersRemaining > 0 && !currentVote && !isJokerActive && (state?.phase === 'playing' || isEliminated);

  // Haptic when you're accused
  useEffect(() => {
    if (isAccused) {
      hapticImpact(ImpactStyle.Heavy);
    }
  }, [isAccused]);

  // Haptic when you're selected as scene partner
  useEffect(() => {
    if (isMyPartnerInJoker && !isMyJoker) {
      hapticImpact(ImpactStyle.Heavy);
    }
  }, [isMyPartnerInJoker, isMyJoker]);

  // Format time
  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '--:--';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timerUrgent = timeLeft !== null && timeLeft < 60000;

  // Accusable players (active, not eliminated, not me unless self-report)
  const accusablePlayers = players.filter(p => p.status === 'active' && !p.redCard);
  const canAccuse = !isEliminated && !currentVote && state?.phase === 'playing';

  if (!state || !meta) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0610',
      }}>
        <div style={{
          width: 30, height: 30, border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#0a0610', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>

      <DisconnectAlert roomCode={code} roomPrefix={ROOM_PREFIX} playerUid={myUid} onReconnect={markActive} />
      <GameStatusBanners isHost={isHost} isHostTemporarilyDisconnected={isHostTemporarilyDisconnected} hostDisconnectedAt={hostDisconnectedAt} />

      {/* Timer header */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <motion.div
          animate={timerUrgent ? { scale: [1, 1.05, 1] } : {}}
          transition={timerUrgent ? { duration: 1, repeat: Infinity } : {}}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 20px',
            background: timerUrgent ? `${ACCENT}25` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${timerUrgent ? `${ACCENT}55` : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
          }}
        >
          <Timer size={18} weight="bold" color={timerUrgent ? ACCENT : 'rgba(255,255,255,0.6)'} />
          <span style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: '1.3rem',
            color: timerUrgent ? ACCENT : '#fff',
            textShadow: timerUrgent ? `0 0 12px ${ACCENT}88` : 'none',
          }}>
            {formatTime(timeLeft)}
          </span>
        </motion.div>
      </div>

      {/* Players list */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 16px 16px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[...players]
            .sort((a, b) => {
              // Me first, then active, then eliminated
              if (a.uid === myUid) return -1;
              if (b.uid === myUid) return 1;
              if (a.redCard && !b.redCard) return 1;
              if (!a.redCard && b.redCard) return -1;
              return 0;
            })
            .map((player) => {
              const eliminated = player.redCard;
              return (
                <motion.div
                  key={player.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: eliminated ? 0.45 : 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: eliminated
                      ? 'rgba(255,255,255,0.02)'
                      : player.uid === myUid
                        ? `${ACCENT}12`
                        : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${player.uid === myUid && !eliminated ? `${ACCENT}30` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px',
                    textDecoration: eliminated ? 'line-through' : 'none',
                  }}
                >
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 700,
                      color: eliminated ? 'rgba(255,255,255,0.3)' : '#fff',
                    }}>
                      {player.name}
                      {player.uid === myUid && <span style={{ color: `${ACCENT}88`, fontSize: '0.75rem', marginLeft: '6px' }}>(toi)</span>}
                    </span>
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {player.yellowCards >= 1 && (
                      <span style={{ fontSize: '1rem' }}>🟡</span>
                    )}
                    {player.redCard && (
                      <span style={{ fontSize: '1rem' }}>🔴</span>
                    )}
                  </div>

                  {/* Joker badge */}
                  {player.jokersRemaining > 0 && !eliminated && (
                    <div style={{
                      padding: '2px 6px', borderRadius: '6px',
                      background: 'rgba(255,215,0,0.15)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      fontSize: '0.65rem', fontWeight: 700, color: '#FFD700',
                    }}>
                      🃏
                    </div>
                  )}
                </motion.div>
              );
            })}
        </div>
      </main>

      {/* Bottom action buttons */}
      <div style={{
        padding: '12px 16px 16px',
        display: 'flex', gap: '10px',
        flexShrink: 0,
        background: 'rgba(10,6,16,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 2,
      }}>
        {/* Accuse button */}
        <motion.button
          whileTap={canAccuse ? { scale: 0.95 } : {}}
          onClick={() => canAccuse && setShowAccuseModal(true)}
          disabled={!canAccuse}
          style={{
            flex: 1, padding: '14px',
            background: canAccuse ? ACCENT : 'rgba(255,255,255,0.05)',
            border: 'none', borderRadius: '14px',
            color: canAccuse ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: '0.9rem', fontWeight: 800,
            cursor: canAccuse ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            boxShadow: canAccuse ? `0 4px 20px ${ACCENT}44` : 'none',
          }}
        >
          <HandPalm size={20} weight="bold" />
          Quelqu'un a rigolé
        </motion.button>

        {/* Joker button */}
        {canPlayJoker && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openJokerSelection}
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              border: 'none', borderRadius: '14px',
              color: '#000',
              fontSize: '0.9rem', fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
            }}
          >
            <Cards size={20} weight="bold" />
            Joker
          </motion.button>
        )}
      </div>

      {/* ACCUSE MODAL — Player selector */}
      <AnimatePresence>
        {showAccuseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setShowAccuseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '360px',
                background: '#14141e',
                borderRadius: '20px',
                border: `1px solid ${ACCENT}30`,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '20px 20px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                  Qui a rigolé ?
                </h3>
                <button
                  onClick={() => setShowAccuseModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
                    padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div style={{
                padding: '8px 12px 16px',
                maxHeight: '50vh', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                {accusablePlayers.map((player) => (
                  <motion.button
                    key={player.uid}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAccuse(player.uid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 14px',
                      background: player.uid === myUid ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${player.uid === myUid ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '100%', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', flex: 1 }}>
                      {player.name}
                      {player.uid === myUid && (
                        <span style={{ color: 'rgba(255,215,0,0.6)', fontSize: '0.75rem', marginLeft: '6px' }}>
                          (moi-meme)
                        </span>
                      )}
                    </span>
                    {player.yellowCards >= 1 && <span>🟡</span>}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VOTE MODAL */}
      <AnimatePresence>
        {currentVote && !isAccused && !isEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              style={{
                width: '100%', maxWidth: '360px',
                background: '#14141e',
                borderRadius: '20px',
                border: `1px solid ${ACCENT}40`,
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <Warning size={40} weight="fill" color={ACCENT} style={{ marginBottom: '12px' }} />

              <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                {players.find(p => p.uid === currentVote.accusedId)?.name || '?'} a rigolé ?
              </h3>

              <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                Accusé par {players.find(p => p.uid === currentVote.accuserId)?.name || '?'}
              </p>

              {/* Vote timer */}
              <div style={{
                margin: '0 0 20px',
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}>
                <Timer size={14} weight="bold" color="rgba(255,255,255,0.5)" />
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: voteTimeLeft < 5000 ? ACCENT : '#fff',
                }}>
                  {voteTimeLeft !== null ? Math.ceil(voteTimeLeft / 1000) : '--'}s
                </span>
              </div>

              {!hasVoted && currentVote.accuserId !== myUid ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote(true)}
                    style={{
                      flex: 1, padding: '14px',
                      background: ACCENT, border: 'none', borderRadius: '14px',
                      color: '#fff', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Oui
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleVote(false)}
                    style={{
                      flex: 1, padding: '14px',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '14px',
                      color: '#fff', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Non
                  </motion.button>
                </div>
              ) : (
                <div style={{
                  padding: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '14px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.85rem', fontWeight: 700,
                }}>
                  {currentVote.accuserId === myUid ? 'Tu as accusé — vote OUI auto' : 'Vote enregistré !'}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCUSED MODAL — Fun notification for the accused */}
      <AnimatePresence>
        {currentVote && isAccused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                width: '100%', maxWidth: '340px',
                background: '#14141e',
                borderRadius: '24px',
                border: `2px solid ${ACCENT}60`,
                padding: '32px 24px',
                textAlign: 'center',
                boxShadow: `0 0 60px ${ACCENT}30`,
              }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ fontSize: '3rem', marginBottom: '16px' }}
              >
                😱
              </motion.div>

              <h2 style={{
                margin: '0 0 8px',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.2rem',
                color: ACCENT,
                textShadow: `0 0 20px ${ACCENT}66`,
              }}>
                On t'accuse !
              </h2>

              <p style={{
                margin: '0 0 20px',
                fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.4,
              }}>
                {players.find(p => p.uid === currentVote.accuserId)?.name || '?'} dit que tu as rigolé...
                <br />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  Les autres votent en ce moment
                </span>
              </p>

              {/* Waiting animation */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ACCENT,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* JOKER SELECTION MODAL — Bottom sheet style */}
      <AnimatePresence>
        {showJokerModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowJokerModal(false); setSelectedJoker(null); }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}
            />
            {/* Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                top: 'calc(56px + max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px)))',
                zIndex: 9999,
                background: '#0a0610',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(255,215,0,0.15)',
                borderBottom: 'none',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -10px 50px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,0,0.05)',
              }}
              ref={jokerModalRef}
            >
              {/* Handle — drag to dismiss */}
              <div
                onPointerDown={handleJokerDragDown}
                onPointerMove={handleJokerDragMove}
                onPointerUp={handleJokerDragUp}
                onPointerCancel={handleJokerDragCancel}
                style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', cursor: 'grab', touchAction: 'none' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              {/* Header */}
              <div style={{
                padding: '8px 16px 12px',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
              {selectedJoker && !showPartnerSelect ? (
                <button onClick={() => setSelectedJoker(null)} style={{
                  background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  <ArrowLeft size={16} weight="bold" /> Retour
                </button>
              ) : showPartnerSelect ? (
                <button onClick={() => { setShowPartnerSelect(false); setSelectedPartners([]); }} style={{
                  background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  <ArrowLeft size={16} weight="bold" /> Retour
                </button>
              ) : (
                <h3 style={{
                  margin: 0, fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '1.1rem', color: '#FFD700',
                }}>
                  JOKER TIME
                </h3>
              )}
              <button onClick={() => { setShowJokerModal(false); setSelectedJoker(null); }} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
                padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Content */}
            {!selectedJoker && !showPartnerSelect && (
              <>
                {/* Tabs */}
                <div style={{
                  display: 'flex', padding: '8px 12px', gap: '6px', flexShrink: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {[
                    { key: 'standup', label: 'Stand-Up', icon: <Microphone size={14} weight="bold" /> },
                    { key: 'scene', label: 'Théâtre', icon: <MaskHappy size={14} weight="bold" /> },
                    { key: 'collective', label: 'Collectif', icon: <UsersThree size={14} weight="bold" /> },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setJokerTab(key)}
                      style={{
                        flex: 1, padding: '8px 6px', borderRadius: '10px',
                        border: jokerTab === key ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        background: jokerTab === key ? 'rgba(255,215,0,0.12)' : 'transparent',
                        color: jokerTab === key ? '#FFD700' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {/* Options — Full catalog with used/pro states */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(jokerTab === 'standup' ? STANDUP_SCRIPTS
                      : jokerTab === 'scene' ? SCENES.filter(s => s.playerCount <= activePCount)
                      : COLLECTIVE_GAMES
                    ).map((content) => {
                      const isUsed = usedJokerIds.has(content.id);
                      const isLocked = content.pro && !isPro;
                      const isDisabled = isUsed || isLocked;

                      return (
                        <motion.button
                          key={content.id}
                          whileTap={!isDisabled ? { scale: 0.97 } : {}}
                          onClick={() => !isDisabled && selectJokerContent(content, jokerTab)}
                          style={{
                            width: '100%', padding: '14px 16px', textAlign: 'left',
                            background: isUsed ? 'rgba(255,255,255,0.02)' : isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isUsed ? 'rgba(255,255,255,0.04)' : isLocked ? 'rgba(255,215,0,0.08)' : 'rgba(255,215,0,0.15)'}`,
                            borderRadius: '14px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isUsed ? 0.35 : isLocked ? 0.5 : 1,
                            position: 'relative',
                          }}
                        >
                          {/* Used overlay */}
                          {isUsed && (
                            <div style={{
                              position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)',
                              fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              Déjà joué
                            </div>
                          )}
                          {/* Pro lock */}
                          {isLocked && (
                            <div style={{
                              position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.65rem', fontWeight: 700, color: '#FFD700',
                            }}>
                              <Lock size={12} weight="bold" /> PRO
                            </div>
                          )}
                          <div style={{ marginBottom: '6px', paddingRight: isDisabled ? '70px' : 0 }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isUsed ? 'rgba(255,255,255,0.4)' : '#fff' }}>
                              {content.title}
                            </span>
                            {content.source && (
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,215,0,0.5)', fontStyle: 'italic', marginTop: '2px' }}>
                                {content.source}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              background: 'rgba(255,215,0,0.1)', color: '#FFD700',
                            }}>
                              {content.tone}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                            }}>
                              {content.duration}
                            </span>
                            {content.playerCount && content.playerCount > 1 && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                                background: `${ACCENT}15`, color: ACCENT,
                              }}>
                                {content.playerCount} joueurs
                              </span>
                            )}
                            {content.difficulty && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)',
                              }}>
                                {content.difficulty}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Selected content preview */}
            {selectedJoker && !showPartnerSelect && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                  {selectedJoker.title}
                </h3>
                {selectedJoker.source && (
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                    {selectedJoker.source}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                    {selectedJoker.tone}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {selectedJoker.duration}
                  </span>
                </div>

                {selectedJoker.stageDirections && (
                  <div style={{
                    padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                    background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
                    fontSize: '0.8rem', color: 'rgba(255,215,0,0.8)', fontStyle: 'italic', lineHeight: 1.5,
                  }}>
                    {selectedJoker.stageDirections}
                  </div>
                )}

                {selectedJoker.setup && (
                  <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {selectedJoker.setup}
                  </p>
                )}

                {selectedJoker.script && (
                  selectedJoker.type === 'scene' && selectedJoker.roles ? (
                    <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                      <RenderSceneScript
                        script={selectedJoker.script}
                        roles={selectedJoker.roles}
                        selectedPlayers={null}
                        myUid={myUid}
                        players={players}
                      />
                    </div>
                  ) : (
                    <div style={{
                      padding: '14px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      maxHeight: '40vh', overflowY: 'auto',
                    }}>
                      {selectedJoker.script}
                    </div>
                  )
                )}

                {selectedJoker.rules && (
                  <div style={{
                    padding: '14px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  }}>
                    {selectedJoker.rules}
                  </div>
                )}

                {/* Launch button */}
                <div style={{ padding: '16px 0' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={selectedJoker.type === 'scene' && selectedJoker.playerCount > 1 ? () => setShowPartnerSelect(true) : launchJoker}
                    style={{
                      width: '100%', padding: '16px',
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none', borderRadius: '14px',
                      color: '#000', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    <Play size={20} weight="fill" />
                    {selectedJoker.type === 'scene' && selectedJoker.playerCount > 1 ? 'Choisir les partenaires' : 'Lancer le Joker !'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Partner selection */}
            {showPartnerSelect && selectedJoker && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                  Choisis {selectedJoker.playerCount - 1} partenaire{selectedJoker.playerCount > 2 ? 's' : ''}
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Ils recevront leur rôle sur leur téléphone
                </p>

                {/* Roles preview */}
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)',
                    fontSize: '0.8rem', color: '#FFD700', fontWeight: 700,
                  }}>
                    Toi : {selectedJoker.roles?.[0]?.name || 'Role 1'}
                  </div>
                  {selectedJoker.roles?.slice(1).map((role, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px', borderRadius: '8px',
                      background: selectedPartners[idx] ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedPartners[idx] ? `${ACCENT}30` : 'rgba(255,255,255,0.06)'}`,
                      fontSize: '0.8rem', color: selectedPartners[idx] ? ACCENT : 'rgba(255,255,255,0.4)', fontWeight: 700,
                    }}>
                      {selectedPartners[idx] ? players.find(p => p.uid === selectedPartners[idx])?.name : '?'} : {role.name}
                    </div>
                  ))}
                </div>

                {/* Player list for selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  {players.filter(p => p.uid !== myUid).map((player) => {
                    const isSelected = selectedPartners.includes(player.uid);
                    return (
                      <motion.button
                        key={player.uid}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPartners(prev => prev.filter(uid => uid !== player.uid));
                          } else if (selectedPartners.length < selectedJoker.playerCount - 1) {
                            setSelectedPartners(prev => [...prev, player.uid]);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '12px 14px',
                          background: isSelected ? `${ACCENT}15` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? `${ACCENT}40` : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '12px', cursor: 'pointer', width: '100%', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', flex: 1 }}>
                          {player.name}
                        </span>
                        {isSelected && <span style={{ color: ACCENT, fontWeight: 800, fontSize: '0.85rem' }}>✓</span>}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Launch button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={launchJoker}
                  disabled={selectedPartners.length < selectedJoker.playerCount - 1}
                  style={{
                    width: '100%', padding: '16px',
                    background: selectedPartners.length >= selectedJoker.playerCount - 1
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: '14px',
                    color: selectedPartners.length >= selectedJoker.playerCount - 1 ? '#000' : 'rgba(255,255,255,0.3)',
                    fontSize: '1rem', fontWeight: 800,
                    cursor: selectedPartners.length >= selectedJoker.playerCount - 1 ? 'pointer' : 'not-allowed',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  <Play size={20} weight="fill" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Lancer le Joker !
                </motion.button>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Performance screen (for the performer) */}
      <AnimatePresence>
        {isJokerActive && isMyJoker && !currentVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Joker header */}
            <div style={{
              padding: '14px 16px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🃏</span>
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: '#FFD700',
                }}>
                  TON JOKER
                </span>
              </div>
            </div>

            {/* Script content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                {currentJoker.contentTitle}
              </h3>

              {/* Find the content to display */}
              {(() => {
                const allContent = [...STANDUP_SCRIPTS, ...SCENES, ...COLLECTIVE_GAMES];
                const content = allContent.find(c => c.id === currentJoker.contentId);
                if (!content) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Contenu en cours...</p>;

                return (
                  <>
                    {content.source && (
                      <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                        {content.source}
                      </p>
                    )}
                    {content.stageDirections && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
                        fontSize: '0.8rem', color: 'rgba(255,215,0,0.8)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.stageDirections}
                      </div>
                    )}
                    {content.setup && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.setup}
                      </div>
                    )}
                    {content.script && (
                      currentJoker.contentType === 'scene' && content.roles ? (
                        <RenderSceneScript
                          script={content.script}
                          roles={content.roles}
                          selectedPlayers={currentJoker.selectedPlayers}
                          myUid={myUid}
                          players={players}
                        />
                      ) : (
                        <div style={{
                          fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap',
                        }}>
                          {content.script}
                        </div>
                      )
                    )}
                    {content.rules && (
                      <div style={{
                        fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.8, whiteSpace: 'pre-wrap',
                      }}>
                        {content.rules}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* End joker button */}
            <div style={{
              padding: '12px 16px 16px', flexShrink: 0,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={endJoker}
                style={{
                  width: '100%', padding: '14px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '14px', color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}
              >
                Terminer le Joker
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Partner screen (scenes: shared script) */}
      <AnimatePresence>
        {isJokerActive && isMyPartnerInJoker && !isMyJoker && !currentVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div style={{
              padding: '14px 16px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎭</span>
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: ACCENT,
                }}>
                  {myJokerRole?.role || 'TON RÔLE'}
                </span>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  Joker de {players.find(p => p.uid === currentJoker.playerId)?.name || '?'}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                {currentJoker.contentTitle}
              </h3>

              {/* Show shared script for scenes */}
              {(() => {
                const content = SCENES.find(c => c.id === currentJoker.contentId);
                if (!content) return null;

                return (
                  <>
                    {content.source && (
                      <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                        {content.source}
                      </p>
                    )}
                    {content.setup && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.setup}
                      </div>
                    )}
                    <RenderSceneScript
                      script={content.script}
                      roles={content.roles}
                      selectedPlayers={currentJoker.selectedPlayers}
                      myUid={myUid}
                      players={players}
                    />
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Spectator screen: COLLECTIVE = full rules, STANDUP/SCENE = banner */}
      <AnimatePresence>
        {isJokerActive && !isMyJoker && !isMyPartnerInJoker && !currentVote && (
          currentJoker.contentType === 'collective' ? (
            /* COLLECTIVE: Full-screen rules view — everyone participates */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div style={{
                padding: '14px 16px', flexShrink: 0,
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>👥</span>
                  <span style={{
                    fontFamily: "var(--font-title, 'Bungee'), cursive",
                    fontSize: '0.9rem', color: '#FFD700',
                  }}>
                    JEU COLLECTIF
                  </span>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    Joker de {players.find(p => p.uid === currentJoker.playerId)?.name || '?'}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                  {currentJoker.contentTitle}
                </h3>

                {(() => {
                  const content = COLLECTIVE_GAMES.find(c => c.id === currentJoker.contentId);
                  if (!content) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</p>;

                  return (
                    <>
                      {content.setup && (
                        <div style={{
                          padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                        }}>
                          {content.setup}
                        </div>
                      )}
                      {content.rules && (
                        <div style={{
                          fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap',
                        }}>
                          {content.rules}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          ) : (
            /* STANDUP/SCENE: Top banner for spectators */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9997,
                paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                padding: '16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,215,0,0.15)',
                  border: '1px solid rgba(255,215,0,0.4)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                  {currentJoker.contentType === 'standup' ? '🎤' : '🎭'}
                </div>
                <div style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.85rem', color: '#FFD700',
                }}>
                  {players.find(p => p.uid === currentJoker.playerId)?.name || '?'} joue son Joker
                </div>
                <div style={{
                  fontSize: '0.7rem', color: 'rgba(255,215,0,0.5)', marginTop: '4px',
                }}>
                  {currentJoker.contentType === 'standup' ? 'Stand-Up' : 'Théâtre'}
                </div>
              </motion.div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LolPlayPage() {
  const { code } = useParams();
  return <LolPlayContent code={code} />;
}
