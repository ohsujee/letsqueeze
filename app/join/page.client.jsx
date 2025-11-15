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
        signInAnonymously(auth).catch(()=>{});
      }
    });
    return () => unsub();
  }, []);

  async function join() {
    if (!code || !pseudo || !auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Détecter le type de jeu en checkant quelle room existe
    const { get } = await import("@/lib/firebase");

    // Check si c'est une room Alibi
    const alibiMetaSnapshot = await get(ref(db, `rooms_alibi/${code}/meta`));
    if (alibiMetaSnapshot.exists()) {
      // C'est une room Alibi
      await set(ref(db, `rooms_alibi/${code}/players/${uid}`), {
        uid,
        name: pseudo,
        team: null,
        joinedAt: Date.now()
      });
      router.push("/alibi/room/" + code);
      return;
    }

    // Sinon c'est une room Quiz normale
    const quizMetaSnapshot = await get(ref(db, `rooms/${code}/meta`));
    if (quizMetaSnapshot.exists()) {
      await set(ref(db, `rooms/${code}/players/${uid}`), {
        uid, name: pseudo, score: 0, teamId: "", blockedUntil: 0, joinedAt: Date.now()
      });
      router.push("/room/" + code);
      return;
    }

    // Aucune room trouvée avec ce code
    alert("❌ Code invalide ! Aucune partie trouvée avec ce code.");
  }

  return (
    <div className="game-container">
      {/* Background orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-6 max-w-xl mx-auto space-y-6 min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="game-page-title">LET'S QUEEEZE</h1>
          <h2 className="game-section-title">Rejoindre une partie</h2>
        </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Code de la room
          </label>
          <input
            className="game-input game-input-code"
            placeholder="ABCDEF"
            value={code}
            onChange={e=>setCode(e.target.value.toUpperCase())}
            maxLength={6}
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 opacity-80">
            Ton pseudo
          </label>
          <input
            className="game-input"
            placeholder="Ton nom de joueur"
            value={pseudo}
            onChange={e=>setPseudo(e.target.value)}
            maxLength={20}
            autoComplete="name"
          />
        </div>

        <button 
          className="btn btn-primary w-full h-14 text-xl" 
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
        <div className="card" style={{ background: "rgba(34,197,94,.12)" }}>
          <div className="text-center">
            <div className="text-sm opacity-80">Code détecté automatiquement</div>
            <div className="text-lg font-bold text-retro-green">{initialCode}</div>
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

        /* Background orbs */
        .bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }

        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #4299E1 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }

        .orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #48BB78 0%, transparent 70%);
          bottom: -100px;
          left: -150px;
        }

        .orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #9F7AEA 0%, transparent 70%);
          top: 300px;
          left: 50%;
          transform: translateX(-50%);
        }
      `}</style>
    </div>
  );
}
