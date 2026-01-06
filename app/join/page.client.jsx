"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, ref, set, get, signInAnonymously, onAuthStateChanged } from "@/lib/firebase";
import { motion } from "framer-motion";
import BottomNav from "@/lib/components/BottomNav";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { User } from "lucide-react";
import { ROOM_TYPES } from "@/lib/config/rooms";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { isPro } from "@/lib/subscription";
import { shouldShowInterstitial, markAdShownDuringJoin } from "@/lib/hooks/useInterstitialAd";
import JoinLoadingScreen from "@/components/ui/JoinLoadingScreen";

export default function JoinClient({ initialCode = "" }) {
  const router = useRouter();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState(null);
  const { user: currentUser, profile, subscription, loading: profileLoading } = useUserProfile();

  // Check if user is Pro
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

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
      let foundRoomType = null;
      for (const roomType of ROOM_TYPES) {
        const metaSnapshot = await get(ref(db, `${roomType.prefix}/${roomCode}/meta`));

        if (metaSnapshot.exists()) {
          foundRoomType = roomType;
          break;
        }
      }

      if (!foundRoomType) {
        // No room found with this code in any game type
        alert("❌ Code invalide ! Aucune partie trouvée avec ce code.");
        setJoining(false);
        return;
      }

      // Show loading screen with Game Card
      setJoiningGameId(foundRoomType.id);

      // Add player to Firebase
      const playerData = foundRoomType.playerSchema(uid, pseudo);
      await set(ref(db, `${foundRoomType.prefix}/${roomCode}/players/${uid}`), playerData);

      // Check if should show ad (unified logic)
      if (shouldShowInterstitial(userIsPro)) {
        try {
          // Mark that ad was shown during join (so room page doesn't show it again)
          markAdShownDuringJoin();

          // Init and show interstitial ad
          await initAdMob();
          await showInterstitialAd();
        } catch (err) {
          console.log('[Join] Interstitial ad error:', err);
        }
      }

      // Navigate to room (ad is dismissed or failed)
      router.push(`${foundRoomType.path}/${roomCode}`);
    } catch (error) {
      console.error("Join error:", error);
      alert("❌ Erreur lors de la connexion à la partie.");
      setJoining(false);
      setJoiningGameId(null);
    }
  }

  // Show loading screen while joining (with Game Card)
  if (joiningGameId) {
    return <JoinLoadingScreen gameId={joiningGameId} />;
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
