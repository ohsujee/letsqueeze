'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, db, ref, set, update, remove, onValue, onAuthStateChanged } from '@/lib/firebase';
import { createRoom as createFirebaseRoom } from '@/lib/config/rooms';

import { MindLinkLobbyContent } from '@/app/mindlink/room/[code]/page';
import { MindLinkDefendContent } from '@/app/mindlink/game/[code]/defend/page';
import { MindLinkPlayContent } from '@/app/mindlink/game/[code]/play/page';
import { MindLinkEndContent } from '@/app/mindlink/game/[code]/end/page';

const ROOM_PREFIX = 'rooms_mindlink';

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const PANEL_COLORS = {
  host: { border: '#eab308', labelBg: 'rgba(234,179,8,0.15)' },
  defender: { border: '#ef4444', labelBg: 'rgba(239,68,68,0.15)' },
  attacker: { border: '#ec4899', labelBg: 'rgba(236,72,153,0.15)' },
  end: { border: '#22c55e', labelBg: 'rgba(34,197,94,0.15)' },
};

const PHASE_TABS = [
  { id: 'lobby', label: 'Lobby', color: '#eab308' },
  { id: 'playing', label: 'Game', color: '#22c55e' },
  { id: 'ended', label: 'End', color: '#ef4444' },
];

const PHONE_W = 360;
const PHONE_H = 740;
const LABEL_H = 26;
const CONTENT_H = PHONE_H - LABEL_H;


function SimPanel({ role, label, children }) {
  const colors = PANEL_COLORS[role] || PANEL_COLORS.attacker;
  const borderColor = colors.border;
  const labelBg = colors.labelBg;

  return (
    <div style={{
      width: PHONE_W,
      height: PHONE_H,
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
      {/* Content — mimics AppShell: flex column with fixed height */}
      <div className="sim-panel-content" style={{
        width: PHONE_W,
        height: CONTENT_H,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        '--app-height': `${CONTENT_H}px`,
        '--safe-area-bottom': '0px',
        '--safe-area-top': '0px',
      }}>
        {children}
        {/* Override transition sizes for small sim panels */}
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

export default function MindLinkSimulator() {
  const [myUid, setMyUid] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [phase, setPhase] = useState(null);
  const [players, setPlayers] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [displayPhase, setDisplayPhase] = useState(null);

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid || null);
    });
    return unsub;
  }, []);

  // Listen to phase changes
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/state/phase`), (snap) => {
      setPhase(snap.val());
    });
    return () => unsub();
  }, [roomCode]);

  // Listen to players
  useEffect(() => {
    if (!roomCode) return;
    const unsub = onValue(ref(db, `${ROOM_PREFIX}/${roomCode}/players`), (snap) => {
      setPlayers(snap.val() || {});
    });
    return () => unsub();
  }, [roomCode]);

  // Delay panel switch during transitions
  useEffect(() => {
    if (phase === 'choosing') {
      // Let 3-2-1-GO countdown play inside game panels
      const timer = setTimeout(() => setDisplayPhase('playing'), 4500);
      return () => clearTimeout(timer);
    }
    if (phase === 'ended') {
      // Let GameEndTransition play inside game panels before switching to end panels
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
        gameId: 'mindlink',
        code,
        hostUid: myUid,
        hostName: 'Host (Sim)',
        db, ref, set,
      });
      await writePromise;

      // Add host as player
      await set(ref(db, `${ROOM_PREFIX}/${code}/players/${myUid}`), {
        uid: myUid,
        name: 'Host (You)',
        score: 0,
        role: 'attacker',
        status: 'active',
        joinedAt: Date.now(),
      });

      // Seed 5 fake players
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
    // Reset state to lobby
    updates[`${ROOM_PREFIX}/${roomCode}/state`] = { phase: 'lobby' };
    // Reset all player roles to attacker and scores to 0
    Object.keys(players).forEach(uid => {
      updates[`${ROOM_PREFIX}/${roomCode}/players/${uid}/role`] = 'attacker';
      updates[`${ROOM_PREFIX}/${roomCode}/players/${uid}/score`] = 0;
    });
    // Clear meta fields set during game start
    updates[`${ROOM_PREFIX}/${roomCode}/meta/selectedDefenders`] = null;
    updates[`${ROOM_PREFIX}/${roomCode}/meta/wordChooserUid`] = null;
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
    // Find next available number
    let num = 1;
    while (existingUids.includes(`fake_p${num}`)) num++;
    const uid = `fake_p${num}`;
    const NAMES = ['Alice','Bob','Charlie','Diana','Emile','Fatou','Gaston','Helene','Igor','Julie','Kevin','Luna','Max','Nina','Oscar','Paul','Quentin','Rosa','Sam','Tina'];
    const name = NAMES[(num - 1) % NAMES.length] || `P${num}`;
    try {
      await set(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${uid}`), {
        uid, name, score: 0, role: 'attacker',
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
    // Remove the last one added (highest joinedAt)
    const sorted = fakeUids.sort((a, b) => (players[b]?.joinedAt || 0) - (players[a]?.joinedAt || 0));
    try {
      await remove(ref(db, `${ROOM_PREFIX}/${roomCode}/players/${sorted[0]}`));
    } catch (err) {
      setError(err.message);
    }
  }, [roomCode, players, myUid]);

  // Derive player lists from actual Firebase roles
  const playerEntries = Object.entries(players);
  const defenders = playerEntries.filter(([, p]) => p.role === 'defender');
  const attackers = playerEntries.filter(([, p]) => p.role !== 'defender');

  // ──────────────────────────────────────
  // Setup screen (before room creation)
  // ──────────────────────────────────────
  if (!roomCode) {
    return (
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: '#04060f',
        fontFamily: "'Space Grotesk', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <a
          href="/dev"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            color: 'rgba(238,242,255,0.4)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.03em',
          }}
        >
          &larr; Dev Studio
        </a>

        <span style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif',
          fontSize: '1.5rem',
          color: '#eef2ff',
          margin: '0 0 8px',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}>
          Mind Link Simulator
        </h1>
        <p style={{
          color: 'rgba(238,242,255,0.4)',
          fontSize: '0.8rem',
          margin: '0 0 32px',
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: 1.5,
        }}>
          Cr&eacute;e une room Firebase r&eacute;elle avec 6 joueurs (1 host + 5 faux) et visualise toutes les vues c&ocirc;te &agrave; c&ocirc;te.
        </p>

        {error && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.75rem',
            marginBottom: '20px',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={createRoom}
          disabled={creating || !myUid}
          style={{
            padding: '14px 32px',
            background: creating ? 'rgba(236,72,153,0.3)' : '#ec4899',
            color: creating ? 'rgba(255,255,255,0.5)' : '#fff',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'Bungee, sans-serif',
            fontSize: '1rem',
            letterSpacing: '0.04em',
            cursor: creating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {creating ? 'Creating...' : 'Create Simulation'}
        </button>

        {!myUid && (
          <p style={{
            color: 'rgba(239,68,68,0.6)',
            fontSize: '0.7rem',
            marginTop: '12px',
          }}>
            Not authenticated. <a href="/dev/signin" style={{ color: '#ec4899' }}>Sign in first</a>
          </p>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────
  // Render panels based on current phase
  // ──────────────────────────────────────
  const renderPanels = () => {
    if (['choosing', 'playing'].includes(displayPhase)) {
      return (
        <>
          {/* Defender panels */}
          {defenders.map(([uid, player]) => (
            <SimPanel key={uid} role="defender" label={`Defender - ${player.name || uid}${uid === myUid ? ' (You)' : ''}`}>
              <MindLinkDefendContent code={roomCode} myUid={uid} />
            </SimPanel>
          ))}
          {/* Attacker panels */}
          {attackers.map(([uid, player]) => (
            <SimPanel key={uid} role={uid === myUid ? 'host' : 'attacker'} label={`Attacker - ${player.name || uid}${uid === myUid ? ' (You)' : ''}`}>
              <MindLinkPlayContent code={roomCode} myUid={uid} />
            </SimPanel>
          ))}
        </>
      );
    }

    if (displayPhase === 'ended') {
      return playerEntries.map(([uid, player]) => (
        <SimPanel key={uid} role="end" label={`End - ${player.name || uid}${uid === myUid ? ' (You)' : ''}`}>
          <MindLinkEndContent code={roomCode} myUid={uid} />
        </SimPanel>
      ));
    }

    // Default: lobby phase
    return (
      <>
        {/* Host lobby panel */}
        <SimPanel role="host" label="Host (You) - Lobby">
          <MindLinkLobbyContent code={roomCode} myUid={myUid} isHost={true} />
        </SimPanel>
        {/* Each fake player's lobby view */}
        {playerEntries.filter(([uid]) => uid !== myUid).map(([uid, player]) => (
          <SimPanel key={uid} role="attacker" label={`Player - ${player.name || uid}`}>
            <MindLinkLobbyContent code={roomCode} myUid={uid} />
          </SimPanel>
        ))}
      </>
    );
  };

  // ──────────────────────────────────────
  // Simulation view
  // ──────────────────────────────────────
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#04060f',
      fontFamily: "'Space Grotesk', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(238,242,255,0.06)',
        flexShrink: 0,
      }}>
        <a
          href="/dev"
          style={{
            color: 'rgba(238,242,255,0.4)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          &larr; Dev Studio
        </a>
        <span style={{ fontSize: '1.2rem' }}>🧠</span>
        <h1 style={{
          fontFamily: 'Bungee, sans-serif',
          fontSize: '1rem',
          color: '#eef2ff',
          margin: 0,
          letterSpacing: '0.04em',
        }}>
          Mind Link Sim
        </h1>
        <div style={{
          marginLeft: 'auto',
          padding: '4px 12px',
          background: 'rgba(236,72,153,0.15)',
          borderRadius: '6px',
          fontFamily: 'Bungee, sans-serif',
          fontSize: '0.8rem',
          color: '#ec4899',
          letterSpacing: '0.1em',
        }}>
          {roomCode}
        </div>
      </div>

      {/* Tabs + info bar */}
      <div style={{
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid rgba(238,242,255,0.06)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Phase tabs */}
        {PHASE_TABS.map((tab) => {
          const isActive = tab.id === 'playing' ? ['choosing', 'playing'].includes(displayPhase) : displayPhase === tab.id;
          return (
            <div
              key={tab.id}
              style={{
                padding: '5px 14px',
                background: isActive ? `${tab.color}20` : 'rgba(238,242,255,0.04)',
                color: isActive ? tab.color : 'rgba(238,242,255,0.2)',
                border: isActive ? `1px solid ${tab.color}50` : '1px solid rgba(238,242,255,0.06)',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                transition: 'all 0.15s ease',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </div>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Phase indicator */}
        <div style={{
          fontSize: '0.65rem',
          color: 'rgba(238,242,255,0.3)',
          letterSpacing: '0.06em',
        }}>
          Phase: <span style={{
            color: displayPhase === 'lobby' ? '#eab308' : ['choosing', 'playing'].includes(displayPhase) ? '#22c55e' : displayPhase === 'ended' ? '#ef4444' : 'rgba(238,242,255,0.4)',
            fontWeight: 700,
          }}>{phase || 'unknown'}</span>
        </div>

        {/* Player count */}
        <div style={{
          fontSize: '0.65rem',
          color: 'rgba(238,242,255,0.3)',
        }}>
          {playerEntries.length} players
        </div>
      </div>

      {/* Panels container - wrapping grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        paddingBottom: '80px',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
        }}>
          {renderPanels()}
        </div>
      </div>

      {/* Bottom control bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(4,6,15,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(238,242,255,0.08)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <ControlButton
          label="+ Joueur"
          color="#ec4899"
          onClick={addPlayer}
        />
        <ControlButton
          label="− Joueur"
          color="#f59e0b"
          onClick={removePlayer}
          disabled={Object.keys(players).filter(uid => uid.startsWith('fake_')).length === 0}
          filled={false}
        />
        <ControlButton
          label="↺ Lobby"
          color="#eab308"
          onClick={resetToLobby}
          filled={false}
        />

        <div style={{ flex: 1 }} />

        <div style={{
          fontSize: '0.65rem',
          color: 'rgba(238,242,255,0.3)',
          letterSpacing: '0.06em',
        }}>
          ROOM <span style={{ color: '#ec4899', fontWeight: 700 }}>{roomCode}</span>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 16px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '0.75rem',
          zIndex: 200,
          maxWidth: '300px',
          cursor: 'pointer',
        }} onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  );
}
