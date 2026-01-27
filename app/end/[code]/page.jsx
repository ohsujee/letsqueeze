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
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { useEndPageAd } from "@/lib/hooks/useEndPageAd";
import { rankWithTies } from "@/lib/utils/ranking";
import { EndScreenFooter } from "@/components/transitions";

export default function EndPage(){
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta,setMeta]=useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [roomExists, setRoomExists] = useState(true);
  const statsRecordedRef = useRef(false);

  // End page ad + auth (handles interstitial + returnedFromGame + myUid)
  const { myUid, userIsPro, currentUser } = useEndPageAd();

  // Centralized players hook (live data)
  const { players: livePlayers } = usePlayers({ roomCode: code, roomPrefix: 'rooms' });

  // Snapshot players on first load for stable end screen
  // This prevents the leaderboard from changing when players leave
  const playersSnapshotRef = useRef(null);
  if (livePlayers.length > 0 && playersSnapshotRef.current === null) {
    playersSnapshotRef.current = [...livePlayers];
  }
  const players = playersSnapshotRef.current || livePlayers;

  // Room guard - détecte fermeture room par l'hôte
  const { isValidating } = useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion (for daily limits)
  useGameCompletion({ gameType: 'quiz', roomCode: code });

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
  const hostPresent = roomExists && meta && !meta.closed;

  useEffect(()=>{
    // Ne pas démarrer les listeners tant que la room n'est pas validée
    if (isValidating) return;

    const u1 = onValue(ref(db,`rooms/${code}/meta`), s=> {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db,`rooms/${code}/state`), s=> setState(s.val()));
    return ()=>{u1();u2();};
  },[code, isValidating]);

  // Memos must be defined before useEffects that use them
  const modeEquipes = meta?.mode === "équipes";

  const teamsArray = useMemo(()=>{
    const t = meta?.teams || {};
    return Object.keys(t).map(k=>({ id:k, ...t[k]}));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(()=> rankWithTies(players, "score"), [players]);
  const rankedTeams   = useMemo(()=> rankWithTies(teamsArray, "score"), [teamsArray]);

  // Marquer le joueur comme étant sur l'écran de fin
  useEffect(() => {
    if (!myUid || !code) return;
    update(ref(db), {
      [`rooms/${code}/players/${myUid}/location`]: 'end'
    });
  }, [myUid, code]);

  useEffect(()=>{
    // Utiliser quizSelection.categoryName (nouveau système) ou quizId (legacy)
    if (meta?.quizSelection?.categoryName) {
      setQuizTitle(meta.quizSelection.categoryName);
    } else if (meta?.quizId) {
      setQuizTitle(meta.quizId.replace(/-/g, " "));
    }
  }, [meta?.quizSelection?.categoryName, meta?.quizId]);

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

    // Don't record stats for the host (they don't play, they just manage)
    const isHostUser = myUid && meta?.hostUid === myUid;
    if (isHostUser) {
      statsRecordedRef.current = true; // Mark as "handled" to prevent future attempts
      return;
    }

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
  }, [firebaseUser, myUid, rankedPlayers, meta?.hostUid]);

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

  // Affiche un loader pendant la validation de la room
  if (isValidating) {
    return (
      <div className="end-page game-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Chargement...</p>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="end-page game-page">
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
            {modeEquipes ? (
              <PodiumPremium topPlayers={rankedTeams.slice(0, 3)} />
            ) : (
              <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
            )}
          </div>
        )}

        {/* Classement */}
        <div className="leaderboard-wrapper">
          <Leaderboard players={players} currentPlayerUid={myUid} teams={meta?.teams} />
        </div>
      </main>

      {/* Footer fixe */}
      <EndScreenFooter
        gameColor="#8b5cf6"
        label={!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
        onNewGame={async () => {
          if (!hostPresent) {
            router.push('/home');
          } else if (isHost) {
            handleBackToLobby();
          } else {
            // Marquer le joueur comme étant dans le lobby avant de naviguer
            await update(ref(db), {
              [`rooms/${code}/players/${myUid}/location`]: 'lobby'
            });
            router.push(`/room/${code}`);
          }
        }}
      />

      <style jsx>{`
        /* ===== LAYOUT - Une seule page ===== */
        .end-page {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
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
          padding-top: 16px;
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

      `}</style>
    </div>
  );
}
