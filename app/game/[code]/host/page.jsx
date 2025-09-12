"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  auth, db, ref, onValue, update, runTransaction, serverTimestamp
} from "@/lib/firebase";
import PointsRing from "@/components/PointsRing";

function useQuiz(quizId){
  const [quiz,setQuiz]=useState(null);
  useEffect(()=>{ if(quizId) fetch(`/data/${quizId}.json`).then(r=>r.json()).then(setQuiz); },[quizId]);
  return quiz;
}

export default function HostGame(){
  const { code } = useParams();
  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [players,setPlayers]=useState([]);
  const [conf,setConf]=useState(null);

  // Tick + offset serveur
  const [localNow, setLocalNow] = useState(Date.now());
  const [offset, setOffset] = useState(0); // ms to add to local time to get server time
  useEffect(()=>{ fetch("/config/scoring.json").then(r=>r.json()).then(setConf); },[]);
  useEffect(()=>{
    const offRef = ref(db, ".info/serverTimeOffset");
    const unoff = onValue(offRef, s=> setOffset(Number(s.val())||0));
    const id=setInterval(()=>setLocalNow(Date.now()), 100);
    return ()=>{ clearInterval(id); unoff(); };
  },[]);
  const serverNow = localNow + offset;

  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/meta`), s=>setMeta(s.val()));
    const u2 = onValue(ref(db,`rooms/${code}/state`), s=>setState(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v = s.val()||{}; setPlayers(Object.values(v));
    });
    return ()=>{u1();u2();u3();};
  },[code]);

  const isHost = meta?.hostUid === auth.currentUser?.uid;
  const quiz  = useQuiz(meta?.quizId || "general");
  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];

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

  // Pause auto quand lock pris → timestamp serveur
  useEffect(()=>{
    if(!isHost) return;
    if(state?.revealed && state?.lockUid && !state?.pausedAt){
      update(ref(db,`rooms/${code}/state`), { pausedAt: serverTimestamp() });
    }
  },[isHost, code, state?.revealed, state?.lockUid, state?.pausedAt]);

  function computeResumeFields(){
    // Utilise exclusivement les timestamps serveur déjà enregistrés
    const already = (state?.elapsedAcc || 0)
      + Math.max(0, (state?.pausedAt || 0) - (state?.lastRevealAt || 0));
    return { elapsedAcc: already, lastRevealAt: serverTimestamp(), pausedAt: null };
  }

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

    await update(ref(db,`rooms/${code}/state`), {
      currentIndex: (state.currentIndex||0)+1,
      revealed: false, lockUid: null, pausedAt: null,
      elapsedAcc: 0, lastRevealAt: 0, buzzBanner: ""
    });
  }

  async function wrong(){
    if(!isHost || !state?.lockUid || !conf) return;
    const ms = conf.lockoutMs || 8000;
    const uid = state.lockUid;

    const updates = {};
    const until = serverNow + ms; // basé sur l'heure serveur
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

  async function end(){ if(isHost) await update(ref(db,`rooms/${code}/state`), { phase:"ended" }); }

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
          <button className="btn" onClick={end}>Terminer</button>
        </div>
        <div className="mt-3 card banner">
          <b>Buzz :</b> {state?.buzzBanner || "— en attente —"}
        </div>
      </div>

      {q ? (
        <div className="card space-y-4">
          <div className="text-xl font-black">
            Q{qIndex+1} — {q.category? `[${q.category}] `:""}{q.question}
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

      <div className="card">
        <b>Podium joueurs</b>
        <ul className="grid grid-cols-2 gap-2 mt-2">
          {players.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,3).map((p,i)=>(
            <li key={p.uid} className="card">{i+1}. {p.name} — <b>{p.score||0}</b></li>
          ))}
        </ul>
      </div>

      <div className="sticky-bar">
        <button className="btn btn-primary w-full h-14 text-xl" onClick={revealToggle}>
          {state?.revealed ? "Masquer la question" : "Révéler la question"}
        </button>
      </div>
    </main>
  );
}
