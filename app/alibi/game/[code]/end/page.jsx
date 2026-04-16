"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, get, onValue, update,
  signInAnonymously, onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { EndScreenFooter } from "@/components/transitions";
import { hueScenariosService } from "@/lib/hue-module";
import { recordAlibiGame } from "@/lib/services/statsService";
import { storage } from "@/lib/utils/storage";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import { AlibiPartyEndScreen } from "@/components/game-alibi";
import { TrophyIcon, DefeatIcon } from './_components/AlibiEndIcons';
import './alibi-end.css';

export function AlibiEndContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;

  // Safe-area color continuity with the end screen dark background
  useAppShellBg('#0e0e1a');

  const [score, setScore] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [myGroupId, setMyGroupId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [groups, setGroups] = useState({});
  const [roomExists, setRoomExists] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  const isPartyMode = meta?.gameMasterMode === 'party';

  const animationStartedRef = useRef(false);
  const confettiTriggeredRef = useRef(false);
  const statsRecordedRef = useRef(false);
  const adShownRef = useRef(false);

  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  const { players: livePlayers } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Snapshot players on first load for stable end screen
  const playersSnapshotRef = useRef(null);
  if (livePlayers.length > 0 && playersSnapshotRef.current === null) {
    playersSnapshotRef.current = [...livePlayers];
  }
  const players = playersSnapshotRef.current || livePlayers;

  useRoomGuard({ roomCode: code, roomPrefix: 'rooms_alibi', playerUid: firebaseUser?.uid, isHost });
  useGameCompletion({ gameType: 'alibi', roomCode: code });

  // Mark returned from game
  useEffect(() => { storage.set('returnedFromGame', true); }, []);

  // Interstitial ad
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;
    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => console.log('[AlibiEnd] Interstitial ad error:', err));
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Auth (skip in dev mode)
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [devUid]);

  // Listen player team/group
  useEffect(() => {
    if (!code || !firebaseUser?.uid) return;
    const unsub = onValue(ref(db, `rooms_alibi/${code}/players/${firebaseUser.uid}`), (snap) => {
      const player = snap.val();
      if (player) { setMyTeam(player.team); setMyGroupId(player.groupId || null); }
    });
    return () => unsub();
  }, [code, firebaseUser?.uid]);

  // Listen meta
  useEffect(() => {
    if (!code || !firebaseUser?.uid) return;
    const unsub = onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
      const m = snap.val();
      setMeta(m);
      setIsHost(m?.hostUid === firebaseUser.uid);
      if (!m || m.closed) setRoomExists(false);
    });
    return () => unsub();
  }, [code, firebaseUser?.uid]);

  // Listen groups (Party Mode)
  useEffect(() => {
    if (!code) return;
    const unsub = onValue(ref(db, `rooms_alibi/${code}/groups`), (snap) => { setGroups(snap.val() || {}); });
    return () => unsub();
  }, [code]);

  const hostPresent = roomExists && meta && !meta.closed;

  // Load score once
  useEffect(() => {
    if (!code || isPartyMode) return;
    get(ref(db, `rooms_alibi/${code}/score`)).then((snap) => {
      const s = snap.val() || { correct: 0, total: 10 };
      setScore(s);
      setTimeout(() => setIsLoaded(true), 100);
    });
  }, [code, isPartyMode]);

  // Redirect on lobby phase
  useEffect(() => {
    if (!code) return;
    const unsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "lobby" && hostPresent) router.push(`/alibi/room/${code}`);
    });
    return () => unsub();
  }, [code, router, hostPresent]);

  // Party Mode: set loaded when groups have scores
  useEffect(() => {
    if (!isPartyMode) return;
    const groupIds = Object.keys(groups).filter(id => id.startsWith('group'));
    if (groupIds.length > 0 && groupIds.some(id => groups[id]?.score)) {
      setTimeout(() => setIsLoaded(true), 100);
    }
  }, [isPartyMode, groups]);

  const handleReturnToLobby = async () => {
    if (!isHost) return;
    if (isPartyMode) {
      const groupUpdates = {};
      Object.keys(groups).filter(id => id.startsWith('group')).forEach(groupId => {
        groupUpdates[`groups/${groupId}/score`] = { correct: 0, total: 0 };
        groupUpdates[`groups/${groupId}/alibiId`] = null;
        groupUpdates[`groups/${groupId}/alibiData`] = null;
      });
      await update(ref(db, `rooms_alibi/${code}`), {
        ...groupUpdates,
        state: {
          phase: "lobby", currentQuestion: 0, prepTimeLeft: 90, questionTimeLeft: 30,
          allAnswered: false, currentRound: null, totalRounds: null,
          inspectorGroupId: null, accusedGroupId: null, roundRotation: null
        },
        interrogation: null
      });
    } else {
      await update(ref(db, `rooms_alibi/${code}`), {
        state: { phase: "lobby", currentQuestion: 0, prepTimeLeft: 90, questionTimeLeft: 30, allAnswered: false },
        interrogation: null, questions: null, alibi: null
      });
    }
    router.push(`/alibi/room/${code}`);
  };

  // Score computation
  const percentage = score ? Math.round((score.correct / score.total) * 100) : 0;
  const isSuccess = percentage >= 50;

  // Record stats once
  useEffect(() => {
    if (statsRecordedRef.current) return;
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    if (!myTeam || score === null) return;
    statsRecordedRef.current = true;
    const suspectsWon = percentage >= 50;
    const myTeamWon = (myTeam === 'suspects' && suspectsWon) || (myTeam === 'inspectors' && !suspectsWon);
    recordAlibiGame({ role: myTeam === 'suspects' ? 'accused' : 'detective', won: myTeamWon, score: percentage });
  }, [firebaseUser, myTeam, score, percentage]);

  // Animated score counter + confetti
  useEffect(() => {
    if (!score || animationStartedRef.current) return;
    animationStartedRef.current = true;

    if (score.correct === 0) {
      setDisplayScore(0);
      setTimeout(() => {
        if (!confettiTriggeredRef.current) {
          confettiTriggeredRef.current = true;
          hueScenariosService.trigger('alibi', 'defeat');
        }
        setShowMessage(true);
      }, 500);
      return;
    }

    let current = 0;
    const target = score.correct;
    const increment = target / (2000 / 50);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
        setTimeout(() => {
          if (!confettiTriggeredRef.current) {
            confettiTriggeredRef.current = true;
            hueScenariosService.trigger('alibi', isSuccess ? 'victory' : 'defeat');
          }
        }, 300);
        setTimeout(() => setShowMessage(true), 800);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [score]);

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton !";
    if (percentage >= 80) return "Excellent ! Très crédible !";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant !";
    if (percentage >= 50) return "Passable... Quelques failles...";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences !";
    return "Alibi effondré ! Trop d'erreurs !";
  };

  // ── PARTY MODE ──
  if (isPartyMode && isLoaded) {
    return (
      <div className="alibi-end-screen game-page">
        <div className="alibi-end-container">
          <AlibiPartyEndScreen
            groups={groups} myGroupId={myGroupId} isHost={isHost}
            onNewGame={handleReturnToLobby} onGoHome={() => router.push('/home')}
            hostPresent={hostPresent}
          />
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (!isLoaded || !score) {
    return (
      <div className="alibi-end-screen game-page">
        <div className="alibi-end-container centered">
          <main className="alibi-end-content">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alibi-end-loading">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="alibi-end-loading-icon">
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none">
                  <motion.circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 20" />
                </svg>
              </motion.div>
              <p className="alibi-end-loading-text">Calcul des résultats...</p>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  // ── GAME MASTER MODE ──
  return (
    <div className="alibi-end-screen game-page">
      <div className="alibi-end-container">
        <main className="alibi-end-content">
          <motion.div
            className="alibi-end-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            data-success={isSuccess}
          >
            <div className="alibi-end-icon">
              {isSuccess ? <TrophyIcon size={100} /> : <DefeatIcon size={100} />}
            </div>

            <motion.h1 className="alibi-end-title" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              {isSuccess ? "Alibi Validé" : "Alibi Rejeté"}
            </motion.h1>

            <motion.div
              className="alibi-end-score-container"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <motion.span
                className="alibi-end-score"
                data-success={isSuccess}
                animate={{
                  scale: displayScore === score.correct ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: 0.5 }}
              >
                {displayScore}
              </motion.span>
              <span className="alibi-end-score-separator">/</span>
              <span className="alibi-end-score-total">{score.total}</span>
            </motion.div>

            <motion.div className="alibi-end-percentage" data-success={isSuccess} initial={{ opacity: 0 }} animate={{ opacity: displayScore === score.correct ? 1 : 0.5 }}>
              {Math.round((displayScore / score.total) * 100)}%
            </motion.div>

            <AnimatePresence>
              {showMessage && (
                <motion.div
                  className="alibi-end-message" data-success={isSuccess}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <motion.p animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    {getMessage()}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        <div className="alibi-end-footer-wrap">
          <EndScreenFooter
            gameColor="#f59e0b"
            label={!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
            onNewGame={() => {
              if (!hostPresent) router.push('/home');
              else if (isHost) handleReturnToLobby();
              else router.push(`/alibi/room/${code}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AlibiEnd() {
  const { code } = useParams();
  return <AlibiEndContent code={code} />;
}
