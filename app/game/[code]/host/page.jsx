"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import PointsRing from "@/components/PointsRing";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { triggerConfetti } from "@/components/Confetti";
import AnimatedLeaderboard, { TeamLeaderboard } from "@/components/AnimatedLeaderboard";
import { RippleButton, ShineButton } from "@/components/InteractiveButton";

function useQuiz(quizId){
  const [quiz,setQuiz]=useState(null);
  useEffect(()=>{ if(quizId) fetch(`/data/${quizId}.json`).then(r=>r.json()).then(setQuiz); },[quizId]);
  return quiz;
}
function useSound(url){
  const aRef = useRef(null);
  useEffect(()=>{ aRef.current = typeof Audio !== "undefined" ? new Audio(url) : null; if(aRef.current){ aRef.current.preload="auto"; } },[url]);
  return useCallback(()=>{ try{ if(aRef.current){ aRef.current.currentTime=0; aRef.current.play(); } }catch{} },[]);
}

export default function HostGame(){
  const { code } = useParams();
  const router = useRouter();

  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [players,setPlayers]=useState([]);
  const [conf,setConf]=useState(null);

  // Tick + offset serveur
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  useEffect(()=>{ fetch("/config/scoring.json").then(r=>r.json()).then(setConf); },[]);
  useEffect(()=>{
    const off = onValue(ref(db, ".info/serverTimeOffset"), s=> setOffset(Number(s.val())||0));
    const id=setInterval(()=>setLocalNow(Date.now()), 100);
    return ()=>{ clearInterval(id); off(); };
  },[]);
  const serverNow = localNow + offset;

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/meta`), s=>setMeta(s.val()));
    const u2 = onValue(ref(db,`rooms/${code}/state`), s=>setState(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v = s.val()||{}; setPlayers(Object.values(v));
    });
    return ()=>{u1();u2();u3();};
  },[code]);

  // Redirige host quand phase=ended
  useEffect(()=>{
    if(state?.phase === "ended") router.replace(`/end/${code}`);
  }, [state?.phase, router, code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const quiz  = useQuiz(meta?.quizId || "general");
  const total = quiz?.items?.length || 0;
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];
  const progressLabel = total ? `Q${Math.min(qIndex+1,total)} / ${total}` : "";
  const title = (quiz?.title || (meta?.quizId ? meta.quizId.replace(/-/g, " ") : "Partie"));

  // compteur points (synchro serveur + pause)
  const elapsedEffective = useMemo(()=>{
    if (!state?.revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const hardStop = state?.pausedAt ?? state?.lockedAt ?? null;
    const end = hardStop ?? serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  },[state?.revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, state?.lockedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 1, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));
    const denom = Math.max(1, c.start - c.floor);
    const remain = Math.max(0, Math.min(1, (pts - c.floor) / denom));
    return { pointsEnJeu: pts, ratioRemain: remain, cfg: c };
  },[conf, q, elapsedEffective]);

  // Sons
  const playReveal = useSound("/sounds/reveal.mp3");
  const playBuzz   = useSound("/sounds/buzz.mp3");
  const prevRevealAt = useRef(0);
  const prevLock = useRef(null);
  useEffect(()=>{
    if(state?.revealed && state?.lastRevealAt && state.lastRevealAt !== prevRevealAt.current){
      playReveal(); prevRevealAt.current = state.lastRevealAt;
    }
  },[state?.revealed, state?.lastRevealAt, playReveal]);

  // *** HOST RÉAGIT AU NOUVEAU LOCK → FIGE TIMER AUTOMATIQUEMENT ***
  useEffect(()=>{
    if (!isHost) return;
    const cur = state?.lockUid || null;
    if (cur && cur !== prevLock.current) {
      const name = players.find(p=>p.uid===cur)?.name || "Un joueur";
      const isAnticipated = state?.buzz?.anticipated === true;
      
      // Figer automatiquement le timer et mettre à jour la bannière
      update(ref(db,`rooms/${code}/state`), {
        pausedAt: serverTimestamp(),
        lockedAt: serverTimestamp(),
        buzzBanner: `🔔 ${name} a buzzé !${isAnticipated ? ' (ANTICIPÉ)' : ''}`
      }).catch(()=>{});
      
      playBuzz();
    }
    prevLock.current = cur;
  },[isHost, state?.lockUid, state?.buzz?.anticipated, code, players, playBuzz]);

  function computeResumeFields(){
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || state?.lockedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null, lockedAt: null };
  }

  // actions
  async function revealToggle(){
    if(!isHost || !q) return;

    if (!state?.revealed) {
      // Utiliser une transaction pour préserver un buzz concurrent
      const stateRef = ref(db, `rooms/${code}/state`);

      await runTransaction(stateRef, (currentState) => {
        if (!currentState) return currentState;

        // Si quelqu'un a buzzé entre-temps, on préserve son buzz
        if (currentState.lockUid) {
          // Révéler la question mais garder le lock existant
          return {
            ...currentState,
            revealed: true,
            lastRevealAt: Date.now(),
            elapsedAcc: 0,
            pausedAt: currentState.pausedAt || null,
            lockedAt: currentState.lockedAt || null
            // lockUid, buzz, buzzBanner sont préservés
          };
        }

        // Sinon, révélation normale sans buzz
        return {
          ...currentState,
          revealed: true,
          lastRevealAt: Date.now(),
          elapsedAcc: 0,
          pausedAt: null,
          lockedAt: null,
          lockUid: null,
          buzzBanner: "",
          buzz: null
        };
      });
    } else {
      await update(ref(db,`rooms/${code}/state`), { revealed: false });
    }
  }
  async function resetBuzzers(){
    if(!isHost) return;
    const resume = computeResumeFields();
    await update(ref(db,`rooms/${code}/state`), { lockUid: null, buzzBanner: "", buzz: null, ...resume });
  }
  async function validate(){
    if(!isHost || !q || !state?.lockUid || !conf) return;
    const uid = state.lockUid;
    const wasAnticipated = state?.buzz?.anticipated === true;
    
    // Calcul des points
    let pts;
    if (wasAnticipated) {
      // Buzz anticipé correct = points maximum
      const diff = q.difficulty === "difficile" ? "difficile" : "normal";
      pts = conf[diff].start;
    } else {
      // Buzz normal = points dégressifs selon le temps
      pts = pointsEnJeu;
    }

    await runTransaction(ref(db,`rooms/${code}/players/${uid}/score`),(cur)=> (cur||0)+pts);

    if (meta?.mode === "équipes") {
      const player = players.find(p=>p.uid===uid);
      const teamId = player?.teamId;
      if (teamId) {
        await runTransaction(ref(db,`rooms/${code}/meta/teams/${teamId}/score`),(cur)=> (cur||0)+pts);
      }
    }

    const next = (state.currentIndex||0)+1;
    if (next >= total) {
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
      router.replace(`/end/${code}`);
      return;
    }

    // Réinitialiser les pénalités de tous les joueurs
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms/${code}/state/currentIndex`] = next;
    updates[`rooms/${code}/state/revealed`] = false;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/pausedAt`] = null;
    updates[`rooms/${code}/state/lockedAt`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = 0;
    updates[`rooms/${code}/state/lastRevealAt`] = 0;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    await update(ref(db), updates);
  }
  async function wrong(){
    if(!isHost || !state?.lockUid || !conf) return;
    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;

    const updates = {};
    const until = serverNow + ms;
    
    // Gestion buzz anticipé : malus selon config
    const wasAnticipated = state?.buzz?.anticipated === true;
    const penalty = wasAnticipated ? (conf.anticipatedBuzzPenalty || 100) : 0;
    
    if (penalty > 0) {
      await runTransaction(ref(db,`rooms/${code}/players/${uid}/score`),(cur)=> (cur||0)-penalty);
      
      if (meta?.mode === "équipes") {
        const player = players.find(p=>p.uid===uid);
        const teamId = player?.teamId;
        if (teamId) {
          await runTransaction(ref(db,`rooms/${code}/meta/teams/${teamId}/score`),(cur)=> (cur||0)-penalty);
        }
      }
    }
    
    // Appliquer la pénalité de temps
    if (meta?.mode === "équipes") {
      // Mode équipes : bloquer toute l'équipe
      const player = players.find(p=>p.uid===uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p=>p.teamId===teamId).forEach(p=>{
          updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      } else {
        // Fallback si pas d'équipe trouvée
        updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
      }
    } else {
      // Mode individuel : bloquer seulement le joueur
      updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;
    }

    // Reprendre le timer avec le temps déjà écoulé
    const resume = computeResumeFields();
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = resume.elapsedAcc;
    updates[`rooms/${code}/state/lastRevealAt`] = resume.lastRevealAt;
    updates[`rooms/${code}/state/pausedAt`] = resume.pausedAt;
    updates[`rooms/${code}/state/lockedAt`] = resume.lockedAt;

    await update(ref(db), updates);
  }
  async function skip(){
    if(!isHost || total===0) return;
    const next = (state?.currentIndex||0)+1;
    if (next >= total) {
      await update(ref(db,`rooms/${code}/state`), { phase:"ended" });
      router.replace(`/end/${code}`);
      return;
    }

    // Réinitialiser les pénalités de tous les joueurs
    const updates = {};
    players.forEach(p => {
      updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = 0;
    });
    updates[`rooms/${code}/state/currentIndex`] = next;
    updates[`rooms/${code}/state/revealed`] = false;
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/pausedAt`] = null;
    updates[`rooms/${code}/state/lockedAt`] = null;
    updates[`rooms/${code}/state/elapsedAcc`] = 0;
    updates[`rooms/${code}/state/lastRevealAt`] = 0;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/buzz`] = null;

    await update(ref(db), updates);
  }
  async function end(){ if(isHost){ await update(ref(db,`rooms/${code}/state`), { phase:"ended" }); router.replace(`/end/${code}`); } }

  const lockedName = state?.lockUid ? (players.find(p=>p.uid===state.lockUid)?.name || state.lockUid) : "—";
  const wasAnticipated = state?.buzz?.anticipated === true;
  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {}; return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const playersSorted = useMemo(()=> players.slice().sort((a,b)=> (b.score||0)-(a.score||0)), [players]);

  // Points à gagner selon le type de buzz
  const pointsAGagner = useMemo(() => {
    if (!conf || !q) return 0;
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    if (wasAnticipated) {
      return conf[diff].start; // Points maximum pour buzz anticipé
    }
    return pointsEnJeu; // Points dégressifs pour buzz normal
  }, [conf, q, wasAnticipated, pointsEnJeu]);

  return (
    <main className="p-6 pb-28 max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Écran Animateur — {title}</h1>

      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <RippleButton className="btn" onClick={resetBuzzers}>Reset buzzers</RippleButton>
          <RippleButton className="btn" onClick={wrong}>
            ✘ Mauvaise{wasAnticipated ? ` (-${conf?.anticipatedBuzzPenalty || 100}pts)` : ''}
          </RippleButton>
          <ShineButton className="btn btn-accent" onClick={validate}>
            ✔ Valider{wasAnticipated ? ` (+${conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0} pts MAX)` : ` (+${pointsEnJeu} pts)`}
          </ShineButton>
          <RippleButton className="btn" onClick={skip}>⏭ Passer</RippleButton>
          <RippleButton className="btn" onClick={end}>Terminer</RippleButton>
        </div>
        <div className="mt-3 card banner">
          <b>Buzz :</b> {state?.buzzBanner || "— en attente —"}
          {wasAnticipated && (
            <div className="mt-2 p-2 bg-blue-100 border-2 border-blue-500 rounded-lg">
              <span className="text-blue-700 font-black">⚡ BUZZ ANTICIPÉ</span>
              <br />
              <span className="text-sm text-blue-600">
                Question pas encore révélée ! Si correct = <b>{conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0} points MAX</b>, si faux = <b>-{conf?.anticipatedBuzzPenalty || 100} points</b>
              </span>
            </div>
          )}
        </div>
      </div>

      {q ? (
        <motion.div
          className="card space-y-4"
          key={qIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between">
            <motion.div
              className="text-xl font-black"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {q.category? `[${q.category}] `:""}{q.question}
            </motion.div>
            <div className="text-sm opacity-80">{progressLabel}</div>
          </div>

          <motion.div
            className="card"
            style={{ background: "rgba(34,197,94,.12)" }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <b>Réponse (privée animateur) :</b> {q.answer}
          </motion.div>

          <div className="flex items-center gap-4">
            <PointsRing 
              value={ratioRemain} 
              points={wasAnticipated ? (conf?.[q?.difficulty === "difficile" ? "difficile" : "normal"]?.start || 0) : pointsEnJeu} 
            />
            <div className="text-sm opacity-80">
              {cfg ? (
                <>
                  De <b>{cfg.start}</b> à <b>{cfg.floor}</b> en <b>{cfg.durationMs/1000}s</b>.
                  {wasAnticipated && <div className="text-blue-600 font-bold">Buzz anticipé : {cfg.start} points si correct !</div>}
                </>
              ) : "Chargement…"}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <b>Lock :</b> {lockedName}
          </motion.div>
        </motion.div>
      ) : <div className="card">Plus de questions. Terminez la partie.</div>}

      {meta?.mode === "équipes" && teamsArray.length > 0 && (
        <TeamLeaderboard teams={teamsArray} />
      )}

      {/* Scores joueurs complets */}
      <AnimatedLeaderboard players={playersSorted} serverNow={serverNow} />

      <div className="sticky-bar">
        <ShineButton className="btn btn-primary w-full h-14 text-xl" onClick={revealToggle}>
          {state?.revealed ? "Masquer la question" : "Révéler la question"}
        </ShineButton>
      </div>
    </main>
  );
}
