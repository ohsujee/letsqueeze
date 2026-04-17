'use client';

import { useState, useMemo, useCallback } from 'react';
import { GridNine, Trophy } from '@phosphor-icons/react';
import { getFlatCSSVars } from '@/lib/config/colors';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';

import { TIMER_SECONDS, evaluateTokens } from '@/app/daily/total/components/helpers';
import TotalResultBanner from '@/app/daily/total/components/TotalResultBanner';
import TotalReadyScreen from '@/app/daily/total/components/TotalReadyScreen';
import TotalPlayingScreen from '@/app/daily/total/components/TotalPlayingScreen';
import TotalSubmissionsRecap from '@/app/daily/total/components/TotalSubmissionsRecap';

import DailyHeader from '@/components/daily/DailyHeader';
import DailyTabs from '@/components/daily/DailyTabs';
import DailyStatsModal from '@/components/daily/DailyStatsModal';
import '@/components/daily/daily-base.css';
import '@/app/daily/total/total.css';

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

const TABS = [
  { id: 'game', label: 'Jeu', icon: <GridNine size={14} weight="fill" /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={14} weight="fill" /> },
];

// ─── Dev Controls Bar — collapsable ──────────────────────────────────────────
function DevBar({ phase, setPhase, timerPreset, setTimerPreset, finishVariant, setFinishVariant, playingState, setPlayingState }) {
  const [open, setOpen] = useState(false);

  const pill = (label, active, onClick, color = '#3b82f6') => (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: active ? color : '#2a2a2a',
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        fontSize: '0.68rem', fontWeight: 700,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', top: 8, right: 8, zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: open ? '#3b82f6' : '#2a2a2a',
          border: 'none', borderBottom: '3px solid ' + (open ? '#1d4ed8' : '#141414'),
          color: '#fff', fontSize: '1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open ? '×' : '⚡'}
      </button>

      {open && (
        <div style={{
          background: '#141414',
          borderBottom: '3px solid #0a0a0a',
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          minWidth: 200,
        }}>
          <div style={{
            fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700,
          }}>
            DEV — Total
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pill('Ready', phase === 'ready', () => setPhase('ready'))}
            {pill('Playing', phase === 'playing', () => setPhase('playing'))}
            {pill('Finished', phase === 'finished', () => setPhase('finished'))}
          </div>

          {phase === 'playing' && (
            <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {pill('Normal', timerPreset === 'normal', () => setTimerPreset('normal'), '#3b82f6')}
                {pill('Urgent', timerPreset === 'urgent', () => setTimerPreset('urgent'), '#f59e0b')}
                {pill('Critical', timerPreset === 'critical', () => setTimerPreset('critical'), '#ef4444')}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {pill('Vide', playingState === 'empty', () => setPlayingState('empty'))}
                {pill('Expression', playingState === 'expression', () => setPlayingState('expression'))}
                {pill('1 essai', playingState === '1sub', () => setPlayingState('1sub'))}
                {pill('3 essais', playingState === '3sub', () => setPlayingState('3sub'))}
              </div>
            </>
          )}

          {phase === 'finished' && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {pill('Exact', finishVariant === 'exact', () => setFinishVariant('exact'), '#10b981')}
              {pill('Approché', finishVariant === 'close', () => setFinishVariant('close'), '#f59e0b')}
              {pill('Temps écoulé', finishVariant === 'time', () => setFinishVariant('time'), '#ef4444')}
              {pill('Abandonné', finishVariant === 'quit', () => setFinishVariant('quit'), '#ef4444')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dev Page ───────────────────────────────────────────────────────────
export default function DevTotalPage() {
  useAppShellBg('#3b82f6');
  const [phase, setPhase] = useState('ready');
  const [timerPreset, setTimerPreset] = useState('normal');
  const [finishVariant, setFinishVariant] = useState('exact');
  const [playingState, setPlayingState] = useState('empty');
  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);

  const timeLeft = timerPreset === 'critical' ? 7 : timerPreset === 'urgent' ? 22 : 134;

  const mockTokens = playingState === 'expression'
    ? [100, '×', 7, '−', 25, '×', 10, '+', 50]
    : [];

  const mockUsedIndices = useMemo(() => {
    if (playingState !== 'expression') return new Set();
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

  const finishConfigs = {
    exact: { endReason: 'exact', exact: true, difference: 0, bestResult: 437, score: 5420, timeMs: 42000, submissions: MOCK_SUBMISSIONS_EXACT },
    close: { endReason: 'attempts', exact: false, difference: 10, bestResult: 447, score: 4100, timeMs: 180000, submissions: MOCK_SUBMISSIONS_CLOSE },
    time: { endReason: 'time', exact: false, difference: 16, bestResult: 421, score: 3280, timeMs: 180000, submissions: MOCK_SUBMISSIONS_CLOSE },
    quit: { endReason: 'quit', exact: false, difference: 16, bestResult: 421, score: 3280, timeMs: 65000, submissions: [MOCK_SUBMISSIONS_CLOSE[0]] },
  };
  const fc = finishConfigs[finishVariant];
  const noop = () => {};

  return (
    <div className="daily-page total-page-v2" style={getFlatCSSVars('total')}>
      <DevBar
        phase={phase} setPhase={setPhase}
        timerPreset={timerPreset} setTimerPreset={setTimerPreset}
        finishVariant={finishVariant} setFinishVariant={setFinishVariant}
        playingState={playingState} setPlayingState={setPlayingState}
      />

      <DailyHeader
        title="Total"
        onBack={() => window.history.back()}
        onStats={() => setShowStats(true)}
      />

      {phase === 'finished' && (
        <DailyTabs active={activeTab} onChange={setActiveTab} tabs={TABS} />
      )}

      <div className="total-content">
        {phase === 'ready' && <TotalReadyScreen onStart={noop} />}

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
            onTapNumber={noop} onTapOperator={noop}
            onBackspace={noop} onClear={noop} onValidate={noop}
            onFinishEarly={currentSubmissions.length > 0 && currentSubmissions.length < 3 ? noop : null}
          />
        )}

        {phase === 'finished' && activeTab === 'game' && (
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TotalResultBanner
              exact={fc.exact} difference={fc.difference} bestResult={fc.bestResult}
              target={MOCK_PUZZLE.target} timeMs={fc.timeMs} score={fc.score}
              stats={MOCK_STATS} streak={MOCK_STREAK} endReason={fc.endReason}
              onShowStats={() => setShowStats(true)} onShowLeaderboard={() => setActiveTab('leaderboard')}
            />
            <TotalSubmissionsRecap submissions={fc.submissions} target={MOCK_PUZZLE.target} />
          </div>
        )}

        {phase === 'finished' && activeTab === 'leaderboard' && (
          <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Trophy size={40} weight="fill" color="rgba(59,130,246,0.3)" />
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
              Leaderboard non disponible en dev (nécessite Firebase)
            </p>
          </div>
        )}
      </div>

      <DailyStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="Mes statistiques"
        stats={MOCK_STATS}
        streak={MOCK_STREAK}
        hint="Preview mode — données simulées"
      />
    </div>
  );
}
