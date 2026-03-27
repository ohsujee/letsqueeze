"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, onAuthStateChanged, signInAnonymously, update } from "@/lib/firebase";
import { motion } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useGameCompletion } from "@/lib/hooks/useGameCompletion";
import EndScreenFooter from "@/components/game/EndScreenFooter";

const ACCENT = '#e11d48';
const ACCENT_LIGHT = '#f43f5e';
const ROOM_PREFIX = 'rooms_imposteur';

export default function ImposteurEnd() {
  return <ImposteurEndContent />;
}

export function ImposteurEndContent({ overrideCode, overrideUid } = {}) {
  const params = useParams();
  const code = overrideCode || params?.code;
  const router = useRouter();

  const [myUid, setMyUid] = useState(overrideUid || null);
  const [isHost, setIsHost] = useState(false);
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX, sort: 'score' });

  useGameCompletion({ gameType: 'imposteur', roomCode: code });

  useEffect(() => {
    if (overrideUid) { setMyUid(overrideUid); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [overrideUid]);

  useEffect(() => {
    if (!code) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), snap => setMeta(snap.val()));
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (!code) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), snap => setState(snap.val()));
    return () => unsub();
  }, [code]);

  useEffect(() => {
    if (myUid && meta?.hostUid) setIsHost(myUid === meta.hostUid);
  }, [myUid, meta?.hostUid]);

  useRoomGuard({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost });

  const handleNewGame = async () => {
    if (!isHost) return;
    // Reset to lobby
    await update(ref(db, `${ROOM_PREFIX}/${code}/state`), { phase: 'lobby' });
    // Reset player scores
    const updates = {};
    players.forEach(p => {
      updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/score`] = 0;
      updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/alive`] = true;
      updates[`${ROOM_PREFIX}/${code}/players/${p.uid}/hasSeenRole`] = false;
    });
    updates[`${ROOM_PREFIX}/${code}/roles`] = null;
    updates[`${ROOM_PREFIX}/${code}/descriptions`] = null;
    updates[`${ROOM_PREFIX}/${code}/votes`] = null;
    updates[`${ROOM_PREFIX}/${code}/revealedRoles`] = null;
    updates[`${ROOM_PREFIX}/${code}/roundScores`] = null;
    await update(ref(db), updates);
    router.push(`/imposteur/room/${code}`);
  };

  const handleGoHome = () => router.push('/home');

  // Podium
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top3 = sortedPlayers.slice(0, 3);
  const rest = sortedPlayers.slice(3);

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#0a0a0f', position: 'relative',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>
      {/* Glow */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', height: '300px',
        background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}15, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '24px 16px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '20px',
      }}>
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏆</div>
          <div style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: 'clamp(1.5rem, 6vw, 2rem)',
            color: '#fff',
            textShadow: `0 0 20px ${ACCENT}55`,
          }}>
            Résultats
          </div>
        </motion.div>

        {/* Podium */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          gap: '10px', width: '100%', maxWidth: '360px',
          marginBottom: '8px',
        }}>
          {/* 2nd place */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(192,192,192,0.1)',
                border: '2px solid rgba(192,192,192,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.1rem', color: '#c0c0c0',
              }}>{top3[1].name?.charAt(0)?.toUpperCase()}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c0c0c0', textAlign: 'center' }}>{top3[1].name}</div>
              <div style={{
                width: '100%', height: '60px', borderRadius: '10px 10px 0 0',
                background: 'rgba(192,192,192,0.08)',
                border: '1px solid rgba(192,192,192,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1rem', color: '#c0c0c0',
              }}>{top3[1].score || 0}</div>
            </motion.div>
          )}

          {/* 1st place */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>👑</div>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,215,0,0.12)',
                border: '2px solid rgba(255,215,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.3rem', color: '#ffd700',
                boxShadow: '0 0 20px rgba(255,215,0,0.15)',
              }}>{top3[0].name?.charAt(0)?.toUpperCase()}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffd700', textAlign: 'center' }}>{top3[0].name}</div>
              <div style={{
                width: '100%', height: '80px', borderRadius: '10px 10px 0 0',
                background: 'rgba(255,215,0,0.08)',
                border: '1px solid rgba(255,215,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.2rem', color: '#ffd700',
                boxShadow: '0 0 20px rgba(255,215,0,0.1)',
              }}>{top3[0].score || 0}</div>
            </motion.div>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '6px',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(205,127,50,0.1)',
                border: '2px solid rgba(205,127,50,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1rem', color: '#cd7f32',
              }}>{top3[2].name?.charAt(0)?.toUpperCase()}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#cd7f32', textAlign: 'center' }}>{top3[2].name}</div>
              <div style={{
                width: '100%', height: '45px', borderRadius: '10px 10px 0 0',
                background: 'rgba(205,127,50,0.08)',
                border: '1px solid rgba(205,127,50,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '0.9rem', color: '#cd7f32',
              }}>{top3[2].score || 0}</div>
            </motion.div>
          )}
        </div>

        {/* Rest of players */}
        {rest.length > 0 && (
          <div style={{
            width: '100%', maxWidth: '360px',
            background: 'rgba(12,14,28,0.92)',
            border: '1px solid rgba(238,242,255,0.08)',
            borderRadius: '16px',
            padding: '8px 0',
          }}>
            {rest.map((player, index) => (
              <motion.div
                key={player.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: index < rest.length - 1 ? '1px solid rgba(238,242,255,0.04)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontFamily: "var(--font-title, 'Bungee'), cursive",
                    fontSize: '0.8rem', color: 'rgba(238,242,255,0.3)',
                    minWidth: '20px',
                  }}>
                    {index + 4}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eef2ff' }}>
                    {player.name}
                  </span>
                  {player.uid === myUid && (
                    <span style={{ fontSize: '0.65rem', color: ACCENT_LIGHT, fontWeight: 700 }}>Toi</span>
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: ACCENT_LIGHT,
                }}>
                  {player.score || 0}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <EndScreenFooter
        isHost={isHost}
        gameColor={ACCENT}
        onNewGame={handleNewGame}
        onGoHome={handleGoHome}
        hostPresent={!!meta?.hostUid}
      />
    </div>
  );
}
