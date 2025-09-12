"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { db, ref, onValue } from "@/lib/firebase";

function rankWithTies(items, scoreKey = "score") {
  // Standard competition ranking: 1,2,2,4…
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

  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);

  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v=s.val()||{};
      setPlayers(Object.values(v));
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=> setMeta(s.val()));
    return ()=>{u1();u2();};
  },[code]);

  const modeEquipes = meta?.mode === "équipes";

  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(()=> rankWithTies(players, "score"), [players]);
  const rankedTeams   = useMemo(()=> rankWithTies(teamsArray, "score"), [teamsArray]);

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Fin de partie — {code}</h1>

      {modeEquipes && (
        <section className="space-y-3">
          <h2 className="text-2xl font-black">Podium — Équipes</h2>
          <ol className="grid md:grid-cols-3 gap-3">
            {rankedTeams.slice(0,3).map(t=>(
              <li key={t.id} className="card flex flex-col items-center justify-center text-center">
                <div className="text-xl font-black">#{t.rank}</div>
                <div className="mt-2 px-3 py-1 rounded-xl border-4 border-black font-bold" style={{backgroundColor:t.color}}>
                  {t.name}
                </div>
                <div className="mt-2 text-lg"><b>{t.score||0}</b> pts</div>
              </li>
            ))}
          </ol>

          <div className="card">
            <b>Classement complet — Équipes</b>
            <ul className="mt-2 space-y-1">
              {rankedTeams.map(t=>(
                <li key={t.id} className="card flex justify-between items-center">
                  <span><b>#{t.rank}</b> {t.name}</span>
                  <b>{t.score||0}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-black">Podium — Joueurs</h2>
        <ol className="grid md:grid-cols-3 gap-3">
          {rankedPlayers.slice(0,3).map(p=>(
            <li key={p.uid} className="card flex flex-col items-center justify-center text-center">
              <div className="text-xl font-black">#{p.rank}</div>
              <div className="mt-2 font-bold">{p.name}</div>
              <div className="mt-2 text-lg"><b>{p.score||0}</b> pts</div>
              {modeEquipes && p.teamId && meta?.teams?.[p.teamId] && (
                <div className="mt-1 text-xs px-2 py-0.5 rounded-xl border-2 border-black"
                     style={{backgroundColor: meta.teams[p.teamId].color}}>
                  {meta.teams[p.teamId].name}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="card">
          <b>Classement complet — Joueurs</b>
          <ul className="mt-2 space-y-1">
            {rankedPlayers.map(p=>(
              <li key={p.uid} className="card flex justify-between items-center">
                <span>
                  <b>#{p.rank}</b> {p.name}
                  {modeEquipes && p.teamId && meta?.teams?.[p.teamId] && (
                    <span className="ml-2 px-2 py-0.5 rounded-xl border-2 border-black text-xs"
                          style={{backgroundColor: meta.teams[p.teamId].color}}>
                      {meta.teams[p.teamId].name}
                    </span>
                  )}
                </span>
                <b>{p.score||0}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
