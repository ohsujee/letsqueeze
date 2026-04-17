'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Lightbulb, Trophy } from '@phosphor-icons/react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { getFlatCSSVars } from '@/lib/config/colors';
import { getStreakFlames } from '@/components/daily/dailyHelpers';

import { GameEndTransition } from '@/components/transitions';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';
import DailyHeader from '@/components/daily/DailyHeader';
import DailyTabs from '@/components/daily/DailyTabs';
import DailyStatsModal from '@/components/daily/DailyStatsModal';
import DailyResultBanner from '@/components/daily/DailyResultBanner';
import DailyLeaderboard from '@/components/daily/DailyLeaderboard';
import '@/components/daily/daily-base.css';

import { useCodeBreakerGame, COLORS } from './_hooks/useCodeBreakerGame';
import CodeBreakerBoard from './_components/CodeBreakerBoard';
import CodeBreakerPalette from './_components/CodeBreakerPalette';
import './codebreaker.css';

const TABS = [
  { id: 'game',        label: 'Jeu',        icon: <Lightbulb size={14} weight="fill" /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={14} weight="fill" /> },
];

const CSS_VARS = getFlatCSSVars('codebreaker');

function useServerDate() {
  const [serverDate, setServerDate] = useState(null);
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(
      offsetRef,
      (snap) => {
        const offset = snap.val() ?? 0;
        setServerDate(new Date(Date.now() + offset).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }));
      },
      () => setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })),
    );
    return () => unsub();
  }, []);
  return serverDate;
}

export default function CodeBreakerPage() {
  useAppShellBg('#6366f1');
  const router = useRouter();
  const serverDate = useServerDate();

  const daily = useDailyGame('codebreaker', { forceDate: serverDate });
  const { triggerPostGameAd, triggered: adTriggered } = usePostGameAd();
  const { openManually: openHowToPlay } = useHowToPlay();

  const game = useCodeBreakerGame({ todayDate: daily.todayDate, daily });

  const [activeTab, setActiveTab] = useState('game');
  const [showStats, setShowStats] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const freshCompletionRef = useRef(false);
  const transitionTimerRef = useRef(null);

  // Marquer completion fraîche quand le jeu vient de se terminer (pas un restore)
  useEffect(() => {
    if (game.freshGameOver && game.showResult) {
      freshCompletionRef.current = true;
    }
  }, [game.freshGameOver, game.showResult]);

  // Auto-transition vers classement 2s après résultat frais
  useEffect(() => {
    if (!game.showResult || !freshCompletionRef.current) return;
    transitionTimerRef.current = setTimeout(() => setShowTransition(true), 2000);
    return () => clearTimeout(transitionTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.showResult]);

  const handleShowLeaderboard = useCallback(() => {
    if (freshCompletionRef.current && !adTriggered.current) {
      clearTimeout(transitionTimerRef.current);
      triggerPostGameAd(() => setActiveTab('leaderboard'), { delay: 0 });
    } else {
      setActiveTab('leaderboard');
    }
  }, [triggerPostGameAd, adTriggered]);

  if (!serverDate || !daily.loaded) {
    return (
      <div className="daily-page" style={CSS_VARS}>
        <div className="daily-loading">
          <div className="daily-spinner" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-page" style={CSS_VARS}>
      <DailyHeader
        title="Code Breaker"
        onBack={() => router.push('/home')}
        onStats={() => setShowStats(true)}
        onHelp={openHowToPlay}
      />

      <DailyTabs active={activeTab} onChange={setActiveTab} tabs={TABS} />

      <DailyStatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="Mes statistiques"
        stats={daily.stats}
        streak={daily.streak}
        hint="Jouez chaque jour pour maintenir votre série !"
      />

      {/* Carrousel Jeu ↔ Classement */}
      <div className="daily-tab-carousel">
        <div
          className="daily-tab-track"
          style={{ transform: activeTab === 'leaderboard' ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          {/* Slide 1 — Jeu */}
          <div className="daily-tab-slide">
            <CodeBreakerBoard
              guesses={game.guesses}
              currentGuess={game.currentGuess}
              selectedSlot={game.selectedSlot}
              gameOver={game.gameOver}
              freshGameOver={game.freshGameOver}
              secret={game.secret}
              onTapSlot={game.tapSlot}
              lastSubmitIndex={game.lastSubmitIndex}
            />

            {/* Result banner */}
            {game.showResult && (
              <div className="cb-result-wrap">
                <DailyResultBanner
                  emoji={game.solved ? '🎉' : '😢'}
                  verdict={game.solved ? 'Code craqué !' : 'Raté…'}
                  sub={game.solved
                    ? `${game.guesses.length} tentative${game.guesses.length > 1 ? 's' : ''}`
                    : <>Le code était : {game.secret.map((c, i) => (
                        <span key={i} className="cb-result-dot" style={{ background: COLORS[c] }} />
                      ))}
                    </>
                  }
                  score={game.score}
                  unranked={!game.solved}
                  stats={daily.stats}
                  streak={daily.streak}
                  flamesSuffix={getStreakFlames(daily.streak.count)}
                  onShowStats={() => setShowStats(true)}
                  onShowLeaderboard={handleShowLeaderboard}
                />
              </div>
            )}

            {/* Palette (cachée quand game over) */}
            {!game.gameOver && (
              <CodeBreakerPalette
                onSelectColor={game.selectColor}
                onClear={game.clearGuess}
                onSubmit={game.submitGuess}
                isFull={game.isFull}
                disabled={game.gameOver}
              />
            )}
          </div>

          {/* Slide 2 — Classement */}
          <div className="daily-tab-slide">
            <LeaderboardErrorBoundary>
              <DailyLeaderboard
                firebaseNode="daily/codebreaker"
                todayDate={daily.todayDate}
                emptyEmoji="🔮"
                emptyText="Personne encore — sois le premier !"
                renderMeta={(entry, tab) => tab === 'week'
                  ? `${entry.days} jour${entry.days > 1 ? 's' : ''}`
                  : `${entry.attempts} tentative${entry.attempts > 1 ? 's' : ''}`
                }
              />
            </LeaderboardErrorBoundary>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTransition && (
          <GameEndTransition
            variant="codebreaker"
            duration={1500}
            onComplete={() => {
              triggerPostGameAd(() => {
                setActiveTab('leaderboard');
                setShowTransition(false);
              }, { delay: 0 });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
