"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update, auth, onAuthStateChanged } from "@/lib/firebase";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";
import { motion } from "framer-motion";
import { useToast } from "@/lib/hooks/useToast";
import { storage } from "@/lib/utils/storage";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";

function rankWithTies(items, scoreKey = "score") {
  const sorted = items.slice().sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0));
  let lastScore = null, lastRank = 0, seen = 0;
  return sorted.map((it) => {
    seen += 1;
    const sc = it[scoreKey] || 0;
    const rank = (lastScore === sc) ? lastRank : seen;
    lastScore = sc; lastRank = rank;
    return { ...it, rank };
  });
}

export default function BlindTestEndPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [players, setPlayers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const adShownRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Get current user UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setMyUid(user?.uid || null);
    });
    // Mark that user completed a game
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, [code]);

  // Show interstitial ad before showing results (for non-Pro users)
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[BlindTestEndPage] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/players`), s => {
      const v = s.val() || {};
      const playersWithUid = Object.entries(v).map(([uid, data]) => ({ uid, ...data }));
      setPlayers(playersWithUid);
    });
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => setMeta(s.val()));
    const u3 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => setState(s.val()));
    return () => { u1(); u2(); u3(); };
  }, [code]);

  const isHost = myUid && meta?.hostUid === myUid;
  const modeEquipes = meta?.mode === "équipes";
  const playlistName = meta?.playlist?.name || "Blind Test";

  const teamsArray = useMemo(() => {
    const t = meta?.teams || {};
    return Object.keys(t).map(k => ({ id: k, ...t[k] }));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(() => rankWithTies(players, "score"), [players]);
  const rankedTeams = useMemo(() => rankWithTies(teamsArray, "score"), [teamsArray]);

  // Global stats
  const stats = useMemo(() => {
    if (players.length === 0) return null;

    const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
    const avgScore = Math.round(totalScore / players.length);
    const maxScore = Math.max(...players.map(p => p.score || 0));

    return { totalScore, avgScore, maxScore };
  }, [players]);

  // Redirect if host returns to lobby
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck) {
      router.push(`/blindtest/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code]);

  const handleShare = () => {
    const winner = rankedPlayers[0];
    const text = `🎵 Blind Test terminé !\n\n🏆 Gagnant : ${winner?.name} (${winner?.score} pts)\n📊 Playlist : ${playlistName}\n👥 ${players.length} joueurs\n\nJouez avec nous !`;

    if (navigator.share) {
      navigator.share({ title: 'Blind Test - Résultats', text })
        .then(() => toast.success('Résultats partagés !'))
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Résultats copiés !'))
        .catch(() => toast.error('Impossible de copier'));
    }
  };

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_blindtest/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_blindtest/${code}/players/${player.uid}/blockedUntil`] = 0;
        }
      });

      // Reset team scores
      if (modeEquipes && teamsArray.length > 0) {
        teamsArray.forEach(team => {
          if (team.id) {
            updates[`rooms_blindtest/${code}/meta/teams/${team.id}/score`] = 0;
          }
        });
      }

      // Reset state
      updates[`rooms_blindtest/${code}/state/phase`] = "lobby";
      updates[`rooms_blindtest/${code}/state/currentIndex`] = 0;
      updates[`rooms_blindtest/${code}/state/revealed`] = false;
      updates[`rooms_blindtest/${code}/state/snippetLevel`] = 0;
      updates[`rooms_blindtest/${code}/state/lockUid`] = null;
      updates[`rooms_blindtest/${code}/state/buzzBanner`] = "";

      await update(ref(db), updates);
      router.push(`/blindtest/room/${code}`);
    } catch (error) {
      console.error('Erreur retour lobby:', error);
      toast.error('Erreur lors du retour au lobby');
    }
  };

  const handleHome = () => {
    router.push('/home');
  };

  return (
    <div className="blindtest-end-page">
      {/* Header */}
      <header className="end-header blindtest">
        <div className="end-header-content">
          <div className="end-header-left">
            <span className="end-header-icon">🎵</span>
            <h1 className="end-header-title">Blind Test Terminé</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="end-content">
        {/* Playlist info */}
        <div className="playlist-info-card blindtest">
          <span className="playlist-label">Playlist</span>
          <span className="playlist-name">{playlistName}</span>
        </div>

        {/* Podium */}
        {modeEquipes ? (
          <PodiumPremium players={rankedTeams} mode="teams" themeColor="cyan" />
        ) : (
          <PodiumPremium players={rankedPlayers} mode="solo" themeColor="cyan" />
        )}

        {/* Stats */}
        {stats && (
          <div className="stats-row blindtest">
            <div className="stat-item">
              <span className="stat-value">{players.length}</span>
              <span className="stat-label">joueurs</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.avgScore}</span>
              <span className="stat-label">moy. pts</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.maxScore}</span>
              <span className="stat-label">max pts</span>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="leaderboard-section">
          <Leaderboard players={rankedPlayers} currentPlayerUid={myUid} showRank />
        </div>
      </main>

      {/* Footer Actions */}
      <footer className="end-footer blindtest">
        <div className="end-actions">
          <motion.button
            className="end-btn share-btn"
            onClick={handleShare}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Partager
          </motion.button>

          {isHost ? (
            <motion.button
              className="end-btn primary-btn blindtest"
              onClick={handleBackToLobby}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Nouvelle partie
            </motion.button>
          ) : (
            <motion.button
              className="end-btn primary-btn blindtest"
              onClick={handleHome}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Accueil
            </motion.button>
          )}
        </div>
      </footer>

      <style jsx>{`
        .blindtest-end-page {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #0a0a0f);
        }

        .blindtest-end-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* Header */
        .end-header.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          padding: 16px;
          padding-top: calc(16px + env(safe-area-inset-top));
        }

        .end-header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .end-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .end-header-icon {
          font-size: 1.5rem;
        }

        .end-header-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: #34d399;
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
        }

        /* Content */
        .end-content {
          flex: 1;
          position: relative;
          z-index: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        /* Playlist info */
        .playlist-info-card.blindtest {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 24px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 16px;
        }

        .playlist-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .playlist-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          color: #34d399;
        }

        /* Stats */
        .stats-row.blindtest {
          display: flex;
          gap: 20px;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .stat-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.2rem;
          color: #34d399;
        }

        .stat-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Leaderboard */
        .leaderboard-section {
          width: 100%;
          max-width: 500px;
        }

        /* Footer */
        .end-footer.blindtest {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(16, 185, 129, 0.2);
        }

        .end-actions {
          display: flex;
          gap: 12px;
          max-width: 500px;
          margin: 0 auto;
        }

        .end-btn {
          flex: 1;
          padding: 14px 24px;
          border-radius: 14px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .share-btn {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .share-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .primary-btn.blindtest {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
        }

        .primary-btn.blindtest:hover {
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.6);
        }
      `}</style>
    </div>
  );
}
