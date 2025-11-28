"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db, ref, set, update, onValue, signInAnonymously, onAuthStateChanged, runTransaction } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Qr from "@/components/ui/Qr";
import QrModal from "@/lib/components/QrModal";
import { genCode } from "@/lib/utils";
import BottomNav from "@/lib/components/BottomNav";

export default function HostPage(){
  const router = useRouter();
  const [ready,setReady]=useState(false);
  const [user,setUser]=useState(null);
  const [room,setRoom]=useState(null);
  const [code,setCode]=useState("");
  const joinUrl = useMemo(()=> typeof window!=="undefined" && code ? window.location.origin + "/join?code="+code : "", [code]);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{
      if(u){
        // Utilisateur déjà connecté
        setUser(u);
        setReady(true);
      } else {
        // Pas d'utilisateur, connexion anonyme
        signInAnonymously(auth).then(()=>setReady(true));
      }
    });
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

    // Rediriger automatiquement vers le lobby
    router.push("/room/" + c);
  }

  return (
    <div className="game-container">
      <main className="game-content p-6 max-w-xl mx-auto space-y-6 min-h-screen" style={{paddingBottom: '100px'}}>
        <h1 className="game-page-title">Animateur — Créer une room</h1>
        {!user && <p>Connexion anonyme…</p>}
        {user && !room && <button className="btn btn-primary" onClick={createRoom}>Créer une room</button>}
        {room && (
          <div className="space-y-3">
            <p className="card">Code room : <span className="font-black text-2xl">{code}</span></p>
            <div className="space-y-3">
              <p><b>Inviter :</b> {joinUrl}</p>
              <div className="flex gap-2 flex-wrap">
                <Link className="btn btn-accent" href={"/room/"+code}>Aller au lobby</Link>
                <Link className="btn btn-primary" href={"/game/"+code+"/host"}>Écran Animateur</Link>
                {joinUrl && <QrModal text={joinUrl} buttonText="Voir QR Code" />}
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />

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

      `}</style>
    </div>
  );
}
