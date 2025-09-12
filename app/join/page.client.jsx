"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [user, setUser] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).catch(()=>{});
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function join() {
    if (!code || !pseudo || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await set(ref(db, `rooms/${code}/players/${uid}`), {
      uid, name: pseudo, score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now()
    });
    router.push("/room/" + code);
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-3xl font-black">Rejoindre une room</h1>
      <input className="card w-full" placeholder="Code (6 caractères)" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/>
      <input className="card w-full" placeholder="Ton pseudo" value={pseudo} onChange={e=>setPseudo(e.target.value)}/>
      <button className="btn btn-primary w-full" onClick={join} disabled={!pseudo || !code || !user}>
        Rejoindre
      </button>
    </main>
  );
}
