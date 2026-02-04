'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getApp } from 'firebase/app';
import { SkipForward } from 'lucide-react';
import BuzzValidationModal from '@/components/game/BuzzValidationModal';
import TimeUpModal from '@/components/game/TimeUpModal';
import DisconnectAlert from '@/components/game/DisconnectAlert';
import { motion, AnimatePresence } from 'framer-motion';
import MimeCard from '@/components/game-mime/MimeCard';
import Leaderboard from '@/components/game/Leaderboard';
import GamePlayHeader from '@/components/game/GamePlayHeader';
import GameStatusBanners from '@/components/game/GameStatusBanners';
import { GameEndTransition } from '@/components/transitions';
import { usePlayers } from '@/lib/hooks/usePlayers';
import { usePlayerCleanup } from '@/lib/hooks/usePlayerCleanup';
import { useRoomGuard } from '@/lib/hooks/useRoomGuard';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import useMimeRotation from '@/lib/hooks/useMimeRotation';
import useMimeTimer from '@/lib/hooks/useMimeTimer';
import useMimeBuzz from '@/lib/hooks/useMimeBuzz';
import useServerOffset from '@/lib/hooks/useServerOffset';
import { MIME_CONFIG, calculateMimePoints } from '@/lib/config/rooms';

/**
 * MimeHostView - Vue du mimeur
 * Structure calquée sur Quiz host view
 */
export default function MimeHostView({ code, isActualHost = true }) {
  const router = useRouter();
  const db = getDatabase(getApp());
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [words, setWords] = useState([]);
  const [myUid, setMyUid] = useState(null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const serverOffset = useServerOffset();
  const buzzWindowRef = useRef(null);

  // Keep screen awake
  useWakeLock({ enabled: true });

  // Récupérer l'UID
  useEffect(() => {
    import('firebase/auth').then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth(getApp());
      const unsub = onAuthStateChanged(auth, (user) => {
        setMyUid(user?.uid || null);
      });
      return () => unsub();
    });
  }, []);

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
    isHost: isActualHost
  });

  const {
    currentMimeUid,
    currentMimer,
    advanceToNextWord,
    currentIndex,
    totalWords
  } = useMimeRotation({ roomCode: code, meta, state, players });

  // Suis-je le mimeur?
  const isMimer = myUid === currentMimeUid;

  // Timer avec callback quand temps écoulé
  const handleTimeUp = useCallback(async () => {
    // Afficher la modal temps écoulé
    setShowTimeUp(true);
    // Attendre 2 secondes puis passer au mot suivant
    setTimeout(async () => {
      setShowTimeUp(false);
      await advanceToNextWord();
    }, 2000);
  }, [advanceToNextWord]);

  const {
    secondsLeft,
    percentLeft,
    isRunning,
    isPaused,
    isRevealed,
    isMimingStarted,
    revealWord,
    startMiming,
    pauseTimer,
    resumeTimer
  } = useMimeTimer({
    roomCode: code,
    state,
    isHost: isActualHost,
    isMimer,
    onTimeUp: handleTimeUp
  });

  const {
    lockedPlayer,
    pendingBuzzes,
    resolveBuzzes,
    validateCorrect,
    validateWrong,
    skipWord,
    cancelBuzz
  } = useMimeBuzz({
    roomCode: code,
    state,
    myUid,
    isMimer,
    isHost: isActualHost,
    serverOffset
  });

  // Résoudre les buzzes après la fenêtre de 150ms
  useEffect(() => {
    if (Object.keys(pendingBuzzes).length > 0 && !state?.lockUid && (isMimer || isActualHost)) {
      if (buzzWindowRef.current) {
        clearTimeout(buzzWindowRef.current);
      }

      buzzWindowRef.current = setTimeout(async () => {
        await resolveBuzzes();
        await pauseTimer();
      }, MIME_CONFIG.BUZZ_WINDOW_MS);
    }

    return () => {
      if (buzzWindowRef.current) {
        clearTimeout(buzzWindowRef.current);
      }
    };
  }, [pendingBuzzes, state?.lockUid, isMimer, isActualHost, resolveBuzzes, pauseTimer]);

  // Mot actuel
  const currentWord = words[currentIndex] || { word: '???', category: '' };

  // Gérer la révélation du mot (swipe)
  const handleReveal = useCallback(async () => {
    if (!isRevealed) {
      await revealWord();
    }
  }, [isRevealed, revealWord]);

  // Valider bonne réponse
  const handleCorrect = useCallback(async () => {
    await validateCorrect(secondsLeft);
    await advanceToNextWord();
  }, [validateCorrect, advanceToNextWord, secondsLeft]);

  // Rejeter mauvaise réponse
  const handleWrong = useCallback(async () => {
    await validateWrong();
    await resumeTimer();
  }, [validateWrong, resumeTimer]);

  // Annuler buzz accidentel
  const handleCancel = useCallback(async () => {
    await cancelBuzz();
    await resumeTimer();
  }, [cancelBuzz, resumeTimer]);

  // Skip le mot
  const handleSkip = useCallback(async () => {
    await skipWord();
    await advanceToNextWord();
  }, [skipWord, advanceToNextWord]);

  const progressLabel = totalWords ? `${currentIndex + 1} / ${totalWords}` : '';

  if (!meta || !state) {
    return (
      <div className="mime-host-page game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <div className="loading-spinner" style={{ width: 40, height: 40, border: '3px solid rgba(0,255,102,0.2)', borderTopColor: '#00ff66', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Chargement...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="mime-host-page game-page">
      {/* End transition */}
      <AnimatePresence>
        {showEndTransition && !meta?.closed && (
          <GameEndTransition
            variant="mime"
            onComplete={() => router.replace(`/mime/game/${code}/end`)}
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
          if (isActualHost) {
            await update(ref(db, `rooms_mime/${code}/state`), { phase: 'ended' });
            await update(ref(db, `rooms_mime/${code}/meta`), { closed: true });
          } else {
            await leaveRoom();
          }
          router.push('/home');
        }}
        exitMessage={isActualHost
          ? "Voulez-vous vraiment quitter ? La partie sera terminée pour tous."
          : "Voulez-vous vraiment quitter ? Votre score sera conservé."
        }
      />

      {/* Main Content */}
      <main className="game-content">
        {/* Timer Section - always visible */}
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
            <span className="points-item mimer">
              Mimeur: <strong>{calculateMimePoints(isMimingStarted ? secondsLeft : 30).mimerPoints} pts</strong>
            </span>
            <span className="points-separator">·</span>
            <span className="points-item guesser">
              Joueur: <strong>{calculateMimePoints(isMimingStarted ? secondsLeft : 30).guesserPoints} pts</strong>
            </span>
          </div>
        </div>

        {/* Word Card */}
        <div className="word-card-wrapper">
          <MimeCard
            word={currentWord.word}
            category={currentWord.category}
            onReveal={handleReveal}
            revealed={isRevealed}
            disabled={!!lockedPlayer}
          />
        </div>

        {/* Buzz Validation Modal */}
        <BuzzValidationModal
          isOpen={!!lockedPlayer}
          playerName={lockedPlayer?.name || ''}
          gameColor="#00ff66"
          points={calculateMimePoints(secondsLeft).guesserPoints}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
          onCancel={handleCancel}
        />

        {/* Time Up Modal */}
        <TimeUpModal
          isOpen={showTimeUp}
          gameColor="#00ff66"
          answer={currentWord.word}
          answerLabel="Le mot était"
        />

        {/* Action Zone - only show when no one has buzzed */}
        {!lockedPlayer && (
          <AnimatePresence mode="wait">
            {!isMimingStarted ? (
              <motion.div
                key="start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="start-zone"
              >
                <button
                  className={`btn-start-miming ${!isRevealed ? 'disabled' : ''}`}
                  onClick={isRevealed ? startMiming : undefined}
                  disabled={!isRevealed}
                >
                  <span>Je commence à mimer</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="skip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="skip-zone"
              >
                <button className="btn-skip" onClick={handleSkip}>
                  <SkipForward size={20} />
                  <span>Passer</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Leaderboard (always visible) */}
        <Leaderboard players={players} currentPlayerUid={myUid} />
      </main>

      {/* Disconnect Alert */}
      <DisconnectAlert
        roomCode={code}
        roomPrefix="rooms_mime"
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Game Status Banners */}
      <GameStatusBanners
        isHost={isActualHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />

      <style jsx>{`
        .mime-host-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .mime-host-page::before {
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

        .game-content {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          gap: 16px;
          overflow-y: auto;
          min-height: 0;
        }

        .timer-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 100%;
          max-width: 300px;
        }

        .timer-badge {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
        }

        .timer-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.5rem;
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
          width: 100%;
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

        .points-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .points-item strong {
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .points-item.mimer strong {
          color: #00ff66;
        }

        .points-item.guesser strong {
          color: #ffc800;
        }

        .points-separator {
          color: rgba(255, 255, 255, 0.3);
        }

        .word-card-wrapper {
          width: 100%;
          max-width: 280px;
          flex-shrink: 0;
        }

        .action-zone {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 52px;
          width: 100%;
        }

        .skip-zone,
        .start-zone {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 52px;
          width: 100%;
        }

        .btn-start-miming {
          padding: 14px 28px;
          background: linear-gradient(135deg, var(--mime-primary, #00ff66), #00cc52);
          border: none;
          border-radius: 12px;
          color: #000;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 255, 102, 0.3);
        }

        .btn-start-miming:active:not(.disabled) {
          transform: scale(0.95);
        }

        .btn-start-miming.disabled {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
          box-shadow: none;
          cursor: not-allowed;
        }

        .btn-skip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-skip:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
