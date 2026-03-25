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
import { ShieldStar, Eye, EyeSlash, ArrowRight, Clock, Shuffle } from '@phosphor-icons/react';
import WordDisplay from '@/components/game/WordDisplay';
import MindLinkNetwork from '@/components/game/MindLinkNetwork';

const ACCENT = '#ec4899';
const ACCENT_DARK = '#db2777';
const ROOM_PREFIX = 'rooms_mindlink';

export function MindLinkDefendContent({ code, myUid: devUid }) {
  const nextRouter = useRouter();
  const noopRouter = useMemo(() => ({ push: () => {}, replace: () => {}, back: () => {} }), []);
  const router = devUid ? noopRouter : nextRouter;
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [myUid, setMyUid] = useState(devUid || null);
  const [isHost, setIsHost] = useState(false);
  const [showEndTransition, setShowEndTransition] = useState(false);
  const endTransitionTriggeredRef = useRef(false);

  // Choosing phase
  const [wordInput, setWordInput] = useState('');
  const [showWord, setShowWord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wordError, setWordError] = useState('');
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const lastRandomRef = useRef('');
  const [showFoundConfirm, setShowFoundConfirm] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);

  const { players, activePlayers } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });

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
    if (devUid) return;
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

  // Timer countdown — pauses during word guess, interception, or match pending decision
  const guessPending = state?.wordGuess && state.wordGuess.correct === null;
  const interceptActive = state?.activeLink?.defenderIntercept?.confirmed === 'pending' || state?.activeLink?.defenderIntercept?.confirmed === 'typing';
  const matchPendingDecision = state?.activeLink?.result === 'match';
  useEffect(() => {
    if (!state?.timerEndAt || state.phase !== 'playing') return;
    // Pause timer while a word guess, interception, or match decision is pending
    if (guessPending || interceptActive || matchPendingDecision) return;
    const tick = () => {
      const now = Date.now();
      const penalty = (state.penaltySeconds || 0) * 1000;
      const effectiveEnd = state.timerEndAt - penalty;
      const remaining = Math.max(0, Math.floor((effectiveEnd - now) / 1000));
      setTimeLeft(remaining);

      // Timer expired → defenders win
      if (remaining <= 0 && isHost) {
        update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
          winner: 'defenders',
          winReason: 'timeout',
          phase: 'ended',
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

  const isWordChooser = meta?.wordChooserUid === myUid;
  const wordChooserName = players.find(p => p.uid === meta?.wordChooserUid)?.name || 'Un défenseur';

  // Fetch a random word from dictionary
  const fetchRandomWord = useCallback(async () => {
    setIsLoadingRandom(true);
    setWordError('');
    try {
      const exclude = lastRandomRef.current;
      const url = exclude
        ? `/api/dictionary/random?exclude=${encodeURIComponent(exclude)}`
        : '/api/dictionary/random';
      const res = await fetch(url);
      const data = await res.json();
      if (data.word) {
        const w = data.word.toUpperCase();
        setWordInput(w);
        lastRandomRef.current = data.word;
      }
    } catch (err) {
      console.error('Random word error:', err);
      toast.error('Impossible de charger un mot');
    } finally {
      setIsLoadingRandom(false);
    }
  }, [toast]);

  // Submit the secret word (with dictionary validation)
  const handleSubmitWord = useCallback(async () => {
    if (!wordInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setWordError('');

    const word = wordInput.trim().toUpperCase();
    const timerMs = (meta?.timerMinutes || 5) * 60 * 1000;

    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        secretWord: word,
        wordLength: word.length,
        revealedLetters: 1,
        revealedPrefix: word[0], // First letter visible to all
        phase: 'playing',
        timerEndAt: Date.now() + timerMs,
      });
    } catch (err) {
      console.error('Error submitting word:', err);
      toast.error('Erreur lors de la validation du mot');
      setIsSubmitting(false);
    }
  }, [wordInput, isSubmitting, meta?.timerMinutes, code, toast]);

  // Signal that attackers found the word
  const handleTheyFoundMyWord = useCallback(async () => {
    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        winner: 'attackers',
        winReason: 'found_during_link',
        phase: 'ended',
      });
    } catch (err) {
      console.error('Error:', err);
    }
  }, [code]);

  // Respond to attacker's word guess
  const handleGuessResponse = useCallback(async (isCorrect) => {
    if (!state?.wordGuess) return;
    if (isCorrect) {
      // Correct guess → attackers win
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        wordGuess: null,
        winner: 'attackers',
        winReason: 'guessed',
        phase: 'ended',
      });
    } else {
      // Wrong guess → 30s penalty, clear guess
      const currentPenalty = state.penaltySeconds || 0;
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), {
        wordGuess: null,
        penaltySeconds: currentPenalty + 30,
      });
    }
  }, [code, state?.wordGuess, state?.penaltySeconds]);

  // Reveal next letter
  const handleRevealLetter = useCallback(async () => {
    if (!state || !state.secretWord) return;
    const next = (state.revealedLetters || 1) + 1;
    const revealedPrefix = state.secretWord.slice(0, next);

    const updates = { revealedLetters: next, revealedPrefix };

    // All letters revealed → attackers win
    if (next >= state.wordLength) {
      updates.winner = 'attackers';
      updates.winReason = 'all_letters';
      updates.phase = 'ended';
    }

    // Also reset activeLink
    updates.activeLink = null;

    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), updates);
    } catch (err) {
      console.error('Error revealing letter:', err);
    }
  }, [state, code]);

  // Don't reveal letter (dismiss after link match)
  const handleDontReveal = useCallback(async () => {
    try {
      await update(ref(db, `${ROOM_PREFIX}/${code}/state`), { activeLink: null });
    } catch (err) {
      console.error('Error:', err);
    }
  }, [code]);

  // Format timer
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // No longer needed - using WordDisplay component

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
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── CHOOSING PHASE ──
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
            position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
            width: '80%', height: '300px',
            background: 'radial-gradient(ellipse, rgba(236,72,153,0.08) 0%, transparent 70%)',
          }} />
        </div>

        <main style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', gap: '24px',
          position: 'relative', zIndex: 1,
        }}>
          {isWordChooser ? (
            // ── Word chooser input ──
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '6px 16px', borderRadius: '20px',
                  background: 'rgba(236,72,153,0.1)',
                  border: '1px solid rgba(236,72,153,0.25)',
                  marginBottom: '16px',
                }}>
                  <ShieldStar size={16} weight="fill" color={ACCENT} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Défenseur
                  </span>
                </div>
                <h2 style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '1.3rem', color: '#eef2ff', marginBottom: '8px',
                }}>
                  Choisis ton mot
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.45)', lineHeight: 1.4 }}>
                  Les joueurs devront le deviner lettre par lettre
                </p>
              </motion.div>

              {/* Word input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ width: '100%', maxWidth: '320px' }}
              >
                <div style={{
                  position: 'relative',
                  background: 'rgba(8,14,32,0.92)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '14px',
                  padding: '4px',
                }}>
                  <input
                    type="text"
                    className="input-dark"
                    value={wordInput}
                    onChange={(e) => { setWordInput(e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, '')); setWordError(''); }}
                    placeholder="Tape ton mot..."
                    autoFocus
                    maxLength={20}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'transparent',
                      border: 'none', outline: 'none',
                      boxShadow: 'none',
                      color: '#eef2ff',
                      fontSize: '1.1rem',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && wordInput.trim()) handleSubmitWord(); }}
                  />
                </div>

                {/* Random word button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={fetchRandomWord}
                  disabled={isLoadingRandom}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    margin: '10px auto 0',
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'rgba(236,72,153,0.08)',
                    border: '1px solid rgba(236,72,153,0.2)',
                    color: ACCENT,
                    fontSize: '0.78rem', fontWeight: 700,
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    cursor: isLoadingRandom ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Shuffle size={14} weight="bold" style={{
                    animation: isLoadingRandom ? 'spin 0.8s linear infinite' : 'none',
                  }} />
                  {isLoadingRandom ? 'Chargement…' : 'Mot aléatoire'}
                </motion.button>

                {/* Word error */}
                <AnimatePresence>
                  {wordError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        textAlign: 'center', fontSize: '0.75rem',
                        color: '#ef4444', marginTop: '10px', fontWeight: 600,
                      }}
                    >
                      {wordError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Preview */}
                <AnimatePresence>
                  {wordInput.trim() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex', justifyContent: 'center', gap: '6px',
                        marginTop: '16px', flexWrap: 'nowrap',
                      }}
                    >
                      {(() => {
                        const letters = wordInput.trim().toUpperCase().split('');
                        const len = letters.length;
                        const gap = 6;
                        const maxWidth = 320;
                        const maxTile = 36;
                        const tileW = Math.min(maxTile, Math.floor((maxWidth - (len - 1) * gap) / len));
                        const tileH = Math.round(tileW * 1.22);
                        const fs = tileW >= 30 ? '1rem' : tileW >= 22 ? '0.8rem' : '0.65rem';
                        return letters.map((letter, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            style={{
                              width: tileW, height: tileH,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: '8px',
                              background: i === 0 ? 'rgba(236,72,153,0.15)' : 'rgba(238,242,255,0.05)',
                              border: i === 0 ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(238,242,255,0.1)',
                              fontFamily: "var(--font-title, 'Bungee'), cursive",
                              fontSize: fs,
                              color: i === 0 ? ACCENT : 'rgba(238,242,255,0.25)',
                              textShadow: i === 0 ? `0 0 10px ${ACCENT}66` : 'none',
                            }}
                          >
                            {i === 0 ? letter : '_'}
                          </motion.div>
                        ));
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p style={{
                  textAlign: 'center', fontSize: '0.7rem',
                  color: 'rgba(238,242,255,0.3)', marginTop: '12px',
                }}>
                  Les joueurs verront : la 1ère lettre + {wordInput.trim() ? wordInput.trim().length - 1 : '?'} underscores
                </p>
              </motion.div>

              {/* Submit button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleSubmitWord}
                disabled={!wordInput.trim() || isSubmitting}
                whileHover={wordInput.trim() ? { scale: 1.03, y: -2 } : {}}
                whileTap={wordInput.trim() ? { scale: 0.97 } : {}}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '14px 32px', borderRadius: '14px',
                  background: wordInput.trim()
                    ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`
                    : 'rgba(238,242,255,0.06)',
                  border: 'none',
                  color: wordInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                  fontSize: '0.9rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  cursor: wordInput.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: wordInput.trim() ? `0 4px 20px ${ACCENT}44` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting ? (
                  <div style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                ) : (
                  <ArrowRight size={18} weight="bold" />
                )}
                {isSubmitting ? 'Lancement...' : 'Valider'}
              </motion.button>
            </>
          ) : (
            // ── Other defenders waiting ──
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '6px 16px', borderRadius: '20px',
                background: 'rgba(236,72,153,0.1)',
                border: '1px solid rgba(236,72,153,0.25)',
                marginBottom: '20px',
              }}>
                <ShieldStar size={16} weight="fill" color={ACCENT} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Défenseur
                </span>
              </div>

              <h2 style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.2rem', color: '#eef2ff', marginBottom: '12px',
              }}>
                En attente du mot
              </h2>

              <p style={{ fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)', lineHeight: 1.5 }}>
                <strong style={{ color: ACCENT }}>{wordChooserName}</strong> choisit le mot secret…
              </p>

              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  marginTop: '24px',
                  width: 40, height: 40, borderRadius: '50%',
                  background: `radial-gradient(circle, ${ACCENT}33, transparent)`,
                  margin: '24px auto 0',
                }}
              />
            </motion.div>
          )}
        </main>

        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          <ShieldStar size={18} weight="fill" color={ACCENT} />
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, color: ACCENT,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Défenseur
          </span>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px', borderRadius: '8px',
          background: timeLeft < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(236,72,153,0.1)',
          border: `1px solid ${timeLeft < 60 ? 'rgba(239,68,68,0.3)' : 'rgba(236,72,153,0.2)'}`,
        }}>
          <Clock size={14} weight="bold" color={timeLeft < 60 ? '#ef4444' : ACCENT} />
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

        {/* Secret word (full for defenders) */}
        <div style={{ marginBottom: '8px', flexShrink: 0 }}>
          <WordDisplay
            wordLength={state.wordLength}
            revealedLetters={state.revealedLetters || 1}
            fullWord={state.secretWord || ''}
            showAll={true}
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

        {/* ── Link overlay — positioned absolute so it doesn't push the network ── */}
        <AnimatePresence>
          {link.activeLink && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '0 16px 16px',
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              <div style={{ pointerEvents: 'auto' }}>
                <LinkOverlay
                  link={link}
                  mode={meta?.mode || 'oral'}
                  players={players}
                  myUid={myUid}
                  myRole="defender"
                  revealedPrefix={state?.revealedPrefix || ''}
                  opaque
                />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
          flexShrink: 0,
        }}>
          {/* Reveal letter button (after link match) */}
          {link.activeLink?.result === 'match' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRevealLetter}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px', borderRadius: '14px',
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                  border: 'none', color: '#fff',
                  fontSize: '0.82rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  cursor: 'pointer',
                  boxShadow: `0 4px 20px ${ACCENT}44`,
                }}
              >
                <Eye size={16} weight="bold" />
                Révéler la lettre
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDontReveal}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px', borderRadius: '14px',
                  background: 'rgba(238,242,255,0.06)',
                  border: '1px solid rgba(238,242,255,0.1)',
                  color: 'rgba(238,242,255,0.6)',
                  fontSize: '0.82rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  cursor: 'pointer',
                }}
              >
                <EyeSlash size={16} weight="bold" />
                Ne pas révéler
              </motion.button>
            </div>
          )}

          {/* They found my word button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowFoundConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px', borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              fontSize: '0.78rem', fontWeight: 700,
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              cursor: 'pointer',
            }}
          >
            Ils ont trouvé mon mot !
          </motion.button>
        </div>
      </main>

      {/* Word guess modal — attacker proposed a word */}
      <AnimatePresence>
        {guessPending && (() => {
          const guesserName = players.find(p => p.uid === state.wordGuess.uid)?.name || '???';
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(8,14,32,0.98)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: '20px',
                  padding: '24px',
                  width: '100%', maxWidth: '320px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
                }}>
                  Proposition de mot
                </div>

                <div style={{
                  fontSize: '0.85rem', color: '#eef2ff', marginBottom: '8px', lineHeight: 1.5,
                }}>
                  <strong style={{ color: ACCENT }}>{guesserName}</strong> pense que le mot secret est :
                </div>

                <div style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '1.4rem', color: '#f59e0b',
                  textShadow: '0 0 15px rgba(245,158,11,0.4)',
                  marginBottom: '16px', letterSpacing: '0.08em',
                }}>
                  « {state.wordGuess.guess} »
                </div>

                <div style={{
                  fontSize: '0.75rem', color: 'rgba(238,242,255,0.4)',
                  marginBottom: '16px',
                }}>
                  Le timer est en pause pendant cette proposition
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGuessResponse(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'rgba(34,197,94,0.15)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#22c55e', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Non, raté ! (-30s)
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGuessResponse(true)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    }}
                  >
                    Oui, c'est ça...
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Confirmation modal — "Ils ont trouvé mon mot" */}
      <AnimatePresence>
        {showFoundConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFoundConfirm(false)}
            style={{
              position: 'absolute', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(8,14,32,0.98)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '20px',
                padding: '24px',
                width: '100%', maxWidth: '320px',
                textAlign: 'center',
              }}
            >
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: '#ef4444',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
              }}>
                Confirmation
              </div>

              <div style={{
                fontSize: '0.88rem', color: '#eef2ff', marginBottom: '20px', lineHeight: 1.5,
              }}>
                Es-tu sûr ? Cette action <strong style={{ color: '#ef4444' }}>met fin à la manche</strong> et donne la victoire aux attaquants.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFoundConfirm(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#eef2ff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowFoundConfirm(false);
                    handleTheyFoundMyWord();
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  Oui, confirmer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MindLinkDefendPage() {
  const { code } = useParams();
  return <MindLinkDefendContent code={code} />;
}
