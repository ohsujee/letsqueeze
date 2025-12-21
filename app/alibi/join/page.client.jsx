"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion } from "framer-motion";

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
    <div className="alibi-join-container">
      <motion.main
        className="alibi-join-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="alibi-join-header">
          <h1 className="page-title">ALIBI</h1>
          <p className="subtitle">Rejoindre une partie</p>
        </div>

        <div className="alibi-join-card">
          <div className="input-group">
            <label className="input-label">Code de la room</label>
            <input
              className="input-field input-code"
              placeholder="ABCDEF"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Ton pseudo</label>
            <input
              className="input-field"
              placeholder="Ton nom de joueur"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              maxLength={20}
              autoComplete="name"
            />
          </div>

          <button
            className="btn-join"
            onClick={join}
            disabled={!pseudo || !code || !user}
          >
            {!user ? "Connexion..." : "Rejoindre la partie"}
          </button>
        </div>

        <div className="alibi-join-footer">
          <button
            className="btn-back"
            onClick={() => router.push("/home")}
          >
            ← Retour à l'accueil
          </button>
        </div>

        {initialCode && (
          <div className="alibi-detected-code">
            <div className="label">Code détecté automatiquement</div>
            <div className="code">{initialCode}</div>
          </div>
        )}
      </motion.main>
    </div>
  );
}
