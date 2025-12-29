"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update, auth, onAuthStateChanged } from "@/lib/firebase";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";
import { motion } from "framer-motion";
import { useToast } from "@/lib/hooks/useToast";
import { hueScenariosService } from "@/lib/hue-module";
import { recordQuizGame } from "@/lib/services/statsService";
import { storage } from "@/lib/utils/storage";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";

function rankWithTies(items, scoreKey = "score") {
  const sorted = items.slice().sort((a,b)=> (b[scoreKey]||0) - (a[scoreKey]||0));
  let lastScore = null, lastRank = 0, seen = 0;
  return sorted.map((it) => {
    seen += 1;
    const sc = it[scoreKey] || 0;
    const rank = (lastScore === sc) ? lastRank : seen;
    lastScore = sc; lastRank = rank;
    return { ...it, rank };
  });
}

export default function EndPage(){
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [players,setPlayers]=useState([]);
  const [meta,setMeta]=useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [myUid, setMyUid] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const statsRecordedRef = useRef(false);
  const adShownRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Récupérer l'uid de l'utilisateur depuis le localStorage
  useEffect(() => {
    const uid = localStorage.getItem(`lq_uid_${code}`);
    setMyUid(uid);

    // Mark that user completed a game (for guest prompt on home)
    storage.set('returnedFromGame', true);
  }, [code]);

  // Show interstitial ad before showing results (for non-Pro users)
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[EndPage] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Get Firebase auth user for stats
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  const [state, setState] = useState(null);

  // Calculer isHost après avoir les données nécessaires
  const isHost = myUid && meta?.hostUid === myUid;

  useEffect(()=>{
    const u1 = onValue(ref(db,`rooms/${code}/players`), s=>{
      const v=s.val()||{};
      // Inclure l'uid depuis les clés Firebase
      const playersWithUid = Object.entries(v).map(([uid, data]) => ({ uid, ...data }));
      setPlayers(playersWithUid);
    });
    const u2 = onValue(ref(db,`rooms/${code}/meta`), s=> setMeta(s.val()));
    const u3 = onValue(ref(db,`rooms/${code}/state`), s=> setState(s.val()));
    return ()=>{u1();u2();u3();};
  },[code]);

  // Rediriger automatiquement si l'hôte retourne au lobby (joueurs seulement)
  useEffect(() => {
    // Attendre que les données soient chargées
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck) {
      console.log('🔄 L\'hôte est retourné au lobby, redirection automatique...');
      router.push(`/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code]);

  useEffect(()=>{
    if (meta?.quizId) {
      fetch(`/data/${meta.quizId}.json`)
        .then(r=>r.json())
        .then(j=> setQuizTitle(j?.title || meta.quizId.replace(/-/g," ")))
        .catch(()=> setQuizTitle(meta.quizId?.replace(/-/g," ") || "Partie"));
    }
  }, [meta?.quizId]);

  // Hue victory effect on page load
  useEffect(() => {
    hueScenariosService.trigger('gigglz', 'victory');
  }, []);

  // Record stats once when we have all data
  useEffect(() => {
    // Skip if already recorded or missing data
    if (statsRecordedRef.current) return;
    if (!firebaseUser || firebaseUser.isAnonymous) return;
    if (!myUid || rankedPlayers.length === 0) return;

    // Find my position in ranked players
    const myPlayer = rankedPlayers.find(p => p.uid === myUid);
    if (!myPlayer) return;

    // Mark as recorded to prevent duplicates
    statsRecordedRef.current = true;

    // Record the game with score
    recordQuizGame({
      won: myPlayer.rank === 1,
      score: myPlayer.score || 0,
      position: myPlayer.rank
    });
  }, [firebaseUser, myUid, rankedPlayers]);

  const modeEquipes = meta?.mode === "équipes";

  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(()=> rankWithTies(players, "score"), [players]);
  const rankedTeams   = useMemo(()=> rankWithTies(teamsArray, "score"), [teamsArray]);

  // Statistiques globales
  const stats = useMemo(() => {
    if (players.length === 0) return null;

    const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
    const avgScore = Math.round(totalScore / players.length);
    const maxScore = Math.max(...players.map(p => p.score || 0));
    const minScore = Math.min(...players.map(p => p.score || 0));

    return { totalScore, avgScore, maxScore, minScore };
  }, [players]);

  const handleShare = () => {
    const winner = rankedPlayers[0];
    const text = `🎮 Partie Gigglz terminée !\n\n🏆 Gagnant : ${winner?.name} (${winner?.score} pts)\n📊 Score moyen : ${stats?.avgScore} pts\n👥 ${players.length} joueurs\n\nJouez avec nous : ${typeof window !== 'undefined' ? window.location.origin : ''}`;

    if (navigator.share) {
      navigator.share({ title: 'Gigglz - Résultats', text })
        .then(() => toast.success('Résultats partagés !'))
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Résultats copiés dans le presse-papiers !'))
        .catch(() => toast.error('Impossible de copier les résultats'));
    }
  };

  // Fonction pour réinitialiser les scores et retourner au lobby
  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Réinitialiser les scores de tous les joueurs
      if (players && players.length > 0) {
        players.forEach(player => {
          if (player.uid) {
            updates[`rooms/${code}/players/${player.uid}/score`] = 0;
            updates[`rooms/${code}/players/${player.uid}/blockedUntil`] = 0;
          }
        });
      }

      // Réinitialiser les scores des équipes
      if (modeEquipes && teamsArray && teamsArray.length > 0) {
        teamsArray.forEach(team => {
          if (team.id) {
            updates[`rooms/${code}/meta/teams/${team.id}/score`] = 0;
          }
        });
      }

      // Réinitialiser l'état de la partie
      updates[`rooms/${code}/state/phase`] = "lobby";
      updates[`rooms/${code}/state/currentIndex`] = 0;
      updates[`rooms/${code}/state/revealed`] = false;
      updates[`rooms/${code}/state/lockUid`] = null;
      updates[`rooms/${code}/state/buzzBanner`] = "";
      updates[`rooms/${code}/state/lastRevealAt`] = 0;
      updates[`rooms/${code}/state/elapsedAcc`] = 0;
      updates[`rooms/${code}/state/pausedAt`] = null;
      updates[`rooms/${code}/state/lockedAt`] = null;
      updates[`rooms/${code}/state/buzz`] = null;

      console.log('🔄 Retour au lobby - Updates:', updates);

      await update(ref(db), updates);

      console.log('✅ Updates Firebase réussis');

      // Rediriger vers le lobby
      router.push(`/room/${code}`);
    } catch (error) {
      console.error('❌ Erreur lors du retour au lobby:', error);
      toast.error('Erreur lors du retour au lobby. Réessayez.');
    }
  };

  return (
    <div className="end-page">
      {/* Main Content - Tout sur une page */}
      <main className="end-content">
        {/* Titre du quiz */}
        <div className="end-header">
          <span className="trophy-icon">🏆</span>
          <span className="title-text">{quizTitle || "Partie terminée"}</span>
        </div>

        {/* Podium animé */}
        {rankedPlayers.length >= 1 && (
          <div className="podium-section">
            <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
          </div>
        )}

        {/* Classement */}
        <div className="leaderboard-wrapper">
          <Leaderboard players={players} currentPlayerUid={myUid} />
        </div>
      </main>

      {/* Footer fixe */}
      <footer className="end-footer">
        <button
          className="action-btn"
          onClick={isHost ? handleBackToLobby : () => router.push(`/room/${code}`)}
        >
          {isHost ? 'Nouvelle partie' : 'Retour au lobby'}
        </button>
      </footer>

      <style jsx>{`
        /* ===== LAYOUT - Une seule page ===== */
        .end-page {
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
          overflow: hidden;
        }

        .end-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background: var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* ===== MAIN CONTENT ===== */
        .end-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          padding: 16px;
          padding-top: calc(16px + env(safe-area-inset-top));
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
          min-height: 0;
          overflow: hidden;
        }

        /* ===== HEADER ===== */
        .end-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 8px 0;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .trophy-icon {
          font-size: 1.5rem;
        }

        .title-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(1rem, 4vw, 1.3rem);
          color: var(--text-primary, #ffffff);
        }

        /* ===== PODIUM ===== */
        .podium-section {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          transform: scale(0.5);
          transform-origin: center top;
          margin: 0 0 -200px 0;
          filter: saturate(0.85);
        }

        /* ===== LEADERBOARD ===== */
        .leaderboard-wrapper {
          flex: 1;
          min-height: 150px;
          display: flex;
          overflow: hidden;
          position: relative;
          z-index: 3;
        }

        /* ===== FOOTER FIXE ===== */
        .end-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(139, 92, 246, 0.3);
        }

        .action-btn {
          display: block;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          padding: 18px 32px;
          border: none;
          border-radius: 14px;
          cursor: pointer;

          /* Typographie style guide */
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: white;

          /* Fond gradient + profondeur 3D */
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
          box-shadow:
            0 5px 0 #5b21b6,
            0 8px 15px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          transition: all 0.15s ease;
        }


        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 7px 0 #5b21b6,
            0 10px 20px rgba(139, 92, 246, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(3px);
          box-shadow:
            0 2px 0 #5b21b6,
            0 4px 8px rgba(139, 92, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
