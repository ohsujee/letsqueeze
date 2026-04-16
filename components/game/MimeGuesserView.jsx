'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import Buzzer from '@/components/game/Buzzer';
import Leaderboard from '@/components/game/Leaderboard';
import GamePlayHeader from '@/components/game/GamePlayHeader';
import GameStatusBanners from '@/components/game/GameStatusBanners';
import DisconnectAlert from '@/components/game/DisconnectAlert';
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
import { calculateMimePoints, MIME_CONFIG } from '@/lib/config/rooms';
import { getFlatCSSVars } from '@/lib/config/colors';
import './MimeGuesserView.css';

/**
 * MimeGuesserView - Vue des devineurs (pas le mimeur)
 * Structure calquée sur Quiz play page
 */
export default function MimeGuesserView({ code, myUid, devMode = false }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devMode ? noopRouter : nextRouter;
  const db = getDatabase(getApp());
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [words, setWords] = useState([]);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const timeUpShownRef = useRef(false);

  // Server time sync (like Quiz)
  const { serverNow, offset } = useServerTime(300);

  // Sounds
  const playBuzz = useSound('/sounds/quiz-buzzer.wav');

  // Listeners Firebase
  useEffect(() => {
    if (!code) return;

    const metaRef = ref(db, `rooms_mime/${code}/meta`);
    const stateRef = ref(db, `rooms_mime/${code}/state`);
    const wordsRef = ref(db, `rooms_mime/${code}/words`);

    const unsubMeta = onValue(metaRef, (snap) => setMeta(snap.val()));
    const unsubState = onValue(stateRef, (snap) => {
      const v = snap.val();
      setState(v);
      if (v?.phase === 'ended' && !endTransitionTriggeredRef.current) {
        endTransitionTriggeredRef.current = true;
        setShowEndTransition(true);
      }
    });
    const unsubWords = onValue(wordsRef, (snap) => setWords(snap.val() || []));

    return () => {
      unsubMeta();
      unsubState();
      unsubWords();
    };
  }, [db, code]);

  // Hooks
  const { players } = usePlayers({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    sort: 'score'
  });
  // Use myUid (dev-aware) to find me, not auth.currentUser
  const me = players.find(p => p.uid === myUid);

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
    timeLeft,
    secondsLeft,
    percentLeft,
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
        // Auto-hide après 3.5s — laisse le temps de lire le mot révélé
        setTimeout(() => {
          setShowTimeUp(false);
        }, 3500);
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
  const currentWord = words[currentIndex] || { word: '', category: '' };

  // Bar animation state — drive purely by CSS for 60fps native fluidity
  const barAnimState = !isMimingStarted ? 'idle' : isPaused ? 'paused' : 'running';
  // Compute initial offset so the animation starts at the correct visual position
  // (handles resume after pause via elapsedAcc + revealedAt diff)
  const barDelaySec = (() => {
    if (!isMimingStarted) return 0;
    const elapsedAcc = state?.elapsedAcc || 0;
    const revealedAt = state?.revealedAt || 0;
    const pausedAt = state?.pausedAt || null;
    const sinceReveal = pausedAt ? (pausedAt - revealedAt) : (Date.now() - revealedAt);
    const totalElapsedMs = elapsedAcc + Math.max(0, sinceReveal);
    return -Math.min(totalElapsedMs, MIME_CONFIG.TIMER_DURATION_MS) / 1000;
  })();

  if (!meta || !state) {
    return <div style={{ flex: 1, minHeight: 0, background: '#059669' }} />;
  }

  return (
    <div className={`mime-play-page game-page ${isMyTurn ? 'my-turn' : ''}`} style={getFlatCSSVars('mime')}>
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
              boxShadow: 'inset 0 0 60px 5px rgba(5, 150, 105, 0.2)'
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

      {/* Main Content */}
      <main className="game-content">
        {/* Mime Card — flip entre état normal, buzz et correct reveal */}
        <div className="mime-card-wrapper">
          <AnimatePresence mode="wait">
            {state?.correctReveal ? (
              <motion.div
                key="correct"
                className="mime-card correct-reveal"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mime-correct-label">
                  <span>✓</span>
                  <span>Bonne réponse !</span>
                </div>
                <span className="mime-correct-name">
                  {state.correctReveal.name} <span className="mime-correct-points">+{state.correctReveal.guesserPoints} pts</span>
                </span>
              </motion.div>
            ) : state?.lockUid && state?.lockUid !== myUid ? (
              <motion.div
                key="buzz"
                className="mime-card buzz-active"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mime-buzz-label">
                  <span>🔔</span>
                  <span>Buzz de</span>
                </div>
                <span className="mime-buzz-name">
                  {lockedPlayer?.name || 'Joueur'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                className="mime-card"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Header: timer + bar + points on one line */}
                <div className="mime-card-header">
                  <span className="mime-timer-compact">
                    <span className="mime-timer-value">{isMimingStarted ? secondsLeft : 30}</span>s
                  </span>
                  <div className="mime-timer-bar">
                    <div
                      key={`bar-${state?.currentIndex ?? 0}-${state?.revealedAt ?? 0}`}
                      className={`mime-timer-bar-fill ${barAnimState}`}
                      style={{
                        '--bar-duration': `${MIME_CONFIG.TIMER_DURATION_MS / 1000}s`,
                        '--bar-delay': `${barDelaySec}s`,
                      }}
                    />
                  </div>
                  <span className="mime-points-compact">
                    <strong>{calculateMimePoints(isMimingStarted ? timeLeft / 1000 : 30).guesserPoints}</strong> pts
                  </span>
                </div>

                {/* Status: 1 ligne unique */}
                <div className="mime-card-status">
                  {!isMimingStarted ? (
                    <span className="mime-status-line">
                      <strong>{currentMimer?.name || '...'}</strong>
                      {' '}{isRevealed ? 'va commencer' : 'prépare son mime'}
                      {!isRevealed && (
                        <span className="waiting-dots">
                          <span></span><span></span><span></span>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="mime-status-line">
                      <strong>{currentMimer?.name || '...'}</strong> mime — observe et buzze
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Time Up Modal — montre le mot aux devineurs (qui ne l'ont pas vu) */}
        <TimeUpModal
          isOpen={showTimeUp}
          gameColor="#059669"
          subtitle="Personne n'a trouvé"
          answer={currentWord.word}
          answerLabel="Le mot était"
        />

        {/* Bravo modal — uniquement pour le gagnant */}
        <AnimatePresence>
          {state?.correctReveal && state.correctReveal.uid === myUid && (
            <>
              <motion.div
                className="mime-bravo-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <div className="mime-bravo-container">
                <motion.div
                  className="mime-bravo-card"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="mime-bravo-icon">🎉</div>
                  <h2 className="mime-bravo-title">Bravo !</h2>
                  <p className="mime-bravo-subtitle">Tu as trouvé la bonne réponse</p>
                  <div className="mime-bravo-points">
                    +{state.correctReveal.guesserPoints} pts
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

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
