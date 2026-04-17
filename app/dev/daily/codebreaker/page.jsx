'use client';

import { useState } from 'react';
import { Trophy, Lightbulb } from '@phosphor-icons/react';
import { getFlatCSSVars } from '@/lib/config/colors';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';

import CodeBreakerBoard from '@/app/daily/codebreaker/_components/CodeBreakerBoard';
import CodeBreakerPalette from '@/app/daily/codebreaker/_components/CodeBreakerPalette';
import { CODE_LENGTH, MAX_ATTEMPTS, COLORS, COLOR_NAMES, computeHints, computeScore } from '@/app/daily/codebreaker/_hooks/useCodeBreakerGame';

import DailyHeader from '@/components/daily/DailyHeader';
import DailyTabs from '@/components/daily/DailyTabs';
import DailyStatsModal from '@/components/daily/DailyStatsModal';
import DailyResultBanner from '@/components/daily/DailyResultBanner';
import '@/components/daily/daily-base.css';
import '@/app/daily/codebreaker/codebreaker.css';

const TABS = [
  { id: 'game', label: 'Jeu', icon: <Lightbulb size={14} weight="fill" /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={14} weight="fill" /> },
];

const MOCK_STATS = { played: 8, won: 5 };
const MOCK_STREAK = { count: 3 };
const MOCK_SECRET = [1, 3, 0, 4]; // Bleu Vert Rouge Blanc

// ─── Dev Controls ────────────────────────────────────────────────────────────
function DevBar({ phase, setPhase, onReset }) {
  const [open, setOpen] = useState(false);
  const pill = (label, active, onClick, color = '#6366f1') => (
    <button onClick={onClick} style={{
      padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? color : '#2a2a2a', color: active ? '#fff' : 'rgba(255,255,255,0.5)',
      fontSize: '0.68rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: 36, height: 36, borderRadius: 10, background: open ? '#6366f1' : '#2a2a2a',
        border: 'none', borderBottom: '3px solid ' + (open ? '#4338ca' : '#141414'),
        color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{open ? '×' : '⚡'}</button>

      {open && (
        <div style={{ background: '#141414', borderBottom: '3px solid #0a0a0a', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            DEV — Code Breaker
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pill('Jeu', phase === 'playing', () => setPhase('playing'))}
            {pill('Victoire', phase === 'won', () => setPhase('won'))}
            {pill('Défaite', phase === 'lost', () => setPhase('lost'))}
          </div>
          <button onClick={onReset} style={{
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#ef4444', color: '#fff', fontSize: '0.68rem', fontWeight: 700,
          }}>Reset partie</button>
          <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)' }}>
            Code : {MOCK_SECRET.map(c => COLOR_NAMES[c]).join(' ')}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dev Page ───────────────────────────────────────────────────────────
export default function DevCodeBreakerPage() {
  useAppShellBg('#6366f1');
  const [phase, setPhase] = useState('playing');
  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);

  // ─── Game state simulé ──────────────────────────────────────────────────
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState(Array(CODE_LENGTH).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [lastSubmitIndex, setLastSubmitIndex] = useState(-1);

  const gameOver = phase === 'won' || phase === 'lost';
  const solved = phase === 'won';

  const isFull = currentGuess.every(c => c !== null);

  const reset = () => {
    setGuesses([]);
    setCurrentGuess(Array(CODE_LENGTH).fill(null));
    setSelectedSlot(0);
    setLastSubmitIndex(-1);
    setPhase('playing');
  };

  const selectColor = (colorIndex) => {
    if (gameOver) return;
    setCurrentGuess(prev => {
      const next = [...prev];
      next[selectedSlot] = colorIndex;
      return next;
    });
    setSelectedSlot(prev => {
      for (let i = 1; i <= CODE_LENGTH; i++) {
        const next = (prev + i) % CODE_LENGTH;
        if (currentGuess[next] === null && next !== prev) return next;
      }
      return Math.min(prev + 1, CODE_LENGTH - 1);
    });
  };

  const tapSlot = (index) => {
    if (gameOver) return;
    setSelectedSlot(index);
  };

  const clearGuess = () => {
    if (gameOver) return;
    setCurrentGuess(Array(CODE_LENGTH).fill(null));
    setSelectedSlot(0);
  };

  const submitGuess = () => {
    if (!isFull || gameOver) return;
    const hints = computeHints(currentGuess, MOCK_SECRET);
    const newGuesses = [...guesses, { colors: [...currentGuess], hints }];
    setGuesses(newGuesses);
    setCurrentGuess(Array(CODE_LENGTH).fill(null));
    setSelectedSlot(0);
    setLastSubmitIndex(newGuesses.length - 1);

    if (hints.black === CODE_LENGTH) setPhase('won');
    else if (newGuesses.length >= MAX_ATTEMPTS) setPhase('lost');
  };

  const score = solved ? computeScore(guesses.length, 30000) : 0;
  const showResult = gameOver;

  return (
    <div className="daily-page" style={getFlatCSSVars('codebreaker')}>
      <DevBar phase={phase} setPhase={setPhase} onReset={reset} />

      <DailyHeader
        title="Code Breaker"
        onBack={() => window.history.back()}
        onStats={() => setShowStats(true)}
      />

      <DailyTabs active={activeTab} onChange={setActiveTab} tabs={TABS} />

      <DailyStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="Mes statistiques"
        stats={MOCK_STATS}
        streak={MOCK_STREAK}
        hint="Preview mode — données simulées"
      />

      <div className="daily-tab-carousel">
        <div className="daily-tab-track" style={{ transform: activeTab === 'leaderboard' ? 'translateX(-100%)' : 'translateX(0)' }}>
          <div className="daily-tab-slide">
            <CodeBreakerBoard
              guesses={guesses}
              currentGuess={currentGuess}
              selectedSlot={selectedSlot}
              gameOver={gameOver}
              secret={MOCK_SECRET}
              onTapSlot={tapSlot}
              lastSubmitIndex={lastSubmitIndex}
            />

            {showResult && (
              <div style={{ padding: '0 14px 10px' }}>
                <DailyResultBanner
                  emoji={solved ? '🎉' : '😢'}
                  verdict={solved ? 'Code craqué !' : 'Raté…'}
                  sub={solved
                    ? `${guesses.length} tentative${guesses.length > 1 ? 's' : ''}`
                    : <>Le code était : {MOCK_SECRET.map((c, i) => (
                        <span key={i} style={{
                          display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                          background: COLORS[c], marginLeft: i > 0 ? 3 : 0, verticalAlign: 'middle',
                        }} />
                      ))}
                    </>
                  }
                  score={score}
                  unranked={!solved}
                  stats={MOCK_STATS}
                  streak={MOCK_STREAK}
                  onShowStats={() => setShowStats(true)}
                  onShowLeaderboard={() => setActiveTab('leaderboard')}
                />
              </div>
            )}

            {!gameOver && (
              <CodeBreakerPalette
                onSelectColor={selectColor}
                onClear={clearGuess}
                onSubmit={submitGuess}
                isFull={isFull}
                disabled={gameOver}
              />
            )}
          </div>

          <div className="daily-tab-slide">
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Trophy size={40} weight="fill" color="rgba(99,102,241,0.3)" />
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                Leaderboard non disponible en dev
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
