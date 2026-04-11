'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { auth, db, ref, set, update, remove, onValue, onAuthStateChanged } from '@/lib/firebase';
import { createRoom as createFirebaseRoom } from '@/lib/config/rooms';

import { QuizLobbyContent } from '@/app/room/[code]/page';

// Lazy load non-lobby phases — prevents CSS from all phases loading simultaneously
const QuizHostContent = lazy(() => import('@/app/game/[code]/host/page').then(m => ({ default: m.QuizHostContent })));
const QuizPlayContent = lazy(() => import('@/app/game/[code]/play/page').then(m => ({ default: m.QuizPlayContent })));
const QuizEndContent = lazy(() => import('@/app/end/[code]/page').then(m => ({ default: m.QuizEndContent })));

const ROOM_PREFIX = 'rooms';

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const PANEL_COLORS = {
  host: { border: '#eab308', labelBg: 'rgba(234,179,8,0.15)' },
  player: { border: '#8b5cf6', labelBg: 'rgba(139,92,246,0.15)' },
  end: { border: '#22c55e', labelBg: 'rgba(34,197,94,0.15)' },
};

const PHASE_TABS = [
  { id: 'lobby', label: 'Lobby', color: '#eab308' },
  { id: 'playing', label: 'Game', color: '#22c55e' },
  { id: 'ended', label: 'End', color: '#ef4444' },
];

const DEVICE_PRESETS = [
  { id: 'se', label: 'iPhone SE', w: 375, h: 667 },
  { id: 's8', label: 'Galaxy S8', w: 360, h: 740 },
  { id: 'ip14', label: 'iPhone 14', w: 390, h: 844 },
  { id: 's20', label: 'Galaxy S20', w: 412, h: 915 },
  { id: 'ip14pm', label: 'iPhone 14 PM', w: 430, h: 932 },
];

const LABEL_H = 26;

function SimPanel({ role, label, children, phoneW, phoneH }) {
  const colors = PANEL_COLORS[role] || PANEL_COLORS.player;
  const borderColor = colors.border;
  const labelBg = colors.labelBg;
  const contentH = phoneH - LABEL_H;

  return (
    <div style={{
      width: phoneW,
      height: phoneH,
      border: `2px solid ${borderColor}40`,
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#04060f',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Label */}
      <div style={{
        padding: '6px 12px',
        height: LABEL_H,
        background: labelBg,
        borderBottom: `1px solid ${borderColor}30`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: borderColor }} />
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.6rem',
          fontWeight: 800,
          color: borderColor,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      </div>
      {/* Content */}
      <div className="sim-panel-content" style={{
        width: phoneW,
        height: contentH,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        '--app-height': `${contentH}px`,
        '--safe-area-bottom': '0px',
        '--safe-area-top': '0px',
      }}>
        {children}
        <style>{`
          .sim-panel-content .transition-overlay {
            position: absolute !important;
          }
          .sim-panel-content .transition-title {
            font-size: 1.1rem !important;
          }
          .sim-panel-content .transition-subtitle {
            font-size: 0.75rem !important;
            margin: 0 0 1rem 0 !important;
          }
          .sim-panel-content .transition-content {
            padding: 1rem !important;
          }
          .sim-panel-content .transition-icon {
            transform: scale(0.5);
            margin-bottom: 0.5rem !important;
          }
          .sim-panel-content .transition-progress {
            width: 120px;
          }
        `}</style>
      </div>
    </div>
  );
}

function ControlButton({ label, color, onClick, disabled = false, filled = true }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        background: disabled ? 'rgba(238,242,255,0.05)' : filled ? color : 'transparent',
        color: disabled ? 'rgba(238,242,255,0.2)' : filled ? '#04060f' : color,
        border: filled ? 'none' : `1px solid ${disabled ? 'rgba(238,242,255,0.1)' : color}50`,
        borderRadius: '8px',
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.15s ease',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}

function PhaseLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1a' }}>
      <div style={{ width: 24, height: 24, border: '3px solid #222240', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function QuizSimulator() {
  const [myUid, setMyUid] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [phase, setPhase] = useState(null);
  const [players, setPlayers] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [displayPhase, setDisplayPhase] = useState(null);
  const [device, setDevice] = useState(DEVICE_PRESETS[2]); // iPhone 14 par défaut

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/state/phase`), (snap) => {
      setPhase(snap.val());
    });
    return () => unsub();
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/players`), (snap) => {
      setPlayers(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  useEffect(() => {
    if (phase === 'playing') {
      const timer = setTimeout(() => setDisplayPhase('playing'), 4500);
      return () => clearTimeout(timer);
    }
    if (phase === 'ended') {
      const timer = setTimeout(() => setDisplayPhase('ended'), 3500);
      return () => clearTimeout(timer);
    }
    setDisplayPhase(phase);
  }, [phase]);

  const createRoom = useCallback(async () => {
    if (!myUid) {
      setError('Not authenticated. Go to /dev/signin first.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const code = genCode();

      const { writePromise } = await createFirebaseRoom({
        gameId: 'quiz',
        code,
        hostUid: myUid,
        hostName: 'Host (Sim)',
        db, ref, set,
      });
      await writePromise;

      await set(ref(db, `${ROOM_PREFIX}/${code}/players/${myUid}`), {
        uid: myUid,
        name: 'Host (You)',
        score: 0,
        teamId: '',
        blockedUntil: 0,
        status: 'active',
        joinedAt: Date.now(),
      });

      const res = await fetch('/api/dev/seed-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: code,
          prefix: ROOM_PREFIX,
          action: 'seed',
          count: 4,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Seed failed: ${text}`);
      }

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
      updates[`${ROOM_PREFIX}/${roomCode}/players/${uid}/blockedUntil`] = 0;
    });
    await update(ref(db), updates);
    setDisplayPhase('lobby');
  }, [roomCode, players]);

  const addPlayer = useCallback(async () => {
    if (!roomCode) return;
    const existingUids = Object.keys(players);
    if (existingUids.length >= 20) {
      setError('Max 20 joueurs (limite du jeu)');
      return;
    }
    let num = 1;
    while (existingUids.includes(`fake_p${num}`)) num++;
    const uid = `fake_p${num}`;
    const NAMES = ['Alice','Bob','Charlie','Diana','Emile','Fatou','Gaston','Helene','Igor','Julie','Kevin','Luna','Max','Nina','Oscar','Paul','Quentin','Rosa','Sam','Tina'];
    const name = NAMES[(num - 1) % NAMES.length] || `P${num}`;
    try {
      await set(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${uid}`), {
        uid, name, score: 0, teamId: '',
        blockedUntil: 0,
        status: 'active', joinedAt: Date.now(), isFake: true,
      });
    } catch (err) {
      setError(err.message);
    }
  }, [roomCode, players]);

  const removePlayer = useCallback(async () => {
    if (!roomCode) return;
    const fakeUids = Object.keys(players).filter(uid => uid !== myUid && uid.startsWith('fake_'));
    if (fakeUids.length === 0) return;
    const sorted = fakeUids.sort((a, b) => (players[b]?.joinedAt || 0) - (players[a]?.joinedAt || 0));
    try {
      await remove(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${sorted[0]}`));
    } catch (err) {
      setError(err.message);
    }
  }, [roomCode, players, myUid]);

  const playerEntries = Object.entries(players);

  if (!roomCode) {
    return (
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', background: '#04060f',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <a href="/dev" style={{
          position: 'absolute', top: '20px', left: '20px',
          color: 'rgba(238,242,255,0.4)', textDecoration: 'none', fontSize: '0.8rem',
          fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.03em',
        }}>&larr; Dev Studio</a>

        <span style={{ fontSize: '3rem', marginBottom: '16px' }}>&#x26A1;</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: '1.5rem', color: '#eef2ff',
          margin: '0 0 8px', letterSpacing: '0.04em', textAlign: 'center',
        }}>Quiz Buzzer Simulator</h1>
        <p style={{
          color: 'rgba(238,242,255,0.4)', fontSize: '0.8rem', margin: '0 0 32px',
          textAlign: 'center', maxWidth: '400px', lineHeight: 1.5,
        }}>
          Cr&eacute;e une room Firebase r&eacute;elle avec 6 joueurs (1 host + 5 faux) et visualise toutes les vues c&ocirc;te &agrave; c&ocirc;te.
        </p>

        {error && (
          <div style={{
            padding: '10px 16px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
            color: '#fca5a5', fontSize: '0.75rem', marginBottom: '20px',
            maxWidth: '400px', textAlign: 'center',
          }}>{error}</div>
        )}

        <button onClick={createRoom} disabled={creating || !myUid} style={{
          padding: '14px 32px',
          background: creating ? 'rgba(139,92,246,0.3)' : '#8b5cf6',
          color: creating ? 'rgba(255,255,255,0.5)' : '#fff',
          border: 'none', borderRadius: '12px', fontFamily: 'Bungee, sans-serif',
          fontSize: '1rem', letterSpacing: '0.04em',
          cursor: creating ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
        }}>
          {creating ? 'Creating...' : 'Create Simulation'}
        </button>

        {!myUid && (
          <p style={{ color: 'rgba(139,92,246,0.6)', fontSize: '0.7rem', marginTop: '12px' }}>
            Not authenticated. <a href="/dev/signin" style={{ color: '#8b5cf6' }}>Sign in first</a>
          </p>
        )}
      </div>
    );
  }

  const renderPanels = () => {
    if (displayPhase === 'playing') {
      return (
        <>
          <SimPanel role="host" label="Host View" phoneW={device.w} phoneH={device.h}>
            <Suspense fallback={<PhaseLoader />}><QuizHostContent code={roomCode} /></Suspense>
          </SimPanel>
          {playerEntries.filter(([uid]) => uid !== myUid).map(([uid, player]) => (
            <SimPanel key={uid} role="player" label={`Player - ${player.name || uid}`} phoneW={device.w} phoneH={device.h}>
              <Suspense fallback={<PhaseLoader />}><QuizPlayContent code={roomCode} myUid={uid} /></Suspense>
            </SimPanel>
          ))}
        </>
      );
    }

    if (displayPhase === 'ended') {
      return playerEntries.map(([uid, player]) => (
        <SimPanel key={uid} role="end" label={`End - ${player.name || uid}${uid === myUid ? ' (You)' : ''}`} phoneW={device.w} phoneH={device.h}>
          <Suspense fallback={<PhaseLoader />}><QuizEndContent code={roomCode} myUid={uid} /></Suspense>
        </SimPanel>
      ));
    }

    return (
      <>
        <SimPanel role="host" label="Host (You) - Lobby" phoneW={device.w} phoneH={device.h}>
          <QuizLobbyContent code={roomCode} myUid={myUid} isHost={true} />
        </SimPanel>
        {playerEntries.filter(([uid]) => uid !== myUid).map(([uid, player]) => (
          <SimPanel key={uid} role="player" label={`Player - ${player.name || uid}`} phoneW={device.w} phoneH={device.h}>
            <QuizLobbyContent code={roomCode} myUid={uid} />
          </SimPanel>
        ))}
      </>
    );
  };

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', fontFamily: "'Space Grotesk', sans-serif", overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid rgba(238,242,255,0.06)', flexShrink: 0,
      }}>
        <a href="/dev" style={{
          color: 'rgba(238,242,255,0.4)', textDecoration: 'none', fontSize: '0.8rem',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>&larr; Dev Studio</a>
        <span style={{ fontSize: '1.2rem' }}>&#x26A1;</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif', fontSize: '1rem', color: '#eef2ff',
          margin: 0, letterSpacing: '0.04em',
        }}>Quiz Sim</h1>
        <div style={{
          marginLeft: 'auto', padding: '4px 12px',
          background: 'rgba(139,92,246,0.15)', borderRadius: '6px',
          fontFamily: 'Bungee, sans-serif', fontSize: '0.8rem', color: '#8b5cf6',
          letterSpacing: '0.1em',
        }}>{roomCode}</div>
      </div>

      <div style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
        borderBottom: '1px solid rgba(238,242,255,0.06)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {PHASE_TABS.map((tab) => {
          const isActive = displayPhase === tab.id;
          return (
            <div key={tab.id} style={{
              padding: '5px 14px',
              background: isActive ? `${tab.color}20` : 'rgba(238,242,255,0.04)',
              color: isActive ? tab.color : 'rgba(238,242,255,0.2)',
              border: isActive ? `1px solid ${tab.color}50` : '1px solid rgba(238,242,255,0.06)',
              borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: "'Space Grotesk', sans-serif", transition: 'all 0.15s ease',
              userSelect: 'none',
            }}>{tab.label}</div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)', letterSpacing: '0.06em' }}>
          Phase: <span style={{
            color: displayPhase === 'lobby' ? '#eab308' : displayPhase === 'playing' ? '#22c55e' : displayPhase === 'ended' ? '#ef4444' : 'rgba(238,242,255,0.4)',
            fontWeight: 700,
          }}>{phase || 'unknown'}</span>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)' }}>
          {playerEntries.length} players
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px', paddingBottom: '80px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {renderPanels()}
        </div>
      </div>

      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'rgba(4,6,15,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(238,242,255,0.08)',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <ControlButton label="+ Joueur" color="#8b5cf6" onClick={addPlayer} />
        <ControlButton label="- Joueur" color="#f59e0b" onClick={removePlayer}
          disabled={Object.keys(players).filter(uid => uid.startsWith('fake_')).length === 0} filled={false} />
        <ControlButton label="&#x21BA; Lobby" color="#eab308" onClick={resetToLobby} filled={false} />

        {/* Device Selector */}
        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: 'rgba(238,242,255,0.04)', borderRadius: '6px', border: '1px solid rgba(238,242,255,0.08)' }}>
          {DEVICE_PRESETS.map(d => (
            <button key={d.id} onClick={() => setDevice(d)} style={{
              padding: '4px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer',
              background: device.id === d.id ? 'rgba(139,92,246,0.3)' : 'transparent',
              color: device.id === d.id ? '#c4b5fd' : 'rgba(238,242,255,0.3)',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '0.03em', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            }}>{d.label}</button>
          ))}
        </div>

        <div style={{ fontSize: '0.55rem', color: 'rgba(238,242,255,0.25)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {device.w}×{device.h}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)', letterSpacing: '0.06em' }}>
          ROOM <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{roomCode}</span>
        </div>
      </div>

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
