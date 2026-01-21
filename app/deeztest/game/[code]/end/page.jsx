"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update } from "@/lib/firebase";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";
import { motion } from "framer-motion";
import { useToast } from "@/lib/hooks/useToast";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { useEndPageAd } from "@/lib/hooks/useEndPageAd";
import { rankWithTies } from "@/lib/utils/ranking";

// Deezer brand colors
const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';
const DEEZER_LIGHT = '#C574FF';

export default function DeezTestEndPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [roomExists, setRoomExists] = useState(true);

  // End page ad + auth (handles interstitial + returnedFromGame + myUid)
  const { myUid } = useEndPageAd();

  // Centralized players hook
  const { players } = usePlayers({ roomCode: code, roomPrefix: 'rooms_deeztest' });

  // Room guard - détecte fermeture room par l'hôte
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_deeztest',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion (for daily limits)
  useGameCompletion({ gameType: 'deeztest', roomCode: code });

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_deeztest/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      // Room is gone or closed by host
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db, `rooms_deeztest/${code}/state`), s => setState(s.val()));
    return () => { u1(); u2(); };
  }, [code]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;
  const modeEquipes = meta?.mode === "équipes";
  const playlistName = meta?.playlist?.name || "Deez Test";

  const teamsArray = useMemo(() => {
    const t = meta?.teams || {};
    return Object.keys(t).map(k => ({ id: k, ...t[k] }));
  }, [meta?.teams]);

  const rankedPlayers = useMemo(() => rankWithTies(players, "score"), [players]);
  const rankedTeams = useMemo(() => rankWithTies(teamsArray, "score"), [teamsArray]);

  // Redirect if host returns to lobby (only if host is still present)
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && hostPresent) {
      router.push(`/deeztest/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, hostPresent]);

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores and stats
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_deeztest/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_deeztest/${code}/players/${player.uid}/blockedUntil`] = 0;
          updates[`rooms_deeztest/${code}/players/${player.uid}/correctAnswers`] = 0;
          updates[`rooms_deeztest/${code}/players/${player.uid}/wrongAnswers`] = 0;
        }
      });

      // Reset team scores
      if (modeEquipes && teamsArray.length > 0) {
        teamsArray.forEach(team => {
          if (team.id) {
            updates[`rooms_deeztest/${code}/meta/teams/${team.id}/score`] = 0;
          }
        });
      }

      // Reset state
      updates[`rooms_deeztest/${code}/state/phase`] = "lobby";
      updates[`rooms_deeztest/${code}/state/currentIndex`] = 0;
      updates[`rooms_deeztest/${code}/state/revealed`] = false;
      updates[`rooms_deeztest/${code}/state/snippetLevel`] = 0;
      updates[`rooms_deeztest/${code}/state/highestSnippetLevel`] = -1;
      updates[`rooms_deeztest/${code}/state/lockUid`] = null;
      updates[`rooms_deeztest/${code}/state/buzzBanner`] = "";

      await update(ref(db), updates);
      router.push(`/deeztest/room/${code}`);
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
              // Host left - everyone goes home
              router.push('/home');
            } else if (isHost) {
              // Host starts new game
              handleBackToLobby();
            } else {
              // Player returns to lobby
              router.push(`/deeztest/room/${code}`);
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
            radial-gradient(ellipse at 50% 0%, rgba(162, 56, 255, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(255, 0, 146, 0.06) 0%, transparent 50%),
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
          color: ${DEEZER_PURPLE};
          text-shadow: 0 0 15px rgba(162, 56, 255, 0.5);
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
          background: rgba(10, 10, 15, 0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(162, 56, 255, 0.3);
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

          /* Deezer gradient + 3D depth */
          background: linear-gradient(135deg, ${DEEZER_LIGHT} 0%, ${DEEZER_PURPLE} 50%, ${DEEZER_PINK} 100%);
          box-shadow:
            0 5px 0 #7B2BD9,
            0 8px 15px rgba(162, 56, 255, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);

          transition: all 0.15s ease;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 7px 0 #7B2BD9,
            0 10px 20px rgba(162, 56, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .action-btn:active {
          transform: translateY(3px);
          box-shadow:
            0 2px 0 #7B2BD9,
            0 4px 8px rgba(162, 56, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
