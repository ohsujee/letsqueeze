"use client";

import { useEffect, useState } from "react";
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

  const [score, setScore] = useState({ correct: 0, total: 10 });
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState({});
  const [displayScore, setDisplayScore] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

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

  const percentage = Math.round((score.correct / score.total) * 100);
  const isSuccess = percentage >= 50;

  // Animated score counter + confetti
  useEffect(() => {
    if (score.correct === 0) return;

    let current = 0;
    const target = score.correct;
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 50); // Update every 50ms

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);

        // Trigger confetti and Hue after score reveal
        setTimeout(() => {
          if (!confettiTriggered) {
            if (isSuccess) {
              ParticleEffects.celebrate('high');
              hueScenariosService.trigger('alibi', 'victory');
            } else {
              ParticleEffects.wrongAnswer();
              hueScenariosService.trigger('alibi', 'defeat');
            }
            setConfettiTriggered(true);
          }
        }, 300);

        // Show message after confetti
        setTimeout(() => {
          setShowMessage(true);
        }, 800);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [score.correct, isSuccess, confettiTriggered]);

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton ! 🏆";
    if (percentage >= 80) return "Excellent ! Très crédible ! 🌟";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant ! 👍";
    if (percentage >= 50) return "Passable... Quelques failles... 🤔";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences ! ⚠️";
    return "Alibi effondré ! Trop d'erreurs ! ❌";
  };

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
        .game-container {
          position: relative;
          min-height: 100vh;
          background: #000000;
          overflow: hidden;
        }

        .game-content {
          position: relative;
          z-index: 1;
        }
      `}</style>
      </div>
    </div>
  );
}
