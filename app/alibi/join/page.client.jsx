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
    signInAnonymously(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function join() {
    if (!code || !pseudo || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Créer le joueur dans la room Alibi
    await set(ref(db, `rooms_alibi/${code}/players/${uid}`), {
      uid,
      name: pseudo,
      team: null, // sera assigné dans le lobby
      joinedAt: Date.now()
    });

    router.push("/alibi/room/" + code);
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black">🕵️ ALIBI</h1>
        <h2 className="text-2xl font-bold">Rejoindre une partie</h2>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Code de la room
          </label>
          <input
            className="w-full p-4 rounded-lg bg-slate-700 border-2 border-accent text-white text-center text-xl font-mono tracking-widest"
            placeholder="ABCDEF"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Ton pseudo
          </label>
          <input
            className="w-full p-4 rounded-lg bg-slate-700 border-2 border-accent text-white"
            placeholder="Ton nom de joueur"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={20}
          />
        </div>

        <button
          className="btn btn-accent w-full h-14 text-xl"
          onClick={join}
          disabled={!pseudo || !code || !user}
        >
          {!user ? "Connexion..." : "Rejoindre la partie"}
        </button>
      </div>

      <div className="text-center">
        <button
          className="btn"
          onClick={() => router.push("/")}
        >
          Retour à l'accueil
        </button>
      </div>

      {initialCode && (
        <div className="card bg-accent/10">
          <div className="text-center">
            <div className="text-sm opacity-80">Code détecté automatiquement</div>
            <div className="text-lg font-bold text-accent">{initialCode}</div>
          </div>
        </div>
      )}
    </main>
  );
}
