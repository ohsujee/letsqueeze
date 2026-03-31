'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import Buzzer from '@/components/game/Buzzer';
import Leaderboard from '@/components/game/Leaderboard';
import GamePlayHeader from '@/components/game/GamePlayHeader';
import GameStatusBanners from '@/components/game/GameStatusBanners';
import DisconnectAlert from '@/components/game/DisconnectAlert';
import MyTurnModal from '@/components/game/MyTurnModal';
import TimeUpModal from '@/components/game/TimeUpModal';
import { GameEndTransition } from '@/components/transitions';
import { usePlayers } from '@/lib/hooks/usePlayers';
import { usePlayerCleanup } from '@/lib/hooks/usePlayerCleanup';
import { useRoomGuard } from '@/lib/hooks/useRoomGuard';
import { useInactivityDetection } from '@/lib/hooks/useInactivityDetection';
import { useServerTime } from '@/lib/hooks/useServerTime';
import useMimeRotation from '@/lib/hooks/useMimeRotation';
import useMimeTimer from '@/lib/hooks/useMimeTimer';
import { useSound } from '@/lib/hooks/useSound';
import { calculateMimePoints } from '@/lib/config/rooms';
import './MimeGuesserView.css';

/**
 * MimeGuesserView - Vue des devineurs (pas le mimeur)
 * Structure calquée sur Quiz play page
 */
export default function MimeGuesserView({ code, myUid }) {
  const router = useRouter();
  const db = getDatabase(getApp());
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const timeUpShownRef = useRef(false);

  // Server time sync (like Quiz)
  const { serverNow, offset } = useServerTime(300);

  // Sounds
  const playBuzz = useSound('/sounds/quiz-buzzer.wav');

  // Keep screen awake

  // Listeners Firebase
  useEffect(() => {
    if (!code) return;

    const metaRef = ref(db, `rooms_mime/${code}/meta`);
    const stateRef = ref(db, `rooms_mime/${code}/state`);

    const unsubMeta = onValue(metaRef, (snap) => setMeta(snap.val()));
    const unsubState = onValue(stateRef, (snap) => {
      const v = snap.val();
      setState(v);
      if (v?.phase === 'ended' && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
    });

    return () => {
      unsubMeta();
      unsubState();
    };
  }, [db, code]);

  // Hooks
  const { players, activePlayers, me } = usePlayers({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    sort: 'score'
  });

  const { leaveRoom, markActive } = usePlayerCleanup({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    phase: 'playing'
  });

  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    isHost: false
  });

  useInactivityDetection({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid
  });

  const {
    currentMimeUid,
    currentMimer,
    currentIndex,
    totalWords
  } = useMimeRotation({ roomCode: code, meta, state, players });

  const {
    secondsLeft,
    percentLeft,
    isRunning,
    isPaused,
    isRevealed,
    isMimingStarted
  } = useMimeTimer({
    roomCode: code,
    state,
    isHost: false,
    isMimer: false
  });

  // Get locked player info
  const lockedPlayer = state?.lockUid ? players.find(p => p.uid === state.lockUid) : null;

  // Play sound when someone buzzes
  const prevLockRef = useRef(null);
  useEffect(() => {
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLockRef.current) playBuzz();
    prevLockRef.current = cur;
  }, [state?.lockUid, playBuzz]);

  // Detect time up (timer reaches 0 without anyone finding)
  const prevSecondsRef = useRef(secondsLeft);
  useEffect(() => {
    // Time just hit 0 while miming was started and no one was locked
    if (prevSecondsRef.current > 0 && secondsLeft === 0 && isMimingStarted && !state?.lockUid) {
      if (!timeUpShownRef.current) {
        timeUpShownRef.current = true;
        setShowTimeUp(true);
        // Auto-hide after 2 seconds
        setTimeout(() => {
          setShowTimeUp(false);
        }, 2000);
      }
    }
    // Reset the flag when a new word starts (timer resets)
    if (secondsLeft > 5 && timeUpShownRef.current) {
      timeUpShownRef.current = false;
    }
    prevSecondsRef.current = secondsLeft;
  }, [secondsLeft, isMimingStarted, state?.lockUid]);

  const isMyTurn = state?.lockUid === myUid;
  // Buzzer disabled when I'm the mimer
  const isMimer = myUid === currentMimeUid;
  const progressLabel = totalWords ? `${currentIndex + 1} / ${totalWords}` : '';

  if (!meta || !state) {
    return (
      <div className="mime-play-page game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <div className="loading-spinner" style={{ width: 40, height: 40, border: '3px solid rgba(0,255,102,0.2)', borderTopColor: '#00ff66', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Chargement...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={`mime-play-page game-page ${isMyTurn ? 'my-turn' : ''}`}>
      {/* End transition */}
      <AnimatePresence>
        {showEndTransition && !meta?.closed && (
          <GameEndTransition
            variant="mime"
            onComplete={() => router.replace(`/mime/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      {/* Green glow when it's my turn */}
      <AnimatePresence>
        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 60px 5px rgba(0, 255, 102, 0.25)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <GamePlayHeader
        game="mime"
        progress={progressLabel}
        title="Mime"
        score={me?.score || 0}
        showScore={true}
        onExit={async () => {
          await leaveRoom();
          router.push('/home');
        }}
        exitMessage="Voulez-vous vraiment quitter ? Votre score sera conservé."
      />

      {/* Buzz notification */}
      <AnimatePresence>
        {state?.lockUid && state?.lockUid !== myUid && (
          <div className="buzz-notification-wrapper">
            <motion.div
              className="buzz-notification mime"
              initial={{ opacity: 0, scale: 0.9, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="buzz-notification-icon">🔔</div>
              <div className="buzz-notification-content">
                <span className="buzz-notification-label">Quelqu'un a buzzé !</span>
                <span className="buzz-notification-name">
                  {lockedPlayer?.name || 'Joueur'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="game-content">
        {/* Mime Card (like question card) */}
        <div className="mime-card">
          {/* Timer with progress bar - always visible */}
          <div className="timer-section">
            <div className="timer-badge">
              <span className="timer-value">{isMimingStarted ? secondsLeft : 30}</span>
              <span className="timer-label">sec</span>
            </div>
            <div className="timer-bar-container">
              <div
                className={`timer-bar-fill ${!isMimingStarted ? 'paused' : ''}`}
                style={{ width: `${isMimingStarted ? percentLeft : 100}%` }}
              />
            </div>
            {/* Points info - always visible */}
            <div className="points-info">
              À gagner: <strong>{calculateMimePoints(isMimingStarted ? secondsLeft : 30).guesserPoints} pts</strong>
            </div>
          </div>

          {/* Content */}
          <div className="mime-card-content">
            <AnimatePresence mode="wait">
              {!isMimingStarted ? (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mime-status waiting"
                >
                  <div className="waiting-text">
                    <span className="waiting-name">{currentMimer?.name || '...'}</span>
                    <span className="waiting-action">
                      {isRevealed ? 'va commencer...' : 'prépare son mime'}
                    </span>
                  </div>
                  {!isRevealed && (
                    <div className="waiting-dots">
                      <span></span><span></span><span></span>
                    </div>
                  )}
                </motion.div>
              ) : isPaused && state?.lockUid ? (
                <motion.div
                  key="validation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mime-status validation"
                >
                  <div className="validation-content">
                    <span className="buzzer-name">{lockedPlayer?.name}</span>
                    <span className="validation-text">répond...</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mime-status active"
                >
                  <div className="active-line-1">
                    <span className="active-name">{currentMimer?.name || '...'}</span>
                    <span className="active-verb">mime !</span>
                  </div>
                  <span className="active-hint">Observe et buzze</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          </div>

        {/* My turn modal */}
        <MyTurnModal
          isOpen={isMyTurn}
          gameColor="#00ff66"
        />

        {/* Time Up Modal */}
        <TimeUpModal
          isOpen={showTimeUp}
          gameColor="#00ff66"
          subtitle="Personne n'a trouvé"
        />

        {/* Leaderboard (always visible like Quiz) */}
        <Leaderboard players={players} currentPlayerUid={myUid} />
      </main>

      {/* Buzzer footer */}
      <footer className="buzzer-footer">
        <Buzzer
          roomCode={code}
          roomPrefix="rooms_mime"
          playerUid={myUid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          serverOffset={offset}
          disabled={isMimer || !isMimingStarted}
        />
      </footer>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_mime"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={false}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

    </div>
  );
}
