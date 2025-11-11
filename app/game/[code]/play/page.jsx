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
  useEffect(()=>{ fetch("/config/scoring.json").then(r=>r.json()).then(setConf); },[]);

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
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));
    const denom = Math.max(1, c.start - c.floor);
    const remain = Math.max(0, Math.min(1, (pts - c.floor) / denom));
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
    <div className="game-container">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <ExitButton
        variant="minimal"
        confirmMessage="Voulez-vous vraiment quitter ? Vous perdrez votre progression."
        onExit={() => router.push('/home')}
      />

      <main className="game-content p-6 max-w-xl mx-auto space-y-4 min-h-screen" style={{paddingBottom: '100px'}}>
        <h1 className="game-page-title">{title}</h1>

      {myTeam && (
        <motion.div
          className="card"
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: 'white',
            border: `5px solid ${myTeam.color}`,
            boxShadow: `0 8px 16px rgba(0,0,0,0.4), inset 0 0 0 1px ${myTeam.color}40`,
            position: 'relative',
            overflow: 'visible'
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full text-sm font-black" style={{
            backgroundColor: myTeam.color,
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}>
            ⭐ MON ÉQUIPE
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: myTeam.color, boxShadow: `0 0 15px ${myTeam.color}80` }}
            >
              <span style={{ fontSize: '0.7rem' }}>⭐</span>
            </div>
            <div>
              <div className="font-black text-xl">{myTeam.name}</div>
              <div className="text-sm opacity-90">Score équipe: <b>{myTeam.score||0}</b> pts</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        className="card banner"
        animate={state?.buzzBanner && state.buzzBanner !== "— en attente —" ? {
          scale: [1, 1.02, 1],
          boxShadow: [
            "0 1px 3px rgba(0,0,0,0.1)",
            "0 4px 12px rgba(239, 68, 68, 0.3)",
            "0 1px 3px rgba(0,0,0,0.1)"
          ]
        } : {}}
        transition={{ duration: 0.5 }}
      >
        <b>Buzz :</b> {state?.buzzBanner || "— en attente —"}
      </motion.div>
      <div className="card"><b>Mon score :</b> {me?.score||0}</div>

      <div className="card">
        {q && (
          <>
            <div className="mb-2 flex items-center justify-between">
              <div className="game-section-title">Question</div>
              <div className="text-sm opacity-80">{progressLabel}</div>
            </div>
            <AnimatePresence mode="wait">
              {revealed ? (
                <motion.div
                  key="revealed"
                  className="mb-3"
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    {q.question}
                  </motion.span>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  className="mb-3 opacity-60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                >
                  En attente de révélation…
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-4">
              <PointsRing 
                value={ratioRemain} 
                points={pointsEnJeu} 
              />
              {cfg && <div className="text-sm opacity-80">De <b>{cfg.start}</b> à <b>{cfg.floor}</b> en <b>{cfg.durationMs/1000}s</b>{paused && <span className="ml-1">⏸︎</span>}</div>}
            </div>
          </>
        )}

        {meta?.mode === "équipes" ? (
          <>
            <div className="mt-3 text-sm opacity-70">Classement des équipes</div>
            <ul className="grid grid-cols-1 gap-2 mt-1">
              {teamsSorted.map((t,i)=>(
                <li key={t.id} className="card flex justify-between items-center">
                  <span className="font-bold" style={{backgroundColor:t.color}}>&nbsp;&nbsp;{i+1}. {t.name}&nbsp;&nbsp;</span>
                  <b>{t.score||0}</b>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="mt-3 text-sm opacity-70">Top 3</div>
            <ul className="grid grid-cols-2 gap-2 mt-1">
              {players.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,3).map((p,i)=>(
                <li key={p.uid} className="card">{i+1}. {p.name} — <b>{p.score||0}</b></li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Buzzer
        roomCode={code}
        playerUid={auth.currentUser?.uid}
        playerName={me?.name}
        blockedUntil={me?.blockedUntil || 0}
        serverNow={serverNow}
        revealed={revealed}
      />
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
