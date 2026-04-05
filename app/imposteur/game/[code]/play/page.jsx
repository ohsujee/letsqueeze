"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, onAuthStateChanged, signInAnonymously } from "@/lib/firebase";
import { motion } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useImposteurGame } from "@/lib/hooks/useImposteurGame";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import './imposteur-play.css';

// Phase components
import ImposteurRolesPhase from "@/components/game/imposteur/ImposteurRolesPhase";
import ImposteurDescribingPhase from "@/components/game/imposteur/ImposteurDescribingPhase";
import ImposteurDiscussionPhase from "@/components/game/imposteur/ImposteurDiscussionPhase";
import ImposteurVotingPhase from "@/components/game/imposteur/ImposteurVotingPhase";
import ImposteurEliminationPhase from "@/components/game/imposteur/ImposteurEliminationPhase";
import ImposteurRoundEndPhase from "@/components/game/imposteur/ImposteurRoundEndPhase";

const ACCENT = '#84cc16';
const ACCENT_LIGHT = '#a3e635';
const ROOM_PREFIX = 'rooms_imposteur';

export default function ImposteurPlay() {
  return <ImposteurPlayContent />;
}

export function ImposteurPlayContent({ overrideCode, overrideUid, code: propCode, myUid: propUid } = {}) {
  const params = useParams();
  const code = overrideCode || propCode || params?.code;
  const devUid = overrideUid || propUid || null;
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  // ── State ──
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const inputRef = useRef(null);

  // ── Hooks ──
  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  // Use myUid (which respects overrideUid) instead of usePlayers' `me` (which uses auth.currentUser)
  const me = players.find(p => p.uid === myUid) || null;
  const alivePlayers = players.filter(p => p.alive !== false);
  const amIAlive = me?.alive !== false;

  const {
    meta, state, myRole, descriptions, votes, discussionVotes, revealedRoles,
    phase,
    markRoleSeen, startDescribing, submitClue, advanceToNextAliveTurn,
    submitVote, submitDiscussionChoice, finalizeVotes, submitMrWhiteGuess,
    resolveElimination, recordRoundWinner, startNextRound, endGame,
  } = useImposteurGame({ roomCode: code, myUid, isHost });

  useWakeLock({ enabled: true });

  // ── Auth ──
  useEffect(() => {
    if (overrideUid) { setMyUid(overrideUid); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [overrideUid]);

  useEffect(() => {
    if (myUid && meta?.hostUid) setIsHost(myUid === meta.hostUid);
  }, [myUid, meta?.hostUid]);

  // ── Guards ──
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, enabled: !devUid,
  });
  const { markActive } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, phase: 'playing',
  });
  useInactivityDetection({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, inactivityTimeout: 30000, enabled: !devUid,
  });

  // ── Phase transitions ──
  // No redirect to /end — roundEnd handles everything including last round

  const allPlayersSeen = players.length > 0 && players.every(p => p.hasSeenRole === true);
  useEffect(() => {
    if (phase !== 'roles' || !isHost || !allPlayersSeen) return;
    const timer = setTimeout(() => startDescribing(), 1500);
    return () => clearTimeout(timer);
  }, [phase, isHost, allPlayersSeen, startDescribing]);

  // ── Derived values ──
  const isMyTurn = state?.currentTurnUid === myUid;
  const settings = meta?.settings || {};
  const currentSubRound = state?.currentSubRound || 1;
  const currentTurnPlayer = players.find(p => p.uid === state?.currentTurnUid);
  const currentVotes = votes?.[currentSubRound] || {};
  const lastEliminatedUid = state?.eliminatedThisRound?.slice(-1)?.[0];
  const eliminatedPlayer = players.find(p => p.uid === lastEliminatedUid);
  const eliminatedRole = revealedRoles?.[lastEliminatedUid];
  const isMrWhiteGuessing = state?.mrWhiteGuessing === true;
  const amIMrWhite = myRole?.role === 'mrwhite';
  const myDiscussionChoice = discussionVotes?.[myUid] || null;
  const aliveUidsSet = useMemo(() => new Set(alivePlayers.map(p => p.uid)), [alivePlayers]);
  const majority = Math.ceil(alivePlayers.length / 2);

  const discussionCounts = useMemo(() => {
    let vote = 0, cont = 0;
    const voteUids = [], contUids = [];
    if (discussionVotes) {
      Object.entries(discussionVotes).forEach(([uid, choice]) => {
        if (!aliveUidsSet.has(uid)) return;
        if (choice === 'vote') { vote++; voteUids.push(uid); }
        else if (choice === 'continue') { cont++; contUids.push(uid); }
      });
    }
    return { vote, continue: cont, voteUids, contUids, total: alivePlayers.length };
  }, [discussionVotes, aliveUidsSet, alivePlayers.length]);

  // ── Handlers ──
  const handleSubmitClue = useCallback(async () => {
    if (!clueInput.trim()) return;
    await submitClue(clueInput.trim());
    setClueInput('');
    await advanceToNextAliveTurn(alivePlayers);
  }, [clueInput, submitClue, advanceToNextAliveTurn, alivePlayers]);

  const handleOralNext = useCallback(async () => {
    await advanceToNextAliveTurn(alivePlayers);
  }, [advanceToNextAliveTurn, alivePlayers]);

  const handleVote = useCallback(async (targetUid) => {
    await submitVote(targetUid);
  }, [submitVote]);

  const handleVoteTimerEnd = useCallback(() => {
    if (isHost) finalizeVotes(alivePlayers);
  }, [isHost, finalizeVotes, alivePlayers]);

  const handleAllVoted = useCallback(() => {
    if (isHost) setTimeout(() => finalizeVotes(alivePlayers), 2000);
  }, [isHost, finalizeVotes, alivePlayers]);

  const handleContinueAfterElimination = useCallback(async () => {
    await resolveElimination(players);
  }, [resolveElimination, players]);

  const handleMrWhiteGuess = useCallback(async (guess) => {
    await submitMrWhiteGuess(guess);
    if (isHost) setTimeout(() => handleContinueAfterElimination(), 3000);
  }, [submitMrWhiteGuess, isHost, handleContinueAfterElimination]);

  const handleNextRound = useCallback(async () => {
    await recordRoundWinner();
    const totalRounds = settings.totalRounds || 1;
    const currentRound = state?.currentRound || 1;
    if (currentRound < totalRounds) {
      await startNextRound(players, state?.usedPairIds || []);
    } else {
      // Last round — go back to lobby
      router.push(`/imposteur/room/${code}`);
    }
  }, [settings, state, recordRoundWinner, startNextRound, players, router, code]);

  // ── Loading ──
  if (!state || !meta) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#04060f',
      }}>
        <div style={{
          width: 30, height: 30, border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
      </div>
    );
  }

  // ── Render ──
  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>
      {/* Background */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(132,204,22,0.02) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '80%', height: '250px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(132,204,22,0.05) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '150px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(132,204,22,0.03) 0%, transparent 70%)',
        }} />
      </div>

      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />
      <DisconnectAlert
        roomCode={code} roomPrefix={ROOM_PREFIX}
        playerUid={myUid} onReconnect={markActive}
      />

      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '16px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        paddingTop: 'calc(16px + max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px)))',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}>

        {phase === 'roles' && (
          <ImposteurRolesPhase
            myRole={myRole}
            me={me}
            players={players}
            allPlayersSeen={allPlayersSeen}
            markRoleSeen={markRoleSeen}
            ACCENT={ACCENT}
            ACCENT_LIGHT={ACCENT_LIGHT}
          />
        )}

        {phase === 'describing' && (
          <ImposteurDescribingPhase
            currentSubRound={currentSubRound}
            descriptions={descriptions}
            players={players}
            alivePlayers={alivePlayers}
            amIAlive={amIAlive}
            isMyTurn={isMyTurn}
            currentTurnPlayer={currentTurnPlayer}
            settings={settings}
            clueInput={clueInput}
            setClueInput={setClueInput}
            inputRef={inputRef}
            onSubmitClue={handleSubmitClue}
            onOralNext={handleOralNext}
            myRole={myRole}
            tieMessage={state?.tieMessage}
            ACCENT={ACCENT}
            ACCENT_LIGHT={ACCENT_LIGHT}
          />
        )}

        {phase === 'discussion' && (
          <ImposteurDiscussionPhase
            alivePlayers={alivePlayers}
            amIAlive={amIAlive}
            players={players}
            myUid={myUid}
            myDiscussionChoice={myDiscussionChoice}
            discussionCounts={discussionCounts}
            majority={majority}
            onChoose={submitDiscussionChoice}
            ACCENT={ACCENT}
            ACCENT_LIGHT={ACCENT_LIGHT}
          />
        )}

        {phase === 'voting' && (
          <ImposteurVotingPhase
            settings={settings}
            descriptions={descriptions}
            players={players}
            myUid={myUid}
            alivePlayers={alivePlayers}
            amIAlive={amIAlive}
            currentSubRound={currentSubRound}
            onVote={handleVote}
            onTimerEnd={handleVoteTimerEnd}
            onAllVoted={handleAllVoted}
            currentVotes={currentVotes}
          />
        )}

        {phase === 'elimination' && (
          <ImposteurEliminationPhase
            isMrWhiteGuessing={isMrWhiteGuessing}
            amIMrWhite={amIMrWhite}
            lastEliminatedUid={lastEliminatedUid}
            myUid={myUid}
            eliminatedPlayer={eliminatedPlayer}
            eliminatedRole={eliminatedRole}
            state={state}
            mrWhiteEnabled={settings?.mrWhiteEnabled}
            onMrWhiteGuess={handleMrWhiteGuess}
            onContinue={handleContinueAfterElimination}
            isHost={isHost}
          />
        )}

        {phase === 'roundEnd' && (
          <ImposteurRoundEndPhase
            state={state}
            settings={settings}
            players={players}
            revealedRoles={revealedRoles}
            isHost={isHost}
            onNextRound={handleNextRound}
            ACCENT={ACCENT}
            ACCENT_LIGHT={ACCENT_LIGHT}
          />
        )}

      </main>
    </div>
  );
}
