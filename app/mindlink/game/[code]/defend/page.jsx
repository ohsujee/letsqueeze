"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, update, onAuthStateChanged } from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameEndTransition } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useActiveLink } from "@/lib/hooks/useActiveLink";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import LinkOverlay from "@/components/game/LinkOverlay";
import WordDisplay from '@/components/game/WordDisplay';
import MindLinkNetwork from '@/components/game/MindLinkNetwork';
import { ShieldStar, Eye, EyeSlash, Clock } from '@phosphor-icons/react';
import ChoosingPhase from './_components/ChoosingPhase';
import { WordGuessModal, FoundConfirmModal } from './_components/DefendModals';
import './defend.css';

const ACCENT = '#ec4899';
const ROOM_PREFIX = 'rooms_mindlink';

export function MindLinkDefendContent({ code, myUid: devUid }) {
  useAppShellBg('#04060f');
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const [showFoundConfirm, setShowFoundConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

  const link = useActiveLink({
    roomCode: code, roomPrefix: ROOM_PREFIX, myUid, state,
    mode: meta?.mode || 'oral', players,
  });

  // Auth
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => { if (user) setMyUid(user.uid); });
    return () => unsub();
  }, [devUid]);

  // Listen meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) { setMeta(m); if (myUid) setIsHost(m.hostUid === myUid); }
      if (m?.closed) router.push('/home');
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const s = snap.val();
      if (s) setState(s);
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, myUid, router]);

  // Redirect on phase change
  useEffect(() => {
    if (!state?.phase || !myUid) return;
    if (state.phase === 'ended' && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state.phase === 'lobby') router.push(`/mindlink/room/${code}`);
  }, [state?.phase, myUid, code, router]);

  // Timer countdown — pauses during word guess, interception, or match pending decision
  const guessPending = state?.wordGuess && state.wordGuess.correct === null;
  const interceptActive = state?.activeLink?.defenderIntercept?.confirmed === 'pending' || state?.activeLink?.defenderIntercept?.confirmed === 'typing';
  const matchPendingDecision = state?.activeLink?.result === 'match';

  useEffect(() => {
    if (!state?.timerEndAt || state.phase !== 'playing') return;
    if (guessPending || interceptActive || matchPendingDecision) return;
    const tick = () => {
      const now = Date.now();
      const penalty = (state.penaltySeconds || 0) * 1000;
      const effectiveEnd = state.timerEndAt - penalty;
      const remaining = Math.max(0, Math.floor((effectiveEnd - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && isHost) {
        update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
          winner: 'defenders', winReason: 'timeout', phase: 'ended',
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.timerEndAt, state?.penaltySeconds, state?.phase, isHost, code, guessPending, interceptActive, matchPendingDecision]);

  // Hooks
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, enabled: !devUid
  });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });
  const { markActive } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: devUid ? null : myUid, isHost, phase: 'playing',
  });
  useInactivityDetection({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: devUid ? null : myUid, inactivityTimeout: 30000 });

  // ── Handlers ──

  const handleTheyFoundMyWord = useCallback(async () => {
    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        winner: 'attackers', winReason: 'found_during_link', phase: 'ended',
      });
    } catch (err) { console.error('Error:', err); }
  }, [code]);

  const handleGuessResponse = useCallback(async (isCorrect) => {
    if (!state?.wordGuess) return;
    if (isCorrect) {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        wordGuess: null, winner: 'attackers', winReason: 'guessed', phase: 'ended',
      });
    } else {
      const currentPenalty = state.penaltySeconds || 0;
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        wordGuess: null, penaltySeconds: currentPenalty + 30,
      });
    }
  }, [code, state?.wordGuess, state?.penaltySeconds]);

  const handleRevealLetter = useCallback(async () => {
    if (!state || !state.secretWord) return;
    const next = (state.revealedLetters || 1) + 1;
    const updates = { revealedLetters: next, revealedPrefix: state.secretWord.slice(0, next), activeLink: null };
    if (next >= state.wordLength) {
      updates.winner = 'attackers';
      updates.winReason = 'all_letters';
      updates.phase = 'ended';
    }
    try { await update(ref(db, `${ROOM_PREFIX}/${code}/state`), updates); }
    catch (err) { console.error('Error revealing letter:', err); }
  }, [state, code]);

  const handleDontReveal = useCallback(async () => {
    try { await update(ref(db, `${ROOM_PREFIX}/${code}/state`), { activeLink: null }); }
    catch (err) { console.error('Error:', err); }
  }, [code]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const timerUrgent = timeLeft < 60;

  // ── Loading ──
  if (!meta || !state) {
    return (
      <div className="defend-loading">
        <div className="defend-spinner" />
        <p className="defend-loading-text">Chargement...</p>
      </div>
    );
  }

  // ── CHOOSING PHASE ──
  if (state.phase === 'choosing') {
    return (
      <ChoosingPhase
        code={code}
        roomPrefix={ROOM_PREFIX}
        meta={meta}
        isWordChooser={meta?.wordChooserUid === myUid}
        wordChooserName={players.find(p => p.uid === meta?.wordChooserUid)?.name || 'Un défenseur'}
      />
    );
  }

  // ── PLAYING PHASE ──
  return (
    <div className="defend-page">
      <div aria-hidden className="defend-bg">
        <div className="defend-bg-dots" />
      </div>

      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="mindlink"
            title={state?.winReason === 'timeout' ? 'Temps écoulé !' : 'Mot trouvé !'}
            subtitle={state?.winReason === 'timeout' ? 'Les défenseurs ont tenu bon !' : 'Les attaquants ont percé le secret !'}
            onComplete={() => router.push(`/mindlink/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      <GameStatusBanners isHost={isHost} isHostTemporarilyDisconnected={isHostTemporarilyDisconnected} hostDisconnectedAt={hostDisconnectedAt} />
      <DisconnectAlert roomCode={code} roomPrefix={ROOM_PREFIX} playerUid={myUid} onReconnect={markActive} />

      {/* Header */}
      <header className="defend-header">
        <div className="defend-header-role">
          <ShieldStar size={18} weight="fill" color={ACCENT} />
          <span className="defend-header-role-text">Défenseur</span>
        </div>
        <div className={`defend-timer ${timerUrgent ? 'urgent' : 'normal'}`}>
          <Clock size={14} weight="bold" color={timerUrgent ? '#ef4444' : ACCENT} />
          <span className={`defend-timer-text ${timerUrgent ? 'urgent' : 'normal'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="defend-playing-main">
        <div className="defend-word-display">
          <WordDisplay wordLength={state.wordLength} revealedLetters={state.revealedLetters || 1} fullWord={state.secretWord || ''} showAll={true} />
        </div>

        <div className="defend-network">
          <MindLinkNetwork players={players} myUid={myUid} activeLink={link.activeLink} />
        </div>

        <AnimatePresence>
          {link.activeLink && (
            <div className="defend-link-wrapper">
              <div className="defend-link-inner">
                <LinkOverlay link={link} mode={meta?.mode || 'oral'} players={players} myUid={myUid} myRole="defender" revealedPrefix={state?.revealedPrefix || ''} opaque />
              </div>
            </div>
          )}
        </AnimatePresence>

        <div className="defend-actions">
          {link.activeLink?.result === 'match' && (
            <div className="defend-reveal-btns">
              <motion.button className="defend-reveal-btn reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }} onClick={handleRevealLetter}>
                <Eye size={16} weight="bold" /> Révéler la lettre
              </motion.button>
              <motion.button className="defend-reveal-btn dont-reveal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }} onClick={handleDontReveal}>
                <EyeSlash size={16} weight="bold" /> Ne pas révéler
              </motion.button>
            </div>
          )}
          <motion.button className="defend-found-btn" whileTap={{ scale: 0.97 }} onClick={() => setShowFoundConfirm(true)}>
            Ils ont trouvé mon mot !
          </motion.button>
        </div>
      </main>

      <WordGuessModal guessPending={guessPending} wordGuess={state?.wordGuess} players={players} onResponse={handleGuessResponse} />
      <FoundConfirmModal show={showFoundConfirm} onClose={() => setShowFoundConfirm(false)} onConfirm={handleTheyFoundMyWord} />
    </div>
  );
}

export default function MindLinkDefendPage() {
  const { code } = useParams();
  return <MindLinkDefendContent code={code} />;
}
