'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, House, Globe, Clock, Shuffle, CaretDown,
  ArrowRight, MagnifyingGlass, Info, DeviceMobile,
} from '@phosphor-icons/react';
import PlayerBanner from '@/components/game/PlayerBanner';
import LobbyStartButton from '@/components/game/LobbyStartButton';
import DevLobbySettings from '@/app/dev/components/DevLobbySettings';
import DevShareModal from '@/app/dev/components/DevShareModal';

/* ─── Mock data ─────────────────────────────────────────── */
const ACCENT       = '#00e5ff';
const ACCENT_DARK  = '#00b8d9';
const MOCK_CODE     = 'R3GL7';
const MOCK_JOIN_URL = `https://gigglz.app/join/${MOCK_CODE}`;
const MOCK_HOST_UID = 'uid1';
const MY_UID        = 'uid1';

const MOCK_PLAYERS = [
  { uid: 'uid1', name: 'OhSujee',  score: 0, status: 'active' },
  { uid: 'uid2', name: 'Nirojan',  score: 0, status: 'active' },
  { uid: 'uid3', name: 'Thomas',   score: 0, status: 'active' },
  { uid: 'uid4', name: 'Léa M.',   score: 0, status: 'active' },
];

/* ─── Main (wrapped in Suspense for useSearchParams) ────── */
function DevLaRegleLobbyContent() {
  const searchParams = useSearchParams();
  const [view, setView] = useState(searchParams.get('view') || 'host');
  const [mode, setMode] = useState('meme_piece');
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [investigatorsCount, setInvestigatorsCount] = useState(2); // synced with pre-selection
  const [selectedInvestigators, setSelectedInvestigators] = useState(['uid2', 'uid3']);

  const isHost = view === 'host';
  const listRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  };

  useEffect(() => {
    checkScroll();
  }, [MOCK_PLAYERS.length]);
  const maxInvestigators = Math.max(1, MOCK_PLAYERS.length - 1);
  const canStart = selectedInvestigators.length >= investigatorsCount && MOCK_PLAYERS.length >= 2;
  const stillNeedInvestigators = selectedInvestigators.length < investigatorsCount;

  const handleRandomInvestigators = () => {
    const shuffled = [...MOCK_PLAYERS].sort(() => Math.random() - 0.5);
    setSelectedInvestigators(shuffled.slice(0, investigatorsCount).map(p => p.uid));
  };

  const handleToggleInvestigator = (uid) => {
    setSelectedInvestigators(prev => {
      if (prev.includes(uid)) return prev.filter(id => id !== uid);
      if (prev.length >= investigatorsCount) return [...prev.slice(1), uid];
      return [...prev, uid];
    });
  };

  const handleSetCount = (delta) => {
    setInvestigatorsCount(prev => {
      const next = Math.max(1, Math.min(maxInvestigators, prev + delta));
      // trim selection if needed
      setSelectedInvestigators(s => s.slice(0, next));
      return next;
    });
  };

  /* ─── Start button state ─────────────────────────────── */
  const startIcon  = canStart
    ? <ArrowRight size={20} weight="bold" />
    : stillNeedInvestigators
      ? <MagnifyingGlass size={18} weight="bold" />
      : <Users size={20} weight="bold" />;
  const startLabel = canStart
    ? 'Commencer'
    : stillNeedInvestigators
      ? `Choisis ${investigatorsCount - selectedInvestigators.length} enquêteur${investigatorsCount - selectedInvestigators.length > 1 ? 's' : ''}`
      : '2 joueurs minimum';

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#04060f',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>

      {/* ── Background layers ─────────────────────────────── */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,229,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* Top ambient glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.09) 0%, transparent 70%)',
        }} />
        {/* Bottom subtle glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '120px',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0,229,255,0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* ── Dev toggle bar ────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px',
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em',
          color: 'rgba(238,242,255,0.3)', textTransform: 'uppercase', marginRight: '8px',
        }}>DEV</span>

        {['host', 'player'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '4px 14px',
              borderRadius: '20px',
              border: view === v ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.1)',
              background: view === v ? `rgba(0,229,255,0.12)` : 'transparent',
              color: view === v ? ACCENT : 'rgba(238,242,255,0.4)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {v === 'host' ? 'Host' : 'Joueur'}
          </button>
        ))}

        <DeviceMobile size={14} color="rgba(238,242,255,0.2)" style={{ marginLeft: '8px' }} />
        <span style={{ fontSize: '0.6rem', color: 'rgba(238,242,255,0.2)' }}>
          {view === 'host' ? 'Vue animateur' : 'Vue joueur'}
        </span>
      </div>

      {/* ── Header ────────────────────────────────────────── */}
      <header style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0,229,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(238,242,255,0.05)',
            border: '1px solid rgba(238,242,255,0.08)',
            borderRadius: '10px',
            cursor: 'pointer',
            color: 'rgba(238,242,255,0.6)',
            flexShrink: 0,
          }}>
            <ArrowLeft size={16} weight="bold" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: '1.1rem',
              color: 'rgba(238,242,255,0.45)',
              margin: 0,
              letterSpacing: '0.04em',
              fontWeight: 400,
            }}>CODE</h1>
            <span style={{ color: 'rgba(238,242,255,0.2)', fontSize: '0.85rem', fontWeight: 300 }}>•</span>
            <span style={{
              fontFamily: 'var(--font-display, "Space Grotesk"), sans-serif',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.1em',
              textShadow: `0 0 16px ${ACCENT}55`,
            }}>{MOCK_CODE}</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Settings (host only) — copie dev avec Phosphor */}
          {isHost && (
            <DevLobbySettings
              players={MOCK_PLAYERS}
              hostUid={MOCK_HOST_UID}
              variant="laregle"
            />
          )}

          {/* Share — copie dev avec Phosphor */}
          <DevShareModal
            roomCode={MOCK_CODE}
            joinUrl={MOCK_JOIN_URL}
          />
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px 16px 8px',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>

        {/* ── Settings panel (host only) ─────────────────── */}
        <AnimatePresence>
          {isHost && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'rgba(8, 14, 32, 0.92)',
                border: `1px solid rgba(0,229,255,0.12)`,
                borderRadius: '16px',
                padding: '14px 16px',
                boxShadow: '0 2px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                flexShrink: 0,
              }}
            >
              {/* Mode selector — segmented control with sliding pill */}
              <div style={{
                position: 'relative', display: 'flex',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(238,242,255,0.07)',
                padding: '4px', gap: '4px',
                marginBottom: '14px',
              }}>
                {[
                  { val: 'meme_piece', label: 'Présentiel', icon: <House size={14} weight="bold" /> },
                  { val: 'a_distance', label: 'À distance', icon: <Globe size={14} weight="bold" /> },
                ].map(({ val, label, icon }) => {
                  const active = mode === val;
                  return (
                    <motion.button
                      key={val}
                      onClick={() => setMode(val)}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        flex: 1, position: 'relative', zIndex: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '7px', padding: '10px 12px', borderRadius: '9px',
                        border: 'none', background: 'transparent',
                        color: active ? ACCENT : 'rgba(238,242,255,0.4)',
                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Space Grotesk', sans-serif",
                        textShadow: active ? `0 0 12px ${ACCENT}80` : 'none',
                        transition: 'color 0.2s ease, text-shadow 0.2s ease',
                      }}
                    >
                      {active && (
                        <motion.div
                          layoutId="mode-pill"
                          style={{
                            position: 'absolute', inset: 0, borderRadius: '9px',
                            background: 'rgba(0,229,255,0.1)',
                            border: `1px solid rgba(0,229,255,0.3)`,
                            zIndex: -1,
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      {icon}
                      {label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{
                height: '1px',
                background: 'rgba(238,242,255,0.05)',
                marginBottom: '14px',
              }} />

              {/* Timer row — cards avec Bungee + barre animée */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '14px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.8rem', fontWeight: 700, color: '#eef2ff',
                }}>
                  <Clock size={13} weight="bold" color={ACCENT} />
                  Timer
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[3, 5, 7, 10].map(mins => {
                    const active = timerMinutes === mins;
                    return (
                      <motion.button
                        key={mins}
                        onClick={() => setTimerMinutes(mins)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          position: 'relative', width: '44px',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          gap: '1px', padding: '7px 0 8px',
                          borderRadius: '10px',
                          border: active ? `1px solid ${ACCENT}55` : '1px solid rgba(238,242,255,0.08)',
                          background: active ? 'rgba(0,229,255,0.1)' : 'rgba(238,242,255,0.03)',
                          cursor: 'pointer', overflow: 'hidden',
                          fontFamily: "'Space Grotesk', sans-serif",
                          transition: 'border-color 0.15s ease, background 0.15s ease',
                        }}
                      >
                        <span style={{
                          fontFamily: 'Bungee, sans-serif', fontSize: '1rem', lineHeight: 1,
                          color: active ? ACCENT : 'rgba(238,242,255,0.5)',
                          textShadow: active ? `0 0 10px ${ACCENT}88` : 'none',
                          transition: 'color 0.15s ease, text-shadow 0.15s ease',
                        }}>{mins}</span>
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em',
                          color: active ? `${ACCENT}bb` : 'rgba(238,242,255,0.3)',
                          textTransform: 'uppercase',
                          transition: 'color 0.15s ease',
                        }}>min</span>
                        {active && (
                          <motion.div
                            layoutId="timer-bar"
                            style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              height: '2px',
                              background: `linear-gradient(90deg, transparent, ${ACCENT}99, transparent)`,
                              boxShadow: `0 0 4px ${ACCENT}55`,
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{
                height: '1px',
                background: 'rgba(238,242,255,0.05)',
                marginBottom: '14px',
              }} />

              {/* Investigators stepper */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700,
                    color: '#eef2ff', marginBottom: '2px',
                  }}>Enquêteurs</div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'rgba(238,242,255,0.35)',
                  }}>Rôle assigné par l'hôte</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={() => handleSetCount(-1)}
                    disabled={investigatorsCount <= 1}
                    style={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      border: '1px solid rgba(238,242,255,0.1)',
                      background: 'rgba(238,242,255,0.06)',
                      color: investigatorsCount <= 1 ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                      fontSize: '1.1rem',
                      fontWeight: 300,
                      cursor: investigatorsCount <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      lineHeight: 1,
                      paddingBottom: '1px',
                    }}
                  >−</button>

                  <span style={{
                    fontFamily: 'Bungee, sans-serif',
                    fontSize: '1.4rem',
                    color: ACCENT,
                    minWidth: '24px',
                    textAlign: 'center',
                    textShadow: `0 0 16px ${ACCENT}66`,
                  }}>{investigatorsCount}</span>

                  <button
                    onClick={() => handleSetCount(1)}
                    disabled={investigatorsCount >= maxInvestigators}
                    style={{
                      width: 30, height: 30,
                      borderRadius: '50%',
                      border: '1px solid rgba(238,242,255,0.1)',
                      background: 'rgba(238,242,255,0.06)',
                      color: investigatorsCount >= maxInvestigators ? 'rgba(238,242,255,0.2)' : '#eef2ff',
                      fontSize: '1.1rem',
                      fontWeight: 300,
                      cursor: investigatorsCount >= maxInvestigators ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      lineHeight: 1,
                      paddingBottom: '1px',
                    }}
                  >+</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Players section ────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700,
                letterSpacing: '0.13em',
                color: 'rgba(238,242,255,0.35)',
                textTransform: 'uppercase',
              }}>Joueurs</span>
              <div style={{
                padding: '2px 9px',
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.25)',
                borderRadius: '6px',
                fontFamily: 'Bungee, sans-serif',
                fontSize: '0.7rem',
                color: ACCENT,
                letterSpacing: '0.04em',
              }}>{MOCK_PLAYERS.length}</div>
            </div>

            {isHost && (
              <motion.button
                onClick={handleRandomInvestigators}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(238,242,255,0.1)',
                  background: 'rgba(238,242,255,0.04)',
                  color: 'rgba(238,242,255,0.5)',
                  fontSize: '0.72rem', fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s ease',
                }}
              >
                <Shuffle size={12} weight="bold" />
                Aléatoire
              </motion.button>
            )}
          </div>

          {/* Hint callout */}
          <AnimatePresence initial={false}>
            {isHost && !canStart && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                animate={{ opacity: 1, maxHeight: '80px', marginBottom: '12px' }}
                exit={{ opacity: 0, maxHeight: 0, marginBottom: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 12px',
                  background: 'rgba(0,229,255,0.05)',
                  borderLeft: `2px solid rgba(0,229,255,0.45)`,
                  borderRadius: '10px',
                }}>
                  <Info size={14} color={`${ACCENT}bb`} weight="bold" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: '0.78rem',
                    color: `${ACCENT}cc`,
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}>
                    {stillNeedInvestigators
                      ? `Sélectionne ${investigatorsCount - selectedInvestigators.length} enquêteur${investigatorsCount - selectedInvestigators.length > 1 ? 's' : ''} dans la liste`
                      : 'Il faut au moins 2 joueurs pour démarrer'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player view hint */}
          {!isHost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px',
                background: 'rgba(238,242,255,0.04)',
                border: '1px solid rgba(238,242,255,0.07)',
                borderRadius: '10px',
                marginBottom: '12px',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>⏳</span>
              <span style={{
                fontSize: '0.78rem',
                color: 'rgba(238,242,255,0.45)',
                fontWeight: 600,
              }}>
                En attente que l'hôte démarre la partie…
              </span>
            </motion.div>
          )}

          {/* Players list */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <div
              ref={listRef}
              onScroll={checkScroll}
              style={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'visible',
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
              }}
            >
            {MOCK_PLAYERS.map((player, index) => {
              const isSelected = selectedInvestigators.includes(player.uid);
              return (
                <motion.div
                  key={player.uid}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  whileHover={isHost ? { y: -1, scale: 1.005 } : {}}
                  whileTap={isHost ? { scale: 0.99 } : {}}
                  style={{ overflow: 'visible' }}
                >
                  <PlayerBanner
                    player={player}
                    isMe={player.uid === MY_UID}
                    isSelected={isSelected}
                    selectedLabel="Enquêteur"
                    onSelect={isHost ? handleToggleInvestigator : null}
                    accentColor={ACCENT}
                    accentDark={ACCENT_DARK}
                  />
                </motion.div>
              );
            })}
            </div>

            {/* Scroll fade + chevron */}
            <AnimatePresence>
              {canScrollDown && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '56px',
                    background: `linear-gradient(to bottom, transparent, rgba(4,6,15,0.96))`,
                    pointerEvents: 'none',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    paddingBottom: '4px',
                    zIndex: 2,
                  }}
                >
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ color: `${ACCENT}66` }}
                  >
                    <CaretDown size={14} weight="bold" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(238,242,255,0.05)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'rgba(4,6,15,0.8)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Start button */}
        {isHost && (
          <LobbyStartButton
            gameColor={ACCENT}
            icon={startIcon}
            label={startLabel}
            disabled={!canStart}
            onClick={() => {}}
          />
        )}

        {/* Player view: join info */}
        {!isHost && (
          <div style={{
            padding: '14px',
            background: 'rgba(238,242,255,0.03)',
            border: '1px solid rgba(238,242,255,0.07)',
            borderRadius: '14px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(238,242,255,0.35)',
              fontWeight: 600,
            }}>
              Partage le code pour inviter des amis
            </div>
          </div>
        )}
      </div>

      {/* ── Global styles ─────────────────────────────────── */}
      <style jsx global>{`
        /* Scrollbar styling for dev page */
        .dev-laregle-main::-webkit-scrollbar {
          width: 4px;
        }
        .dev-laregle-main::-webkit-scrollbar-track {
          background: transparent;
        }
        .dev-laregle-main::-webkit-scrollbar-thumb {
          background: rgba(0,229,255,0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export default function DevLaRegleLobby() {
  return (
    <Suspense>
      <DevLaRegleLobbyContent />
    </Suspense>
  );
}
