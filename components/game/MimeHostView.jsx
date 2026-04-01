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
import useMimeRotation from '@/lib/hooks/useMimeRotation';
import useMimeTimer from '@/lib/hooks/useMimeTimer';
import useMimeBuzz from '@/lib/hooks/useMimeBuzz';
import useServerOffset from '@/lib/hooks/useServerOffset';
import { MIME_CONFIG, calculateMimePoints } from '@/lib/config/rooms';
import './MimeHostView.css';

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

    </div>
  );
}
