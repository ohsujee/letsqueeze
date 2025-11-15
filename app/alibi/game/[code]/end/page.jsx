"use client";

import { useEffect, useState, useMemo } from "react";
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
import { motion } from 'framer-motion';
import { PodiumPremium } from '@/components/PodiumPremium';
import BottomNav from "@/lib/components/BottomNav";

export default function AlibiEnd() {
  const { code } = useParams();
  const router = useRouter();

  const [score, setScore] = useState({ correct: 0, total: 10 });
  const [myTeam, setMyTeam] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState({});

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

  // Calculer le top 3 des joueurs
  const topPlayers = useMemo(() => {
    const allPlayersArray = Object.values(players || {});
    if (allPlayersArray.length === 0) return [];

    // Pour Alibi, on donne le même score à tous (c'est un jeu d'équipe)
    return allPlayersArray
      .map(p => ({
        ...p,
        score: score?.correct || 0
      }))
      .slice(0, 3);
  }, [players, score]);

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

  const getMessage = () => {
    if (percentage === 100) return "Parfait ! Alibi béton ! 🏆";
    if (percentage >= 80) return "Excellent ! Très crédible ! 🌟";
    if (percentage >= 60) return "Bien joué ! Plutôt convaincant ! 👍";
    if (percentage >= 50) return "Passable... Quelques failles... 🤔";
    if (percentage >= 30) return "Alibi fragile... Beaucoup d'incohérences ! ⚠️";
    return "Alibi effondré ! Trop d'erreurs ! ❌";
  };

  return (
    <div className="game-container">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-6 max-w-4xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
        {/* Score principal */}
        <motion.div
          className={`card text-center space-y-6 ${isSuccess ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <h1 className="game-page-title">🕵️ Fin de l'interrogatoire</h1>

          <div className="space-y-4">
            <p className="text-6xl font-black">
              {score.correct} / {score.total}
            </p>
            <p className="text-2xl opacity-80">{percentage}%</p>
          </div>

          <div className={`p-6 rounded-lg ${isSuccess ? "bg-green-500/20" : "bg-red-500/20"}`}>
            <p className="text-2xl font-bold">{getMessage()}</p>
          </div>
        </motion.div>

        {/* Podium Premium */}
        {topPlayers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginBottom: '2rem' }}
          >
            <PodiumPremium topPlayers={topPlayers} />
          </motion.section>
        )}

      {/* Détails par équipe */}
      {myTeam === "suspects" && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="game-section-title text-primary">🎭 Suspects</h2>
          {isSuccess ? (
            <div className="space-y-2">
              <p className="text-lg">Bravo ! Vous avez défendu votre alibi avec succès.</p>
              <p className="opacity-70">Les inspecteurs ont validé {score.correct} de vos réponses sur {score.total}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">Les inspecteurs ont trouvé trop d'incohérences...</p>
              <p className="opacity-70">Seulement {score.correct} réponses validées sur {score.total}.</p>
            </div>
          )}
        </motion.div>
      )}

      {myTeam === "inspectors" && (
        <motion.div
          className="card space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="game-section-title text-accent">🕵️ Inspecteurs</h2>
          {!isSuccess ? (
            <div className="space-y-2">
              <p className="text-lg">Excellent travail ! Vous avez démasqué les suspects.</p>
              <p className="opacity-70">Vous avez détecté {score.total - score.correct} incohérence(s) sur {score.total} questions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">Les suspects s'en sortent plutôt bien...</p>
              <p className="opacity-70">Vous avez validé {score.correct} de leurs réponses sur {score.total}.</p>
            </div>
          )}
        </motion.div>
      )}

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

        /* Background orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #4299E1 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #48BB78 0%, transparent 70%);
          bottom: -100px;
          left: -150px;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #9F7AEA 0%, transparent 70%);
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>
    </div>
  );
}
