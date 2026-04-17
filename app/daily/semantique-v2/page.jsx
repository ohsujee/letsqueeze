'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Trophy, Lightbulb } from '@phosphor-icons/react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

import { useDailyGame } from '@/lib/hooks/useDailyGame';
import { usePostGameAd } from '@/lib/hooks/useInterstitialAd';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { getFlatCSSVars } from '@/lib/config/colors';

import { GameEndTransition } from '@/components/transitions';
import SuspiciousResultModal from '@/components/ui/SuspiciousResultModal';
import ScoreUpdateModal from '@/components/ui/ScoreUpdateModal';
import MidnightModal from '@/components/ui/MidnightModal';
import LeaderboardErrorBoundary from '@/components/shared/LeaderboardErrorBoundary';

import DailyHeader from '@/components/daily/DailyHeader';
import DailyTabs from '@/components/daily/DailyTabs';
import DailyStatsModal from '@/components/daily/DailyStatsModal';
import DailyResultBanner from '@/components/daily/DailyResultBanner';
import DailyLeaderboard from '@/components/daily/DailyLeaderboard';
import '@/components/daily/daily-base.css';

import { useSemanticKeyboard } from './_hooks/useSemanticKeyboard';
import { useSemanticGame } from './_hooks/useSemanticGame';
import { getStreakFlames } from '@/components/daily/dailyHelpers';
import SemanticGuessTable from './_components/SemanticGuessTable';
import SemanticInputBar from './_components/SemanticInputBar';
import './semantique-v2.css';

// ─── Constantes (hors composant pour éviter recréation à chaque render) ──
const TABS = [
  { id: 'game',        label: 'Jeu',        icon: <Lightbulb size={14} weight="fill" /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={14} weight="fill" /> },
];

// ─── Helpers locaux ───────────────────────────────────────────────────────
function formatDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function useServerDate() {
  const [serverDate, setServerDate] = useState(null);
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(
      offsetRef,
      (snap) => {
        const offset = snap.val() ?? 0;
        const date = new Date(Date.now() + offset).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        setServerDate(date);
      },
      () => setServerDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })),
    );
    return () => unsub();
  }, []);
  return [serverDate, setServerDate];
}

function useYesterdayWord(todayDate) {
  const [yesterdayWord, setYesterdayWord] = useState(null);
  useEffect(() => {
    if (!todayDate) return;
    const d = new Date(todayDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const pad = (n) => String(n).padStart(2, '0');
    const y = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    fetch(`/api/daily/semantic-v2-word?date=${y}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.word) setYesterdayWord(data.word); })
      .catch(() => {});
  }, [todayDate]);
  return yesterdayWord;
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function SemantiqueV2Page() {
  useAppShellBg('#e67e22');
  const router = useRouter();
  const [serverDate, setServerDate] = useServerDate();

  const daily = useDailyGame('semantique-v2', { forceDate: serverDate });
  const postGameAd = usePostGameAd();
  const { openManually: openHowToPlay } = useHowToPlay();

  const kb = useSemanticKeyboard();
  const game = useSemanticGame({ daily, serverDate, postGameAd });

  const yesterdayWord = useYesterdayWord(daily.todayDate);

  // Midnight reset : la page contrôle serverDate, le hook game reset son state interne
  const handleMidnightReset = useCallback(() => {
    const freshDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    game.handleMidnightReset();
    setServerDate(freshDate);
  }, [game, setServerDate]);

  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter') game.submit(); }, [game.submit]);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (!serverDate || !daily.loaded) {
    return (
      <div className="sem-v2-page daily-page" style={getFlatCSSVars('semantique')}>
        <div className="daily-loading">
          <div className="daily-spinner" />
          <p>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sem-v2-page daily-page" style={getFlatCSSVars('semantique')}>
      <DailyHeader
        title="Sémantique"
        badge={{ label: 'V2', color: '#06b6d4' }}
        onBack={() => router.push('/home')}
        onStats={() => game.setShowStats(true)}
        onHelp={openHowToPlay}
      />

      <DailyTabs active={game.activeTab} onChange={game.setActiveTab} tabs={TABS} />

      {/* ─── Modals partagées ─── */}
      <MidnightModal
        isOpen={game.showMidnightModal}
        previousDate={game.previousDate}
        newDate={new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })}
        onPlayNewWord={handleMidnightReset}
      />

      <ScoreUpdateModal
        isOpen={game.showScoreUpdateModal}
        onClose={game.handleCloseScoreUpdate}
      />

      <SuspiciousResultModal
        isOpen={game.showSuspiciousModal}
        onAccept={game.handleAcceptSuspicious}
        onPlayAlternative={game.handlePlayAlternative}
        isWatchingAd={game.isLoadingAlt}
      />

      <DailyStatsModal
        isOpen={game.showStats}
        onClose={() => game.setShowStats(false)}
        title="Mes statistiques"
        stats={daily.stats}
        streak={daily.streak}
        hint="Jouez chaque jour pour maintenir votre série !"
      />

      {/* ─── Carrousel Jeu ↔ Classement ─── */}
      <div className="daily-tab-carousel">
        <div
          className="daily-tab-track"
          style={{ transform: game.activeTab === 'leaderboard' ? 'translateX(-100%)' : 'translateX(0)' }}
        >
          {/* Slide 1 — Jeu */}
          <div className="daily-tab-slide">
            <main className="sem-main" ref={kb.mainRef}>
              <div className="sem-scroll" ref={kb.scrollAreaRef}>
                <p className="sem-date">{formatDateLong(daily.todayDate)}</p>

                <AnimatePresence>
                  {game.showingResult && (
                    <DailyResultBanner
                      emoji="🎯"
                      verdict="Trouvé !"
                      sub={
                        <>
                          Le mot était <strong>{game.targetWord?.toUpperCase()}</strong>
                          {' · '}
                          {game.activeGuesses.length} essai{game.activeGuesses.length > 1 ? 's' : ''}
                        </>
                      }
                      score={game.scoreToShow}
                      scoreLabel="pts"
                      unranked={!game.altMode && game.unranked}
                      stats={daily.stats}
                      streak={daily.streak}
                      flamesSuffix={getStreakFlames(daily.streak.count)}
                      onShowStats={() => game.setShowStats(true)}
                      onShowLeaderboard={game.handleShowLeaderboard}
                    />
                  )}
                </AnimatePresence>

                {game.activeGuesses.length === 0 && !game.showingResult && (
                  <div className="sem-empty">
                    <span className="sem-empty-emoji">🧠</span>
                    <p className="sem-empty-text">Quel est le mot du jour ?</p>
                  </div>
                )}

                {game.activeGuesses.length > 0 && (
                  <SemanticGuessTable
                    guesses={game.activeGuesses}
                    flashEntry={game.flashEntry}
                  />
                )}
              </div>

              {!game.showingResult && (
                <SemanticInputBar
                  ref={kb.inputZoneRef}
                  inputRef={game.inputRef}
                  input={game.input}
                  onChange={game.setInput}
                  onSubmit={game.submit}
                  onKeyDown={handleKeyDown}
                  onFocus={kb.onInputFocus}
                  onBlur={kb.onInputBlur}
                  error={game.error}
                  disabled={game.submitDisabled}
                  isSubmitting={game.isSubmitting}
                />
              )}
            </main>
          </div>

          {/* Slide 2 — Classement */}
          <div className="daily-tab-slide">
            <LeaderboardErrorBoundary>
              <DailyLeaderboard
                firebaseNode="daily/semantic"
                todayDate={daily.todayDate}
                yesterdayWord={yesterdayWord}
                emptyEmoji="🧠"
                emptyText="Personne encore — sois le premier !"
                renderMeta={(entry, tab) => tab === 'week'
                  ? `${entry.days} jour${entry.days > 1 ? 's' : ''} joué${entry.days > 1 ? 's' : ''}`
                  : `${entry.attempts} essai${entry.attempts > 1 ? 's' : ''}`
                }
              />
            </LeaderboardErrorBoundary>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {game.showTransition && (
          <GameEndTransition
            variant="semantique"
            duration={1500}
            onComplete={() => {
              postGameAd.triggerPostGameAd(() => {
                game.setActiveTab('leaderboard');
                game.setShowTransition(false);
              }, { delay: 0 });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
