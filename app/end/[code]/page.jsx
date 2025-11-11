"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update } from "@/lib/firebase";
import { PodiumPremium } from "@/components/PodiumPremium";
import { JuicyButton } from "@/components/JuicyButton";
import { motion } from "framer-motion";

function rankWithTies(items, scoreKey = "score") {
  const sorted = items.slice().sort((a,b)=> (b[scoreKey]||0) - (a[scoreKey]||0));
  let lastScore = null, lastRank = 0, seen = 0;
  return sorted.map((it) => {
    seen += 1;
    const sc = it[scoreKey] || 0;
    const rank = (lastScore === sc) ? lastRank : seen;
    lastScore = sc; lastRank = rank;
    return { ...it, rank };
  });
}

export default function EndPage(){
  const { code } = useParams();
  const router = useRouter();

  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);
  const [quizTitle, setQuizTitle] = useState("");

  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v=s.val()||{};
      setPlayers(Object.values(v));
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=> setMeta(s.val()));
    return ()=>{u1();u2();};
  },[code]);

  useEffect(()=>{
    if (meta?.quizId) {
      fetch(`/data/${meta.quizId}.json`)
        .then(r=>r.json())
        .then(j=> setQuizTitle(j?.title || meta.quizId.replace(/-/g," ")))
        .catch(()=> setQuizTitle(meta.quizId?.replace(/-/g," ") || "Partie"));
    }
  }, [meta?.quizId]);

  const modeEquipes = meta?.mode === "équipes";

  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(()=> rankWithTies(players, "score"), [players]);
  const rankedTeams   = useMemo(()=> rankWithTies(teamsArray, "score"), [teamsArray]);

  // Fonction pour réinitialiser les scores et retourner au lobby
  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Réinitialiser les scores de tous les joueurs
      if (players && players.length > 0) {
        players.forEach(player => {
          if (player.uid) {
            updates[`rooms/${code}/players/${player.uid}/score`] = 0;
            updates[`rooms/${code}/players/${player.uid}/blockedUntil`] = 0;
          }
        });
      }

      // Réinitialiser les scores des équipes
      if (modeEquipes && teamsArray && teamsArray.length > 0) {
        teamsArray.forEach(team => {
          if (team.id) {
            updates[`rooms/${code}/meta/teams/${team.id}/score`] = 0;
          }
        });
      }

      // Réinitialiser l'état de la partie
      updates[`rooms/${code}/state/phase`] = "lobby";
      updates[`rooms/${code}/state/currentIndex`] = 0;
      updates[`rooms/${code}/state/revealed`] = false;
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/lastRevealAt`] = 0;
      updates[`rooms/${code}/state/elapsedAcc`] = 0;
      updates[`rooms/${code}/state/pausedAt`] = null;
      updates[`rooms/${code}/state/lockedAt`] = null;
      updates[`rooms/${code}/state/buzz`] = null;

      console.log('🔄 Retour au lobby - Updates:', updates);

      await update(ref(db), updates);

      console.log('✅ Updates Firebase réussis');

      // Rediriger vers le lobby
      router.push(`/room/${code}`);
    } catch (error) {
      console.error('❌ Erreur lors du retour au lobby:', error);
      alert('Erreur lors du retour au lobby. Réessayez.');
    }
  };

  return (
    <div className="game-container">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-6 max-w-5xl mx-auto space-y-6 pb-32">
        <motion.h1
          className="game-page-title text-center"
          initial={{ scale: 0, rotateZ: -180 }}
          animate={{ scale: 1, rotateZ: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          Fin de partie
        </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center text-xl opacity-80"
      >
        {quizTitle || "Partie"}
      </motion.div>

      {/* Podium Premium avec top 3 */}
      {rankedPlayers.length >= 1 && (
        <motion.section
          className="mt-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="game-section-title text-center mb-8">Podium</h2>
          <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
        </motion.section>
      )}

      {/* Classement complet - Mode Équipes */}
      {modeEquipes && (
        <motion.section
          className="space-y-3 mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <h3 className="game-section-title text-center">Classement Équipes</h3>
          <div className="card">
            <ul className="space-y-2">
              {rankedTeams.map(t=>(
                <motion.li
                  key={t.id}
                  className="card flex justify-between items-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="flex items-center gap-3">
                    <b className="text-2xl">#{t.rank}</b>
                    <div className="px-3 py-1 rounded-xl border-3 border-white font-bold" style={{backgroundColor:t.color}}>
                      {t.name}
                    </div>
                  </span>
                  <b className="text-2xl">{t.score||0}</b>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>
      )}

      {/* Classement complet - Joueurs */}
      <motion.section
        className="space-y-3 mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <h3 className="game-section-title text-center">Classement Complet</h3>
        <div className="card">
          <ul className="space-y-2">
            {rankedPlayers.map((p, index)=>(
              <motion.li
                key={p.uid}
                className="card flex justify-between items-center"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2 + index * 0.1 }}
              >
                <span className="flex items-center gap-3">
                  <b className="text-2xl">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${p.rank}`}
                  </b>
                  <span className="font-bold">{p.name}</span>
                  {modeEquipes && p.teamId && meta?.teams?.[p.teamId] && (
                    <span className="ml-2 px-2 py-0.5 rounded-xl border-2 border-white text-xs font-bold"
                          style={{backgroundColor: meta.teams[p.teamId].color}}>
                      {meta.teams[p.teamId].name}
                    </span>
                  )}
                </span>
                <b className="text-2xl score-display">{p.score||0}</b>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Retour au lobby */}
      <motion.div
        className="flex justify-center mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
      >
        <JuicyButton onClick={handleBackToLobby} className="btn-primary btn-lg">
          🔄 Retour au lobby
        </JuicyButton>
      </motion.div>
      </main>

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
