'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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
import HostActionFooter from '@/components/game/HostActionFooter';
import useMimeTimer from '@/lib/hooks/useMimeTimer';
import useMimeBuzz from '@/lib/hooks/useMimeBuzz';
import useServerOffset from '@/lib/hooks/useServerOffset';
import useAutoUnblockPenalty from '@/lib/hooks/useAutoUnblockPenalty';
import { MIME_CONFIG, calculateMimePoints } from '@/lib/config/rooms';
import { getFlatCSSVars } from '@/lib/config/colors';
import './MimeHostView.css';

/**
 * MimeHostView - Vue du mimeur
 * Structure calquée sur Quiz host view
 */
export default function MimeHostView({ code, isActualHost = true, myUid: devUid, devMode = false }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devMode ? noopRouter : nextRouter;
  const db = getDatabase(getApp());
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [words, setWords] = useState([]);
  const [myUid, setMyUid] = useState(devUid || null);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const endTransitionTriggeredRef = useRef(false);
  const serverOffset = useServerOffset();
  const buzzWindowRef = useRef(null);

  // Récupérer l'UID (skip in dev mode — devUid takes priority)
  useEffect(() => {
    if (devUid) return;
    const auth = getAuth(getApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return () => unsub();
  }, [devUid]);

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
  const { players, activePlayers } = usePlayers({
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
    isHost: isActualHost
  });

  const {
    currentMimeUid,
    currentMimer,
    advanceToNextWord,
    announceNextMimer,
    currentIndex,
    totalWords
  } = useMimeRotation({ roomCode: code, meta, state, players });

  // Suis-je le mimeur?
  const isMimer = myUid === currentMimeUid;

  // Timer avec callback quand temps écoulé
  const handleTimeUp = useCallback(async () => {
    // Afficher la modal temps écoulé
    setShowTimeUp(true);
    // 3.5s — laisse le temps aux devineurs de lire le mot révélé
    setTimeout(async () => {
      setShowTimeUp(false);
      // Annonce le prochain mimeur (transition affichée chez tous les clients)
      await announceNextMimer();
      // Laisse la transition tourner ~1.6s avant le swap effectif
      setTimeout(async () => {
        await advanceToNextWord();
      }, 1600);
    }, 3500);
  }, [advanceToNextWord, announceNextMimer]);

  const {
    timeLeft,
    secondsLeft,
    percentLeft,
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

  // Pauser le timer dès qu'un buzz est verrouillé (utile pour les fake players du simulateur
  // qui écrivent directement lockUid sans passer par pendingBuzzes)
  useEffect(() => {
    if (state?.lockUid && !state?.pausedAt && state?.revealedAt && (isMimer || isActualHost)) {
      pauseTimer();
    }
  }, [state?.lockUid, state?.pausedAt, state?.revealedAt, isMimer, isActualHost, pauseTimer]);

  // Auto-unblock si tous les joueurs éligibles (non-mimeur) sont en pénalité
  useAutoUnblockPenalty({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    eligiblePlayers: activePlayers.filter(p => p.uid !== state?.currentMimeUid),
    serverNow: Date.now() + serverOffset,
    canWrite: isMimer || isActualHost,
    enabled: !!state?.revealedAt && !state?.pausedAt,
  });

  // Mot actuel
  const currentWord = words[currentIndex] || { word: '???', category: '' };

  // Bar animation state — 100% CSS for native 60fps fluidity
  const barAnimState = !isMimingStarted ? 'idle' : isPaused ? 'paused' : 'running';
  const barDelaySec = (() => {
    if (!isMimingStarted) return 0;
    const elapsedAcc = state?.elapsedAcc || 0;
    const revealedAt = state?.revealedAt || 0;
    const pausedAt = state?.pausedAt || null;
    const sinceReveal = pausedAt ? (pausedAt - revealedAt) : (Date.now() - revealedAt);
    const totalElapsedMs = elapsedAcc + Math.max(0, sinceReveal);
    return -Math.min(totalElapsedMs, MIME_CONFIG.TIMER_DURATION_MS) / 1000;
  })();

  // Gérer la révélation du mot (swipe)
  const handleReveal = useCallback(async () => {
    if (!isRevealed) {
      await revealWord();
    }
  }, [isRevealed, revealWord]);

  // Valider bonne réponse — écrit correctReveal (scores + anim), attend, transition, avance
  const handleCorrect = useCallback(async () => {
    await validateCorrect(secondsLeft);
    // Reveal vert "X a trouvé" pendant 2.5s
    await new Promise((r) => setTimeout(r, 2500));
    // Annonce le prochain mimeur (transition full-screen sur tous les clients)
    await announceNextMimer();
    // Laisse la transition tourner ~1.6s avant le swap effectif (état Firebase)
    await new Promise((r) => setTimeout(r, 1600));
    await advanceToNextWord();
  }, [validateCorrect, advanceToNextWord, announceNextMimer, secondsLeft]);

  // Rejeter mauvaise réponse
  const handleWrong = useCallback(async () => {
    await validateWrong();
    await resumeTimer();
  }, [validateWrong, resumeTimer]);

  // Passer le mot — transition vers prochain mimeur
  const handleSkipWord = useCallback(async () => {
    await announceNextMimer();
    await new Promise((r) => setTimeout(r, 1600));
    await advanceToNextWord();
  }, [announceNextMimer, advanceToNextWord]);

  // Terminer la partie — passe en phase ended
  const handleEndGame = useCallback(async () => {
    await update(ref(db, `rooms_mime/${code}/state`), { phase: 'ended' });
  }, [db, code]);

  // Annuler buzz accidentel
  const handleCancel = useCallback(async () => {
    await cancelBuzz();
    await resumeTimer();
  }, [cancelBuzz, resumeTimer]);


  const progressLabel = totalWords ? `${currentIndex + 1} / ${totalWords}` : '';

  if (!meta || !state) {
    return <div style={{ flex: 1, minHeight: 0, background: '#059669' }} />;
  }

  return (
    <div className="mime-host-page game-page" style={getFlatCSSVars('mime')}>
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
        {/* Timer Section — compact 1 ligne */}
        <div className="mime-host-timer">
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
            <strong>{calculateMimePoints(isMimingStarted ? timeLeft / 1000 : 30).mimerPoints}</strong> pts
          </span>
        </div>

        {/* Word Card (ou card reveal pendant les 2.5s post-correct) */}
        <div className="word-card-wrapper">
          <AnimatePresence mode="wait">
            {state?.correctReveal ? (
              <motion.div
                key="reveal"
                className="mime-host-reveal"
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mime-host-reveal-label">
                  <span>✓</span>
                  <span>{state.correctReveal.name} a trouvé</span>
                </div>
                <div className="mime-host-reveal-points">
                  +{state.correctReveal.mimerPoints} pts
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="word"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MimeCard
                  word={currentWord.word}
                  category={currentWord.category}
                  onReveal={handleReveal}
                  revealed={isRevealed}
                  disabled={!!lockedPlayer}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Buzz Validation Modal — fermée pendant le reveal pour laisser l'anim */}
        <BuzzValidationModal
          isOpen={!!lockedPlayer && !state?.correctReveal}
          playerName={lockedPlayer?.name || ''}
          gameColor="#059669"
          points={calculateMimePoints(secondsLeft).guesserPoints}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
          onCancel={handleCancel}
        />

        {/* Time Up Modal */}
        <TimeUpModal
          isOpen={showTimeUp}
          gameColor="#059669"
          answer={currentWord.word}
          answerLabel="Le mot était"
        />

        {/* Bouton "Lancer le chrono" — visible uniquement avant le démarrage */}
        {!isMimingStarted && !lockedPlayer && (
          <div className="start-zone">
            <button
              className={`btn-start-miming ${!isRevealed ? 'disabled' : ''}`}
              onClick={isRevealed ? startMiming : undefined}
              disabled={!isRevealed}
            >
              <span>Lancer le chrono</span>
            </button>
          </div>
        )}

        {/* Leaderboard (always visible) */}
        <Leaderboard players={players} currentPlayerUid={myUid} />
      </main>

      {/* Host action footer — Passer / Fin avec modales de confirmation */}
      {(isMimer || isActualHost) && (
        <HostActionFooter
          onSkip={handleSkipWord}
          onEnd={handleEndGame}
          skipLabel="Passer"
          skipMessage="Le mot sera passé et personne ne marquera de points."
        />
      )}

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
