"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update,
  signInAnonymously, onAuthStateChanged
} from "@/lib/firebase";

const TEAM_PALETTE = [
  { id: "t1", name: "Équipe 1", color: "#FF6B6B" },
  { id: "t2", name: "Équipe 2", color: "#4D96FF" },
  { id: "t3", name: "Équipe 3", color: "#43D17C" },
  { id: "t4", name: "Équipe 4", color: "#B26BFF" }
];

export default function LobbyPage(){
  const { code } = useParams();
  const router = useRouter();

  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);
  const [state,setState]=useState(null);
  const [quizList,setQuizList]=useState([]);
  const [user,setUser]=useState(null);

  // Auth
  useEffect(()=>{
    signInAnonymously(auth);
    const unsub = onAuthStateChanged(auth, (u)=>setUser(u));
    return ()=>unsub();
  },[]);

  // Data listeners
  useEffect(()=>{
    const pRef = ref(db, `rooms/${code}/players`);
    const mRef = ref(db, `rooms/${code}/meta`);
    const sRef = ref(db, `rooms/${code}/state`);

    const u1 = onValue(pRef, snap=>{
      const val = snap.val()||{};
      setPlayers(Object.values(val).sort((a,b)=>a.joinedAt-b.joinedAt));
    });
    const u2 = onValue(mRef, snap=> setMeta(snap.val()));
    const u3 = onValue(sRef, snap=> setState(snap.val()));

    fetch("/data/manifest.json").then(r=>r.json()).then(m=>setQuizList(m.quizzes||[]));
    return ()=>{ u1(); u2(); u3(); };
  },[code]);

  // Redirections jeu
  useEffect(()=>{
    if (!state?.phase || !meta || !user) return;
    if (state.phase === "playing") {
      const isHost = meta.hostUid === user.uid;
      router.replace(isHost ? `/game/${code}/host` : `/game/${code}/play`);
    } else if (state.phase === "ended") {
      router.replace(`/end/${code}`);
    }
  },[state?.phase, meta, user, code, router]);

  const isHost = meta?.hostUid === user?.uid;
  const teamCount = Math.min(4, Math.max(0, meta?.teamCount || 0));
  const activeTeams = useMemo(()=>{
    const t = meta?.teams || {};
    return TEAM_PALETTE
      .filter((tp,i)=> i < teamCount)
      .map(tp => ({ ...tp, ...(t[tp.id]||{}) })); // merge persisted score/name
  }, [meta?.teams, teamCount]);

  // —— Actions équipes ——

  async function setMode(mode){
    if(!isHost) return;
    await update(ref(db, `rooms/${code}/meta`), { mode });
  }

  async function applyTeamCount(n){
    if(!isHost) return;
    n = Math.min(4, Math.max(2, n));

    // Construire updates pour créer/retirer les équipes
    const updates = {};
    updates[`rooms/${code}/meta/mode`] = "équipes";
    updates[`rooms/${code}/meta/teamCount`] = n;

    TEAM_PALETTE.forEach((tp, idx)=>{
      if (idx < n) {
        updates[`rooms/${code}/meta/teams/${tp.id}/name`] = meta?.teams?.[tp.id]?.name || tp.name;
        updates[`rooms/${code}/meta/teams/${tp.id}/color`] = meta?.teams?.[tp.id]?.color || tp.color;
        updates[`rooms/${code}/meta/teams/${tp.id}/score`] = meta?.teams?.[tp.id]?.score || 0;
      } else {
        updates[`rooms/${code}/meta/teams/${tp.id}`] = null;
      }
    });

    await update(ref(db), updates);
  }

  async function autoAssign(){
    if(!isHost || activeTeams.length < 2) return;
    const arr = players.slice();
    if (!arr.length) return;

    // Round-robin équilibré
    const updates = {};
    arr.forEach((p, idx)=>{
      const team = activeTeams[idx % activeTeams.length];
      updates[`rooms/${code}/players/${p.uid}/teamId`] = team.id;
    });
    await update(ref(db), updates);
  }

  async function movePlayer(uid, teamId){
    if(!isHost) return;
    await update(ref(db, `rooms/${code}/players/${uid}`), { teamId });
  }

  async function start(){
    if(!isHost) return;
    await update(ref(db, `rooms/${code}/state`), {
      phase: "playing", currentIndex: 0, revealed: false, lockUid: null, buzzBanner: "",
      lastRevealAt: 0, pausedAt: null, elapsedAcc: 0
    });
    router.replace(`/game/${code}/host`);
  }

  const grouped = useMemo(()=>{
    const byTeam = { none: [] };
    activeTeams.forEach(t=> byTeam[t.id] = []);
    players.forEach(p=>{
      const tid = p.teamId && byTeam[p.teamId] ? p.teamId : "none";
      byTeam[tid].push(p);
    });
    return byTeam;
  }, [players, activeTeams]);

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Lobby — Room {code}</h1>

      {/* Paramètres */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div><b>Mode :</b> {meta?.mode || "individuel"}</div>
          {isHost && (
            <div className="flex gap-2">
              <button className={"btn " + (meta?.mode==="individuel"?"btn-accent":"")} onClick={()=>setMode("individuel")}>Individuel</button>
              <button className={"btn " + (meta?.mode==="équipes"?"btn-accent":"")} onClick={()=>setMode("équipes")}>Équipes</button>
            </div>
          )}
        </div>

        {meta?.mode === "équipes" && (
          <div className="flex flex-wrap items-center gap-3">
            <div><b>Nombre d’équipes :</b> {teamCount || "—"}</div>
            {isHost && (
              <div className="flex gap-2">
                {[2,3,4].map(n=>(
                  <button key={n} className={"btn " + (teamCount===n?"btn-primary":"")} onClick={()=>applyTeamCount(n)}>{n}</button>
                ))}
                <button className="btn btn-accent" onClick={autoAssign}>Auto-répartir</button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><b>Quiz :</b> {meta?.quizId}</div>
          {isHost && (
            <select className="card" value={meta?.quizId||"general"} onChange={e=>update(ref(db, `rooms/${code}/meta`), { quizId: e.target.value })}>
              {quizList.map(q=> <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Grilles équipes */}
      {meta?.mode === "équipes" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTeams.map(team=>(
            <div key={team.id} className="card">
              <div className="rounded-xl border-4 border-black px-3 py-2 mb-3"
                   style={{backgroundColor: team.color}}>
                <div className="font-black">🏳️ {team.name}</div>
                <div className="text-sm">Score: <b>{team.score||0}</b></div>
              </div>
              <ul className="space-y-2">
                {grouped[team.id].map(p=>(
                  <li key={p.uid} className="card flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    {isHost && (
                      <select
                        className="card"
                        value={p.teamId || ""}
                        onChange={(e)=>movePlayer(p.uid, e.target.value)}
                      >
                        {activeTeams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
                        <option value="">Sans équipe</option>
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Sans équipe */}
          <div className="card">
            <div className="rounded-xl border-4 border-black px-3 py-2 mb-3 bg-gray-200">
              <div className="font-black">👤 Sans équipe</div>
            </div>
            <ul className="space-y-2">
              {grouped.none.map(p=>(
                <li key={p.uid} className="card flex items-center justify-between gap-2">
                  <span>{p.name}</span>
                  {isHost && (
                    <select
                      className="card"
                      value={p.teamId || ""}
                      onChange={(e)=>movePlayer(p.uid, e.target.value)}
                    >
                      <option value="">Sans équipe</option>
                      {activeTeams.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        // Mode individuel: liste plate
        <div className="card">
          <b>Joueurs ({players.length})</b>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {players.map(p=> <li key={p.uid} className="card">{p.name}</li>)}
          </ul>
        </div>
      )}

      {isHost && <button className="btn btn-primary w-full" onClick={start}>Démarrer la partie</button>}
    </main>
  );
}
