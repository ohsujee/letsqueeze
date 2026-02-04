"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, ref, onValue, update } from "@/lib/firebase";
import { PodiumPremium } from "@/components/ui/PodiumPremium";
import Leaderboard from "@/components/game/Leaderboard";
import { EndScreenFooter } from "@/components/transitions";
import { useToast } from "@/lib/hooks/useToast";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { useEndPageAd } from "@/lib/hooks/useEndPageAd";
import { rankWithTies } from "@/lib/utils/ranking";

// Mime colors
const MIME_GREEN = '#00ff66';

export default function MimeEndPage() {
  const { code } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [roomExists, setRoomExists] = useState(true);

  // End page ad + auth (handles interstitial + returnedFromGame + myUid)
  const { myUid } = useEndPageAd();

  // Centralized players hook (live data)
  const { players: livePlayers } = usePlayers({ roomCode: code, roomPrefix: 'rooms_mime' });

  // Snapshot players on first load for stable end screen
  const playersSnapshotRef = useRef(null);
  if (livePlayers.length > 0 && playersSnapshotRef.current === null) {
    playersSnapshotRef.current = [...livePlayers];
  }
  const players = playersSnapshotRef.current || livePlayers;

  // Room guard - détecte fermeture room par l'hôte
  useRoomGuard({
    roomCode: code,
    roomPrefix: 'rooms_mime',
    playerUid: myUid,
    isHost: false
  });

  // Record game completion (for daily limits)
  useGameCompletion({ gameType: 'mime', roomCode: code });

  // Marquer le joueur comme étant sur l'écran de fin
  useEffect(() => {
    if (!myUid || !code) return;
    update(ref(db), {
      [`rooms_mime/${code}/players/${myUid}/location`]: 'end'
    });
  }, [myUid, code]);

  // Firebase listeners
  useEffect(() => {
    const u1 = onValue(ref(db, `rooms_mime/${code}/meta`), s => {
      const data = s.val();
      setMeta(data);
      if (!data || data.closed) {
        setRoomExists(false);
      }
    });
    const u2 = onValue(ref(db, `rooms_mime/${code}/state`), s => setState(s.val()));
    return () => { u1(); u2(); };
  }, [code]);

  const isHost = myUid && meta?.hostUid === myUid;
  const hostPresent = roomExists && meta && !meta.closed;

  const rankedPlayers = useMemo(() => rankWithTies(players, "score"), [players]);

  // Redirect if host returns to lobby (only if host is still present)
  useEffect(() => {
    if (myUid === null || meta === null) return;

    const hostCheck = myUid && meta?.hostUid === myUid;
    if (state?.phase === "lobby" && !hostCheck && hostPresent) {
      router.push(`/mime/room/${code}`);
    }
  }, [state?.phase, myUid, meta, router, code, hostPresent]);

  const handleBackToLobby = async () => {
    try {
      const updates = {};

      // Reset player scores and locations
      players.forEach(player => {
        if (player.uid) {
          updates[`rooms_mime/${code}/players/${player.uid}/score`] = 0;
          updates[`rooms_mime/${code}/players/${player.uid}/blockedUntil`] = 0;
          updates[`rooms_mime/${code}/players/${player.uid}/location`] = 'lobby';
        }
      });

      // Reset state
      updates[`rooms_mime/${code}/state/phase`] = "lobby";
      updates[`rooms_mime/${code}/state/currentIndex`] = 0;
      updates[`rooms_mime/${code}/state/totalWords`] = 0;
      updates[`rooms_mime/${code}/state/mimeRotation`] = null;
      updates[`rooms_mime/${code}/state/mimeIndex`] = 0;
      updates[`rooms_mime/${code}/state/currentMimeUid`] = null;
      updates[`rooms_mime/${code}/state/revealed`] = false;
      updates[`rooms_mime/${code}/state/revealedAt`] = null;
      updates[`rooms_mime/${code}/state/pausedAt`] = null;
      updates[`rooms_mime/${code}/state/elapsedAcc`] = 0;
      updates[`rooms_mime/${code}/state/lockUid`] = null;
      updates[`rooms_mime/${code}/state/lockedAt`] = null;
      updates[`rooms_mime/${code}/state/buzzBanner`] = "";
      updates[`rooms_mime/${code}/state/pendingBuzzes`] = null;
      updates[`rooms_mime/${code}/words`] = null;

      await update(ref(db), updates);
      router.push(`/mime/room/${code}`);
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
          <span className="trophy-icon">🎭</span>
          <span className="title-text">Mime terminé</span>
        </div>

        {/* Podium */}
        {rankedPlayers.length >= 1 && (
          <div className="podium-section">
            <PodiumPremium topPlayers={rankedPlayers.slice(0, 3)} />
          </div>
        )}

        {/* Leaderboard */}
        <div className="leaderboard-wrapper">
          <Leaderboard players={rankedPlayers} currentPlayerUid={myUid} gameColor={MIME_GREEN} />
        </div>
      </main>

      {/* Footer */}
      <EndScreenFooter
        gameColor={MIME_GREEN}
        label={!hostPresent ? "Retour à l'accueil" : isHost ? 'Nouvelle partie' : 'Retour au lobby'}
        onNewGame={async () => {
          if (!hostPresent) {
            router.push('/home');
          } else if (isHost) {
            handleBackToLobby();
          } else {
            // Marquer le joueur comme étant dans le lobby avant de naviguer
            await update(ref(db), {
              [`rooms_mime/${code}/players/${myUid}/location`]: 'lobby'
            });
            router.push(`/mime/room/${code}`);
          }
        }}
      />

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
            radial-gradient(ellipse at 50% 0%, rgba(0, 255, 102, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(0, 204, 82, 0.06) 0%, transparent 50%),
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
          color: ${MIME_GREEN};
          text-shadow: 0 0 15px rgba(0, 255, 102, 0.5);
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
      `}</style>
    </div>
  );
}
