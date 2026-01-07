"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update, auth, onAuthStateChanged } from "@/lib/firebase";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useToast } from "@/lib/hooks/useToast";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { isPro } from "@/lib/subscription";
import { showInterstitialAd, initAdMob } from "@/lib/admob";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { storage } from "@/lib/utils/storage";
import { TROUVE_COLORS } from "@/data/trouveregle-rules";

const CYAN_PRIMARY = TROUVE_COLORS.primary;
const CYAN_LIGHT = TROUVE_COLORS.light;
const CYAN_DARK = TROUVE_COLORS.dark;

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

export default function TrouveRegleEndPage() {
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
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_trouveregle' });

  // Room guard
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_trouveregle',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion
  useGameCompletion({ gameType: 'trouveregle', roomCode: code });

  // Get current user UID
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    storage.set('returnedFromGame', true);
    return () => unsub();
  }, [code]);

  // Show interstitial ad (non-Pro users)
  useEffect(() => {
    if (adShownRef.current || profileLoading) return;

    if (currentUser !== null && !userIsPro) {
      adShownRef.current = true;
      initAdMob().then(() => {
        showInterstitialAd().catch(err => {
          console.log('[TrouveRegleEndPage] Interstitial ad error:', err);
        });
      });
    }
  }, [currentUser, userIsPro, profileLoading]);

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_trouveregle/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db, `rooms_trouveregle/${code}/state`), s => setState(s.val()));
    return () => { u1(); u2(); };
  }, [code]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;

  const rankedPlayers = useMemo(() => rankWithTies(players, "score"), [players]);

  // My stats
  const myStats = useMemo(() => {
    const me = players.find(p => p.uid === myUid);
    if (!me) return null;
    return {
      score: me.score || 0,
      role: me.role
    };
  }, [players, myUid]);

  // Redirect if host returns to lobby
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && hostPresent) {
      router.push(`/trouveregle/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, hostPresent]);

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_trouveregle/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_trouveregle/${code}/players/${player.uid}/role`] = 'player';
        }
      });

      // Reset state
      updates[`rooms_trouveregle/${code}/state`] = {
        phase: "lobby",
        investigatorUids: [],
        currentRule: null,
        ruleOptions: [],
        votes: {},
        rerollsUsed: 0,
        guessAttempts: 0,
        guesses: [],
        roundNumber: 1,
        playedRuleIds: state?.playedRuleIds || []
      };

      await update(ref(db), updates);
      router.push(`/trouveregle/room/${code}`);
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
          <span className="trophy-icon">🔍</span>
          <span className="title-text">Trouve la Règle</span>
        </div>

        {/* Last Rule */}
        {state?.currentRule && (
          <div className="last-rule">
            <span className="rule-label">Dernière règle</span>
            <p className="rule-text">{state.currentRule.text}</p>
            <span className={`result-badge ${state.foundByInvestigators ? 'found' : 'not-found'}`}>
              {state.foundByInvestigators ? '🔍 Trouvée !' : '🎭 Non trouvée'}
            </span>
          </div>
        )}

        {/* Podium */}
        {rankedPlayers.length >= 1 && (
          <div className="podium-section">
            <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
          </div>
        )}

        {/* My Stats */}
        {myStats && (
          <div className="my-stats-card">
            <div className="stats-title">Ton récap</div>
            <div className="stats-row">
              <div className="stat-item role">
                <span className="stat-value">
                  {myStats.role === 'investigator' ? '🔍' : '🎭'}
                </span>
                <span className="stat-label">
                  {myStats.role === 'investigator' ? 'Enquêteur' : 'Joueur'}
                </span>
              </div>
              <div className="stat-item score">
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
              router.push(`/trouveregle/room/${code}`);
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
        }

        .end-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(6, 182, 212, 0.06) 0%, transparent 50%),
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
          color: ${CYAN_PRIMARY};
          text-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
        }

        /* ===== LAST RULE ===== */
        .last-rule {
          flex-shrink: 0;
          text-align: center;
          padding: 14px 16px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.25);
          border-radius: 12px;
          margin-bottom: 12px;
        }

        .rule-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .rule-text {
          font-size: 0.95rem;
          color: ${CYAN_LIGHT};
          margin: 6px 0;
        }

        .result-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .result-badge.found {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .result-badge.not-found {
          background: rgba(168, 85, 247, 0.2);
          color: #c084fc;
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

        /* ===== STATS CARD ===== */
        .my-stats-card {
          flex-shrink: 0;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(6, 182, 212, 0.25);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 12px;
          position: relative;
          z-index: 3;
        }

        .stats-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          text-align: center;
        }

        .stats-row {
          display: flex;
          justify-content: space-around;
          gap: 8px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
          flex: 1;
        }

        .stat-item.role {
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .stat-item.score {
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .stat-value {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.4rem;
          line-height: 1;
        }

        .stat-item.role .stat-value {
          font-size: 1.8rem;
        }

        .stat-item.score .stat-value {
          color: ${CYAN_PRIMARY};
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }

        .stat-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.3px;
          text-align: center;
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
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(6, 182, 212, 0.3);
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
          color: #0a0a0f;

          /* Cyan gradient + 3D depth */
          background: linear-gradient(135deg, ${CYAN_LIGHT} 0%, ${CYAN_PRIMARY} 50%, ${CYAN_DARK} 100%);
          box-shadow:
            0 5px 0 #0e7490,
            0 8px 15px rgba(6, 182, 212, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          transition: all 0.15s ease;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 7px 0 #0e7490,
            0 10px 20px rgba(6, 182, 212, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(3px);
          box-shadow:
            0 2px 0 #0e7490,
            0 4px 8px rgba(6, 182, 212, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
