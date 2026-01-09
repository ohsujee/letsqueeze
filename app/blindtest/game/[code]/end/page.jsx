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
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";

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

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(null);
  const [roomExists, setRoomExists] = useState(true);
  const adShownRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_blindtest' });

  // Room guard - détecte fermeture room par l'hôte
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_blindtest',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion (for daily limits)
  useGameCompletion({ gameType: 'blindtest', roomCode: code });

  // Get current user UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
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
    const u1 = onValue(ref(db, `rooms_blindtest/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db, `rooms_blindtest/${code}/state`), s => setState(s.val()));
    return () => { u1(); u2(); };
  }, [code]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;
  const modeEquipes = meta?.mode === "équipes";
  const playlistName = meta?.playlist?.name || "Blind Test";

  const teamsArray = useMemo(() => {
    const t = meta?.teams || {};
    return Object.keys(t).map(k => ({ id: k, ...t[k] }));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(() => rankWithTies(players, "score"), [players]);
  const rankedTeams = useMemo(() => rankWithTies(teamsArray, "score"), [teamsArray]);

  // Stats du joueur actuel
  const myStats = useMemo(() => {
    const me = players.find(p => p.uid === myUid);
    if (!me) return null;
    const totalTracks = meta?.playlist?.tracks?.length || 0;
    return {
      correctAnswers: me.correctAnswers || 0,
      wrongAnswers: me.wrongAnswers || 0,
      totalTracks,
      score: me.score || 0
    };
  }, [players, myUid, meta?.playlist?.tracks?.length]);

  // Redirect if host returns to lobby (only if host is still present)
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && hostPresent) {
      router.push(`/blindtest/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, hostPresent]);

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores and stats
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_blindtest/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_blindtest/${code}/players/${player.uid}/blockedUntil`] = 0;
          updates[`rooms_blindtest/${code}/players/${player.uid}/correctAnswers`] = 0;
          updates[`rooms_blindtest/${code}/players/${player.uid}/wrongAnswers`] = 0;
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

  return (
    <div className="end-page game-page">
      {/* Main Content */}
      <main className="end-content">
        {/* Header */}
        <div className="end-header">
          <span className="trophy-icon">🎵</span>
          <span className="title-text">{playlistName}</span>
        </div>

        {/* Podium */}
        {rankedPlayers.length >= 1 && (
          <div className="podium-section">
            {modeEquipes ? (
              <PodiumPremium topPlayers={rankedTeams.slice(0, 3)} />
            ) : (
              <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
            )}
          </div>
        )}

        {/* Stats personnelles */}
        {myStats && (
          <div className="my-stats-card">
            <div className="stats-title">Ton récap</div>
            <div className="stats-row">
              <div className="stat-item correct">
                <span className="stat-value">{myStats.correctAnswers}</span>
                <span className="stat-label">Bonnes réponses</span>
              </div>
              <div className="stat-item wrong">
                <span className="stat-value">{myStats.wrongAnswers}</span>
                <span className="stat-label">Erreurs</span>
              </div>
              <div className="stat-item total">
                <span className="stat-value">{myStats.score}</span>
                <span className="stat-label">Points</span>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="leaderboard-wrapper">
          <Leaderboard players={rankedPlayers} currentPlayerUid={myUid} />
        </div>
      </main>

      {/* Footer */}
      <footer className="end-footer">
        <button
          className="action-btn"
          onClick={() => {
            if (!hostPresent) {
              router.push('/home');
            } else if (isHost) {
              handleBackToLobby();
            } else {
              router.push(`/blindtest/room/${code}`);
            }
          }}
        >
          {!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
        </button>
      </footer>

      <style jsx>{`
        /* ===== LAYOUT ===== */
        .end-page {
          flex: 1;
          min-height: 0;
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
          background:
            radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
            var(--bg-primary, #0a0a0f);
          pointer-events: none;
        }

        /* ===== MAIN CONTENT ===== */
        .end-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          padding: 1.5vh 3vw;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
          min-height: 0;
          overflow: hidden;
        }

        /* ===== HEADER - 5vh ===== */
        .end-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2vw;
          height: 5vh;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .trophy-icon {
          font-size: 3vh;
        }

        .title-text {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.5vh;
          color: #34d399;
          text-shadow: 0 0 1.5vh rgba(16, 185, 129, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ===== PODIUM - scaled to fit ===== */
        .podium-section {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          transform: scale(0.45);
          transform-origin: center top;
          margin: 0 0 -22vh 0;
        }

        /* ===== STATS CARD ===== */
        .my-stats-card {
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 1.8vh;
          padding: 1.5vh 2vw;
          margin-bottom: 1.5vh;
          position: relative;
          z-index: 3;
        }

        .stats-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.4vh;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1.2vh;
          text-align: center;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          gap: 1.5vw;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5vh;
          padding: 1.2vh 2.5vw;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 1.2vh;
          flex: 1;
        }

        .stat-item.correct {
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .stat-item.wrong {
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .stat-item.total {
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .stat-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2.5vh;
          line-height: 1;
        }

        .stat-item.correct .stat-value {
          color: #22c55e;
          text-shadow: 0 0 1vh rgba(34, 197, 94, 0.5);
        }

        .stat-item.wrong .stat-value {
          color: #f87171;
          text-shadow: 0 0 1vh rgba(239, 68, 68, 0.5);
        }

        .stat-item.total .stat-value {
          color: #34d399;
          text-shadow: 0 0 1vh rgba(16, 185, 129, 0.5);
        }

        .stat-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1vh;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          text-align: center;
        }

        /* ===== LEADERBOARD ===== */
        .leaderboard-wrapper {
          flex: 1;
          min-height: 15vh;
          display: flex;
          overflow: hidden;
          position: relative;
          z-index: 3;
        }

        /* ===== FOOTER - 10vh ===== */
        .end-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          height: 10vh;
          padding: 1.5vh 3vw;
          padding-bottom: calc(1.5vh + var(--safe-area-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 400px;
          height: 7vh;
          padding: 0 4vw;
          border: none;
          border-radius: 1.8vh;
          cursor: pointer;

          /* Typography */
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 2vh;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: white;

          /* Emerald gradient + 3D depth */
          background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
          box-shadow:
            0 0.6vh 0 #047857,
            0 1vh 2vh rgba(16, 185, 129, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          transition: all 0.15s ease;
        }

        .action-btn:hover {
          transform: translateY(-0.3vh);
          box-shadow:
            0 0.9vh 0 #047857,
            0 1.3vh 2.5vh rgba(16, 185, 129, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(0.4vh);
          box-shadow:
            0 0.25vh 0 #047857,
            0 0.5vh 1vh rgba(16, 185, 129, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
