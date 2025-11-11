"use client";
import { useEffect, useState } from "react";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { genCode } from "@/lib/utils";

export default function AlibiHostPage(){
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if(u){
        setUser(u);
      } else {
        signInAnonymously(auth).then(() => {});
      }
    });
    return () => unsub();
  }, []);

  async function createRoom(){
    const c = genCode();
    const now = Date.now();

    // Créer la room Alibi dans Firebase
    await set(ref(db, "rooms_alibi/" + c + "/meta"), {
      code: c,
      createdAt: now,
      hostUid: auth.currentUser.uid,
      expiresAt: now + 12 * 60 * 60 * 1000,
      alibiId: null,
      gameType: "alibi"
    });

    await set(ref(db, "rooms_alibi/" + c + "/teams"), {
      inspectors: [],
      suspects: []
    });

    await set(ref(db, "rooms_alibi/" + c + "/state"), {
      phase: "lobby",
      currentQuestion: 0,
      prepTimeLeft: 90,
      questionTimeLeft: 30,
      allAnswered: false
    });

    await set(ref(db, "rooms_alibi/" + c + "/score"), {
      correct: 0,
      total: 10
    });

    // Rediriger automatiquement vers le lobby Alibi
    router.push("/alibi/room/" + c);
  }

  return (
    <div className="game-container">
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      <main className="game-content p-6 max-w-xl mx-auto space-y-6 min-h-screen">
        <h1 className="game-page-title">🕵️ ALIBI — Créer une partie</h1>
        <p className="opacity-70">Interrogatoire d'accusés : trouvez les incohérences dans leur alibi !</p>

      {!user && <p>Connexion anonyme…</p>}
      {user && (
        <button className="btn btn-accent w-full" onClick={createRoom}>
          Créer une partie ALIBI
        </button>
      )}

      <div className="card space-y-2">
        <h3 className="font-bold">Comment jouer ?</h3>
        <ul className="text-sm opacity-80 space-y-1 list-disc list-inside">
          <li>2 équipes : Inspecteurs vs Interrogés (suspects)</li>
          <li>Phase préparation : 1m30 pour lire l'alibi</li>
          <li>Phase interrogatoire : 10 questions avec 30s par réponse</li>
          <li>Les inspecteurs valident ou refusent chaque réponse</li>
          <li>Score final : nombre de réponses validées / 10</li>
        </ul>
      </div>
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
