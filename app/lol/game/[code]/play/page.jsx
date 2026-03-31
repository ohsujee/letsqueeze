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
import JokerOverlays from "./_components/JokerOverlays";
import GameModals from "./_components/GameModals";

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


      {/* Game Modals (Accuse, Vote, Accused) */}
      <GameModals
        showAccuseModal={showAccuseModal} setShowAccuseModal={setShowAccuseModal}
        accusablePlayers={accusablePlayers} handleAccuse={handleAccuse} myUid={myUid}
        currentVote={currentVote} handleVote={handleVote} voteTimeLeft={voteTimeLeft} players={players}
        isAccused={isAccused}
      />

      {/* Joker System (Selection + Active Screens) */}
      <JokerOverlays
        showJokerModal={showJokerModal} setShowJokerModal={setShowJokerModal}
        jokerTab={jokerTab} setJokerTab={setJokerTab}
        selectedJoker={selectedJoker} setSelectedJoker={setSelectedJoker}
        showPartnerSelect={showPartnerSelect} setShowPartnerSelect={setShowPartnerSelect}
        selectedPartners={selectedPartners} setSelectedPartners={setSelectedPartners}
        jokerModalRef={jokerModalRef}
        handleJokerDragDown={handleJokerDragDown} handleJokerDragMove={handleJokerDragMove}
        handleJokerDragUp={handleJokerDragUp} handleJokerDragCancel={handleJokerDragCancel}
        selectJokerContent={selectJokerContent} launchJoker={launchJoker}
        usedJokerIds={usedJokerIds} isPro={isPro} activePCount={activePCount}
        state={state} myUid={myUid} players={players} isHost={isHost}
        currentJoker={currentJoker} isJokerActive={isJokerActive} isMyJoker={isMyJoker}
        isMyPartnerInJoker={isMyPartnerInJoker} myJokerRole={myJokerRole}
        currentVote={currentVote} endJoker={endJoker} me={me}
      />
    </div>
  );
}

export default function LolPlayPage() {
  const { code } = useParams();
  return <LolPlayContent code={code} />;
}
