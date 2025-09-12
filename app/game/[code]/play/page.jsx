"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, runTransaction, update,
  signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";
import Buzzer from "@/components/Buzzer";
import PointsRing from "@/components/PointsRing";

export default function PlayerGame(){
  const { code } = useParams();
  const router = useRouter();

  const [state,setState]=useState(null);
  const [meta,setMeta]=useState(null);
  const [players,setPlayers]=useState([]);
  const [me,setMe]=useState(null);
  const [quiz,setQuiz]=useState(null);
  const [conf,setConf]=useState(null);

  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ const id = setInterval(()=>setNow(Date.now()), 100); return ()=>clearInterval(id); },[]);

  // Auth
  useEffect(()=>{ signInAnonymously(auth).then(()=>{}); const unsub = onAuthStateChanged(auth, ()=>{}); return ()=>unsub(); },[]);

  // Config scoring
  useEffect(()=>{ fetch("/config/scoring.json").then(r=>r.json()).then(setConf); },[]);

  // DB listeners
  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/state`), s=>{
      const v=s.val(); setState(v);
      if(v?.phase==="ended") router.push("/end/"+code);
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
  const paused = !!state?.pausedAt;

  const qIndex = state?.currentIndex || 0;
  const q = quiz?.items?.[qIndex];

  const blockedMs = Math.max(0, (me?.blockedUntil || 0) - now);
  const blocked = blockedMs > 0;
  const blockedSec = Math.ceil(blockedMs / 1000);

  const elapsedEffective = useMemo(()=>{
    if (!revealed || !state?.lastRevealAt) return 0;
    const acc = state?.elapsedAcc || 0;
    const end = paused ? state.pausedAt : now;
    return acc + Math.max(0, end - state.lastRevealAt);
  }, [revealed, state?.lastRevealAt, state?.elapsedAcc, paused, state?.pausedAt, now]);

  const { pointsEnJeu, ratioRemain, cfg } = useMemo(()=>{
    if(!conf || !q) return { pointsEnJeu: 0, ratioRemain: 0, cfg: null };
    const diff = q.difficulty === "difficile" ? "difficile" : "normal";
    const c = conf[diff];
    const ratio = Math.max(0, 1 - (elapsedEffective / c.durationMs));
    const pts = Math.max(c.floor, Math.round(c.start * ratio));
    const denom = Math.max(1, c.start - c.floor);
    const remain = Math.max(0, Math.min(1, (pts - c.floor) / denom));
    return { pointsEnJeu: pts, ratioRemain: remain, cfg: c };
  }, [conf, q, elapsedEffective]);

  async function buzz(){
    if(!revealed || blocked) return;
    const lockRef = ref(db, `rooms/${code}/state/lockUid`);
    const res = await runTransaction(lockRef, cur => cur ? cur : auth.currentUser.uid );
    if (res?.committed && res.snapshot?.val() === auth.currentUser.uid) {
      await update(ref(db,`rooms/${code}/state`), { buzzBanner: `🔔 ${me?.name||"Un joueur"} a buzzé !` });
    }
  }

  const myTeam = me?.teamId ? meta?.teams?.[me.teamId] : null;

  const teamsSorted = useMemo(()=>{
    if (meta?.mode !== "équipes") return [];
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}))
      .sort((a,b)=> (b.score||0)-(a.score||0));
  }, [meta?.teams, meta?.mode]);

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-black">Player — Room {code}</h1>

      {myTeam && (
        <div className="card" style={{ backgroundColor: myTeam.color }}>
          <b>Mon équipe :</b> {myTeam.name} — Score équipe: <b>{myTeam.score||0}</b>
        </div>
      )}

      <div className="card banner"><b>Buzz :</b> {state?.buzzBanner || "— en attente —"}</div>
      <div className="card"><b>Mon score :</b> {me?.score||0}</div>

      <div className="card">
        {q && (
          <>
            <div className="mb-2 text-lg font-black">Question</div>
            {revealed ? <div className="mb-3">{q.question}</div> : <div className="mb-3 opacity-60">En attente de révélation…</div>}

            {/* Anneau Points en jeu */}
            <div className="flex items-center gap-4">
              <PointsRing value={revealed ? ratioRemain : 0} points={revealed ? pointsEnJeu : 0} />
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

      <Buzzer onBuzz={buzz} disabled={!revealed || locked || blocked}/>
      {blocked && <div className="card" style={{ background: "rgba(148,163,184,.2)" }}>⏳ Pénalité {blockedSec}s après erreur/buzz trop tôt</div>}
    </main>
  );
}
