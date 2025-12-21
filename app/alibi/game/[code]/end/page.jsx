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
import { ParticleEffects } from "@/components/shared/ParticleEffects";
import { hueScenariosService } from "@/lib/hue-module";

export default function AlibiEnd() {
  const { code } = useParams();
  const router = useRouter();

  const [score, setScore] = useState(null); // null = loading
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState({});
  const [displayScore, setDisplayScore] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs pour éviter les re-renders qui relancent l'animation
  const animationStartedRef = useRef(false);
  const confettiTriggeredRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && code) {
        onValue(ref(db, `rooms_alibi/${code}/players/${user.uid}`), (snap) => {
          const player = snap.val();
          if (player) setMyTeam(player.team);
        });
        onValue(ref(db, `rooms_alibi/${code}/meta`), (snap) => {
          const m = snap.val();
          setMeta(m);
          setIsHost(m?.hostUid === user.uid);
        });
      } else if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (!code) return;

    const scoreUnsub = onValue(ref(db, `rooms_alibi/${code}/score`), (snap) => {
      const s = snap.val() || { correct: 0, total: 10 };
      setScore(s);
      // Petit délai pour une transition fluide
      setTimeout(() => setIsLoaded(true), 100);
    });

    const playersUnsub = onValue(ref(db, `rooms_alibi/${code}/players`), (snap) => {
      setPlayers(snap.val() || {});
    });

    // Redirection automatique quand l'hôte retourne au lobby
    const stateUnsub = onValue(ref(db, `rooms_alibi/${code}/state`), (snap) => {
      const state = snap.val();
      if (state?.phase === "lobby") {
        router.push(`/alibi/room/${code}`);
      }
    });

    return () => {
      scoreUnsub();
      playersUnsub();
      stateUnsub();
    };
  }, [code, router]);


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
    if (percentage === 100) return "Parfait ! Alibi béton ! 🏆";
    if (percentage >= 80) return "Excellent ! Très crédible ! 🌟";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant ! 👍";
    if (percentage >= 50) return "Passable... Quelques failles... 🤔";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences ! ⚠️";
    return "Alibi effondré ! Trop d'erreurs ! ❌";
  };

  // Écran de chargement pendant que le score charge
  if (!isLoaded || !score) {
    return (
      <div className="alibi-theme">
        <div className="game-container">
          <main className="game-content p-6 max-w-4xl mx-auto min-h-screen flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-6xl mb-4"
              >
                🕵️
              </motion.div>
              <p className="text-xl opacity-70">Calcul des résultats...</p>
            </motion.div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="alibi-theme">
      <div className="game-container">
      <main className="game-content p-6 max-w-4xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
        {/* Score principal - Version spectaculaire */}
        <motion.div
          className="card text-center space-y-6 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1,
            boxShadow: isSuccess
              ? ['0 0 40px rgba(16, 185, 129, 0.3)', '0 0 60px rgba(16, 185, 129, 0.5)', '0 0 40px rgba(16, 185, 129, 0.3)']
              : ['0 0 40px rgba(239, 68, 68, 0.3)', '0 0 60px rgba(239, 68, 68, 0.5)', '0 0 40px rgba(239, 68, 68, 0.3)']
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            boxShadow: { duration: 2, repeat: Infinity }
          }}
          style={{
            background: isSuccess
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
            border: isSuccess ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid rgba(239, 68, 68, 0.4)'
          }}
        >
          {/* Background effect */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200%',
            height: '200%',
            background: isSuccess
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 50%)'
              : 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.h1
              className="game-page-title"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              🕵️ Fin de l'interrogatoire
            </motion.h1>

            <motion.div
              className="space-y-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <motion.p
                className="font-black"
                animate={{
                  scale: displayScore === score.correct ? [1, 1.1, 1] : 1
                }}
                transition={{
                  scale: { duration: 0.5 }
                }}
                style={{
                  fontSize: 'clamp(4rem, 12vw, 8rem)',
                  color: isSuccess ? '#10B981' : '#EF4444',
                  textShadow: isSuccess
                    ? '0 0 40px rgba(16, 185, 129, 0.8)'
                    : '0 0 40px rgba(239, 68, 68, 0.8)',
                  lineHeight: 1
                }}
              >
                {displayScore} / {score.total}
              </motion.p>
              <motion.p
                className="text-3xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: displayScore === score.correct ? 1 : 0.5 }}
                style={{
                  color: isSuccess ? '#10B981' : '#EF4444'
                }}
              >
                {Math.round((displayScore / score.total) * 100)}%
              </motion.p>
            </motion.div>

            <AnimatePresence>
              {showMessage && (
                <motion.div
                  className="p-6 rounded-xl relative overflow-hidden"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{
                    background: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    border: isSuccess ? '2px solid rgba(16, 185, 129, 0.4)' : '2px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <motion.p
                    className="text-2xl font-bold"
                    animate={{
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                  >
                    {getMessage()}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>


      {/* Bouton retour au lobby (Host seulement) */}
      {isHost && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button
            className="btn btn-accent w-full h-14 text-xl"
            onClick={handleReturnToLobby}
          >
            Retour au lobby
          </button>
          <p className="text-sm text-center opacity-70">
            Vous pourrez choisir un nouvel alibi et relancer une partie
          </p>
        </motion.div>
      )}

      {/* Bouton retour au lobby pour les joueurs */}
      {!isHost && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button
            className="btn btn-primary w-full h-14 text-xl"
            onClick={() => router.push(`/alibi/room/${code}`)}
          >
            Retour au lobby
          </button>
          <p className="text-sm text-center opacity-70">
            Retourne au lobby pour la prochaine partie
          </p>
        </motion.div>
      )}
      </main>

      <BottomNav />

      <style jsx>{`
        /* ===== ALIBI END PAGE - Guide UI Compliant ===== */

        /* Alibi Theme Variables */
        .alibi-theme {
          --alibi-primary: #f59e0b;
          --alibi-glow: #fbbf24;
          --alibi-dark: #b45309;
          --bg-primary: #0a0a0f;
          --bg-secondary: #12121a;
          --bg-card: rgba(20, 20, 30, 0.8);
          --text-primary: #ffffff;
          --text-secondary: rgba(255, 255, 255, 0.7);
          --text-muted: rgba(255, 255, 255, 0.5);
          --success: #10b981;
          --danger: #ef4444;
        }

        .game-container {
          position: relative;
          min-height: 100dvh;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* Animated Background - Alibi Theme Victory (Amber/Gold) */
        .game-container::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 50% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(251, 191, 36, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(180, 83, 9, 0.10) 0%, transparent 50%),
            var(--bg-primary);
          pointer-events: none;
        }

        .game-content {
          position: relative;
          z-index: 1;
          padding-top: 20px;
        }

        /* Page Title - Guide Compliant (Bungee font with glow) */
        .alibi-theme :global(.game-page-title) {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(1.5rem, 5vw, 2.25rem);
          color: var(--text-primary);
          text-shadow:
            0 0 10px rgba(245, 158, 11, 0.5),
            0 0 30px rgba(245, 158, 11, 0.3),
            0 0 60px rgba(245, 158, 11, 0.2);
          text-align: center;
          margin-bottom: 1.5rem;
        }

        /* Cards - Glassmorphism Alibi */
        .alibi-theme :global(.card) {
          background: rgba(20, 20, 30, 0.8);
          border-radius: 20px;
          padding: 1.5rem;
          border: 1px solid rgba(245, 158, 11, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Buttons - Alibi Theme */
        .alibi-theme :global(.btn) {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 24px;
          color: var(--text-primary);
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .alibi-theme :global(.btn:hover) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .alibi-theme :global(.btn:active) {
          transform: translateY(1px) scale(0.98);
        }

        .alibi-theme :global(.btn-primary) {
          background: linear-gradient(135deg, var(--alibi-primary), var(--alibi-dark));
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(245, 158, 11, 0.4),
            0 0 30px rgba(245, 158, 11, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-primary:hover) {
          box-shadow:
            0 6px 20px rgba(245, 158, 11, 0.5),
            0 0 40px rgba(245, 158, 11, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: translateY(-2px) scale(1.02);
        }

        .alibi-theme :global(.btn-accent) {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: none;
          color: white;
          box-shadow:
            0 4px 15px rgba(59, 130, 246, 0.4),
            0 0 30px rgba(59, 130, 246, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .alibi-theme :global(.btn-accent:hover) {
          box-shadow:
            0 6px 20px rgba(59, 130, 246, 0.5),
            0 0 40px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px) scale(1.02);
        }

        /* Score Display - Large and impactful */
        .alibi-theme :global(.score-display) {
          font-family: var(--font-title, 'Bungee'), cursive;
        }

        /* Loading state */
        .alibi-theme :global(.loading-spinner) {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Animation pulsante pour les cartes */
        @keyframes alibi-glow-pulse {
          0%, 100% {
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 20px rgba(245, 158, 11, 0.2);
          }
          50% {
            box-shadow:
              0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(245, 158, 11, 0.4);
          }
        }

        /* Success glow */
        @keyframes success-glow {
          0%, 100% {
            box-shadow:
              0 0 40px rgba(16, 185, 129, 0.3),
              0 8px 32px rgba(0, 0, 0, 0.4);
          }
          50% {
            box-shadow:
              0 0 60px rgba(16, 185, 129, 0.5),
              0 8px 32px rgba(0, 0, 0, 0.4);
          }
        }

        /* Failure glow */
        @keyframes danger-glow {
          0%, 100% {
            box-shadow:
              0 0 40px rgba(239, 68, 68, 0.3),
              0 8px 32px rgba(0, 0, 0, 0.4);
          }
          50% {
            box-shadow:
              0 0 60px rgba(239, 68, 68, 0.5),
              0 8px 32px rgba(0, 0, 0, 0.4);
          }
        }

        /* Animation de flottement */
        @keyframes alibi-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* Confetti celebration styles would be handled by ParticleEffects component */
      `}</style>
      </div>
    </div>
  );
}
