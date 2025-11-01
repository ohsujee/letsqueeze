"use client";
import { useEffect, useState } from "react";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { genCode } from "@/lib/utils";

export default function AlibiHostPage(){
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    signInAnonymously(auth).then(() => {});
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
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
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-3xl font-black">🕵️ ALIBI — Créer une partie</h1>
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
  );
}
