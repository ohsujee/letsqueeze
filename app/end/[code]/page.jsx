"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update } from "@/lib/firebase";
import { PodiumPremium } from "@/components/PodiumPremium";
import { JuicyButton } from "@/components/JuicyButton";
import { motion } from "framer-motion";
import { useToast } from "@/lib/hooks/useToast";

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
  const toast = useToast();

  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [myUid, setMyUid] = useState(null);

  // Récupérer l'uid de l'utilisateur depuis le localStorage
  useEffect(() => {
    const uid = localStorage.getItem(`lq_uid_${code}`);
    setMyUid(uid);
  }, [code]);

  const [state, setState] = useState(null);

  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v=s.val()||{};
      setPlayers(Object.values(v));
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=> setMeta(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/state`), s=> setState(s.val()));
    return ()=>{u1();u2();u3();};
  },[code]);

  // Rediriger automatiquement si l'hôte retourne au lobby
  useEffect(() => {
    if (state?.phase === "lobby" && !isHost) {
      console.log('🔄 L\'hôte est retourné au lobby, redirection automatique...');
      router.push(`/room/${code}`);
    }
  }, [state?.phase, isHost, router, code]);

  useEffect(()=>{
    if (meta?.quizId) {
      fetch(`/data/${meta.quizId}.json`)
        .then(r=>r.json())
        .then(j=> setQuizTitle(j?.title || meta.quizId.replace(/-/g," ")))
        .catch(()=> setQuizTitle(meta.quizId?.replace(/-/g," ") || "Partie"));
    }
  }, [meta?.quizId]);

  const modeEquipes = meta?.mode === "équipes";
  const isHost = myUid && meta?.hostUid === myUid;

  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(()=> rankWithTies(players, "score"), [players]);
  const rankedTeams   = useMemo(()=> rankWithTies(teamsArray, "score"), [teamsArray]);

  // Statistiques globales
  const stats = useMemo(() => {
    if (players.length === 0) return null;

    const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
    const avgScore = Math.round(totalScore / players.length);
    const maxScore = Math.max(...players.map(p => p.score || 0));
    const minScore = Math.min(...players.map(p => p.score || 0));

    return { totalScore, avgScore, maxScore, minScore };
  }, [players]);

  const handleShare = () => {
    const winner = rankedPlayers[0];
    const text = `🎮 Partie LetsQueeze terminée !\n\n🏆 Gagnant : ${winner?.name} (${winner?.score} pts)\n📊 Score moyen : ${stats?.avgScore} pts\n👥 ${players.length} joueurs\n\nJouez avec nous : ${typeof window !== 'undefined' ? window.location.origin : ''}`;

    if (navigator.share) {
      navigator.share({ title: 'LetsQueeze - Résultats', text })
        .then(() => toast.success('Résultats partagés !'))
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Résultats copiés dans le presse-papiers !'))
        .catch(() => toast.error('Impossible de copier les résultats'));
    }
  };

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
      toast.error('Erreur lors du retour au lobby. Réessayez.');
    }
  };

  return (
    <div className="end-page-container">
      {/* Header fixe avec même style que le jeu */}
      <header className="player-game-header">
        <div className="player-game-header-content" style={{justifyContent: 'center'}}>
          <motion.div
            className="player-game-title"
            style={{textAlign: 'center', fontSize: '1.25rem'}}
            initial={{ scale: 0, rotateZ: -180 }}
            animate={{ scale: 1, rotateZ: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            🏆 {quizTitle || "Partie terminée"}
          </motion.div>
        </div>
      </header>

      <main className="player-game-content" style={{maxWidth: '900px', paddingTop: '100px', paddingBottom: '150px'}}>

      {/* Podium Premium avec top 3 */}
      {rankedPlayers.length >= 1 && (
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{marginBottom: '2rem'}}
        >
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

      {/* Statistiques Globales */}
      {stats && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          style={{marginBottom: '2rem'}}
        >
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              className="card text-center"
              style={{padding: '1.5rem'}}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-2xl font-bold" style={{color: '#FCD34D'}}>{stats.maxScore}</div>
              <div className="text-sm opacity-60">Meilleur score</div>
            </motion.div>

            <motion.div
              className="card text-center"
              style={{padding: '1.5rem'}}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl mb-2">📈</div>
              <div className="text-2xl font-bold" style={{color: '#60A5FA'}}>{stats.avgScore}</div>
              <div className="text-sm opacity-60">Score moyen</div>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* Classement complet - Joueurs */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{marginBottom: '2rem'}}
      >
        <div className="card">
          <div style={{marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '700', opacity: 0.9}}>
            Classement complet
          </div>
          <div className="space-y-2">
            {rankedPlayers.map((p, index)=>(
              <motion.div
                key={p.uid}
                className="card flex justify-between items-center"
                whileHover={{ scale: 1.01 }}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 + index * 0.05 }}
                style={{
                  background: index < 3
                    ? `linear-gradient(135deg, ${
                        index === 0 ? 'rgba(245,158,11,0.15)' :
                        index === 1 ? 'rgba(148,163,184,0.15)' :
                        'rgba(205,127,50,0.15)'
                      }, rgba(255,255,255,0.05))`
                    : undefined
                }}
              >
                <span className="flex items-center gap-3">
                  <span style={{fontSize: '1.5rem', minWidth: '2rem'}}>
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${p.rank}`}
                  </span>
                  <span className="font-bold">{p.name}</span>
                  {modeEquipes && p.teamId && meta?.teams?.[p.teamId] && (
                    <span className="ml-2 px-2 py-0.5 rounded-xl border-2 border-white text-xs font-bold"
                          style={{backgroundColor: meta.teams[p.teamId].color}}>
                      {meta.teams[p.teamId].name}
                    </span>
                  )}
                </span>
                <span className="host-leaderboard-score">{p.score||0}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Actions */}
      <motion.div
        className="flex gap-3 flex-col"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        {isHost && (
          <button className="btn btn-primary w-full h-14 text-lg" onClick={handleBackToLobby}>
            🔄 Retour au lobby
          </button>
        )}
        <button className="btn w-full h-14 text-lg" onClick={() => router.push('/home')}
          style={{
            background: isHost ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.8)',
            border: isHost ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(99, 102, 241, 1)'
          }}
        >
          🏠 Retour à l'accueil
        </button>
      </motion.div>
      </main>
    </div>
  );
}
