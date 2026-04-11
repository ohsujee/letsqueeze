"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  auth, db, ref, onValue, update,
  onAuthStateChanged,
} from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { GameEndTransition } from "@/components/transitions";
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { useHostDisconnect } from "@/lib/hooks/useHostDisconnect";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useActiveLink } from "@/lib/hooks/useActiveLink";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import LinkOverlay from "@/components/game/LinkOverlay";
import { useToast } from "@/lib/hooks/useToast";
import { useAppShellBg } from "@/lib/hooks/useAppShellBg";
import { Clock, Lightbulb, Target } from 'lucide-react';
import './mindlink-play.css';
import { Sword } from '@phosphor-icons/react';
import WordDisplay from '@/components/game/WordDisplay';
import MindLinkNetwork from '@/components/game/MindLinkNetwork';

const ACCENT = '#ec4899';
const ACCENT_DARK = '#db2777';
const ROOM_PREFIX = 'rooms_mindlink';

function NeuralWaitIcon() {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${ACCENT}20, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '48px', lineHeight: 1,
      }}
    >
      🧠
    </motion.div>
  );
}

export function MindLinkPlayContent({ code, myUid: devUid }) {
  useAppShellBg('#04060f');
  const realRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : realRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);

  // Guess word
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [guessInput, setGuessInput] = useState('');

  const { players } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

  // Link mechanic
  const link = useActiveLink({
    roomCode: code,
    roomPrefix: ROOM_PREFIX,
    myUid,
    state,
    mode: meta?.mode || 'oral',
    players,
  });

  // Auth
  useEffect(() => {
    if (devUid) return; // Skip auth in dev/simulation mode
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
    });
    return () => unsub();
  }, [devUid]);

  // Listen meta & state
  useEffect(() => {
    if (!code) return;
    const metaUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        setMeta(m);
        if (myUid) setIsHost(m.hostUid === myUid);
      }
      if (m?.closed) router.push('/home');
    });
    const stateUnsub = onValue(ref(db, `${ROOM_PREFIX}/${code}/state`), (snap) => {
      const s = snap.val();
      if (s) setState(s);
    });
    return () => { metaUnsub(); stateUnsub(); };
  }, [code, myUid, router]);

  // Redirect on phase change
  useEffect(() => {
    if (!state?.phase || !myUid) return;
    if (state.phase === 'ended' && !endTransitionTriggeredRef.current) {
      endTransitionTriggeredRef.current = true;
      setShowEndTransition(true);
    }
    if (state.phase === 'lobby') {
      router.push(`/mindlink/room/${code}`);
    }
  }, [state?.phase, myUid, code, router]);

  // Timer countdown + auto-end when expired (host writes) — pauses during word guess, interception, or match pending decision
  const guessPending = state?.wordGuess && state.wordGuess.correct === null;
  const interceptActive = state?.activeLink?.defenderIntercept?.confirmed === 'pending' || state?.activeLink?.defenderIntercept?.confirmed === 'typing';
  const matchPendingDecision = state?.activeLink?.result === 'match';
  useEffect(() => {
    if (!state?.timerEndAt || state.phase !== 'playing') return;
    if (guessPending || interceptActive || matchPendingDecision) return;
    const tick = () => {
      const now = Date.now();
      const penalty = (state.penaltySeconds || 0) * 1000;
      const effectiveEnd = state.timerEndAt - penalty;
      const remaining = Math.max(0, Math.floor((effectiveEnd - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && isHost) {
        update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
          phase: 'ended',
          winner: 'defenders',
          winReason: 'timeout',
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.timerEndAt, state?.penaltySeconds, state?.phase, isHost, code, guessPending, interceptActive, matchPendingDecision]);

  // Hooks
  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, enabled: !devUid
  });
  useHostDisconnect({ roomCode: code, roomPrefix: ROOM_PREFIX, hostUid: devUid ? null : meta?.hostUid });
  const { markActive } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: devUid ? null : myUid, isHost, phase: 'playing',
  });
  useInactivityDetection({ roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: devUid ? null : myUid, inactivityTimeout: 30000 });

  // Format timer
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Propose the defended word directly
  const handleGuessWord = useCallback(async () => {
    if (!guessInput.trim()) return;
    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        wordGuess: {
          uid: myUid,
          guess: guessInput.trim().toUpperCase(),
          correct: null,
        }
      });
      setGuessInput('');
      setShowGuessModal(false);
      toast.info('Proposition envoyée au défenseur');
    } catch (err) {
      console.error('Error guessing word:', err);
    }
  }, [guessInput, myUid, code, toast]);

  // ──────────────────── RENDER ────────────────────

  // Loading
  if (!meta || !state) {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#04060f', alignItems: 'center', justifyContent: 'center', gap: '14px',
      }}>
        <div style={{
          width: 30, height: 30,
          border: '2px solid #1e1e30', borderTopColor: ACCENT,
          borderRadius: '50%', animation: 'spin 0.9s linear infinite',
        }} />
        <p style={{ color: '#5a5a72', fontSize: '0.85rem' }}>Chargement...</p>
      </div>
    );
  }

  // ── CHOOSING PHASE (waiting for defenders) ──
  if (state.phase === 'choosing') {
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        background: '#04060f', position: 'relative', overflow: 'hidden',
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
      }}>
        {/* Background */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          <div style={{
            position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
            width: '70%', height: '250px',
            background: 'radial-gradient(ellipse, rgba(236,72,153,0.07) 0%, transparent 70%)',
          }} />
        </div>

        <main style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', gap: '20px',
          position: 'relative', zIndex: 1,
        }}>
          {/* Neural network animated SVG */}
          <NeuralWaitIcon />

          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.1rem', color: '#eef2ff', marginBottom: '10px',
            }}>
              Préparation
            </h2>
            <p style={{
              fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)', lineHeight: 1.5,
            }}>
              Les défenseurs choisissent leur mot secret…
            </p>
          </div>

          {/* Animated nodes forming */}
          <div style={{
            display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {players.filter(p => p.role === 'attacker' || !p.role || p.role === 'attacker').slice(0, 8).map((player, i) => (
              <motion.div
                key={player.uid}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 200 }}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(236,72,153,0.1)',
                  border: '1px solid rgba(236,72,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: ACCENT,
                }}
              >
                {player.name?.slice(0, 2).toUpperCase()}
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── PLAYING PHASE ──
  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>
      {/* Background */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      <AnimatePresence>
        {showEndTransition && (
          <GameEndTransition
            variant="mindlink"
            title={state?.winReason === 'timeout' ? 'Temps écoulé !' : 'Mot trouvé !'}
            subtitle={state?.winReason === 'timeout' ? 'Les défenseurs ont tenu bon !' : 'Les attaquants ont percé le secret !'}
            onComplete={() => router.push(`/mindlink/game/${code}/end`)}
          />
        )}
      </AnimatePresence>

      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />
      <DisconnectAlert
        roomCode={code}
        roomPrefix={ROOM_PREFIX}
        playerUid={myUid}
        onReconnect={markActive}
      />

      {/* Header bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(236,72,153,0.1)',
        position: 'relative', zIndex: 2,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sword size={18} weight="fill" color={ACCENT} />
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, color: ACCENT,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Attaquant
          </span>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '8px',
          background: timeLeft < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(236,72,153,0.1)',
          border: `1px solid ${timeLeft < 60 ? 'rgba(239,68,68,0.3)' : 'rgba(236,72,153,0.2)'}`,
        }}>
          <Clock size={14} color={timeLeft < 60 ? '#ef4444' : ACCENT} />
          <span style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: '0.9rem',
            color: timeLeft < 60 ? '#ef4444' : ACCENT,
            textShadow: timeLeft < 60 ? '0 0 8px rgba(239,68,68,0.5)' : `0 0 8px ${ACCENT}44`,
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        padding: '16px',
        position: 'relative', zIndex: 1,
        overflow: 'hidden',
      }}>

        {/* Word display (revealed letters only) */}
        <div style={{ marginBottom: '8px', flexShrink: 0 }}>
          <WordDisplay
            wordLength={state.wordLength}
            revealedLetters={state.revealedLetters || 1}
            revealedPrefix={state.revealedPrefix || ''}
          />
        </div>

        {/* Neural network — flexible, shrinks to fit */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <MindLinkNetwork
            players={players}
            myUid={myUid}
            activeLink={link.activeLink}
          />
        </div>

        {/* ── Link overlay (all phases handled by LinkOverlay) ── */}
        <AnimatePresence>
          {link.activeLink && (
            <LinkOverlay
              link={link}
              mode={meta?.mode || 'oral'}
              players={players}
              myUid={myUid}
              myRole="attacker"
              revealedPrefix={state?.revealedPrefix || ''}
            />
          )}
        </AnimatePresence>

        {/* Action buttons (when no active link) */}
        {!link.activeLink && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            flexShrink: 0,
          }}>
            {/* Launch clue button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={link.launchClue}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '14px', borderRadius: '16px',
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                border: 'none', color: '#fff',
                fontSize: '0.95rem', fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: `0 4px 24px ${ACCENT}44, 0 0 40px ${ACCENT}22`,
              }}
            >
              <Lightbulb size={20} />
              J'ai un indice !
            </motion.button>

            {/* Guess word button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowGuessModal(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '12px',
                background: 'rgba(238,242,255,0.04)',
                border: '1px solid rgba(238,242,255,0.1)',
                color: 'rgba(238,242,255,0.6)',
                fontSize: '0.8rem', fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                cursor: 'pointer',
              }}
            >
              <Target size={16} />
              J'ai trouvé le mot !
            </motion.button>
          </div>
        )}

        {/* Word guess pending */}
        {state.wordGuess && !state.wordGuess.correct && state.wordGuess.correct !== false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '10px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '12px', marginTop: '8px',
              fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Proposition « {state.wordGuess.guess} » en attente de validation…
          </motion.div>
        )}
      </main>

      {/* Guess word modal */}
      <AnimatePresence>
        {showGuessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setShowGuessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0d0f1a',
                border: '1px solid rgba(236,72,153,0.2)',
                borderRadius: '20px',
                padding: '24px',
                width: '100%', maxWidth: '340px',
              }}
            >
              <h3 style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1rem', color: '#eef2ff', marginBottom: '6px',
              }}>
                Proposer le mot
              </h3>
              <p style={{
                fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)',
                marginBottom: '16px', lineHeight: 1.4,
              }}>
                Attention : si tu te trompes, -30 secondes de pénalité !
              </p>

              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, ''))}
                placeholder="Le mot secret est..."
                autoFocus
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '12px', outline: 'none',
                  color: '#eef2ff', fontSize: '1rem',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  fontWeight: 700, textAlign: 'center', textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '16px',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && guessInput.trim()) handleGuessWord(); }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowGuessModal(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: 'rgba(238,242,255,0.06)',
                    border: '1px solid rgba(238,242,255,0.1)',
                    color: 'rgba(238,242,255,0.6)',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGuessWord}
                  disabled={!guessInput.trim()}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: guessInput.trim() ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : 'rgba(238,242,255,0.06)',
                    border: 'none',
                    color: guessInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                    fontSize: '0.82rem', fontWeight: 700,
                    cursor: guessInput.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Proposer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function MindLinkPlayPage() {
  const { code } = useParams();
  return <MindLinkPlayContent code={code} />;
}
