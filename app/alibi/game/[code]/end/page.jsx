"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  signInAnonymously,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from "@/lib/components/BottomNav";
import { EndScreenFooter } from "@/components/transitions";
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { hueScenariosService } from "@/lib/hue-module";
import { recordAlibiGame } from "@/lib/services/statsService";
import { storage } from "@/lib/utils/storage";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { usePlayers } from "@/lib/hooks/usePlayers";

/**
 * Icône Trophy animée pour la victoire
 */
function TrophyIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Coupe du trophée */}
        <motion.path
          d="M6 4H18V9C18 12.5 15.5 14 12 14C8.5 14 6 12.5 6 9V4Z"
          fill="url(#trophyGold)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
        />
        {/* Anse gauche */}
        <motion.path
          d="M6 5H4.5C4 5 3.5 5.5 3.5 6V7.5C3.5 8.5 4.5 9.5 5.5 9.5H6"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        {/* Anse droite */}
        <motion.path
          d="M18 5H19.5C20 5 20.5 5.5 20.5 6V7.5C20.5 8.5 19.5 9.5 18.5 9.5H18"
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        {/* Tige - connectée directement à la coupe (y=14) */}
        <motion.rect
          x="10"
          y="14"
          width="4"
          height="4"
          fill="#f59e0b"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
          style={{ transformOrigin: '12px 14px' }}
        />
        {/* Base du trophée - connectée à la tige (y=18) */}
        <motion.path
          d="M8 18H16V20C16 20.5 15.5 21 15 21H9C8.5 21 8 20.5 8 20V18Z"
          fill="#d97706"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.1, type: "spring" }}
        />
        <defs>
          <linearGradient id="trophyGold" x1="6" y1="4" x2="18" y2="14">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

/**
 * Icône Skull animée pour la défaite
 */
function DefeatIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      {/* Glow rouge */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        {/* Tête */}
        <motion.path
          d="M12 2C7 2 4 6 4 10C4 13 5 15 7 16V19C7 20 8 21 9 21H15C16 21 17 20 17 19V16C19 15 20 13 20 10C20 6 17 2 12 2Z"
          fill="url(#skullGrad)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        {/* Yeux X */}
        <motion.path
          d="M8 9L10 11M10 9L8 11"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
        <motion.path
          d="M14 9L16 11M16 9L14 11"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />
        {/* Nez */}
        <motion.path
          d="M12 12V14"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, delay: 1 }}
        />
        {/* Dents */}
        <motion.path
          d="M9 17V19M12 17V19M15 17V19"
          stroke="#1a1a2e"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.1 }}
        />
        <defs>
          <linearGradient id="skullGrad" x1="4" y1="2" x2="20" y2="21">
            <stop stopColor="#f87171" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

export default function AlibiEnd() {
  const { code } = useParams();
  const router = useRouter();

  const [score, setScore] = useState(null); // null = loading
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [roomExists, setRoomExists] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Refs pour éviter les re-renders qui relancent l'animation
  const animationStartedRef = useRef(false);
  const confettiTriggeredRef = useRef(false);
  const statsRecordedRef = useRef(false);
  const adShownRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_alibi' });

  // Room guard - détecte fermeture room par l'hôte
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_alibi',
    playerUid: firebaseUser?.uid,
    isHost
  });

  // Record game completion (for daily limits)
  useGameCompletion({ gameType: 'alibi', roomCode: code });

  // Mark that user completed a game (for guest prompt on home)
  useEffect(() => {
    storage.set('returnedFromGame', true);
  }, []);

  // Show interstitial ad before showing results (for non-Pro users)
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[AlibiEnd] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Auth - only set firebaseUser
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Listen to player team - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !firebaseUser?.uid) return;

    const playerRef = ref(db, `rooms_alibi/${code}/players/${firebaseUser.uid}`);
    const unsub = onValue(playerRef, (snap) => {
      const player = snap.val();
      if (player) setMyTeam(player.team);
    });

    return () => unsub();
  }, [code, firebaseUser?.uid]);

  // Listen to meta - separate effect with proper cleanup
  useEffect(() => {
    if (!code || !firebaseUser?.uid) return;

    const metaRef = ref(db, `rooms_alibi/${code}/meta`);
    const unsub = onValue(metaRef, (snap) => {
      const m = snap.val();
      setMeta(m);
      setIsHost(m?.hostUid === firebaseUser.uid);
      // Track room existence
      if (!m || m.closed) {
        setRoomExists(false);
      }
    });

    return () => unsub();
  }, [code, firebaseUser?.uid]);

  // Computed: is host still present?
  const hostPresent = roomExists && meta && !meta.closed;

  useEffect(() => {
    if (!code) return;

    const scoreUnsub = onValue(ref(db, `rooms_alibi/${code}/score`), (snap) => {
      const s = snap.val() || { correct: 0, total: 10 };
      setScore(s);
      // Petit délai pour une transition fluide
      setTimeout(() => setIsLoaded(true), 100);
    });

    // Redirection automatique quand l'hôte retourne au lobby (seulement si l'hôte est présent)
    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "lobby" && hostPresent) {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      scoreUnsub();
      stateUnsub();
    };
  }, [code, router, hostPresent]);


  const handleReturnToLobby = async () => {
    if (!isHost) return;

    // Retourner au lobby SANS réinitialiser les scores
    // Les scores seront réinitialisés au prochain démarrage de partie
    await update(ref(db, `rooms_alibi/${code}`), {
      state: {
        phase: "lobby",
        currentQuestion: 0,
        prepTimeLeft: 90,
        questionTimeLeft: 30,
        allAnswered: false
      },
      interrogation: null,
      questions: null,
      alibi: null
    });

    router.push(`/alibi/room/${code}`);
  };

  // Attendre que le score soit chargé pour calculer
  const percentage = score ? Math.round((score.correct / score.total) * 100) : 0;
  const isSuccess = percentage >= 50;

  // Record stats once when we have all data
  useEffect(() => {
    // Skip if already recorded or missing data
    if (statsRecordedRef.current) return;
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    if (!myTeam || score === null) return;

    // Mark as recorded to prevent duplicates
    statsRecordedRef.current = true;

    // Determine if my team won
    // Accused team wins if isSuccess (>= 50%), Detectives win if not
    const accusedWon = percentage >= 50;
    const myTeamWon = (myTeam === 'accused' && accusedWon) || (myTeam === 'detectives' && !accusedWon);

    // Record the game with score (correct answers)
    recordAlibiGame({
      role: myTeam,
      won: myTeamWon,
      score: score?.correct || 0
    });
  }, [firebaseUser, myTeam, score, percentage]);

  // Animated score counter + confetti (une seule fois)
  useEffect(() => {
    // Ne pas relancer si déjà démarré ou pas de score
    if (!score || animationStartedRef.current) return;

    // Marquer comme démarré immédiatement
    animationStartedRef.current = true;

    // Si score = 0, afficher directement sans animation
    if (score.correct === 0) {
      setDisplayScore(0);
      setTimeout(() => {
        if (!confettiTriggeredRef.current) {
          confettiTriggeredRef.current = true;
          ParticleEffects.wrongAnswer();
          hueScenariosService.trigger('alibi', 'defeat');
        }
        setShowMessage(true);
      }, 500);
      return;
    }

    let current = 0;
    const target = score.correct;
    const duration = 2000;
    const increment = target / (duration / 50);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);

        // Trigger confetti et Hue après le compteur
        setTimeout(() => {
          if (!confettiTriggeredRef.current) {
            confettiTriggeredRef.current = true;
            if (isSuccess) {
              ParticleEffects.celebrate('high');
              hueScenariosService.trigger('alibi', 'victory');
            } else {
              ParticleEffects.wrongAnswer();
              hueScenariosService.trigger('alibi', 'defeat');
            }
          }
        }, 300);

        // Message après confetti
        setTimeout(() => setShowMessage(true), 800);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [score, isSuccess]); // Plus de confettiTriggered dans les deps !

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton !";
    if (percentage >= 80) return "Excellent ! Très crédible !";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant !";
    if (percentage >= 50) return "Passable... Quelques failles...";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences !";
    return "Alibi effondré ! Trop d'erreurs !";
  };

  // Écran de chargement pendant que le score charge
  if (!isLoaded || !score) {
    return (
      <div className="alibi-end-screen game-page">
        <div className="alibi-end-container">
          <main className="alibi-end-content">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="alibi-end-loading"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="alibi-end-loading-icon"
              >
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none">
                  <motion.circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="40 20"
                  />
                </svg>
              </motion.div>
              <p className="alibi-end-loading-text">Calcul des résultats...</p>
            </motion.div>
          </main>
        </div>

        <style jsx global>{`
          .alibi-end-screen {
            flex: 1 !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            background: #0a0a0f !important;
          }
          .alibi-end-container {
            flex: 1 !important;
            min-height: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .alibi-end-loading {
            text-align: center !important;
          }
          .alibi-end-loading-icon {
            margin-bottom: 1rem !important;
            display: flex !important;
            justify-content: center !important;
          }
          .alibi-end-loading-text {
            font-family: 'Inter', sans-serif !important;
            font-size: 1.25rem !important;
            color: rgba(255, 255, 255, 0.7) !important;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="alibi-end-screen game-page">
      <div className="alibi-end-container">
        <main className="alibi-end-content">
          {/* Carte principale avec score */}
          <motion.div
            className="alibi-end-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            data-success={isSuccess}
          >
            {/* Background glow */}
            <div className="alibi-end-glow" data-success={isSuccess} />

            {/* Icône animée */}
            <div className="alibi-end-icon">
              {isSuccess ? <TrophyIcon size={100} /> : <DefeatIcon size={100} />}
            </div>

            {/* Titre */}
            <motion.h1
              className="alibi-end-title"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isSuccess ? "Alibi Validé" : "Alibi Rejeté"}
            </motion.h1>

            {/* Score animé */}
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
                  textShadow: displayScore === score.correct
                    ? isSuccess
                      ? ['0 0 30px rgba(16, 185, 129, 0.6)', '0 0 60px rgba(16, 185, 129, 0.9)', '0 0 30px rgba(16, 185, 129, 0.6)']
                      : ['0 0 30px rgba(239, 68, 68, 0.6)', '0 0 60px rgba(239, 68, 68, 0.9)', '0 0 30px rgba(239, 68, 68, 0.6)']
                    : undefined
                }}
                transition={{ duration: 0.5, textShadow: { duration: 1.5, repeat: Infinity } }}
              >
                {displayScore}
              </motion.span>
              <span className="alibi-end-score-separator">/</span>
              <span className="alibi-end-score-total">{score.total}</span>
            </motion.div>

            {/* Pourcentage */}
            <motion.div
              className="alibi-end-percentage"
              data-success={isSuccess}
              initial={{ opacity: 0 }}
              animate={{ opacity: displayScore === score.correct ? 1 : 0.5 }}
            >
              {Math.round((displayScore / score.total) * 100)}%
            </motion.div>

            {/* Message */}
            <AnimatePresence>
              {showMessage && (
                <motion.div
                  className="alibi-end-message"
                  data-success={isSuccess}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <motion.p
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {getMessage()}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* End Screen Footer */}
          <EndScreenFooter
            gameColor="#f59e0b"
            label={!hostPresent
              ? "L'hote a quitte la partie"
              : isHost
                ? "Vous pourrez choisir un nouvel alibi"
                : "Retourne au lobby pour la prochaine partie"
            }
            onNewGame={() => {
              if (!hostPresent) {
                router.push('/home');
              } else if (isHost) {
                handleReturnToLobby();
              } else {
                router.push(`/alibi/room/${code}`);
              }
            }}
            buttonText={!hostPresent ? "Retour a l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
          />
        </main>

        <BottomNav />

        <style jsx global>{`
          /* ===== ALIBI END SCREEN - Style Guide Compliant ===== */

          .alibi-end-screen {
            flex: 1 !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            background: #0a0a0f !important;
            position: relative !important;
          }

          /* Animated background */
          .alibi-end-screen::before {
            content: '' !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 0 !important;
            background:
              radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 80%, rgba(251, 191, 36, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 60%, rgba(180, 83, 9, 0.08) 0%, transparent 50%),
              #0a0a0f !important;
            pointer-events: none !important;
          }

          .alibi-end-container {
            flex: 1 !important;
            min-height: 0 !important;
            position: relative !important;
            z-index: 1 !important;
            padding-bottom: 100px !important;
            overflow-y: auto !important;
          }

          .alibi-end-content {
            max-width: 500px !important;
            margin: 0 auto !important;
            padding: 2rem 1.5rem !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
          }

          /* Main card */
          .alibi-end-card {
            position: relative !important;
            background: rgba(20, 20, 30, 0.85) !important;
            border-radius: 24px !important;
            padding: 2rem !important;
            text-align: center !important;
            border: 1px solid rgba(245, 158, 11, 0.2) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            overflow: hidden !important;
          }

          .alibi-end-card[data-success="true"] {
            border-color: rgba(16, 185, 129, 0.3) !important;
            box-shadow:
              0 0 40px rgba(16, 185, 129, 0.2),
              0 8px 32px rgba(0, 0, 0, 0.4) !important;
          }

          .alibi-end-card[data-success="false"] {
            border-color: rgba(239, 68, 68, 0.3) !important;
            box-shadow:
              0 0 40px rgba(239, 68, 68, 0.2),
              0 8px 32px rgba(0, 0, 0, 0.4) !important;
          }

          /* Background glow effect */
          .alibi-end-glow {
            position: absolute !important;
            top: -50% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 200% !important;
            height: 200% !important;
            pointer-events: none !important;
            z-index: 0 !important;
          }

          .alibi-end-glow[data-success="true"] {
            background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 50%) !important;
          }

          .alibi-end-glow[data-success="false"] {
            background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 50%) !important;
          }

          /* Icon container */
          .alibi-end-icon {
            position: relative !important;
            z-index: 1 !important;
            display: flex !important;
            justify-content: center !important;
            margin-bottom: 1rem !important;
          }

          /* Title - Bungee font */
          .alibi-end-title {
            position: relative !important;
            z-index: 1 !important;
            font-family: 'Bungee', cursive !important;
            font-size: clamp(1.5rem, 6vw, 2.5rem) !important;
            font-weight: 400 !important;
            color: white !important;
            margin: 0 0 1.5rem 0 !important;
            text-transform: uppercase !important;
            text-shadow:
              0 0 20px rgba(245, 158, 11, 0.5),
              0 0 40px rgba(245, 158, 11, 0.3) !important;
          }

          /* Score container */
          .alibi-end-score-container {
            position: relative !important;
            z-index: 1 !important;
            display: flex !important;
            align-items: baseline !important;
            justify-content: center !important;
            gap: 0.25rem !important;
            margin-bottom: 0.5rem !important;
          }

          /* Main score number - Bungee font */
          .alibi-end-score {
            font-family: 'Bungee', cursive !important;
            font-size: clamp(5rem, 20vw, 8rem) !important;
            font-weight: 400 !important;
            line-height: 1 !important;
          }

          .alibi-end-score[data-success="true"] {
            color: #10b981 !important;
            text-shadow: 0 0 40px rgba(16, 185, 129, 0.6) !important;
          }

          .alibi-end-score[data-success="false"] {
            color: #ef4444 !important;
            text-shadow: 0 0 40px rgba(239, 68, 68, 0.6) !important;
          }

          .alibi-end-score-separator {
            font-family: 'Bungee', cursive !important;
            font-size: clamp(2rem, 8vw, 3rem) !important;
            color: rgba(255, 255, 255, 0.5) !important;
            margin: 0 0.25rem !important;
          }

          .alibi-end-score-total {
            font-family: 'Bungee', cursive !important;
            font-size: clamp(2.5rem, 10vw, 4rem) !important;
            color: rgba(255, 255, 255, 0.7) !important;
          }

          /* Percentage */
          .alibi-end-percentage {
            position: relative !important;
            z-index: 1 !important;
            font-family: 'Space Grotesk', sans-serif !important;
            font-size: 2rem !important;
            font-weight: 700 !important;
            margin-bottom: 1.5rem !important;
          }

          .alibi-end-percentage[data-success="true"] {
            color: #10b981 !important;
          }

          .alibi-end-percentage[data-success="false"] {
            color: #ef4444 !important;
          }

          /* Message box */
          .alibi-end-message {
            position: relative !important;
            z-index: 1 !important;
            padding: 1.25rem 1.5rem !important;
            border-radius: 16px !important;
            margin-top: 0.5rem !important;
          }

          .alibi-end-message[data-success="true"] {
            background: rgba(16, 185, 129, 0.15) !important;
            border: 1px solid rgba(16, 185, 129, 0.3) !important;
          }

          .alibi-end-message[data-success="false"] {
            background: rgba(239, 68, 68, 0.15) !important;
            border: 1px solid rgba(239, 68, 68, 0.3) !important;
          }

          .alibi-end-message p {
            font-family: 'Inter', sans-serif !important;
            font-size: 1.25rem !important;
            font-weight: 600 !important;
            color: white !important;
            margin: 0 !important;
          }

          /* Responsive */
          @media (max-width: 480px) {
            .alibi-end-content {
              padding: 1.5rem 1rem !important;
            }

            .alibi-end-card {
              padding: 1.5rem !important;
            }

            .alibi-end-title {
              font-size: 1.5rem !important;
            }

            .alibi-end-message p {
              font-size: 1rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
