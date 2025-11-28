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
    const unsub = onAuthStateChanged(auth, (u) => {
      if(u){
        setUser(u);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
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
    <div className="game-container">
      <main className="game-content p-6 max-w-xl mx-auto space-y-6 min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="game-page-title">🕵️ ALIBI</h1>
          <h2 className="game-section-title">Rejoindre une partie</h2>
        </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Code de la room
          </label>
          <input
            className="game-input game-input-code game-input-accent"
            placeholder="ABCDEF"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Ton pseudo
          </label>
          <input
            className="game-input game-input-accent"
            placeholder="Ton nom de joueur"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={20}
            autoComplete="name"
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
