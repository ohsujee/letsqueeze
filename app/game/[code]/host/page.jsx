"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import PointsRing from "@/components/PointsRing";

function useQuiz(quizId){
  const [quiz,setQuiz]=useState(null);
  useEffect(()=>{ if(quizId) fetch(`/data/${quizId}.json`).then(r=>r.json()).then(setQuiz); },[quizId]);
  return quiz;
}

// petit hook sonore
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

  // compteur points (synchro serveur + pause)
  const elapsedEffective = useMemo(()=>{
    if (!state?.revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const end = state?.pausedAt ? state.pausedAt : serverNow;
    return acc + Math.max(0, end - state.lastRevealAt);
  },[state?.revealed, state?.lastRevealAt, state?.elapsedAcc, state?.pausedAt, serverNow]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 0, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));
    const denom = Math.max(1, c.start - c.floor);
    const remain = Math.max(0, Math.min(1, (pts - c.floor) / denom));
    return { pointsEnJeu: pts, ratioRemain: remain, cfg: c };
  },[conf, q, elapsedEffective]);

  // Sons: reveal & buzz (déclenchement sur changement)
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

  // helpers
  function computeResumeFields(){
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null };
  }

  // actions
  async function revealToggle(){
    if(!isHost || !q) return;
    if (!state?.revealed) {
      await update(ref(db,`rooms/${code}/state`), {
        revealed: true, lastRevealAt: serverTimestamp(), elapsedAcc: 0, pausedAt: null, lockUid: null
      });
    } else {
      await update(ref(db,`rooms/${code}/state`), { revealed: false });
    }
  }
  async function resetBuzzers(){
    if(!isHost) return;
    const resume = computeResumeFields();
    await update(ref(db,`rooms/${code}/state`), { lockUid: null, buzzBanner: "", ...resume });
  }
  async function validate(){
    if(!isHost || !q || !state?.lockUid || !conf) return;
    const uid = state.lockUid;
    const pts = pointsEnJeu;

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
    await update(ref(db,`rooms/${code}/state`), {
      currentIndex: next,
      revealed: false, lockUid: null, pausedAt: null,
      elapsedAcc: 0, lastRevealAt: 0, buzzBanner: ""
    });
  }
  async function wrong(){
    if(!isHost || !state?.lockUid || !conf) return;
    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;

    const updates = {};
    const until = serverNow + ms;
    updates[`rooms/${code}/players/${uid}/blockedUntil`] = until;

    if (meta?.mode === "équipes") {
      const player = players.find(p=>p.uid===uid);
      const teamId = player?.teamId;
      if (teamId) {
        players.filter(p=>p.teamId===teamId).forEach(p=>{
          updates[`rooms/${code}/players/${p.uid}/blockedUntil`] = until;
        });
      }
    }

    const resume = computeResumeFields();
    updates[`rooms/${code}/state/lockUid`] = null;
    updates[`rooms/${code}/state/buzzBanner`] = "";
    updates[`rooms/${code}/state/elapsedAcc`] = resume.elapsedAcc;
    updates[`rooms/${code}/state/lastRevealAt`] = resume.lastRevealAt;
    updates[`rooms/${code}/state/pausedAt`] = resume.pausedAt;

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
    await update(ref(db,`rooms/${code}/state`), {
      currentIndex: next, revealed: false, lockUid: null,
      pausedAt: null, elapsedAcc: 0, lastRevealAt: 0, buzzBanner: ""
    });
  }
  async function end(){ if(isHost){ await update(ref(db,`rooms/${code}/state`), { phase:"ended" }); router.replace(`/end/${code}`); } }

  const lockedName = state?.lockUid ? (players.find(p=>p.uid===state.lockUid)?.name || state.lockUid) : "—";
  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {}; return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  return (
    <main className="p-6 pb-28 max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Écran Animateur — {code}</h1>

      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={resetBuzzers}>Reset buzzers</button>
          <button className="btn" onClick={wrong}>✘ Mauvaise</button>
          <button className="btn btn-accent" onClick={validate}>✔ Valider</button>
          <button className="btn" onClick={skip}>⏭ Passer</button>
          <button className="btn" onClick={end}>Terminer</button>
        </div>
        <div className="mt-3 card banner">
          <b>Buzz :</b> {state?.buzzBanner || "— en attente —"}
        </div>
      </div>

      {q ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-black">
              {q.category? `[${q.category}] `:""}{q.question}
            </div>
            <div className="text-sm opacity-80">{progressLabel}</div>
          </div>

          <div className="card" style={{ background: "rgba(34,197,94,.12)" }}>
            <b>Réponse (privée animateur) :</b> {q.answer}
          </div>

          <div className="flex items-center gap-4">
            <PointsRing value={state?.revealed ? ratioRemain : 0} points={state?.revealed ? pointsEnJeu : 0} />
            <div className="text-sm opacity-80">
              {cfg ? <>Descend de <b>{cfg.start}</b> à <b>{cfg.floor}</b> sur <b>{cfg.durationMs/1000}s</b>.</> : "Chargement…"}
            </div>
          </div>

          <div><b>Lock :</b> {lockedName}</div>
        </div>
      ) : <div className="card">Plus de questions. Terminez la partie.</div>}

      {meta?.mode === "équipes" && teamsArray.length > 0 && (
        <div className="card">
          <b>Scores des équipes</b>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {teamsArray.map(t=>(
              <li key={t.id} className="card flex justify-between items-center">
                <span className="font-bold" style={{backgroundColor:t.color}}>&nbsp;&nbsp;{t.name}&nbsp;&nbsp;</span>
                <b>{t.score||0}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sticky-bar">
        <button className="btn btn-primary w-full h-14 text-xl" onClick={revealToggle}>
          {state?.revealed ? "Masquer la question" : "Révéler la question"}
        </button>
      </div>
    </main>
  );
}
