'use client';

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { auth, db, ref, set, update, remove, onValue, onAuthStateChanged, get } from '@/lib/firebase';
import { createRoom as createFirebaseRoom } from '@/lib/config/rooms';

import { AlibiLobbyContent } from '@/app/alibi/room/[code]/page';

// Lazy load phases — prevents CSS from all phases loading simultaneously
const AlibiPrepContent = lazy(() => import('@/app/alibi/game/[code]/prep/page').then(m => ({ default: m.AlibiPrepContent })));
const AlibiPlayContent = lazy(() => import('@/app/alibi/game/[code]/play/page').then(m => ({ default: m.AlibiPlayContent })));
const AlibiEndContent = lazy(() => import('@/app/alibi/game/[code]/end/page').then(m => ({ default: m.AlibiEndContent })));

const ROOM_PREFIX = 'rooms_alibi';
const GAME_COLOR = '#f59e0b';

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const PANEL_COLORS = {
  host: { border: '#eab308', labelBg: 'rgba(234,179,8,0.15)' },
  player: { border: GAME_COLOR, labelBg: 'rgba(245,158,11,0.15)' },
};

const DEVICE_PRESETS = [
  { id: 'se', label: 'iPhone SE', w: 375, h: 667 },
  { id: 's8', label: 'Galaxy S8', w: 360, h: 740 },
  { id: 'ip14', label: 'iPhone 14', w: 390, h: 844 },
  { id: 's20', label: 'Galaxy S20', w: 412, h: 915 },
  { id: 'ip14pm', label: 'iPhone 14 PM', w: 430, h: 932 },
];

const LABEL_H = 26;

const NAMES = ['Alice','Bob','Charlie','Diana','Emile','Fatou','Gaston','Helene','Igor','Julie','Kevin','Luna','Max','Nina','Oscar','Paul','Quentin','Rosa','Sam','Tina'];

/**
 * SimPanel — Phone frame that renders content at a given device size.
 * Each panel independently renders the right phase based on Firebase state.
 */
function SimPanel({ role, label, children, phoneW, phoneH }) {
  const colors = PANEL_COLORS[role] || PANEL_COLORS.player;
  const borderColor = colors.border;
  const labelBg = colors.labelBg;
  const contentH = phoneH - LABEL_H;

  return (
    <div style={{
      width: phoneW, height: phoneH,
      border: `2px solid ${borderColor}40`, borderRadius: '16px',
      overflow: 'hidden', background: '#04060f', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '6px 12px', height: LABEL_H, background: labelBg,
        borderBottom: `1px solid ${borderColor}30`,
        display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: borderColor }} />
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.6rem',
          fontWeight: 800, color: borderColor, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <div className="sim-panel-content" style={{
        width: phoneW, height: contentH,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative', transform: 'translateZ(0)',
        '--app-height': `${contentH}px`, '--safe-area-bottom': '0px', '--safe-area-top': '0px',
      }}>
        {children}
        <style>{`
          .sim-panel-content .transition-overlay { position: absolute !important; }
          .sim-panel-content .transition-title { font-size: 1.1rem !important; }
          .sim-panel-content .transition-subtitle { font-size: 0.75rem !important; margin: 0 0 1rem 0 !important; }
          .sim-panel-content .transition-content { padding: 1rem !important; }
          .sim-panel-content .transition-icon { transform: scale(0.5); margin-bottom: 0.5rem !important; }
          .sim-panel-content .transition-progress { width: 120px; }
          /* Scope countdown inside the sim panel (fixed -> absolute) */
          .sim-panel-content > div[style*="position: fixed"],
          .sim-panel-content > *[style*="position: fixed"] { position: absolute !important; }
        `}</style>
      </div>
    </div>
  );
}

function ControlButton({ label, color, onClick, disabled = false, filled = true }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 14px',
      background: disabled ? 'rgba(238,242,255,0.05)' : filled ? color : 'transparent',
      color: disabled ? 'rgba(238,242,255,0.2)' : filled ? '#04060f' : color,
      border: filled ? 'none' : `1px solid ${disabled ? 'rgba(238,242,255,0.1)' : color}50`,
      borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em',
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'Space Grotesk', sans-serif",
      transition: 'all 0.15s ease', textTransform: 'uppercase',
    }}>{label}</button>
  );
}

/**
 * PlayerPanel — Renders the right game phase content for a given player.
 * Listens to Firebase phase and transitions naturally.
 */
function PlayerPanel({ code, uid, phase, isHost }) {
  if (phase === 'prep') return <Suspense fallback={<PhaseLoader />}><AlibiPrepContent code={code} myUid={uid} /></Suspense>;
  if (phase === 'interrogation') return <Suspense fallback={<PhaseLoader />}><AlibiPlayContent code={code} myUid={uid} /></Suspense>;
  if (phase === 'ended') return <Suspense fallback={<PhaseLoader />}><AlibiEndContent code={code} myUid={uid} /></Suspense>;
  return <AlibiLobbyContent code={code} myUid={uid} isHost={isHost} />;
}

function PhaseLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1a' }}>
      <div style={{ width: 24, height: 24, border: '3px solid #222240', borderTopColor: GAME_COLOR, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

const SIM_STORAGE_KEY = 'dev_sim_alibi_roomCode';

export default function AlibiSimulator() {
  const [myUid, setMyUid] = useState(null);
  const [roomCode, setRoomCodeState] = useState(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SIM_STORAGE_KEY);
  });
  const [phase, setPhase] = useState(null);
  const [displayPhase, setDisplayPhase] = useState(null);
  const [players, setPlayers] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [device, setDevice] = useState(DEVICE_PRESETS[2]); // iPhone 14

  // Wrapper to persist roomCode
  const setRoomCode = useCallback((code) => {
    setRoomCodeState(code);
    if (typeof window !== 'undefined') {
      if (code) localStorage.setItem(SIM_STORAGE_KEY, code);
      else localStorage.removeItem(SIM_STORAGE_KEY);
    }
  }, []);

  // Return to Dev Studio with simulation tab active
  const goToDevStudio = useCallback((e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev_active_tab', 'simulation');
    }
    window.location.href = '/dev';
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { setMyUid(user?.uid || null); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/state/phase`), (snap) => {
      setPhase(snap.val());
    });
    return () => unsub();
  }, [roomCode]);

  // Delay phase switch to allow countdown transition to play in lobby
  useEffect(() => {
    if (phase === 'prep') {
      const timer = setTimeout(() => setDisplayPhase('prep'), 4500);
      return () => clearTimeout(timer);
    }
    if (phase === 'ended') {
      const timer = setTimeout(() => setDisplayPhase('ended'), 3500);
      return () => clearTimeout(timer);
    }
    setDisplayPhase(phase);
  }, [phase]);

  // Validate persisted roomCode once on mount — clear if room no longer exists in Firebase
  const mountCheckDoneRef = useRef(false);
  useEffect(() => {
    if (mountCheckDoneRef.current || !roomCode) return;
    mountCheckDoneRef.current = true;
    get(ref(db, `${ROOM_PREFIX}/${roomCode}/meta/hostUid`)).then((snap) => {
      if (!snap.exists()) {
        console.log('[Sim] Clearing stale roomCode:', roomCode);
        setRoomCode(null);
        setPhase(null);
        setPlayers({});
      }
    }).catch(() => {});
  }, [roomCode, setRoomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/players`), (snap) => {
      setPlayers(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  const createRoom = useCallback(async (mode) => {
    if (!myUid) { setError('Not authenticated. Go to /dev/signin first.'); return; }
    setCreating(true);
    setError(null);
    try {
      const code = genCode();
      const { writePromise } = await createFirebaseRoom({
        gameId: 'alibi', code, hostUid: myUid, hostName: 'Host (Sim)',
        gameMasterMode: mode, db, ref, set,
      });
      await writePromise;

      await set(ref(db, `${ROOM_PREFIX}/${code}/players/${myUid}`), {
        uid: myUid, name: 'Host (You)', score: 0, team: null,
        status: 'active', joinedAt: Date.now(),
      });

      const res = await fetch('/api/dev/seed-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, prefix: ROOM_PREFIX, action: 'seed', count: 4 }),
      });
      if (!res.ok) throw new Error(`Seed failed: ${await res.text()}`);

      setRoomCode(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }, [myUid]);

  const resetToLobby = useCallback(async () => {
    if (!roomCode) return;
    const updates = {};
    updates[`${ROOM_PREFIX}/${roomCode}/state`] = { phase: 'lobby' };
    Object.keys(players).forEach(uid => {
      updates[`${ROOM_PREFIX}/${roomCode}/players/${uid}/score`] = 0;
    });
    await update(ref(db), updates);
  }, [roomCode, players]);

  const addPlayer = useCallback(async () => {
    if (!roomCode) return;
    const existingUids = Object.keys(players);
    if (existingUids.length >= 10) { setError('Max 10 joueurs pour Alibi'); return; }
    let num = 1;
    while (existingUids.includes(`fake_p${num}`)) num++;
    const uid = `fake_p${num}`;
    const name = NAMES[(num - 1) % NAMES.length] || `P${num}`;
    try {
      await set(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${uid}`), {
        uid, name, score: 0, team: null,
        status: 'active', joinedAt: Date.now(), isFake: true,
      });
    } catch (err) { setError(err.message); }
  }, [roomCode, players]);

  const removePlayer = useCallback(async () => {
    if (!roomCode) return;
    const fakeUids = Object.keys(players).filter(uid => uid !== myUid && uid.startsWith('fake_'));
    if (fakeUids.length === 0) return;
    const sorted = fakeUids.sort((a, b) => (players[b]?.joinedAt || 0) - (players[a]?.joinedAt || 0));
    try {
      await remove(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${sorted[0]}`));
    } catch (err) { setError(err.message); }
  }, [roomCode, players, myUid]);

  const playerEntries = Object.entries(players);

  // ===== CREATE SCREEN =====
  if (!roomCode) {
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', background: '#04060f',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <a href="/dev" onClick={goToDevStudio} style={{
          position: 'absolute', top: '20px', left: '20px',
          color: 'rgba(238,242,255,0.4)', textDecoration: 'none', fontSize: '0.8rem',
          fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.03em',
        }}>&larr; Dev Studio</a>

        <span style={{ fontSize: '3rem', marginBottom: '16px' }}>🕵️</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: '1.5rem', color: '#eef2ff',
          margin: '0 0 8px', letterSpacing: '0.04em', textAlign: 'center',
        }}>Alibi Simulator</h1>
        <p style={{
          color: 'rgba(238,242,255,0.4)', fontSize: '0.8rem', margin: '0 0 32px',
          textAlign: 'center', maxWidth: '400px', lineHeight: 1.5,
        }}>
          Crée une room et joue une partie complète avec toutes les transitions.
        </p>

        {error && (
          <div style={{
            padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
            color: '#fca5a5', fontSize: '0.75rem', marginBottom: '20px',
            maxWidth: '400px', textAlign: 'center',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => createRoom('gamemaster')} disabled={creating || !myUid} style={{
            padding: '14px 28px',
            background: creating ? `${GAME_COLOR}4D` : GAME_COLOR,
            color: creating ? 'rgba(255,255,255,0.5)' : '#04060f',
            border: 'none', borderBottom: '4px solid #b45309',
            borderRadius: '12px', fontFamily: 'Bungee, sans-serif',
            fontSize: '0.9rem', letterSpacing: '0.04em',
            cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
          }}>
            {creating ? '...' : '🎙️ Game Master'}
          </button>

          <button onClick={() => createRoom('party')} disabled={creating || !myUid} style={{
            padding: '14px 28px',
            background: creating ? 'rgba(124,58,237,0.3)' : '#7c3aed',
            color: creating ? 'rgba(255,255,255,0.5)' : '#fff',
            border: 'none', borderBottom: '4px solid #5b21b6',
            borderRadius: '12px', fontFamily: 'Bungee, sans-serif',
            fontSize: '0.9rem', letterSpacing: '0.04em',
            cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
          }}>
            {creating ? '...' : '🎉 Party Mode'}
          </button>
        </div>

        {!myUid && (
          <p style={{ color: `${GAME_COLOR}99`, fontSize: '0.7rem', marginTop: '12px' }}>
            Not authenticated. <a href="/dev/signin" style={{ color: GAME_COLOR }}>Sign in first</a>
          </p>
        )}
      </div>
    );
  }

  // ===== SIMULATION VIEW — natural game flow =====
  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(238,242,255,0.06)', flexShrink: 0,
      }}>
        <a href="/dev" onClick={goToDevStudio} style={{
          color: 'rgba(238,242,255,0.4)', textDecoration: 'none', fontSize: '0.8rem',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>&larr; Dev Studio</a>
        <span style={{ fontSize: '1.2rem' }}>🕵️</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: '1rem', color: '#eef2ff',
          margin: 0, letterSpacing: '0.04em',
        }}>Alibi Sim</h1>
        <div style={{
          padding: '4px 10px', background: 'rgba(238,242,255,0.06)', borderRadius: '6px',
          fontSize: '0.65rem', fontWeight: 700, color: 'rgba(238,242,255,0.4)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{phase || 'lobby'}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)' }}>
          {playerEntries.length} joueurs
        </div>
        <div style={{
          padding: '4px 12px',
          background: `${GAME_COLOR}26`, borderRadius: '6px',
          fontFamily: 'Bungee, sans-serif', fontSize: '0.8rem', color: GAME_COLOR,
          letterSpacing: '0.1em',
        }}>{roomCode}</div>
      </div>

      {/* Panels — each player sees their own game flow */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {/* Host panel */}
          <SimPanel role="host" label={`Host (You) · ${phase || 'lobby'}`} phoneW={device.w} phoneH={device.h}>
            <PlayerPanel code={roomCode} uid={myUid} phase={displayPhase} isHost={true} />
          </SimPanel>

          {/* Player panels */}
          {playerEntries.filter(([uid]) => uid !== myUid).map(([uid, player]) => (
            <SimPanel key={uid} role="player" label={`${player.name || uid} · ${phase || 'lobby'}`} phoneW={device.w} phoneH={device.h}>
              <PlayerPanel code={roomCode} uid={uid} phase={displayPhase} isHost={false} />
            </SimPanel>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'rgba(4,6,15,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(238,242,255,0.08)',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <ControlButton label="+ Joueur" color={GAME_COLOR} onClick={addPlayer} />
        <ControlButton label="− Joueur" color="#ef4444" onClick={removePlayer}
          disabled={Object.keys(players).filter(uid => uid.startsWith('fake_')).length === 0} filled={false} />
        <ControlButton label="↺ Lobby" color="#eab308" onClick={resetToLobby} filled={false} />
        <ControlButton label="✕ Nouvelle Room" color="#ef4444" onClick={() => { setRoomCode(null); setPhase(null); setPlayers({}); }} filled={false} />

        {/* Device Selector */}
        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: 'rgba(238,242,255,0.04)', borderRadius: '6px', border: '1px solid rgba(238,242,255,0.08)' }}>
          {DEVICE_PRESETS.map(d => (
            <button key={d.id} onClick={() => setDevice(d)} style={{
              padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer',
              background: device.id === d.id ? `${GAME_COLOR}4D` : 'transparent',
              color: device.id === d.id ? '#fde68a' : 'rgba(238,242,255,0.3)',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '0.03em', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            }}>{d.label}</button>
          ))}
        </div>
        <div style={{ fontSize: '0.55rem', color: 'rgba(238,242,255,0.25)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {device.w}×{device.h}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)', letterSpacing: '0.06em' }}>
          ROOM <span style={{ color: GAME_COLOR, fontWeight: 700 }}>{roomCode}</span>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          padding: '10px 16px', background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
          color: '#fca5a5', fontSize: '0.75rem', zIndex: 200, maxWidth: '300px', cursor: 'pointer',
        }} onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}
