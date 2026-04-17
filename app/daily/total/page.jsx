'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowsClockwise, GridNine, Trophy, X } from '@phosphor-icons/react';
import { GameEndTransition } from '@/components/transitions';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { getFlatCSSVars } from '@/lib/config/colors';
import { formatResult, TIMER_SECONDS } from './components/helpers';
import TotalResultBanner from './components/TotalResultBanner';
import TotalReadyScreen from './components/TotalReadyScreen';
import TotalPlayingScreen from './components/TotalPlayingScreen';
import TotalSubmissionsRecap from './components/TotalSubmissionsRecap';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';
import DailyHeader from '@/components/daily/DailyHeader';
import DailyTabs from '@/components/daily/DailyTabs';
import DailyStatsModal from '@/components/daily/DailyStatsModal';
import DailyLeaderboard from '@/components/daily/DailyLeaderboard';
import { useTotalGame } from '@/lib/hooks/useTotalGame';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import '@/components/daily/daily-base.css';
import './total.css';

const TABS = [
  { id: 'game',        label: 'Jeu',        icon: <GridNine size={14} weight="fill" /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={14} weight="fill" /> },
];

export default function DailyTotalPage() {
  useAppShellBg('#3b82f6');
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

  const handleBack = useCallback(() => {
    if (gamePhase === 'playing') setShowQuitConfirm(true);
    else router.push('/home');
  }, [gamePhase, router]);

  if (!loaded || !puzzle) {
    return (
      <div className="daily-page" style={getFlatCSSVars('total')}>
        <div className="daily-loading"><div className="daily-spinner" /><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="daily-page total-page-v2" style={getFlatCSSVars('total')}>
      <DailyHeader
        title="Total"
        onBack={handleBack}
        onStats={() => setShowStats(true)}
        onHelp={openHowToPlay}
        extras={devMode ? (
          <button className="daily-icon-btn" onClick={handleDevRestart} title="Restart (dev)">
            <ArrowsClockwise size={18} weight="fill" />
          </button>
        ) : null}
      />

      {gamePhase === 'finished' && (
        <DailyTabs active={activeTab} onChange={setActiveTab} tabs={TABS} />
      )}

      {/* Carrousel Jeu ↔ Classement */}
      {gamePhase === 'finished' ? (
        <div className="daily-tab-carousel">
          <div className="daily-tab-track" style={{ transform: activeTab === 'leaderboard' ? 'translateX(-100%)' : 'translateX(0)' }}>
            <div className="daily-tab-slide">
              {showResult && (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
                  <TotalResultBanner
                    exact={bestDifference === 0} difference={bestDifference === Infinity ? null : bestDifference}
                    bestResult={bestResult} target={puzzle.target}
                    timeMs={bestDifference === 0 ? (Date.now() - (startTimeRef.current || Date.now())) : TIMER_SECONDS * 1000}
                    score={score} stats={stats} streak={streak} endReason={endReason}
                    onShowStats={() => setShowStats(true)} onShowLeaderboard={handleShowLeaderboard}
                  />
                  <TotalSubmissionsRecap submissions={submissions} target={puzzle.target} />
                </div>
              )}
            </div>
            <div className="daily-tab-slide">
              <LeaderboardErrorBoundary>
                <DailyLeaderboard
                  firebaseNode="daily/total"
                  todayDate={todayDate}
                  emptyEmoji="🔢"
                  emptyText="Personne encore — sois le premier !"
                  renderMeta={(entry, tab) => tab === 'week'
                    ? `${entry.days} jour${entry.days > 1 ? 's' : ''}`
                    : `écart : ${entry.difference ?? '?'}`
                  }
                />
              </LeaderboardErrorBoundary>
            </div>
          </div>
        </div>
      ) : (
        <div className="total-content">
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
        </div>
      )}

      <DailyStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="Mes statistiques"
        stats={stats}
        streak={streak}
        hint="Jouez chaque jour pour maintenir votre série !"
      />

      {/* Quit confirm */}
      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div className="daily-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuitConfirm(false)}>
            <motion.div className="daily-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
              <div className="daily-modal-header">
                <h3 className="daily-modal-title">Quitter la partie ?</h3>
                <button className="daily-modal-close" onClick={() => setShowQuitConfirm(false)}><X size={14} weight="bold" /></button>
              </div>
              <p className="total-confirm-text">Ta partie sera terminée avec ton meilleur résultat actuel. Tu ne pourras pas recommencer aujourd&apos;hui.</p>
              <div className="total-confirm-btns">
                <button className="daily-btn secondary" onClick={() => setShowQuitConfirm(false)}>Continuer</button>
                <button className="daily-btn primary" onClick={() => { setShowQuitConfirm(false); handleQuitGame(); setTimeout(() => router.push('/home'), 200); }}>Quitter</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish early confirm */}
      <AnimatePresence>
        {showFinishConfirm && (
          <motion.div className="daily-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFinishConfirm(false)}>
            <motion.div className="daily-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 320 }}>
              <div className="daily-modal-header">
                <h3 className="daily-modal-title">Terminer la partie ?</h3>
                <button className="daily-modal-close" onClick={() => setShowFinishConfirm(false)}><X size={14} weight="bold" /></button>
              </div>
              <p className="total-confirm-text">Ton meilleur résultat ({formatResult(bestResult)}, {bestResult >= puzzle.target ? '+' : '−'}{formatResult(bestDifference)}) sera utilisé pour te classer. Il te reste {submissionsLeft} essai{submissionsLeft > 1 ? 's' : ''}.</p>
              <div className="total-confirm-btns">
                <button className="daily-btn secondary" onClick={() => setShowFinishConfirm(false)}>Continuer</button>
                <button className="daily-btn primary" onClick={() => { setShowFinishConfirm(false); handleQuitGame(); }}>Terminer</button>
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
