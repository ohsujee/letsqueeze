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
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useServerTime } from '@/lib/hooks/useServerTime';
import useMimeRotation from '@/lib/hooks/useMimeRotation';
import useMimeTimer from '@/lib/hooks/useMimeTimer';
import { useSound } from '@/lib/hooks/useSound';
import { calculateMimePoints } from '@/lib/config/rooms';

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
  useWakeLock({ enabled: true });

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

      <style jsx>{`
        .mime-play-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .mime-play-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(0, 255, 102, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 204, 82, 0.06) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        .buzz-notification-wrapper {
          position: fixed;
          top: calc(70px + env(safe-area-inset-top));
          left: 16px;
          right: 16px;
          z-index: 100;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .buzz-notification.mime {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid var(--mime-primary, #00ff66);
          border-radius: 16px;
          box-shadow:
            0 0 30px rgba(0, 255, 102, 0.3),
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .buzz-notification-icon {
          font-size: 1.5rem;
          filter: drop-shadow(0 0 8px rgba(0, 255, 102, 0.6));
          animation: buzz-icon-pulse 1s ease-in-out infinite;
        }

        @keyframes buzz-icon-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .buzz-notification-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .buzz-notification-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--mime-primary, #00ff66);
        }

        .buzz-notification-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.1rem;
          color: var(--text-primary, #ffffff);
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
        }

        .game-content {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 16px;
          gap: 10px;
          overflow-y: auto;
          min-height: 0;
        }

        .mime-card {
          position: relative;
          width: 100%;
          max-width: 500px;
          flex: 0 0 auto;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(0, 255, 102, 0.2);
          border-radius: 16px;
          padding: 12px 16px;
          text-align: center;
          display: flex;
          flex-direction: column;
        }

        .timer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          width: 100%;
        }

        .points-info {
          margin-top: 8px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .points-info strong {
          font-weight: 700;
          color: #ffc800;
          transition: all 0.3s ease;
        }

        .timer-badge {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 5px;
        }

        .timer-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: var(--mime-primary, #00ff66);
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
        }

        .timer-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
        }

        .timer-bar-container {
          width: 80%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .timer-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--mime-primary, #00ff66), #00cc52);
          border-radius: 3px;
          transition: width 0.3s ease-out;
          box-shadow: 0 0 10px rgba(0, 255, 102, 0.5);
        }

        .timer-bar-fill.paused {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .mime-card-content {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 0;
        }

        .mime-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }

        .mime-status.waiting {
          color: rgba(255, 255, 255, 0.5);
        }

        .waiting-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-bottom: 8px;
        }

        .waiting-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: var(--mime-primary, #00ff66);
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
        }

        .waiting-action {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .waiting-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
        }

        .waiting-dots span {
          width: 6px;
          height: 6px;
          background: var(--mime-primary, #00ff66);
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(0, 255, 102, 0.5);
        }

        .waiting-dots span:nth-child(1) { animation-delay: 0s; }
        .waiting-dots span:nth-child(2) { animation-delay: 0.2s; }
        .waiting-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.4; }
          40% { transform: scale(1.3); opacity: 1; }
        }

        .status-hint {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .validation-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .buzzer-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: var(--mime-primary, #00ff66);
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
        }

        .validation-text {
          font-size: 0.9rem;
          color: var(--text-primary, #fff);
        }

        .mime-status.active {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .active-line-1 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .active-verb {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .active-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: var(--mime-primary, #00ff66);
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
        }

        .active-hint {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .buzzer-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          padding: 0 16px 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
