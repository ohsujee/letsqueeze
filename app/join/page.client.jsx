"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, get, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion } from "framer-motion";
import BottomNav from "@/lib/components/BottomNav";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { User } from "lucide-react";
import { ROOM_TYPES } from "@/lib/config/rooms";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const { profile, loading: profileLoading } = useUserProfile();

  // Get pseudo from profile or fallback to displayName
  const pseudo = profile?.pseudo || user?.displayName?.split(' ')[0] || 'Joueur';

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
    if (!code || !pseudo || !auth.currentUser || joining) return;

    setJoining(true);
    const uid = auth.currentUser.uid;
    const roomCode = code.trim().toUpperCase();

    try {
      // Check all room types to find the matching one
      for (const roomType of ROOM_TYPES) {
        const metaSnapshot = await get(ref(db, `${roomType.prefix}/${roomCode}/meta`));

        if (metaSnapshot.exists()) {
          // Found the room! Add player and redirect
          const playerData = roomType.playerSchema(uid, pseudo);
          await set(ref(db, `${roomType.prefix}/${roomCode}/players/${uid}`), playerData);
          router.push(`${roomType.path}/${roomCode}`);
          return;
        }
      }

      // No room found with this code in any game type
      alert("❌ Code invalide ! Aucune partie trouvée avec ce code.");
    } catch (error) {
      console.error("Join error:", error);
      alert("❌ Erreur lors de la connexion à la partie.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="join-container">
      <motion.main
        className="join-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="join-header">
          <h1 className="page-title">Rejoindre</h1>
        </div>

        <div className="join-card">
          <div className="input-group">
            <label className="input-label">Code de la room</label>
            <input
              className="input-field input-code"
              placeholder="ABCDEF"
              value={code}
              onChange={e=>setCode(e.target.value.toUpperCase())}
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
            disabled={!code || !user || profileLoading || joining}
          >
            {!user || profileLoading ? "Connexion..." : joining ? "Connexion..." : "Rejoindre la partie"}
          </button>
        </div>

        {initialCode && (
          <div className="join-detected-code">
            <div className="label">Code détecté automatiquement</div>
            <div className="code">{initialCode}</div>
          </div>
        )}
      </motion.main>

      <BottomNav />
    </div>
  );
}
