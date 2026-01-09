"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update, auth, onAuthStateChanged } from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useToast } from "@/lib/hooks/useToast";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { storage } from "@/lib/utils/storage";
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { CheckCircle, XCircle } from "lucide-react";
import { TROUVE_COLORS } from "@/data/trouveregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;

/**
 * Victory Icon - Animated trophy for investigators winning
 */
function VictoryIcon({ size = 100 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <div style={{ fontSize: size * 0.8, textAlign: 'center', lineHeight: 1.2 }}>🎉</div>
    </motion.div>
  );
}

/**
 * Defeat Icon - Animated sad face
 */
function DefeatIcon({ size = 100 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
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
      <div style={{ fontSize: size * 0.8, textAlign: 'center', lineHeight: 1.2 }}>😢</div>
    </motion.div>
  );
}

/**
 * Players Win Icon - Mask for players victory
 */
function PlayersWinIcon({ size = 100 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          inset: -15,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <div style={{ fontSize: size * 0.8, textAlign: 'center', lineHeight: 1.2 }}>🎭</div>
    </motion.div>
  );
}

export default function TrouveRegleEndPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [roomExists, setRoomExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const adShownRef = useRef(false);
  const confettiTriggeredRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_trouveregle' });

  // Room guard
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion
  useGameCompletion({ gameType: 'trouveregle', roomCode: code });

  // Get current user UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, [code]);

  // Show interstitial ad during loading
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[TrouveRegleEndPage] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_trouveregle/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db, `rooms_trouveregle/${code}/state`), s => {
      setState(s.val());
    });
    return () => { u1(); u2(); };
  }, [code]);

  // Simulate loading delay (1.5s) then show result
  useEffect(() => {
    if (state && meta) {
      const timer = setTimeout(() => {
        setIsLoading(false);
        // Small delay before showing result animation
        setTimeout(() => setShowResult(true), 100);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state, meta]);

  // Trigger confetti when result is shown
  useEffect(() => {
    if (!showResult || confettiTriggeredRef.current) return;
    confettiTriggeredRef.current = true;

    const myPlayer = players.find(p => p.uid === myUid);
    const isInvestigator = myPlayer?.role === 'investigator';
    const investigatorsWon = state?.foundByInvestigators;

    // Determine if current player won
    const iWon = (isInvestigator && investigatorsWon) || (!isInvestigator && !investigatorsWon);

    if (iWon) {
      ParticleEffects.celebrate('high');
    } else {
      ParticleEffects.wrongAnswer();
    }
  }, [showResult, players, myUid, state?.foundByInvestigators]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;

  // Get my role
  const myPlayer = players.find(p => p.uid === myUid);
  const isInvestigator = myPlayer?.role === 'investigator';
  const investigatorsWon = state?.foundByInvestigators;

  // Redirect if host returns to lobby
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && hostPresent) {
      router.push(`/trouveregle/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, hostPresent]);

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores and roles
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_trouveregle/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_trouveregle/${code}/players/${player.uid}/role`] = 'player';
        }
      });

      // Reset state
      updates[`rooms_trouveregle/${code}/state`] = {
        phase: "lobby",
        investigatorUids: [],
        currentRule: null,
        ruleOptions: [],
        votes: {},
        rerollsUsed: 0,
        guessAttempts: 0,
        guesses: [],
        roundNumber: 1,
        playedRuleIds: state?.playedRuleIds || []
      };

      await update(ref(db), updates);
      router.push(`/trouveregle/room/${code}`);
    } catch (error) {
      console.error('Erreur retour lobby:', error);
      toast.error('Erreur lors du retour au lobby');
    }
  };

  // Get result message based on role
  const getResultMessage = () => {
    if (isInvestigator) {
      return investigatorsWon
        ? { title: "Bravo !", subtitle: "Tu as trouvé la règle secrète !", icon: 'victory' }
        : { title: "Dommage...", subtitle: "La règle t'a échappé cette fois", icon: 'defeat' };
    } else {
      return investigatorsWon
        ? { title: "Perdu !", subtitle: "Les enquêteurs ont trouvé la règle", icon: 'defeat' }
        : { title: "Bravo !", subtitle: "Les enquêteurs n'ont pas trouvé !", icon: 'playersWin' };
    }
  };

  const result = getResultMessage();

  // Loading screen
  if (isLoading) {
    return (
      <div className="end-page game-page">
        <div className="loading-container">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="loading-content"
          >
            {/* Pulsing icon */}
            <motion.div
              className="loading-icon"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              🔍
            </motion.div>
            <p className="loading-text">Calcul des résultats...</p>
            {/* Dots animation */}
            <div className="loading-dots">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          </motion.div>
        </div>

        <style jsx>{`
          .end-page {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            background: #0a0a0f;
          }
          .end-page::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
              radial-gradient(ellipse at 50% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
              #0a0a0f;
            pointer-events: none;
          }
          .loading-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 1;
          }
          .loading-content {
            text-align: center;
          }
          .loading-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 0 20px rgba(6, 182, 212, 0.5));
          }
          .loading-text {
            font-family: var(--font-display, 'Space Grotesk'), sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 1rem;
          }
          .loading-dots {
            display: flex;
            justify-content: center;
            gap: 8px;
          }
          .loading-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${CYAN_PRIMARY};
          }
        `}</style>
      </div>
    );
  }

  // Determine if I won
  const iWon = (isInvestigator && investigatorsWon) || (!isInvestigator && !investigatorsWon);

  return (
    <div className="end-page game-page" data-won={iWon}>
      <div className="end-container">
        <main className="end-content">
          {/* Result Card */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                className="result-card"
                data-won={iWon}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                {/* Background glow */}
                <div className="result-glow" data-won={iWon} />

                {/* Icon */}
                <div className="result-icon">
                  {result.icon === 'victory' && <VictoryIcon size={100} />}
                  {result.icon === 'defeat' && <DefeatIcon size={100} />}
                  {result.icon === 'playersWin' && <PlayersWinIcon size={100} />}
                </div>

                {/* Title */}
                <motion.h1
                  className="result-title"
                  data-won={iWon}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {result.title}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="result-subtitle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {result.subtitle}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rule Card */}
          {showResult && state?.currentRule && (
            <motion.div
              className="rule-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="rule-label">La règle était</span>
              <p className="rule-text">{state.currentRule.text}</p>
            </motion.div>
          )}

          {/* Guesses recap (for investigators) */}
          {showResult && isInvestigator && state?.guesses && state.guesses.length > 0 && (
            <motion.div
              className="guesses-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="guesses-title">Tes propositions</h3>
              <div className="guesses-list">
                {state.guesses.map((guess, idx) => (
                  <div
                    key={idx}
                    className={`guess-item ${
                      idx === state.guesses.length - 1 && investigatorsWon
                        ? 'correct' : 'wrong'
                    }`}
                  >
                    {idx === state.guesses.length - 1 && investigatorsWon
                      ? <CheckCircle size={16} />
                      : <XCircle size={16} />
                    }
                    <span>{guess}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          {showResult && (
            <motion.div
              className="action-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                className="action-btn"
                onClick={() => {
                  if (!hostPresent) {
                    router.push('/home');
                  } else if (isHost) {
                    handleBackToLobby();
                  } else {
                    router.push(`/trouveregle/room/${code}`);
                  }
                }}
              >
                {!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
              </button>
              <p className="action-hint">
                {!hostPresent
                  ? "L'hôte a quitté la partie"
                  : isHost
                    ? "Retourne au lobby pour relancer une partie"
                    : "Retourne au lobby en attendant la prochaine partie"
                }
              </p>
            </motion.div>
          )}
        </main>
      </div>

      <style jsx>{`
        .end-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: #0a0a0f;
          position: relative;
        }

        .end-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .end-page[data-won="true"]::before {
          background:
            radial-gradient(ellipse at 50% 20%, rgba(34, 197, 94, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
            #0a0a0f;
        }

        .end-page[data-won="false"]::before {
          background:
            radial-gradient(ellipse at 50% 20%, rgba(239, 68, 68, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(239, 68, 68, 0.06) 0%, transparent 50%),
            #0a0a0f;
        }

        .end-container {
          flex: 1;
          min-height: 0;
          position: relative;
          z-index: 1;
          overflow-y: auto;
        }

        .end-content {
          max-width: 500px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Result Card */
        .result-card {
          position: relative;
          background: rgba(20, 20, 30, 0.9);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          text-align: center;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
        }

        .result-card[data-won="true"] {
          border: 2px solid rgba(34, 197, 94, 0.4);
          box-shadow:
            0 0 60px rgba(34, 197, 94, 0.25),
            0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .result-card[data-won="false"] {
          border: 2px solid rgba(239, 68, 68, 0.4);
          box-shadow:
            0 0 60px rgba(239, 68, 68, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .result-glow {
          position: absolute;
          top: -50%;
          left: 50%;
          transform: translateX(-50%);
          width: 200%;
          height: 200%;
          pointer-events: none;
          z-index: 0;
        }

        .result-glow[data-won="true"] {
          background: radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 50%);
        }

        .result-glow[data-won="false"] {
          background: radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 50%);
        }

        .result-icon {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .result-title {
          position: relative;
          z-index: 1;
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(2rem, 10vw, 3rem);
          font-weight: 400;
          margin: 0 0 0.75rem 0;
          text-transform: uppercase;
        }

        .result-title[data-won="true"] {
          color: #4ade80;
          text-shadow:
            0 0 30px rgba(34, 197, 94, 0.6),
            0 0 60px rgba(34, 197, 94, 0.3);
        }

        .result-title[data-won="false"] {
          color: #f87171;
          text-shadow:
            0 0 30px rgba(239, 68, 68, 0.6),
            0 0 60px rgba(239, 68, 68, 0.3);
        }

        .result-subtitle {
          position: relative;
          z-index: 1;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.15rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
        }

        /* Rule Card */
        .rule-card {
          background: rgba(6, 182, 212, 0.08);
          border: 2px solid rgba(6, 182, 212, 0.25);
          border-radius: 16px;
          padding: 20px 24px;
          text-align: center;
        }

        .rule-label {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 8px;
        }

        .rule-text {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: ${CYAN_LIGHT};
          margin: 0;
          line-height: 1.5;
        }

        /* Guesses Card */
        .guesses-card {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 16px;
        }

        .guesses-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .guesses-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .guess-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9rem;
        }

        .guess-item.correct {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .guess-item.wrong {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.6);
        }

        /* Action Section */
        .action-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .action-btn {
          width: 100%;
          padding: 18px 32px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0a0a0f;
          background: linear-gradient(135deg, ${CYAN_LIGHT} 0%, ${CYAN_PRIMARY} 50%, ${CYAN_DARK} 100%);
          box-shadow:
            0 5px 0 #0e7490,
            0 8px 20px rgba(6, 182, 212, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 7px 0 #0e7490,
            0 10px 25px rgba(6, 182, 212, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(3px);
          box-shadow:
            0 2px 0 #0e7490,
            0 4px 10px rgba(6, 182, 212, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .action-hint {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
          margin: 8px 0 0 0;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .end-content {
            padding: 1.5rem 1rem;
          }

          .result-card {
            padding: 2rem 1.5rem;
          }

          .result-title {
            font-size: 1.75rem;
          }

          .result-subtitle {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
