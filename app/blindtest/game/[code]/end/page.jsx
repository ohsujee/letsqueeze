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
  const adShownRef = useRef(false);

  // Get user profile for Pro check
  const { user: currentUser, subscription, loading: profileLoading } = useUserProfile();
  const userIsPro = currentUser && subscription ? isPro({ ...currentUser, subscription }) : false;

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

  // Redirect if host returns to lobby
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck) {
      router.push(`/blindtest/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code]);

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

  return (
    <div className="end-page">
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

        {/* Leaderboard */}
        <div className="leaderboard-wrapper">
          <Leaderboard players={rankedPlayers} currentPlayerUid={myUid} />
        </div>
      </main>

      {/* Footer */}
      <footer className="end-footer">
        <button
          className="action-btn"
          onClick={isHost ? handleBackToLobby : () => router.push(`/blindtest/room/${code}`)}
        >
          {isHost ? 'Nouvelle partie' : 'Retour au lobby'}
        </button>
      </footer>

      <style jsx>{`
        /* ===== LAYOUT ===== */
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
          color: #34d399;
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
        }

        /* ===== PODIUM ===== */
        .podium-section {
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          transform: scale(0.5);
          transform-origin: center top;
          margin: 0 0 -200px 0;
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

        /* ===== FOOTER ===== */
        .end-footer {
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          padding: 16px;
          padding-bottom: calc(16px + env(safe-area-inset-bottom));
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(16, 185, 129, 0.3);
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

          /* Typography */
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: white;

          /* Emerald gradient + 3D depth */
          background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
          box-shadow:
            0 5px 0 #047857,
            0 8px 15px rgba(16, 185, 129, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          transition: all 0.15s ease;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 7px 0 #047857,
            0 10px 20px rgba(16, 185, 129, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(3px);
          box-shadow:
            0 2px 0 #047857,
            0 4px 8px rgba(16, 185, 129, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
