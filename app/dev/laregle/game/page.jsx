'use client';

/**
 * DevLaRegleGame — Copie dev des pages investigate + play
 * - Pas de Firebase, pas d'auth
 * - Mock data + switchers de vue (enqueteur/civil) et de phase (choosing/playing/guessing)
 * - Icônes Phosphor au lieu de Lucide
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, MagnifyingGlass,
  ThumbsUp, ThumbsDown, Pause, Play, Warning,
} from '@phosphor-icons/react';
import PlayerBanner from '@/components/game/PlayerBanner';

/* ─── Mock data ──────────────────────────────────────────── */
const ACCENT      = '#00e5ff';
const ACCENT_DIM  = 'rgba(0,229,255,0.15)';
const MOCK_CODE   = 'R3GL7';

const MOCK_RULE = {
  id: 'rule1',
  text: 'Toujours terminer ses réponses par une question',
  category: 'Langage',
  difficulty: 2,
};

const MOCK_RULE_OPTIONS = [
  { id: 'rule1', text: 'Toujours terminer ses réponses par une question', category: 'Langage', difficulty: 2 },
  { id: 'rule2', text: 'Parler de soi à la troisième personne', category: 'Comportement', difficulty: 3 },
  { id: 'rule3', text: 'Dire "absolument" avant chaque réponse', category: 'Langage', difficulty: 1 },
];

const MOCK_PLAYERS = [
  { uid: 'uid1', name: 'OhSujee', role: 'investigator' },
  { uid: 'uid2', name: 'Nirojan', role: 'player' },
  { uid: 'uid3', name: 'Thomas',  role: 'player' },
  { uid: 'uid4', name: 'Léa M.', role: 'player' },
];

const investigators = MOCK_PLAYERS.filter(p => p.role === 'investigator');
const civilians     = MOCK_PLAYERS.filter(p => p.role === 'player');

const PHASES = ['choosing', 'revealing', 'playing', 'guessing'];

/* ─── Helpers ────────────────────────────────────────────── */
function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function getPlayerColor(uid) {
  const colors = ['#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];
  const i = parseInt(uid?.replace(/\D/g, '') || '0') % colors.length;
  return colors[i];
}

/* ─── Main ────────────────────────────────────────────────── */
function DevLaRegleGameContent() {
  const searchParams = useSearchParams();
  const [view, setView]   = useState(searchParams.get('view') || 'enqueteur');
  const [phase, setPhase] = useState('playing');

  // Timer
  const [timeLeft,    setTimeLeft]    = useState(4 * 60);
  const [timerPaused, setTimerPaused] = useState(false);

  // Enquêteur state
  const [guessAttempts, setGuessAttempts] = useState(0);

  // Civil state — choosing phase
  const [selectedRule, setSelectedRule] = useState(null);
  const [hasVoted, setHasVoted]         = useState(false);

  // Civil state — guessing phase
  const [guessVote, setGuessVote] = useState(null); // true | false | null

  // Guess modal enquêteur + votes simulés
  const [showGuessModal, setShowGuessModal] = useState(false);
  const [mockVotes, setMockVotes] = useState({ uid2: 'correct' });
  const [enqueteurModalPhase, setEnqueteurModalPhase] = useState('voting'); // 'voting' | 'result'

  // Guess modal civil (vote Oui/Non)
  const [showCivilGuessModal, setShowCivilGuessModal] = useState(false);
  const [civilVotedCount, setCivilVotedCount] = useState(1); // "moi" = 1 après vote
  const [civilModalPhase, setCivilModalPhase] = useState('voting'); // 'voting' | 'result'
  const [civilRoundOutcome, setCivilRoundOutcome] = useState('found'); // 'found' | 'not_found'
  const toggleMockVote = (uid) =>
    setMockVotes(prev => {
      if (!prev[uid]) return { ...prev, [uid]: 'correct' };
      if (prev[uid] === 'correct') return { ...prev, [uid]: 'wrong' };
      const { [uid]: _, ...rest } = prev;
      return rest;
    });

  // Shared elimination state (simulates Firebase in prod)
  const [eliminated, setEliminated] = useState([]);
  const [flashUid, setFlashUid] = useState(null);
  const [eliminationNotif, setEliminationNotif] = useState(null);
  const notifTimerRef = useRef(null);

  const handleEliminate = (uid) => {
    if (eliminated.includes(uid)) {
      setEliminated(prev => prev.filter(id => id !== uid));
    } else {
      setFlashUid(uid);
      setTimeout(() => setFlashUid(null), 500);
      setEliminated(prev => [...prev, uid]);
      const player = civilians.find(p => p.uid === uid);
      if (player) {
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        setEliminationNotif(player);
        notifTimerRef.current = setTimeout(() => setEliminationNotif(null), 2500);
      }
    }
  };

  const handleContestElimination = (uid) => {
    setEliminated(prev => prev.filter(id => id !== uid));
  };

  // Reset contextual states when phase/view changes
  useEffect(() => {
    setSelectedRule(null);
    setHasVoted(false);
    setGuessVote(null);
    setMockVotes({ uid2: 'correct' });
    if (phase === 'playing') setTimeLeft(4 * 60);
    setShowGuessModal(phase === 'guessing' && view === 'enqueteur');
    setShowCivilGuessModal(phase === 'guessing' && view === 'civil');
    setCivilVotedCount(1);
    setCivilModalPhase('voting');
    setCivilRoundOutcome('found');
    setEnqueteurModalPhase('voting');
  }, [phase, view]);

  // Transition vers résultat enquêteur quand tous les civils ont voté
  useEffect(() => {
    if (Object.keys(mockVotes).length < civilians.length || enqueteurModalPhase === 'result') return;
    const t = setTimeout(() => setEnqueteurModalPhase('result'), 800);
    return () => clearTimeout(t);
  }, [mockVotes, enqueteurModalPhase]);

  // Transition vers résultat quand tous les civils ont voté
  useEffect(() => {
    if (!guessVote || civilVotedCount < civilians.length || civilModalPhase === 'result') return;
    const t = setTimeout(() => setCivilModalPhase('result'), 800);
    return () => clearTimeout(t);
  }, [civilVotedCount, guessVote, civilModalPhase]);

  // Timer tick
  useEffect(() => {
    if (phase !== 'playing' || timerPaused) return;
    const interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [phase, timerPaused]);

  const isEnqueteur = view === 'enqueteur';

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#04060f', position: 'relative' }}>

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}12 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 90%, ${ACCENT}07 0%, transparent 45%)`,
      }} />

      {/* ── Dev Controls Bar ── */}
      <div style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.6)',
        borderBottom: '1px solid rgba(255,200,0,0.2)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,200,0,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
          DEV
        </span>

        {/* View switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }}>
          {[{ key: 'enqueteur', label: '🔍 Enquêteur' }, { key: 'civil', label: '👤 Civil' }].map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: view === v.key ? ACCENT : 'transparent',
                color: view === v.key ? '#04060f' : 'rgba(238,242,255,0.5)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Phase switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }}>
          {PHASES.map(p => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: phase === p ? 'rgba(255,200,0,0.25)' : 'transparent',
                color: phase === p ? '#fcd34d' : 'rgba(238,242,255,0.5)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Space Grotesk', sans-serif",
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Game Header ── */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(4,6,15,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${ACCENT}22`,
        flexShrink: 0,
      }}>
        {/* Left : exit + rôle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={{
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(238,242,255,0.05)',
            border: '1px solid rgba(238,242,255,0.08)',
            borderRadius: '10px',
            color: 'rgba(238,242,255,0.5)',
            cursor: 'pointer',
          }}>
            <ArrowLeft size={16} weight="bold" />
          </button>

          <span style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            color: '#eef2ff',
            textShadow: isEnqueteur
              ? `0 0 14px ${ACCENT}99`
              : '0 0 14px rgba(192,132,252,0.8)',
          }}>
            {isEnqueteur ? '🔍 Enquêteur' : '👤 Civil'}
          </span>
        </div>

        {/* Right : timer (tous les rôles en playing) */}
        <AnimatePresence>
          {(phase === 'playing' || phase === 'guessing') && (
            isEnqueteur ? (
              /* Enquêteur : timer interactif avec pause/play */
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setTimerPaused(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px',
                  background: timerPaused
                    ? 'rgba(251,191,36,0.12)'
                    : timeLeft <= 30
                      ? 'rgba(239,68,68,0.12)'
                      : `${ACCENT}12`,
                  border: `1px solid ${timerPaused ? 'rgba(251,191,36,0.35)' : timeLeft <= 30 ? 'rgba(239,68,68,0.35)' : ACCENT + '35'}`,
                  borderRadius: '10px',
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: '1.1rem',
                  color: timerPaused ? '#fbbf24' : timeLeft <= 30 ? '#f87171' : ACCENT,
                  cursor: 'pointer',
                }}
              >
                <Clock size={16} />
                <span>{formatTime(timeLeft)}</span>
                <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                  {timerPaused ? <Play size={12} /> : <Pause size={12} />}
                </span>
              </motion.button>
            ) : (
              /* Civil : timer lecture seule */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px',
                  background: timerPaused
                    ? 'rgba(251,191,36,0.08)'
                    : timeLeft <= 30
                      ? 'rgba(239,68,68,0.1)'
                      : `${ACCENT}0a`,
                  border: `1px solid ${timerPaused ? 'rgba(251,191,36,0.2)' : timeLeft <= 30 ? 'rgba(239,68,68,0.25)' : ACCENT + '25'}`,
                  borderRadius: '10px',
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: '1.1rem',
                  color: timerPaused ? 'rgba(251,191,36,0.6)' : timeLeft <= 30 ? '#f87171' : `${ACCENT}cc`,
                  opacity: timerPaused ? 0.6 : 1,
                }}
              >
                <Clock size={16} />
                <span>{formatTime(timeLeft)}</span>
                {timerPaused && (
                  <span style={{ fontSize: '0.6rem', color: 'rgba(251,191,36,0.6)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '0.06em' }}>
                    PAUSE
                  </span>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </header>

      {/* ── Main content ── */}
      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: `16px 16px ${isEnqueteur && phase === 'playing' ? '96px' : '16px'}`,
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <AnimatePresence mode="wait">
            {isEnqueteur
              ? <EnqueteurView key={`enq-${phase}`} phase={phase} guessAttempts={guessAttempts} civilians={civilians} eliminated={eliminated} flashUid={flashUid} eliminationNotif={eliminationNotif} onEliminate={handleEliminate} />
              : <CivilView key={`civ-${phase}`} phase={phase} selectedRule={selectedRule} setSelectedRule={setSelectedRule} hasVoted={hasVoted} setHasVoted={setHasVoted} eliminated={eliminated} flashUid={flashUid} eliminationNotif={eliminationNotif} onEliminate={handleEliminate} onContest={handleContestElimination} />
            }
          </AnimatePresence>
        </div>
      </main>

      {/* ── Bouton "Proposer une règle" — fixe en bas ── */}
      <AnimatePresence>
        {isEnqueteur && phase === 'playing' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 15,
              padding: '12px 16px 24px',
              background: 'linear-gradient(to top, rgba(4,6,15,1) 50%, rgba(4,6,15,0) 100%)',
            }}
          >
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {guessAttempts < 3 && (
                <p style={{
                  fontSize: '0.75rem', color: 'rgba(238,242,255,0.4)',
                  margin: 0, textAlign: 'center',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  Dis ta réponse à voix haute — les joueurs voteront
                </p>
              )}
              <motion.button
                whileHover={{ scale: guessAttempts < 3 ? 1.015 : 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={guessAttempts >= 3}
                onClick={() => { setGuessAttempts(a => Math.min(3, a + 1)); setShowGuessModal(true); }}
                style={{
                  width: '100%',
                  padding: '17px 24px',
                  border: 'none',
                  borderRadius: '14px',
                  background: guessAttempts >= 3
                    ? 'rgba(238,242,255,0.06)'
                    : 'linear-gradient(135deg, #c084fc, #a855f7)',
                  color: guessAttempts >= 3 ? 'rgba(238,242,255,0.25)' : '#0a0a0f',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: guessAttempts >= 3 ? 'not-allowed' : 'pointer',
                  boxShadow: guessAttempts >= 3 ? 'none' : '0 4px 24px rgba(168,85,247,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                {guessAttempts >= 3 ? "Plus d'essais" : "J'ai deviné la règle !"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guess Modal ── */}
      <AnimatePresence>
        {isEnqueteur && showGuessModal && (
          <>
            <motion.div
              key="guess-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowGuessModal(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(4,6,15,0.82)',
                backdropFilter: 'blur(5px)',
              }}
            />
            <motion.div
              key="guess-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                background: '#0c1228',
                borderTop: `1px solid ${ACCENT}25`,
                borderRadius: '20px 20px 0 0',
                paddingBottom: '32px',
                maxHeight: '75vh',
                overflowY: 'auto',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>

              <AnimatePresence mode="wait">
              {enqueteurModalPhase === 'voting' && (
              <motion.div key="enq-voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
              <div style={{ padding: '0 16px 4px' }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{
                    margin: 0,
                    fontFamily: 'Bungee, sans-serif',
                    fontSize: '0.95rem',
                    color: '#eef2ff',
                    letterSpacing: '0.04em',
                    textShadow: `0 0 16px ${ACCENT}55`,
                  }}>
                    Les joueurs votent
                  </p>
                  <button
                    onClick={() => setShowGuessModal(false)}
                    style={{
                      width: '30px', height: '30px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(238,242,255,0.05)',
                      border: '1px solid rgba(238,242,255,0.08)',
                      borderRadius: '8px',
                      color: 'rgba(238,242,255,0.4)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Votes card */}
                <div style={{
                  background: 'rgba(8,14,32,0.92)',
                  border: '1px solid rgba(0,229,255,0.1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: 'rgba(238,242,255,0.3)',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}>
                        Votes
                      </span>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, animation: 'devPulse 1.5s ease-in-out infinite' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.28)', fontFamily: "'Space Grotesk', sans-serif" }}>
                        {3 - guessAttempts} essai{3 - guessAttempts !== 1 ? 's' : ''} restant{3 - guessAttempts !== 1 ? 's' : ''}
                      </span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {[0, 1, 2].map(i => (
                          <div key={i} style={{
                            width: '9px', height: '9px',
                            borderRadius: '50%',
                            background: i < guessAttempts ? 'rgba(239,68,68,0.2)' : ACCENT,
                            border: i < guessAttempts ? '1px solid rgba(239,68,68,0.4)' : 'none',
                            boxShadow: i < guessAttempts ? 'none' : `0 0 6px ${ACCENT}80`,
                            transition: 'all 0.3s ease',
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Per-player rows — ⚠️ DEV ONLY: cliquer pour cycler le vote */}
                  <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {civilians.map(player => {
                      const vote = mockVotes[player.uid];
                      return (
                        <div
                          key={player.uid}
                          style={{ display: 'grid', cursor: 'pointer' }}
                          onClick={() => toggleMockVote(player.uid)}
                          title="DEV: cliquer pour simuler un vote"
                        >
                          <div style={{ gridArea: '1/1', opacity: vote ? 0.72 : 1, transition: 'opacity 0.25s ease' }}>
                            <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                          </div>
                          <div style={{
                            gridArea: '1/1', zIndex: 2, pointerEvents: 'none',
                            paddingTop: '10px', paddingRight: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                          }}>
                            <AnimatePresence mode="wait">
                              {vote ? (
                                <motion.div
                                  key={vote}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.18 }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 10px',
                                    background: vote === 'correct' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                    border: `1px solid ${vote === 'correct' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                                    borderRadius: '8px',
                                  }}
                                >
                                  {vote === 'correct'
                                    ? <ThumbsUp size={12} weight="fill" style={{ color: '#4ade80' }} />
                                    : <ThumbsDown size={12} weight="fill" style={{ color: '#f87171' }} />
                                  }
                                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: vote === 'correct' ? '#4ade80' : '#f87171', fontFamily: "'Space Grotesk', sans-serif" }}>
                                    {vote === 'correct' ? 'Oui' : 'Non'}
                                  </span>
                                </motion.div>
                              ) : (
                                <motion.span
                                  key="pending"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  style={{ color: 'rgba(238,242,255,0.2)', fontSize: '1.1rem', letterSpacing: '-1px', lineHeight: 1 }}
                                >
                                  ···
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              </motion.div>
              )}

              {/* ── Phase RESULT enquêteur ── */}
              {enqueteurModalPhase === 'result' && (() => {
                const votes = Object.values(mockVotes);
                const correctCount = votes.filter(v => v === 'correct').length;
                const outcome = correctCount > votes.length / 2 ? 'found' : 'not_found';
                return (
                  <motion.div
                    key="enq-result"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    style={{ padding: '0 16px 8px' }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                      style={{
                        borderRadius: '20px', overflow: 'hidden',
                        background: outcome === 'found' ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                        border: `1px solid ${outcome === 'found' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.22)'}`,
                        boxShadow: outcome === 'found'
                          ? '0 0 40px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)'
                          : '0 0 40px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ padding: '28px 20px 22px', textAlign: 'center' }}>
                        <motion.div
                          initial={{ scale: 0, rotate: outcome === 'found' ? -20 : 10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.05 }}
                          style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.75, 0.4] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                              position: 'absolute', inset: -16, borderRadius: '50%',
                              background: outcome === 'found'
                                ? 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)',
                              filter: 'blur(10px)',
                            }}
                          />
                          <span style={{ fontSize: '3rem', lineHeight: 1, display: 'block', position: 'relative' }}>
                            {outcome === 'found' ? '🎉' : '😤'}
                          </span>
                        </motion.div>

                        <motion.h2
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                          style={{
                            fontFamily: 'Bungee, sans-serif',
                            fontSize: '1.3rem', letterSpacing: '0.04em', margin: '0 0 8px',
                            color: outcome === 'found' ? '#4ade80' : '#f87171',
                            textShadow: outcome === 'found'
                              ? '0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.2)'
                              : '0 0 24px rgba(239,68,68,0.55), 0 0 48px rgba(239,68,68,0.2)',
                          }}
                        >
                          {outcome === 'found' ? 'Bonne réponse !' : 'Pas la bonne règle'}
                        </motion.h2>

                        <motion.p
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                          style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}
                        >
                          {outcome === 'found'
                            ? `${correctCount}/${votes.length} joueurs confirment — vous avez trouvé la règle !`
                            : `${correctCount}/${votes.length} joueurs ont dit oui — ${3 - guessAttempts - 1 > 0 ? `${3 - guessAttempts - 1} essai${3 - guessAttempts - 1 > 1 ? 's' : ''} restant${3 - guessAttempts - 1 > 1 ? 's' : ''}` : "plus d'essais"}`
                          }
                        </motion.p>
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      {outcome === 'found' ? (
                        <a href="/dev/laregle/end" target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'block', width: '100%', padding: '16px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.12))',
                            border: '1px solid rgba(34,197,94,0.35)',
                            borderRadius: '14px', textAlign: 'center',
                            fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.9rem', fontWeight: 700,
                            color: '#4ade80', textDecoration: 'none', letterSpacing: '0.04em',
                            boxShadow: '0 4px 16px rgba(34,197,94,0.12)',
                          }}
                        >
                          Voir les résultats →
                        </a>
                      ) : (
                        <motion.button whileTap={{ scale: 0.97 }}
                          onClick={() => { setShowGuessModal(false); setEnqueteurModalPhase('voting'); setMockVotes({}); }}
                          style={{
                            width: '100%', padding: '16px',
                            background: 'rgba(238,242,255,0.06)', border: '1px solid rgba(238,242,255,0.1)',
                            borderRadius: '14px', fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '0.9rem', fontWeight: 700, color: 'rgba(238,242,255,0.7)',
                            cursor: 'pointer', letterSpacing: '0.04em',
                          }}
                        >
                          Continuer la partie
                        </motion.button>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })()}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Civil Guess Modal ── */}
      <AnimatePresence>
        {!isEnqueteur && showCivilGuessModal && (
          <>
            <motion.div
              key="civil-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(4,6,15,0.82)',
                backdropFilter: 'blur(5px)',
              }}
            />
            <motion.div
              key="civil-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
                background: '#0c1228',
                borderTop: `1px solid ${ACCENT}25`,
                borderRadius: '20px 20px 0 0',
                paddingBottom: '32px',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>

              <AnimatePresence mode="wait">

                {/* ── Phase VOTING ── */}
                {civilModalPhase === 'voting' && (
                  <motion.div
                    key="voting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{ padding: '0 16px' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🎤</span>
                      <div>
                        <p style={{ margin: '0 0 2px', fontFamily: 'Bungee, sans-serif', fontSize: '0.95rem', color: '#eef2ff', letterSpacing: '0.04em' }}>
                          L'enquêteur propose
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.78rem', fontFamily: "'Space Grotesk', sans-serif" }}>
                          Est-ce que c'est la bonne règle ?
                        </p>
                      </div>
                    </div>

                    {/* Rappel de la vraie règle */}
                    <div style={{
                      padding: '12px 14px',
                      background: `${ACCENT}0a`,
                      border: `1px solid ${ACCENT}20`,
                      borderRadius: '12px',
                      marginBottom: '16px',
                    }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px', fontFamily: "'Space Grotesk', sans-serif" }}>
                        La vraie règle
                      </p>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}>
                        {MOCK_RULE.text}
                      </p>
                    </div>

                    {/* Vote buttons / confirmation */}
                    <AnimatePresence mode="wait">
                      {!guessVote ? (
                        <motion.div
                          key="vote-buttons"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ display: 'flex', gap: '10px' }}
                        >
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                            onClick={() => setGuessVote('correct')}
                            style={{ flex: 1, padding: '16px', background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', cursor: 'pointer' }}
                          >
                            <ThumbsUp size={20} weight="fill" style={{ color: '#4ade80', flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#4ade80' }}>Oui !</span>
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                            onClick={() => setGuessVote('wrong')}
                            style={{ flex: 1, padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', cursor: 'pointer' }}
                          >
                            <ThumbsDown size={20} weight="fill" style={{ color: '#f87171', flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>Non !</span>
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="vote-sent"
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                          style={{
                            borderRadius: '18px', overflow: 'hidden',
                            background: guessVote === 'correct' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                            border: `1px solid ${guessVote === 'correct' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            boxShadow: guessVote === 'correct' ? '0 0 32px rgba(34,197,94,0.1), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 0 32px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
                          }}
                        >
                          <div style={{ padding: '24px 20px 20px', textAlign: 'center' }}>
                            <motion.div
                              initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 16 }}
                              style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}
                            >
                              <motion.div
                                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: guessVote === 'correct' ? 'radial-gradient(circle, rgba(34,197,94,0.55) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)', filter: 'blur(8px)' }}
                              />
                              <span style={{ fontSize: '2.6rem', lineHeight: 1, display: 'block', position: 'relative' }}>
                                {guessVote === 'correct' ? '✅' : '❌'}
                              </span>
                            </motion.div>
                            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '1.5rem', letterSpacing: '0.05em', margin: '0 0 6px', color: guessVote === 'correct' ? '#4ade80' : '#f87171', textShadow: guessVote === 'correct' ? '0 0 20px rgba(34,197,94,0.6), 0 0 40px rgba(34,197,94,0.25)' : '0 0 20px rgba(239,68,68,0.55), 0 0 40px rgba(239,68,68,0.2)' }}
                            >
                              {guessVote === 'correct' ? 'OUI !' : 'NON !'}
                            </motion.p>
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
                              style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(238,242,255,0.45)', fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                              {guessVote === 'correct' ? "Tu penses que c'est la bonne règle" : "Tu penses que ce n'est pas la bonne règle"}
                            </motion.p>
                          </div>
                          <div style={{ height: '1px', background: guessVote === 'correct' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', margin: '0 16px' }} />
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {[0, 1, 2].map(i => (
                                  <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: ACCENT, animation: 'devPulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.22}s` }} />
                                ))}
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)', fontFamily: "'Space Grotesk', sans-serif" }}>
                                En attente —{' '}
                                <span style={{ color: ACCENT, fontWeight: 700 }}>{civilVotedCount}/{civilians.length}</span>
                                {' '}ont voté
                              </span>
                            </div>
                            {civilVotedCount < civilians.length && (
                              <button onClick={() => setCivilVotedCount(c => c + 1)}
                                style={{ padding: '3px 8px', background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.25)', borderRadius: '6px', color: 'rgba(255,200,0,0.7)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
                              >
                                +1
                              </button>
                            )}
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ── Phase RESULT ── */}
                {civilModalPhase === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    style={{ padding: '0 16px 8px' }}
                  >
                    {/* ⚠️ DEV ONLY — toggle outcome */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', marginBottom: '14px' }}>
                      {[{ key: 'found', label: '🔍 Trouvé' }, { key: 'not_found', label: '🎭 Pas trouvé' }].map(v => (
                        <button key={v.key} onClick={() => setCivilRoundOutcome(v.key)}
                          style={{ flex: 1, padding: '4px 10px', borderRadius: '6px', border: 'none', background: civilRoundOutcome === v.key ? 'rgba(255,200,0,0.25)' : 'transparent', color: civilRoundOutcome === v.key ? '#fcd34d' : 'rgba(238,242,255,0.4)', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    {/* Carte résultat */}
                    <motion.div
                      key={civilRoundOutcome}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                      style={{
                        borderRadius: '20px', overflow: 'hidden',
                        background: civilRoundOutcome === 'found' ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                        border: `1px solid ${civilRoundOutcome === 'found' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.22)'}`,
                        boxShadow: civilRoundOutcome === 'found' ? '0 0 40px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 0 40px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ padding: '28px 20px 22px', textAlign: 'center' }}>
                        {/* Icône avec glow */}
                        <motion.div
                          initial={{ scale: 0, rotate: civilRoundOutcome === 'found' ? -20 : 10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.05 }}
                          style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.75, 0.4] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                              position: 'absolute', inset: -16, borderRadius: '50%',
                              background: civilRoundOutcome === 'found'
                                ? 'radial-gradient(circle, rgba(34,197,94,0.5) 0%, transparent 70%)'
                                : 'radial-gradient(circle, rgba(239,68,68,0.45) 0%, transparent 70%)',
                              filter: 'blur(10px)',
                            }}
                          />
                          <span style={{ fontSize: '3rem', lineHeight: 1, display: 'block', position: 'relative' }}>
                            {civilRoundOutcome === 'found' ? '🔍' : '🎭'}
                          </span>
                        </motion.div>

                        <motion.h2
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                          style={{
                            fontFamily: 'Bungee, sans-serif',
                            fontSize: '1.3rem', letterSpacing: '0.04em', margin: '0 0 8px',
                            color: civilRoundOutcome === 'found' ? '#f87171' : '#4ade80',
                            textShadow: civilRoundOutcome === 'found'
                              ? '0 0 24px rgba(239,68,68,0.55), 0 0 48px rgba(239,68,68,0.2)'
                              : '0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.2)',
                          }}
                        >
                          {civilRoundOutcome === 'found' ? 'Règle trouvée !' : 'Pas trouvé !'}
                        </motion.h2>

                        <motion.p
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                          style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.5 }}
                        >
                          {civilRoundOutcome === 'found'
                            ? 'Les enquêteurs ont deviné votre règle secrète'
                            : `Les enquêteurs n'ont pas trouvé — ${3 - guessAttempts - 1 > 0 ? `${3 - guessAttempts - 1} essai${3 - guessAttempts - 1 > 1 ? 's' : ''} restant${3 - guessAttempts - 1 > 1 ? 's' : ''}` : 'plus d\'essais'}`
                          }
                        </motion.p>
                      </div>
                    </motion.div>

                    {/* Bouton CTA */}
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      {civilRoundOutcome === 'found' ? (
                        <a
                          href="/dev/laregle/end"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block', width: '100%', padding: '16px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.12))',
                            border: '1px solid rgba(34,197,94,0.35)',
                            borderRadius: '14px',
                            textAlign: 'center',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '0.9rem', fontWeight: 700,
                            color: '#4ade80',
                            textDecoration: 'none',
                            letterSpacing: '0.04em',
                            boxShadow: '0 4px 16px rgba(34,197,94,0.12)',
                          }}
                        >
                          Voir les résultats →
                        </a>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setShowCivilGuessModal(false);
                            setCivilModalPhase('voting');
                            setGuessVote(null);
                            setCivilVotedCount(1);
                          }}
                          style={{
                            width: '100%', padding: '16px',
                            background: 'rgba(238,242,255,0.06)',
                            border: '1px solid rgba(238,242,255,0.1)',
                            borderRadius: '14px',
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: '0.9rem', fontWeight: 700,
                            color: 'rgba(238,242,255,0.7)',
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Continuer la partie
                        </motion.button>
                      )}
                    </motion.div>
                  </motion.div>
                )}

              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   VUE ENQUÊTEUR
══════════════════════════════════════════════════════════ */
function EnqueteurView({ phase, guessAttempts, civilians, eliminated, flashUid, eliminationNotif, onEliminate }) {
  return (
    <>
    {/* Elimination notification modal */}
    <AnimatePresence>
      {eliminationNotif && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(8, 8, 12, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
              background: 'linear-gradient(180deg, rgba(45, 20, 20, 0.98) 0%, rgba(28, 12, 12, 0.98) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '24px',
              padding: '32px 24px 24px',
              textAlign: 'center',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                width: '72px', height: '72px',
                margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                border: '2px solid rgba(239,68,68,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 0 20px rgba(239,68,68,0.1)',
              }}
            >
              <Warning size={36} weight="bold" color="#f87171" />
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                Joueur éliminé
              </span>
              <div style={{ width: '100%' }}>
                <PlayerBanner player={eliminationNotif} accentColor="#ef4444" accentDark="#dc2626" />
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                N'a pas suivi la règle
              </span>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.5, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '4px',
                background: '#ef4444',
                transformOrigin: 'left center',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* CHOOSING — Salle d'attente */}
      {phase === 'choosing' && (
        <>
          {/* Instruction strip — identique au playing */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 14px',
            background: `${ACCENT}07`,
            borderLeft: `2px solid ${ACCENT}45`,
            borderRadius: '10px',
          }}>
            <MagnifyingGlass size={14} weight="bold" style={{ color: ACCENT, flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              Pose des questions, observe les comportements, devine la règle.
            </span>
          </div>

          {/* Waiting card — même style que la carte Suspects */}
          <div style={{
            background: 'rgba(8,14,32,0.92)',
            border: '1px solid rgba(0,229,255,0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Prépare-toi
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.25)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Les joueurs choisissent...
                </span>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT, animation: 'devPulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>

            {/* Waiting status */}
            <div style={{
              margin: '10px 12px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '10px 14px',
              background: `${ACCENT}08`,
              border: `1px solid ${ACCENT}20`,
              borderRadius: '10px',
            }}>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: ACCENT,
                    animation: 'devPulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.22}s`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', fontFamily: "'Space Grotesk', sans-serif" }}>
                Les joueurs choisissent une règle secrète
              </span>
            </div>

            {/* Tips */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '💬', text: 'Pose des questions ouvertes aux joueurs' },
                { icon: '👁️', text: 'Observe leurs réponses et comportements' },
                { icon: '🎯', text: 'Tu auras 3 essais pour deviner la règle' },
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, lineHeight: 1 }}>{tip.icon}</span>
                  <span style={{ fontSize: '0.83rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>{tip.text}</span>
                </div>
              ))}

              {investigators.length > 1 && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(238,242,255,0.3)', fontFamily: "'Space Grotesk', sans-serif" }}>
                    Co-enquêteur{investigators.length > 2 ? 's' : ''} :
                  </span>
                  {investigators.slice(1).map(p => (
                    <span key={p.uid} style={{ padding: '3px 10px', background: `${ACCENT}15`, borderRadius: '6px', fontSize: '0.72rem', color: ACCENT, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* REVEALING — La règle a été choisie, c'est parti */}
      {phase === 'revealing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Instruction strip */}
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '9px 14px',
              background: `${ACCENT}07`,
              borderLeft: `2px solid ${ACCENT}45`,
              borderRadius: '10px',
            }}
          >
            <MagnifyingGlass size={14} weight="bold" style={{ color: ACCENT, flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              Pose des questions, observe les comportements, devine la règle.
            </span>
          </motion.div>

          {/* Card "C'est parti" */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 22, stiffness: 280 }}
            style={{
              background: 'rgba(8,14,32,0.92)',
              border: `1px solid ${ACCENT}20`,
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: `0 0 40px ${ACCENT}10, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
              textAlign: 'center',
              padding: '32px 24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', damping: 16 }}
              style={{ fontSize: '3rem', marginBottom: '16px', filter: `drop-shadow(0 0 24px ${ACCENT}70)` }}
            >
              🔍
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              style={{ fontFamily: 'Bungee, sans-serif', fontSize: '1.2rem', color: '#eef2ff', margin: '0 0 10px', letterSpacing: '0.04em', textShadow: `0 0 24px ${ACCENT}55` }}
            >
              C'EST PARTI !
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ fontSize: '0.88rem', color: 'rgba(238,242,255,0.5)', margin: 0, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.6 }}
            >
              Les civils ont choisi leur règle secrète.<br />
              Commence à poser tes questions !
            </motion.p>
          </motion.div>

          {/* Waiting dots */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '11px',
              background: 'rgba(8,14,32,0.6)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '5px', height: '5px', borderRadius: '50%', background: ACCENT,
                animation: 'devPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.22}s`,
              }} />
            ))}
            <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.35)', fontFamily: "'Space Grotesk', sans-serif", marginLeft: '4px' }}>
              La partie commence...
            </span>
          </motion.div>
        </div>
      )}

      {/* PLAYING / GUESSING — En train d'interroger (modal gère les votes en guessing) */}
      {(phase === 'playing' || phase === 'guessing') && (
        <>
          {/* Instruction strip — compact, non-intrusif */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 14px',
            background: `${ACCENT}07`,
            borderLeft: `2px solid ${ACCENT}45`,
            borderRadius: '10px',
          }}>
            <MagnifyingGlass size={14} weight="bold" style={{ color: ACCENT, flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              Pose des questions, observe les réponses, devine la règle.
            </span>
          </div>

          {/* Suspects card */}
          <div style={{
            background: 'rgba(8,14,32,0.92)',
            border: '1px solid rgba(0,229,255,0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            {/* Header : label + essais */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Suspects
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.28)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {3 - guessAttempts} essai{3 - guessAttempts !== 1 ? 's' : ''} restant{3 - guessAttempts !== 1 ? 's' : ''}
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '9px', height: '9px',
                      borderRadius: '50%',
                      background: i < guessAttempts ? 'rgba(239,68,68,0.2)' : ACCENT,
                      border: i < guessAttempts ? '1px solid rgba(239,68,68,0.4)' : 'none',
                      boxShadow: i < guessAttempts ? 'none' : `0 0 6px ${ACCENT}80`,
                      transition: 'all 0.3s ease',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Player rows — PlayerBanner + toggle élimination */}
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...civilians]
                .sort((a, b) => (eliminated.includes(a.uid) ? 1 : 0) - (eliminated.includes(b.uid) ? 1 : 0))
                .map(player => {
                const isEliminated = eliminated.includes(player.uid);
                return (
                  <motion.div
                    key={player.uid}
                    layout
                    transition={{ layout: { type: 'spring', stiffness: 280, damping: 26 } }}
                    style={{ display: 'grid' }}
                  >
                    {/* Couche 1 — PlayerBanner */}
                    <div style={{ gridArea: '1/1', opacity: isEliminated ? 0.38 : 1, transition: 'opacity 0.3s ease' }}>
                      <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                    </div>

                    {/* Couche 2 — Flash rouge à l'élimination */}
                    <AnimatePresence>
                      {flashUid === player.uid && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.45, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                          style={{
                            gridArea: '1/1', zIndex: 3, pointerEvents: 'none',
                            paddingTop: '10px',
                          }}
                        >
                          <div style={{
                            height: '100%',
                            borderRadius: '14px',
                            background: 'rgba(239,68,68,0.35)',
                            boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                          }} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Couche 3 — Badge ÉLIMINÉ centré sur pb-root */}
                    <AnimatePresence>
                      {isEliminated && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: 0.15 }}
                          style={{
                            gridArea: '1/1', zIndex: 1, pointerEvents: 'none',
                            paddingTop: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: '#f87171',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            padding: '3px 10px', borderRadius: '6px',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}>
                            Éliminé
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Couche 4 — ⚠️ DEV ONLY : bouton élimination simulée, ne pas porter en prod */}
                    <div style={{
                      gridArea: '1/1', zIndex: 2,
                      paddingTop: '10px', paddingRight: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    }}>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEliminate(player.uid)}
                        style={{
                          width: '28px', height: '28px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isEliminated ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${isEliminated ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          borderRadius: '8px',
                          color: isEliminated ? '#4ade80' : '#f87171',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {isEliminated ? '↩' : '✕'}
                      </motion.button>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </motion.div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   VUE CIVIL
══════════════════════════════════════════════════════════ */
function CivilView({ phase, selectedRule, setSelectedRule, hasVoted, setHasVoted, eliminated, flashUid, eliminationNotif, onEliminate, onContest }) {
  // ⚠️ DEV ONLY — simule les votes des autres joueurs en live
  const [mockVoteCount, setMockVoteCount] = useState(1); // "moi" = 1
  // Hold-to-reveal pour la règle (idem vrai jeu)
  const [isRuleRevealed, setIsRuleRevealed] = useState(false);
  const [reportMode, setReportMode] = useState(false);

  const MY_UID_CIVIL = 'uid2'; // Simulate being Nirojan (civil)
  const amIEliminated = eliminated.includes(MY_UID_CIVIL);

  const handleEliminate = (uid) => {
    onEliminate(uid);
    setReportMode(false);
  };

  const handleContestElimination = () => {
    onContest(MY_UID_CIVIL);
  };

  // Garantit que la règle se remasque même si mouseup/touchend se produit hors du div
  useEffect(() => {
    const hide = () => setIsRuleRevealed(false);
    window.addEventListener('mouseup', hide);
    window.addEventListener('touchend', hide);
    window.addEventListener('touchcancel', hide);
    return () => {
      window.removeEventListener('mouseup', hide);
      window.removeEventListener('touchend', hide);
      window.removeEventListener('touchcancel', hide);
    };
  }, []);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* ⚠️ DEV ONLY — toggle "je suis éliminé" */}
      {(phase === 'playing' || phase === 'guessing') && (
        <button
          onClick={() => {
            if (amIEliminated) handleContestElimination();
            else handleEliminate(MY_UID_CIVIL);
          }}
          style={{
            padding: '4px 10px',
            background: amIEliminated ? 'rgba(239,68,68,0.2)' : 'rgba(255,200,0,0.12)',
            border: `1px solid ${amIEliminated ? 'rgba(239,68,68,0.35)' : 'rgba(255,200,0,0.25)'}`,
            borderRadius: '8px',
            color: amIEliminated ? '#f87171' : 'rgba(255,200,0,0.7)',
            fontSize: '0.65rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Space Grotesk', sans-serif",
            alignSelf: 'flex-start',
          }}
        >
          DEV: {amIEliminated ? '↩ Annuler élimination' : '💀 Simuler mon élimination'}
        </button>
      )}

      {/* CHOOSING — Vote sur les règles */}
      {phase === 'choosing' && (
        <>
          {/* Instruction strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 14px',
            background: `${ACCENT}07`,
            borderLeft: `2px solid ${ACCENT}45`,
            borderRadius: '10px',
          }}>
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🗳️</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              Choisis une règle — l'enquêteur devra la deviner !
            </span>
          </div>

          {/* Options */}
          <AnimatePresence>
            {MOCK_RULE_OPTIONS.map(rule => {
              const isSelected = selectedRule === rule.id;
              return (
                <motion.button
                  key={rule.id}
                  layout
                  onClick={() => !hasVoted && setSelectedRule(rule.id)}
                  whileHover={{ scale: hasVoted ? 1 : 1.01 }}
                  whileTap={{ scale: hasVoted ? 1 : 0.98 }}
                  style={{
                    width: '100%',
                    padding: '16px 18px',
                    textAlign: 'left',
                    background: isSelected ? `${ACCENT}12` : 'rgba(8,14,32,0.92)',
                    border: `1.5px solid ${isSelected ? ACCENT + '50' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '14px',
                    cursor: hasVoted ? 'default' : 'pointer',
                    opacity: hasVoted && !isSelected ? 0.4 : 1,
                    transition: 'all 0.25s ease',
                    boxShadow: isSelected ? `0 0 20px ${ACCENT}15, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '20px', height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                      background: isSelected ? ACCENT : 'transparent',
                      flexShrink: 0,
                      marginTop: '2px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}>
                      {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#04060f' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, lineHeight: 1.4 }}>
                        {rule.text}
                      </p>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: isSelected ? ACCENT : 'rgba(255,255,255,0.3)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {rule.category}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {/* CTA / Waiting */}
          <AnimatePresence mode="wait">
            {!hasVoted ? (
              <motion.button
                key="validate"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                whileHover={{ scale: selectedRule ? 1.02 : 1 }}
                whileTap={{ scale: 0.97 }}
                disabled={!selectedRule}
                onClick={() => setHasVoted(true)}
                style={{
                  padding: '16px',
                  border: 'none',
                  borderRadius: '14px',
                  background: selectedRule
                    ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                    : 'rgba(255,255,255,0.06)',
                  color: selectedRule ? '#04060f' : 'rgba(255,255,255,0.3)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: selectedRule ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedRule ? `0 4px 20px ${ACCENT}40` : 'none',
                }}
              >
                Valider mon vote
              </motion.button>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px',
                  background: 'rgba(8,14,32,0.92)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: ACCENT,
                      animation: 'devPulse 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.22}s`,
                    }} />
                  ))}
                </div>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  En attente —{' '}
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{mockVoteCount}/{civilians.length}</span>
                  {' '}ont choisi
                </span>
                {/* ⚠️ DEV ONLY — simuler un vote supplémentaire */}
                {mockVoteCount < civilians.length && (
                  <button
                    onClick={() => setMockVoteCount(c => c + 1)}
                    style={{
                      flexShrink: 0, padding: '3px 8px',
                      background: 'rgba(255,200,0,0.12)',
                      border: '1px solid rgba(255,200,0,0.25)',
                      borderRadius: '6px',
                      color: 'rgba(255,200,0,0.7)',
                      fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    +1
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* REVEALING — Annonce de la règle retenue */}
      {phase === 'revealing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Strip */}
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '9px 14px',
              background: `${ACCENT}07`,
              borderLeft: `2px solid ${ACCENT}45`,
              borderRadius: '10px',
            }}
          >
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🎉</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              La règle a été choisie — voici ce que vous devez appliquer !
            </span>
          </motion.div>

          {/* Reveal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 260 }}
            style={{
              padding: '28px 24px',
              background: `${ACCENT}0d`,
              border: `2px solid ${ACCENT}45`,
              borderRadius: '20px',
              boxShadow: `0 0 48px ${ACCENT}1a, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)`,
              textAlign: 'center',
            }}
          >
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ fontSize: '0.7rem', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 16px', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              La règle retenue
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, type: 'spring', damping: 22 }}
              style={{ fontSize: '1.2rem', color: '#fff', margin: '0 0 18px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, lineHeight: 1.5 }}
            >
              {MOCK_RULE.text}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}
              style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '0.68rem', color: ACCENT, background: `${ACCENT}18`, padding: '3px 10px', borderRadius: '6px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                {MOCK_RULE.category}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: '3px 0' }}>
                {'★'.repeat(MOCK_RULE.difficulty)}{'☆'.repeat(3 - MOCK_RULE.difficulty)}
              </span>
            </motion.div>
          </motion.div>

          {/* La partie commence */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px',
              background: 'rgba(8,14,32,0.6)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '5px', height: '5px', borderRadius: '50%', background: ACCENT,
                animation: 'devPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.22}s`,
              }} />
            ))}
            <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.35)', fontFamily: "'Space Grotesk', sans-serif", marginLeft: '4px' }}>
              La partie commence...
            </span>
          </motion.div>
        </div>
      )}

      {/* PLAYING / GUESSING — Suivre la règle (modal gère le vote en guessing) */}
      {(phase === 'playing' || phase === 'guessing') && (
        <>
          {/* Rule card — toute la carte est la zone hold-to-reveal */}
          <div
            style={{
              padding: '20px',
              background: `${ACCENT}0a`,
              border: `2px solid ${isRuleRevealed ? ACCENT + '70' : ACCENT + '35'}`,
              borderRadius: '16px',
              boxShadow: isRuleRevealed ? `0 0 40px ${ACCENT}25` : `0 0 30px ${ACCENT}15`,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              textAlign: 'center',
              cursor: 'pointer',
              touchAction: 'none',
            }}
            onMouseDown={() => setIsRuleRevealed(true)}
            onMouseUp={() => setIsRuleRevealed(false)}
            onMouseLeave={() => setIsRuleRevealed(false)}
            onTouchStart={() => setIsRuleRevealed(true)}
            onTouchEnd={() => setIsRuleRevealed(false)}
            onTouchCancel={() => setIsRuleRevealed(false)}
            onContextMenu={e => e.preventDefault()}
          >
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px', pointerEvents: 'none' }}>
              🤫 Ta règle secrète
            </p>

            {/* Contenu + overlay superposés */}
            <div style={{ position: 'relative' }}>
              {/* Contenu — flouté quand masqué */}
              <div style={{
                filter: isRuleRevealed ? 'none' : 'blur(12px)',
                transition: 'filter 0.15s ease',
                pointerEvents: 'none',
              }}>
                <p style={{ fontSize: '1.05rem', color: '#fff', margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
                  {MOCK_RULE.text}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: ACCENT, background: `${ACCENT}15`, padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                    {MOCK_RULE.category}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', padding: '3px 0' }}>
                    {'★'.repeat(MOCK_RULE.difficulty)}{'☆'.repeat(3 - MOCK_RULE.difficulty)}
                  </span>
                </div>
              </div>

              {/* Overlay hint — centré sur le contenu flouté */}
              <AnimatePresence>
                {!isRuleRevealed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      pointerEvents: 'none',
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>👆</span>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: 'rgba(238,242,255,0.85)',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>
                      Maintiens pour voir
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Instruction strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            padding: '9px 14px',
            background: `${ACCENT}07`,
            borderLeft: `2px solid ${ACCENT}45`,
            borderRadius: '10px',
          }}>
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🤫</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.6)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
              Réponds en <strong style={{ color: '#eef2ff' }}>respectant la règle</strong> sans la révéler !
            </span>
          </div>

          {/* Eliminated banner — si je suis éliminé */}
          <AnimatePresence>
            {amIEliminated && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  padding: '16px 20px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1.5px solid rgba(239,68,68,0.3)',
                  borderRadius: '14px',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Tu as été éliminé
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(238,242,255,0.5)', fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.4 }}>
                  Un coéquipier pense que tu n'as pas suivi la règle.
                </span>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleContestElimination}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    borderRadius: '10px',
                    color: '#4ade80',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Voté par erreur
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Report mode header */}
          <AnimatePresence>
            {reportMode && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Qui n'a pas suivi la règle ?
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setReportMode(false)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'rgba(238,242,255,0.5)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Annuler
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Team card — avec système d'élimination */}
          <div style={{
            background: 'rgba(8,14,32,0.92)',
            border: `1px solid ${reportMode ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'border-color 0.2s ease',
          }}>
            <div style={{
              padding: '11px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: 'rgba(238,242,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Ton équipe
              </span>
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...civilians]
                .sort((a, b) => (eliminated.includes(a.uid) ? 1 : 0) - (eliminated.includes(b.uid) ? 1 : 0))
                .map(player => {
                const isEliminated = eliminated.includes(player.uid);
                const isMe = player.uid === MY_UID_CIVIL;
                return (
                  <motion.div
                    key={player.uid}
                    layout
                    transition={{ layout: { type: 'spring', stiffness: 280, damping: 26 } }}
                    style={{ display: 'grid', cursor: reportMode && !isMe && !isEliminated ? 'pointer' : isEliminated && !isMe ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (reportMode && !isMe && !isEliminated) handleEliminate(player.uid);
                      else if (isEliminated && !isMe) handleEliminate(player.uid); // undo
                    }}
                  >
                    {/* Couche 1 — PlayerBanner */}
                    <div style={{ gridArea: '1/1', opacity: isEliminated ? 0.38 : 1, transition: 'opacity 0.3s ease' }}>
                      <PlayerBanner player={player} accentColor={ACCENT} accentDark="#00b8d9" />
                    </div>

                    {/* Couche 2 — Flash rouge à l'élimination */}
                    <AnimatePresence>
                      {flashUid === player.uid && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.45, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                          style={{
                            gridArea: '1/1', zIndex: 3, pointerEvents: 'none',
                            paddingTop: '10px',
                          }}
                        >
                          <div style={{
                            height: '100%',
                            borderRadius: '14px',
                            background: 'rgba(239,68,68,0.35)',
                            boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                          }} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Couche 3 — Badge ÉLIMINÉ */}
                    <AnimatePresence>
                      {isEliminated && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: 0.15 }}
                          style={{
                            gridArea: '1/1', zIndex: 1, pointerEvents: 'none',
                            paddingTop: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700,
                            color: '#f87171',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            padding: '3px 10px', borderRadius: '6px',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                          }}>
                            Éliminé
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Couche 4 — Indicateur undo pour éliminés */}
                    {isEliminated && !isMe && (
                      <div style={{
                        gridArea: '1/1', zIndex: 2,
                        paddingTop: '10px', paddingRight: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      }}>
                        <div style={{
                          width: '24px', height: '24px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          borderRadius: '8px',
                          color: '#4ade80',
                          fontSize: '0.7rem',
                        }}>
                          ↩
                        </div>
                      </div>
                    )}

                    {/* Couche 5 — Highlight en report mode */}
                    {reportMode && !isEliminated && !isMe && (
                      <div style={{
                        gridArea: '1/1', zIndex: 2,
                        paddingTop: '10px', paddingRight: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      }}>
                        <div style={{
                          width: '24px', height: '24px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '8px',
                          color: '#f87171',
                          fontSize: '0.7rem',
                        }}>
                          ✕
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </motion.div>

      {/* Elimination notification modal */}
      <AnimatePresence>
        {eliminationNotif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'rgba(8, 8, 12, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '320px',
                background: 'linear-gradient(180deg, rgba(45, 20, 20, 0.98) 0%, rgba(28, 12, 12, 0.98) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '24px',
                padding: '32px 24px 24px',
                textAlign: 'center',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: '72px', height: '72px',
                  margin: '0 auto 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                  border: '2px solid rgba(239,68,68,0.5)',
                  borderRadius: '50%',
                  boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 0 20px rgba(239,68,68,0.1)',
                }}
              >
                <Warning size={36} weight="bold" color="#f87171" />
              </motion.div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  Joueur éliminé
                </span>

                {/* PlayerBanner */}
                <div style={{ width: '100%' }}>
                  <PlayerBanner player={eliminationNotif} accentColor="#ef4444" accentDark="#dc2626" />
                </div>

                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,0.35)',
                  marginTop: '4px',
                }}>
                  N'a pas suivi la règle
                </span>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 2.5, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '4px',
                  background: '#ef4444',
                  transformOrigin: 'left center',
                  boxShadow: '0 0 10px #ef4444',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bottom button — "Un joueur n'a pas suivi la règle" (playing/guessing only) */}
      <AnimatePresence>
        {(phase === 'playing' || phase === 'guessing') && !amIEliminated && !reportMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 50,
              padding: '12px 16px 20px',
              background: 'linear-gradient(to top, rgba(4,6,15,0.95) 60%, transparent)',
              pointerEvents: 'none',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setReportMode(true)}
              style={{
                pointerEvents: 'auto',
                width: '100%',
                padding: '15px 20px',
                border: 'none',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <Warning size={18} weight="bold" />
              Un joueur n'a pas suivi la règle
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Shared: attempts bar ───────────────────────────────── */
function AttemptsBar({ guessAttempts }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
      padding: '8px 16px',
      background: `${ACCENT}08`,
      border: `1px solid ${ACCENT}18`,
      borderRadius: '10px',
    }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Essais restants
      </span>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '11px', height: '11px',
            borderRadius: '50%',
            background: i < guessAttempts ? 'rgba(239,68,68,0.35)' : ACCENT,
            border: i < guessAttempts ? '1px solid rgba(239,68,68,0.5)' : 'none',
            boxShadow: i < guessAttempts ? 'none' : `0 0 8px ${ACCENT}70`,
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Export with Suspense ───────────────────────────────── */
export default function DevLaRegleGamePage() {
  return (
    <Suspense fallback={<div style={{ flex: 1, background: '#04060f' }} />}>
      <DevLaRegleGameContent />
      <style>{`
        @keyframes devSpin { to { transform: rotate(360deg); } }
        @keyframes devPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.75); } }
      `}</style>
    </Suspense>
  );
}
