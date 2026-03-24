'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, ChartBar, Question, GridNine, Trophy } from '@phosphor-icons/react';

import { TIMER_SECONDS, evaluateTokens } from '@/app/daily/total/components/helpers';
import TotalResultBanner from '@/app/daily/total/components/TotalResultBanner';
import TotalStatsModal from '@/app/daily/total/components/TotalStatsModal';
import TotalReadyScreen from '@/app/daily/total/components/TotalReadyScreen';
import TotalPlayingScreen from '@/app/daily/total/components/TotalPlayingScreen';
import TotalSubmissionsRecap from '@/app/daily/total/components/TotalSubmissionsRecap';

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_PUZZLE = { numbers: [3, 7, 10, 25, 50, 100], target: 437 };

const MOCK_STATS = { played: 14, won: 5 };
const MOCK_STREAK = { count: 3 };

const MOCK_SUBMISSIONS_EXACT = [
  { expression: '100 × 50 ÷ 25 + 7 × 10 − 3', result: 437, difference: 0, score: 5420 },
];
const MOCK_SUBMISSIONS_CLOSE = [
  { expression: '50 × 10 − 100 + 25 + 3 − 7', result: 421, difference: 16, score: 3280 },
  { expression: '100 × 7 − 25 × 10 + 50 − 3', result: 447, difference: 10, score: 4100 },
  { expression: '25 × 50 ÷ 3 + 10 × 7 − 100', result: 388, difference: 49, score: 1560 },
];

// ─── Dev Controls Bar ────────────────────────────────────────────────────────
function DevBar({ phase, setPhase, timerPreset, setTimerPreset, finishVariant, setFinishVariant, playingState, setPlayingState }) {
  const pill = (label, active, onClick, color = '#3b82f6') => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: active ? color : 'rgba(255,255,255,0.06)',
        color: active ? '#04060f' : 'rgba(255,255,255,0.5)',
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
        fontFamily: "'Space Grotesk', sans-serif",
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(4,6,15,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(59,130,246,0.15)',
      padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.65rem', color: 'rgba(238,242,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
      }}>
        <span style={{ color: '#3b82f6', fontSize: '0.8rem' }}>⚡</span>
        DEV — Total Preview
      </div>

      {/* Phase selector */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {pill('Ready', phase === 'ready', () => setPhase('ready'))}
        {pill('Playing', phase === 'playing', () => setPhase('playing'))}
        {pill('Finished', phase === 'finished', () => setPhase('finished'))}
      </div>

      {/* Timer presets (playing only) */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(238,242,255,0.25)', marginRight: 4 }}>Timer:</span>
          {pill('Normal', timerPreset === 'normal', () => setTimerPreset('normal'), '#3b82f6')}
          {pill('Urgent', timerPreset === 'urgent', () => setTimerPreset('urgent'), '#f59e0b')}
          {pill('Critical', timerPreset === 'critical', () => setTimerPreset('critical'), '#ef4444')}
        </div>
      )}

      {/* Playing sub-state */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(238,242,255,0.25)', marginRight: 4 }}>État:</span>
          {pill('Vide', playingState === 'empty', () => setPlayingState('empty'))}
          {pill('Expression', playingState === 'expression', () => setPlayingState('expression'))}
          {pill('1 essai', playingState === '1sub', () => setPlayingState('1sub'))}
          {pill('3 essais', playingState === '3sub', () => setPlayingState('3sub'))}
        </div>
      )}

      {/* Finish variant */}
      {phase === 'finished' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(238,242,255,0.25)', marginRight: 4 }}>Résultat:</span>
          {pill('Exact', finishVariant === 'exact', () => setFinishVariant('exact'), '#10b981')}
          {pill('Approché', finishVariant === 'close', () => setFinishVariant('close'), '#f59e0b')}
          {pill('Temps écoulé', finishVariant === 'time', () => setFinishVariant('time'), '#ef4444')}
          {pill('Abandonné', finishVariant === 'quit', () => setFinishVariant('quit'), '#ef4444')}
        </div>
      )}
    </div>
  );
}

// ─── Main Dev Page ───────────────────────────────────────────────────────────
export default function DevTotalPage() {
  const [phase, setPhase] = useState('ready');
  const [timerPreset, setTimerPreset] = useState('normal');
  const [finishVariant, setFinishVariant] = useState('exact');
  const [playingState, setPlayingState] = useState('empty');
  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);

  // Mock playing state data
  const timeLeft = timerPreset === 'critical' ? 7 : timerPreset === 'urgent' ? 22 : 134;

  const mockTokens = playingState === 'expression'
    ? [100, '×', 7, '−', 25, '×', 10, '+', 50]
    : [];

  const mockUsedIndices = useMemo(() => {
    if (playingState !== 'expression') return new Set();
    // Indices for: 100(idx 5), 7(idx 1), 25(idx 3), 10(idx 2), 50(idx 4)
    return new Set([5, 1, 3, 2, 4]);
  }, [playingState]);

  const mockLiveResult = useMemo(() => {
    if (playingState !== 'expression') return null;
    return evaluateTokens(mockTokens);
  }, [playingState, mockTokens]);

  const currentSubmissions = playingState === '1sub'
    ? [MOCK_SUBMISSIONS_CLOSE[0]]
    : playingState === '3sub'
      ? MOCK_SUBMISSIONS_CLOSE
      : [];

  // Finish data
  const finishConfigs = {
    exact: { endReason: 'exact', exact: true, difference: 0, bestResult: 437, score: 5420, timeMs: 42000, submissions: MOCK_SUBMISSIONS_EXACT },
    close: { endReason: 'attempts', exact: false, difference: 10, bestResult: 447, score: 4100, timeMs: 180000, submissions: MOCK_SUBMISSIONS_CLOSE },
    time: { endReason: 'time', exact: false, difference: 16, bestResult: 421, score: 3280, timeMs: 180000, submissions: MOCK_SUBMISSIONS_CLOSE },
    quit: { endReason: 'quit', exact: false, difference: 16, bestResult: 421, score: 3280, timeMs: 65000, submissions: [MOCK_SUBMISSIONS_CLOSE[0]] },
  };
  const fc = finishConfigs[finishVariant];

  const noop = () => {};

  return (
    <div className="total-page" style={{ background: '#04060f', position: 'relative', overflow: 'hidden' }}>
      {/* Dev controls */}
      <DevBar
        phase={phase} setPhase={setPhase}
        timerPreset={timerPreset} setTimerPreset={setTimerPreset}
        finishVariant={finishVariant} setFinishVariant={setFinishVariant}
        playingState={playingState} setPlayingState={setPlayingState}
      />

      {/* Background layers */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '90%', height: '280px',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }} />
      </div>

      {/* Header */}
      <header className="wordle-header" style={{ position: 'relative', zIndex: 1 }}>
        <button className="wordle-back-btn" onClick={() => window.history.back()}>
          <ArrowLeft size={20} weight="fill" />
        </button>
        <h1 className="total-title">Total</h1>
        <div className="wordle-header-actions">
          <button className="wordle-help-btn" onClick={() => setShowStats(true)} style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }}>
            <ChartBar size={18} weight="fill" />
          </button>
          <button className="wordle-help-btn" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }}>
            <Question size={18} weight="fill" />
          </button>
        </div>
      </header>

      {/* Tabs (finished only) */}
      {phase === 'finished' && (
        <div className="wordle-tabs total-tabs">
          <div className="wordle-tabs-content">
            <button className={`wordle-tab ${activeTab === 'game' ? 'active total-tab-active' : ''}`} onClick={() => setActiveTab('game')}>
              <GridNine size={14} weight="fill" /> Jeu
            </button>
            <button className={`wordle-tab ${activeTab === 'leaderboard' ? 'active total-tab-active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={14} weight="fill" /> Classement
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="total-content" style={{ position: 'relative', zIndex: 1 }}>
        {/* ─── Ready Phase ─── */}
        {phase === 'ready' && (
          <TotalReadyScreen onStart={noop} />
        )}

        {/* ─── Playing Phase ─── */}
        {phase === 'playing' && (
          <TotalPlayingScreen
            puzzle={MOCK_PUZZLE}
            timeLeft={timeLeft}
            tokens={mockTokens}
            usedIndices={mockUsedIndices}
            liveResult={mockLiveResult}
            bestResult={playingState === '1sub' || playingState === '3sub' ? 421 : null}
            bestDifference={playingState === '1sub' || playingState === '3sub' ? 16 : Infinity}
            submissions={currentSubmissions}
            flashResult={null}
            canValidate={false}
            allUsed={playingState === 'expression' && mockUsedIndices.size === 6}
            onTapNumber={noop}
            onTapOperator={noop}
            onBackspace={noop}
            onClear={noop}
            onValidate={noop}
            onFinishEarly={currentSubmissions.length > 0 && currentSubmissions.length < 3 ? noop : null}
          />
        )}

        {/* ─── Finished Phase ─── */}
        {phase === 'finished' && activeTab === 'game' && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TotalResultBanner
              exact={fc.exact}
              difference={fc.difference}
              bestResult={fc.bestResult}
              target={MOCK_PUZZLE.target}
              timeMs={fc.timeMs}
              score={fc.score}
              stats={MOCK_STATS}
              streak={MOCK_STREAK}
              endReason={fc.endReason}
              onShowStats={() => setShowStats(true)}
              onShowLeaderboard={() => setActiveTab('leaderboard')}
            />
            <TotalSubmissionsRecap submissions={fc.submissions} />
          </div>
        )}

        {phase === 'finished' && activeTab === 'leaderboard' && (
          <div style={{
            padding: '40px 20px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
          }}>
            <Trophy size={40} weight="duotone" color="rgba(59,130,246,0.3)" />
            <p style={{
              fontSize: '0.85rem', color: 'rgba(238,242,255,0.4)', textAlign: 'center',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              Leaderboard (preview non disponible en dev — nécessite Firebase)
            </p>
          </div>
        )}
      </div>

      {/* Stats modal — uses the real component */}
      <TotalStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        stats={MOCK_STATS}
        streak={MOCK_STREAK}
      />
    </div>
  );
}
