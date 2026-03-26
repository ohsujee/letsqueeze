"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion } from "framer-motion";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import { useToast } from "@/lib/hooks/useToast";
import { Trophy, ArrowCounterClockwise, House, Crown } from "@phosphor-icons/react";

const ACCENT = '#EF4444';
const ROOM_PREFIX = 'rooms_lol';

export function LolEndContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [myUid, setMyUid] = useState(devUid || null);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, enabled: !devUid });
  useGameCompletion({ gameType: 'lol', roomCode: code });

  // Auth
  useEffect(() => {
    if (devUid) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
    });
    return () => unsub();
  }, [devUid]);

  // Listen to meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        setMeta(m);
        if (myUid) setIsHost(m.hostUid === myUid);
      }
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const s = snap.val();
      if (s) setState(s);
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, myUid]);


  // Build ranking
  const eliminationOrder = state?.eliminationOrder || [];
  const survivors = players.filter(p => !p.redCard);
  const eliminated = [...eliminationOrder]
    .reverse()
    .map(uid => players.find(p => p.uid === uid))
    .filter(Boolean);

  const ranking = [...survivors, ...eliminated];

  // Stats
  const mostAccusations = [...players].sort((a, b) => (b.accusationsMade || 0) - (a.accusationsMade || 0))[0];
  const mostAccused = [...players].sort((a, b) => (b.accusationsReceived || 0) - (a.accusationsReceived || 0))[0];

  const hostPresent = players.some(p => p.uid === meta?.hostUid && p.status !== 'disconnected' && p.status !== 'left');

  const handleNewGame = async () => {
    if (!isHost) return;
    try {
      const updates = {};
      // Reset players
      players.forEach(p => {
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/yellowCards`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/redCard`] = false;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/jokersRemaining`] = 1;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/status`] = 'active';
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/accusationsMade`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/accusationsReceived`] = 0;
        updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/jokersPlayed`] = 0;
      });
      updates[`${ROOM_PREFIX}/${code}/state`] = {
        phase: 'lobby',
        startedAt: null,
        timerEndAt: null,
        pausedAt: null,
        totalPausedMs: 0,
        currentVote: null,
        currentJoker: null,
        eliminationOrder: [],
      };
      await update(ref(db), updates);
    } catch (err) {
      console.error('Error resetting game:', err);
      toast.error('Erreur lors du reset');
    }
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  if (!state || !meta) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0610',
      }}>
        <div style={{
          width: 30, height: 30, border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#0a0610', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>

      {/* Background glow */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', height: '300px',
        background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}20 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        padding: '24px 16px 16px',
        textAlign: 'center', flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Trophy size={48} weight="fill" color="#FFD700" style={{ marginBottom: '8px' }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            margin: '0 0 4px',
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: '1.6rem',
            color: '#fff',
          }}
        >
          Fin de partie !
        </motion.h1>

        {survivors.length === 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)',
            }}
          >
            {survivors[0].name} a tenu jusqu'au bout !
          </motion.p>
        )}
        {survivors.length > 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)',
            }}
          >
            {survivors.length} survivant{survivors.length > 1 ? 's' : ''} !
          </motion.p>
        )}
      </div>

      {/* Ranking list */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 16px 16px',
        position: 'relative', zIndex: 1,
      }}>
        {/* Ranking */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em',
            color: 'rgba(238,242,255,0.35)', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Classement
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {ranking.map((player, index) => {
              const isSurvivor = !player.redCard;
              const isWinner = isSurvivor && survivors.length === 1;
              return (
                <motion.div
                  key={player.uid}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.08 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: isWinner
                      ? 'rgba(255,215,0,0.1)'
                      : isSurvivor
                        ? `${ACCENT}12`
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isWinner ? 'rgba(255,215,0,0.25)' : isSurvivor ? `${ACCENT}25` : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px',
                  }}
                >
                  {/* Position */}
                  <div style={{
                    width: '28px', textAlign: 'center',
                    fontFamily: "var(--font-title, 'Bungee'), cursive",
                    fontSize: '0.85rem',
                    color: isWinner ? '#FFD700' : isSurvivor ? ACCENT : 'rgba(255,255,255,0.3)',
                  }}>
                    {isWinner ? <Crown size={18} weight="fill" color="#FFD700" /> : `#${index + 1}`}
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: '0.9rem', fontWeight: 700,
                      color: isSurvivor ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}>
                      {player.name}
                      {player.uid === myUid && (
                        <span style={{ color: `${ACCENT}88`, fontSize: '0.75rem', marginLeft: '6px' }}>(toi)</span>
                      )}
                    </span>
                  </div>

                  {/* Cards received */}
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {player.yellowCards >= 1 && <span>🟡</span>}
                    {player.redCard && <span>🔴</span>}
                    {isSurvivor && !player.yellowCards && <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>Clean !</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.13em',
            color: 'rgba(238,242,255,0.35)', textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            Stats
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {mostAccusations && mostAccusations.accusationsMade > 0 && (
              <div style={{
                flex: '1 1 140px', padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                  Plus accusateur
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {mostAccusations.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: ACCENT }}>
                  {mostAccusations.accusationsMade} accusation{mostAccusations.accusationsMade > 1 ? 's' : ''}
                </div>
              </div>
            )}

            {mostAccused && mostAccused.accusationsReceived > 0 && (
              <div style={{
                flex: '1 1 140px', padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                  Plus accusé
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {mostAccused.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: ACCENT }}>
                  {mostAccused.accusationsReceived} fois accusé
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer buttons */}
      <div style={{
        padding: '12px 16px 16px',
        display: 'flex', gap: '10px',
        flexShrink: 0,
        background: 'rgba(10,6,16,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 2,
      }}>
        {isHost && hostPresent ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNewGame}
            style={{
              flex: 1, padding: '14px',
              background: ACCENT, border: 'none', borderRadius: '14px',
              color: '#fff', fontSize: '0.9rem', fontWeight: 800,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              boxShadow: `0 4px 20px ${ACCENT}44`,
            }}
          >
            <ArrowCounterClockwise size={18} weight="bold" />
            Nouvelle Partie
          </motion.button>
        ) : !hostPresent ? (
          <div style={{
            flex: 1, padding: '14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', fontWeight: 600,
          }}>
            L'hôte a quitté la partie
          </div>
        ) : null}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleGoHome}
          style={{
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem', fontWeight: 700,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}
        >
          <House size={18} weight="bold" />
        </motion.button>
      </div>
    </div>
  );
}

export default function LolEndPage() {
  const { code } = useParams();
  return <LolEndContent code={code} />;
}
