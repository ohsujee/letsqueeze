"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/Buzzer";
import PointsRing from "@/components/PointsRing";
import { motion, AnimatePresence } from "framer-motion";
import { triggerConfetti } from "@/components/Confetti";
import ExitButton from "@/lib/components/ExitButton";

function useSound(url){
  const aRef = useRef(null);
  useEffect(()=>{
    aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null;
    if(aRef.current){
      aRef.current.preload="auto";
      aRef.current.volume = 0.5; // Volume par défaut
    }
  },[url]);
  return useCallback(()=>{
    if(aRef.current){
      aRef.current.currentTime=0;
      // Play avec gestion silencieuse des erreurs d'autoplay
      const playPromise = aRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay bloqué par le navigateur - pas grave, on ignore silencieusement
          console.debug('Audio autoplay prevented (normal behavior):', error.message);
        });
      }
    }
  },[]);
}

export default function PlayerGame(){
  const { code } = useParams();
  const router = useRouter();

  const [state,setState]=useState(null);
  const [meta,setMeta]=useState(null);
  const [players,setPlayers]=useState([]);
  const [me,setMe]=useState(null);
  const [quiz,setQuiz]=useState(null);
  const [conf,setConf]=useState(null);

  // Tick + offset serveur
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  useEffect(()=>{ const id = setInterval(()=>setLocalNow(Date.now()), 100); return ()=>clearInterval(id); },[]);
  useEffect(()=>{ const u = onValue(ref(db, ".info/serverTimeOffset"), s=> setOffset(Number(s.val())||0)); return ()=>u(); },[]);
  const serverNow = localNow + offset;

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  // Config scoring
  useEffect(()=>{
    fetch(`/config/scoring.json?t=${Date.now()}`)
      .then(r=>r.json())
      .then(setConf)
      .catch(err => console.error('Erreur chargement config:', err));
  },[]);

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/state`), s=>{
      const v=s.val(); setState(v);
      if(v?.phase==="ended") router.replace("/end/"+code);
      if(v?.phase==="lobby") router.replace("/room/"+code);
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=>{
      const m = s.val(); setMeta(m);
      if(m?.quizId) fetch(`/data/${m.quizId}.json`).then(r=>r.json()).then(setQuiz);
    });
    const u3 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v = s.val()||{}; const arr = Object.values(v);
      setPlayers(arr); setMe(arr.find(p=>p.uid===auth.currentUser?.uid)||null);
    });
    return ()=>{u1();u2();u3();};
  },[code, router]);

  const revealed = !!state?.revealed;
  const locked = !!state?.lockUid;
  const paused = !!state?.pausedAt || !!state?.lockedAt;

  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex+1,total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // Pénalité serveur
  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - serverNow);
  const blocked = blockedMs > 0;

  // Points synchro (stop sur pausedAt ou lockedAt)
  const elapsedEffective = useMemo(()=>{
    if (!revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];

    // Le ratio doit être basé sur le TEMPS, pas sur les points !
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));

    // La barre doit suivre le temps écoulé, pas la différence de points
    const remain = ratio;

    return { pointsEnJeu: pts, ratioRemain: remain, cfg: c };
  }, [conf, q, elapsedEffective]);

  // Sons: reveal & buzz (déclenchés par changements d'état)
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz   = useSound("/sounds/buzz.mp3");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  useEffect(()=>{
    if(state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current){
      playReveal(); prevRevealAt.current = state.lastRevealAt;
    }
  },[state?.revealed, state?.lastRevealAt, playReveal]);
  useEffect(()=>{
    const cur = state?.lockUid || null;
    if(cur && cur !== prevLock.current) playBuzz();
    prevLock.current = cur;
  },[state?.lockUid, playBuzz]);

  // Confettis pour bonne réponse (quand la question change et que j'étais locké)
  const prevQuestionIndex = useRef(-1);
  const wasLockedByMe = useRef(false);
  useEffect(() => {
    const currentIndex = state?.currentIndex || 0;
    const isLockedByMe = state?.lockUid === auth.currentUser?.uid;

    // Si la question change et que j'étais locké = bonne réponse validée !
    if (currentIndex !== prevQuestionIndex.current && prevQuestionIndex.current >= 0 && wasLockedByMe.current) {
      // Déclencher les confettis multicolores
      triggerConfetti('reward');
      // Double rafale pour plus d'effet
      setTimeout(() => triggerConfetti('reward'), 100);
    }

    // Mettre à jour les refs
    prevQuestionIndex.current = currentIndex;
    wasLockedByMe.current = isLockedByMe;
  }, [state?.currentIndex, state?.lockUid]);

  const myTeam = (meta?.mode === "équipes" && me?.teamId) ? meta?.teams?.[me.teamId] : null;

  const teamsSorted = useMemo(()=>{
    if (meta?.mode !== "équipes") return [];
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}))
      .sort((a,b)=> (b.score||0)-(a.score||0));
  }, [meta?.teams, meta?.mode]);

  return (
    <div className="player-game-page">
      {/* Header fixe simple et clair */}
      <header className="player-game-header">
        <div className="player-game-header-content">
          {/* Titre à gauche */}
          <div className="player-game-title">{title}</div>

          {/* Progress au centre */}
          <div className="player-progress-center">{progressLabel}</div>

          {/* Bouton exit à droite */}
          <div className="player-header-exit">
            <ExitButton
              variant="header"
              confirmMessage="Voulez-vous vraiment quitter ? Vous perdrez votre progression."
              onExit={() => router.push('/home')}
            />
          </div>
        </div>
      </header>

      <main className="player-game-content">
        {/* Mon équipe badge si mode équipes */}
        {myTeam && (
          <motion.div
            className="team-badge-large"
            style={{
              borderColor: myTeam.color,
              boxShadow: `0 4px 16px ${myTeam.color}40, inset 0 0 0 1px ${myTeam.color}20`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="team-badge-icon" style={{ backgroundColor: myTeam.color }}>
              ⭐
            </div>
            <div className="team-badge-info">
              <div className="team-badge-name">{myTeam.name}</div>
              <div className="team-badge-score">{myTeam.score||0} pts</div>
            </div>
          </motion.div>
        )}

        {/* Score du joueur - AU DESSUS de la question */}
        <div style={{ position: 'relative' }}>
          <motion.div
            className="player-score-card"
            key={me?.score}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className="player-score-label">Votre score</div>
            <div className="player-score-value">{me?.score||0}</div>
          </motion.div>

          {/* Buzz notification toast - Ne s'affiche que si ce n'est pas moi qui ai buzzé */}
          <AnimatePresence>
            {state?.buzzBanner && state.buzzBanner !== "— en attente —" && state?.lockUid !== me?.uid && (
              <motion.div
                className="buzz-notification"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <span className="buzz-notification-icon">🔔</span>
                <span className="buzz-notification-text">{state.buzzBanner}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Question principale avec barre de progression */}
        <div className="question-main-card">
          {/* Barre de progression des points - toujours visible */}
          {q && (
            <div className="points-progress-bar-container">
              <div className="points-progress-info">
                <span className="points-progress-label">Points en jeu</span>
                <span className="points-progress-value">{pointsEnJeu}</span>
              </div>
              <div className="points-progress-bar-track">
                <motion.div
                  className="points-progress-bar-fill"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: ratioRemain }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </div>
            </div>
          )}

          {q && (
            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div
                  key="revealed"
                  className="question-text-display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {q.question}
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  className="question-waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="question-waiting-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div>En attente de la question...</div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Leaderboard moderne */}
        {meta?.mode === "équipes" ? (
          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <span className="leaderboard-icon">🏆</span>
              <span className="leaderboard-title">Classement des équipes</span>
            </div>
            <div className="leaderboard-list">
              {teamsSorted.map((t,i)=>(
                <div
                  key={t.id}
                  className="leaderboard-item"
                  style={{
                    background: i < 3 ? `linear-gradient(135deg, ${t.color}15, ${t.color}05)` : 'rgba(255,255,255,0.02)',
                    borderColor: i < 3 ? `${t.color}40` : 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div className="leaderboard-item-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                  </div>
                  <div className="leaderboard-item-name">{t.name}</div>
                  <div className="leaderboard-item-score">{t.score||0}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="leaderboard-card">
            <div className="leaderboard-header">
              <span className="leaderboard-icon">🏆</span>
              <span className="leaderboard-title">Classement</span>
            </div>

            {/* Top 3 - Podium style */}
            <div className="leaderboard-podium">
              {players.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,3).map((p,i)=>{
                const isMe = p.uid === me?.uid;
                // Gradients colorés selon la position
                const positionBackground = i === 0
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))'
                  : i === 1
                  ? 'linear-gradient(135deg, rgba(148,163,184,0.15), rgba(203,213,225,0.1))'
                  : 'linear-gradient(135deg, rgba(205,127,50,0.15), rgba(180,100,30,0.1))';

                return (
                  <motion.div
                    key={p.uid}
                    className={`podium-item ${isMe ? 'podium-item-me' : ''}`}
                    style={!isMe ? { background: positionBackground } : {}}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="podium-medal">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="podium-name">
                      {p.name}
                      {isMe && <span className="podium-you-badge">Vous</span>}
                    </div>
                    <div className="podium-score">{p.score||0}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Autres joueurs - Liste compacte */}
            {players.length > 3 && (
              <div className="leaderboard-others">
                <div className="leaderboard-others-title">Autres joueurs</div>
                <div className="leaderboard-list-compact">
                  {players.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(3).map((p,i)=>{
                    const isMe = p.uid === me?.uid;
                    return (
                      <div
                        key={p.uid}
                        className={`leaderboard-compact-item ${isMe ? 'leaderboard-compact-item-me' : ''}`}
                      >
                        <span className="leaderboard-compact-rank">{i+4}.</span>
                        <span className="leaderboard-compact-name">{p.name}</span>
                        <span className="leaderboard-compact-score">{p.score||0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Espace pour le buzzer fixe en bas */}
        <div style={{ height: '120px' }}></div>
      </main>

      {/* Buzzer fixe en bas */}
      <div className="buzzer-fixed-container">
        <Buzzer
          roomCode={code}
          playerUid={auth.currentUser?.uid}
          playerName={me?.name}
          blockedUntil={me?.blockedUntil || 0}
          serverNow={serverNow}
          revealed={revealed}
        />
      </div>

      <style jsx>{`
        .player-game-page {
          position: relative;
          min-height: 100vh;
          background: #000000;
          overflow-x: hidden;
        }

      `}</style>
    </div>
  );
}
