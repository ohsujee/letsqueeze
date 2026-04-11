'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChartBar, X, ArrowsClockwise, Question, GridNine, Trophy } from '@phosphor-icons/react';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { formatResult } from './components/helpers';
import TotalResultBanner from './components/TotalResultBanner';
import TotalStatsModal from './components/TotalStatsModal';
import TotalLeaderboard from './components/TotalLeaderboard';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';
import TotalReadyScreen from './components/TotalReadyScreen';
import TotalPlayingScreen from './components/TotalPlayingScreen';
import TotalSubmissionsRecap from './components/TotalSubmissionsRecap';
import { useTotalGame } from '@/lib/hooks/useTotalGame';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import { TIMER_SECONDS } from './components/helpers';
import './total.css';

export default function DailyTotalPage() {
  useAppShellBg('#0e0e1a');
  const router = useRouter();
  const { openManually: openHowToPlay } = useHowToPlay();
  const [showStats, setShowStats] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const {
    puzzle, loaded, devMode, gamePhase, timeLeft, tokens, usedIndices, liveResult,
    bestResult, bestDifference, bestScore, submissions, submissionsLeft,
    flashResult, canValidate, allUsed, score, endReason, showResult, showTransition,
    activeTab, stats, streak, todayDate, startTimeRef,
    handleStart, handleTapNumber, handleTapOperator, handleBackspace, handleClear,
    handleValidate, handleShowLeaderboard, handleDevRestart, handleQuitGame,
    setActiveTab, setShowResult, setShowTransition,
    adTriggered, triggerPostGameAd,
  } = useTotalGame();

  if (!loaded || !puzzle) {
    return (
      <div className="total-page">
        <div className="wordle-loading"><div className="total-spinner" /><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="total-page" style={{ background: '#04060f', position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden className="total-bg">
        <div className="total-bg-dots" /><div className="total-bg-glow-top" /><div className="total-bg-glow-bottom" />
      </div>

      <header className="wordle-header" style={{ position: 'relative', zIndex: 1 }}>
        <button className="wordle-back-btn" onClick={() => gamePhase === 'playing' ? setShowQuitConfirm(true) : router.push('/home')}>
          <ArrowLeft size={20} weight="fill" />
        </button>
        <h1 className="total-title">Total</h1>
        <div className="wordle-header-actions">
          {devMode && (
            <button className="wordle-help-btn" onClick={handleDevRestart} title="Restart (dev)" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }}>
              <ArrowsClockwise size={18} weight="fill" />
            </button>
          )}
          <button className="wordle-help-btn" onClick={() => setShowStats(true)} title="Statistiques" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }}>
            <ChartBar size={18} weight="fill" />
          </button>
          <button className="wordle-help-btn" onClick={openHowToPlay} title="Comment jouer" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.25)', color: '#3b82f6' }}>
            <Question size={18} weight="fill" />
          </button>
        </div>
      </header>

      {gamePhase === 'finished' && (
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

      <div className="total-content" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab === 'game' ? (
          <>
            {gamePhase === 'ready' && <TotalReadyScreen onStart={handleStart} />}
            {gamePhase === 'playing' && (
              <TotalPlayingScreen
                puzzle={puzzle} timeLeft={timeLeft} tokens={tokens} usedIndices={usedIndices}
                liveResult={liveResult} bestResult={bestResult} bestDifference={bestDifference}
                submissions={submissions} flashResult={flashResult} canValidate={canValidate} allUsed={allUsed}
                onTapNumber={handleTapNumber} onTapOperator={handleTapOperator}
                onBackspace={handleBackspace} onClear={handleClear} onValidate={handleValidate}
                onFinishEarly={() => setShowFinishConfirm(true)}
              />
            )}
            {gamePhase === 'finished' && showResult && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TotalResultBanner
                  exact={bestDifference === 0} difference={bestDifference === Infinity ? null : bestDifference}
                  bestResult={bestResult} target={puzzle.target}
                  timeMs={bestDifference === 0 ? (Date.now() - (startTimeRef.current || Date.now())) : TIMER_SECONDS * 1000}
                  score={score} stats={stats} streak={streak} endReason={endReason}
                  onShowStats={() => setShowStats(true)} onShowLeaderboard={handleShowLeaderboard}
                />
                <TotalSubmissionsRecap submissions={submissions} />
              </div>
            )}
          </>
        ) : (
          <LeaderboardErrorBoundary><TotalLeaderboard todayDate={todayDate} /></LeaderboardErrorBoundary>
        )}
      </div>

      <TotalStatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} streak={streak} />

      {/* Quit confirm */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div className="wordle-stats-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuitConfirm(false)}>
            <motion.div className="wordle-stats-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
              <div className="wsm-header">
                <h3 className="wsm-title" style={{ color: '#f59e0b' }}>Quitter la partie ?</h3>
                <button className="wsm-close" onClick={() => setShowQuitConfirm(false)}><X size={16} weight="fill" /></button>
              </div>
              <p className="total-confirm-text">Ta partie sera terminée avec ton meilleur résultat actuel. Tu ne pourras pas recommencer aujourd&apos;hui.</p>
              <div className="total-confirm-btns">
                <button className="total-confirm-btn cancel" onClick={() => setShowQuitConfirm(false)}>Continuer</button>
                <button className="total-confirm-btn quit" onClick={() => { setShowQuitConfirm(false); handleQuitGame(); setTimeout(() => router.push('/home'), 200); }}>Quitter</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish early confirm */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div className="wordle-stats-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFinishConfirm(false)}>
            <motion.div className="wordle-stats-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
              <div className="wsm-header">
                <h3 className="wsm-title" style={{ color: '#3b82f6' }}>Terminer la partie ?</h3>
                <button className="wsm-close" onClick={() => setShowFinishConfirm(false)}><X size={16} weight="fill" /></button>
              </div>
              <p className="total-confirm-text">Ton meilleur résultat ({formatResult(bestResult)}, écart : {formatResult(bestDifference)}) sera utilisé pour te classer. Il te reste {submissionsLeft} essai{submissionsLeft > 1 ? 's' : ''}.</p>
              <div className="total-confirm-btns">
                <button className="total-confirm-btn cancel" onClick={() => setShowFinishConfirm(false)}>Continuer</button>
                <button className="total-confirm-btn finish" onClick={() => { setShowFinishConfirm(false); handleQuitGame(); }}>Terminer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTransition && (
        <GameEndTransition variant="total" title="Voyons le classement !" subtitle="Qui est le meilleur calculateur ?"
          onComplete={() => { setShowTransition(false); setShowResult(true); if (!adTriggered.current) triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 }); else setActiveTab('leaderboard'); }}
        />
      )}
    </div>
  );
}
