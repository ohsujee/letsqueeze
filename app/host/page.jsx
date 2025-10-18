"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db, ref, set, update, onValue, signInAnonymously, onAuthStateChanged, runTransaction } from "@/lib/firebase";
import Link from "next/link";
import Qr from "@/components/Qr";
import { genCode } from "@/lib/utils";

export default function HostPage(){
  const [ready,setReady]=useState(false);
  const [user,setUser]=useState(null);
  const [room,setRoom]=useState(null);
  const [code,setCode]=useState("");
  const joinUrl = useMemo(()=> typeof window!=="undefined" && code ? window.location.origin + "/join?code="+code : "", [code]);

  useEffect(()=>{
    signInAnonymously(auth).then(()=>setReady(true));
    const unsub = onAuthStateChanged(auth, (u)=>setUser(u));
    return ()=>unsub();
  },[]);

  async function createRoom(){
    const c = genCode();
    const now = Date.now();
    await set(ref(db, "rooms/"+c+"/meta"), {
      code: c, createdAt: now, hostUid: auth.currentUser.uid, expiresAt: now + 12*60*60*1000,
      mode: "individuel", teamCount: 0, quizId: "general", teams: {}
    });
    await set(ref(db, "rooms/"+c+"/state"), {
      phase: "lobby", currentIndex: 0, revealed: false, lockUid: null, buzzBanner: "", lastRevealAt: 0
    });
    await set(ref(db, "rooms/"+c+"/__health__"), { aliveAt: now });
    setCode(c);
    setRoom(c);
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">Animateur — Créer une room</h1>
      {!user && <p>Connexion anonyme…</p>}
      {user && !room && <button className="btn btn-primary" onClick={createRoom}>Créer une room</button>}
      {room && (
        <div className="space-y-3">
          <p className="card">Code room : <span className="font-black text-2xl">{code}</span></p>
          <div className="flex items-center gap-3 flex-wrap">
            {joinUrl && <Qr text={joinUrl} />}
            <div className="space-y-2">
              <p><b>Inviter :</b> {joinUrl}</p>
              <div className="flex gap-2">
                <Link className="btn btn-accent" href={"/room/"+code}>Aller au lobby</Link>
                <Link className="btn btn-primary" href={"/game/"+code+"/host"}>Écran Animateur</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
