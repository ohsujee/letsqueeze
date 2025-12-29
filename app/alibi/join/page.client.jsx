"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion } from "framer-motion";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { User } from "lucide-react";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [user, setUser] = useState(null);
  const { profile, loading: profileLoading } = useUserProfile();

  // Get pseudo from profile or fallback to displayName
  const pseudo = profile?.pseudo || user?.displayName?.split(' ')[0] || 'Joueur';

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

          {/* Show current pseudo from profile */}
          <div className="pseudo-preview">
            <User size={16} className="pseudo-icon" />
            <span className="pseudo-label">Tu joues en tant que</span>
            <span className="pseudo-name">{pseudo}</span>
          </div>

          <button
            className="btn-join"
            onClick={join}
            disabled={!code || !user || profileLoading}
          >
            {!user || profileLoading ? "Connexion..." : "Rejoindre la partie"}
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
