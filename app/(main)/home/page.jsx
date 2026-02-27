'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth, db, ref, set, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useHearts } from '@/lib/hooks/useHearts';
import { useDevAuth } from '@/lib/hooks/useDevAuth';
import { storage } from '@/lib/utils/storage';
import GameCard from '@/lib/components/GameCard';
import GuestWarningModal from '@/components/ui/GuestWarningModal';
import HeartsModal from '@/components/ui/HeartsModal';
import GameModeSelector from '@/components/ui/GameModeSelector';
import AudioModeSelector from '@/components/ui/AudioModeSelector';
import CreateOrJoinSelector from '@/components/ui/CreateOrJoinSelector';
import HowToPlayModal from '@/components/ui/HowToPlayModal';
import RejoinBanner from '@/components/ui/RejoinBanner';
import HomeHeader from '@/components/home/HomeHeader';
import GameFilterBar from '@/components/home/GameFilterBar';
import { useActiveGameCheck } from '@/lib/hooks/usePlayerCleanup';
import { useToast } from '@/lib/hooks/useToast';
import { GameController, Heart } from '@phosphor-icons/react';
import DailyGamesSection from '@/components/home/DailyGamesSection';
import { genUniqueCode } from '@/lib/utils';
import { isFounder } from '@/lib/admin';
import { getVisibleGames, filterByPlayerCount, sortGames, searchGames, applyRemoteConfig } from '@/lib/config/games';
import { useRemoteConfig } from '@/lib/hooks/useRemoteConfig';
import { useGlobalPlayCounts } from '@/lib/hooks/useGlobalPlayCounts';
import { ROOM_TYPES, createRoom } from '@/lib/config/rooms';
import { LobbyEntryTransition } from '@/components/transitions';
import { GAME_COLOR_MAP } from '@/lib/config/colors';

function HomePageContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [showCreateOrJoinSelector, setShowCreateOrJoinSelector] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showAudioModeSelector, setShowAudioModeSelector] = useState(false);
  const [pendingGame, setPendingGame] = useState(null);
  const [selectedGameMasterMode, setSelectedGameMasterMode] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [helpGameId, setHelpGameId] = useState('quiz');
  const { profile, cachedPseudo, subscription } = useUserProfile();
  const userWithSubscription = useMemo(() => user ? { ...user, subscription } : null, [user, subscription]);
  const { isPro, isLoading: subscriptionLoading } = useSubscription(userWithSubscription);
  const {
    heartsRemaining,
    canPlay: canPlayHearts,
    canRecharge,
    consumeHeart,
    rechargeHearts,
    isRecharging,
  } = useHearts({ isPro, uid: user?.uid ?? null });
  const [showRejoinBanner, setShowRejoinBanner] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [playerCountFilter, setPlayerCountFilter] = useState(null);
  const [sortBy, setSortBy] = useState('default'); // 'default', 'popular', 'newest', 'alphabetical'

  // Entry transition state
  const [showEntryTransition, setShowEntryTransition] = useState(false);
  const [transitionConfig, setTransitionConfig] = useState(null);

  // Global play counts for "popular" sort
  const { playCounts } = useGlobalPlayCounts();

  // Remote Config for dynamic game availability
  const { gamesConfig } = useRemoteConfig();

  // Check for active game the player can rejoin
  const activeGame = useActiveGameCheck(user?.uid);

  // Toast notifications
  const toast = useToast();

  // Dev auth bypass - allows ?devAuth=UID to auto-login (localhost only)
  const { isDevAuth, loading: devAuthLoading, error: devAuthError } = useDevAuth();

  // Check if player was kicked from a room (show notification)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const wasKicked = sessionStorage.getItem('lq_wasKicked');
    if (wasKicked) {
      sessionStorage.removeItem('lq_wasKicked');
      // Small delay to ensure toast provider is ready
      setTimeout(() => {
        toast.error('Tu as été exclu de la partie par l\'hôte');
      }, 100);
    }
  }, []); // toast est stable au mount, pas besoin de le relancer

  useEffect(() => {
    // Load favorites from storage
    const savedFavorites = storage.get('favorites');
    if (savedFavorites) {
      setFavorites(savedFavorites);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — router est stable, mais s'il change la re-subscription crée un loop infini

  const handleToggleFavorite = (gameId) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];

    setFavorites(newFavorites);
    storage.set('favorites', newFavorites);
  };

  // Actually create the game room and navigate
  const createAndNavigateToGame = async (game, gameMasterMode = 'gamemaster', audioMode = 'single') => {
    // Local games (like Mime) - no Firebase, direct navigation
    // Note: consumeHeart() is called in each game's start handler, not here
    if (game.local) {
      router.push(game.path || `/${game.id}`);
      return;
    }

    const code = await genUniqueCode();
    const hostName = profile?.pseudo || cachedPseudo || user?.displayName?.split(' ')[0] || 'Animateur';

    try {
      const { path, navigateBeforeCreate, writePromise } = await createRoom({
        gameId: game.id,
        code,
        hostUid: auth.currentUser.uid,
        hostName,
        gameMasterMode,
        audioMode,
        db,
        ref,
        set
      });

      // Store transition config and show animation
      setTransitionConfig({
        path,
        color: GAME_COLOR_MAP[game.id] || '#8b5cf6',
        playerName: hostName
      });
      setShowEntryTransition(true);

      // Start room creation in background (or wait if needed)
      if (navigateBeforeCreate) {
        writePromise.catch(err => console.error(`${game.id} room creation error:`, err));
      } else {
        await writePromise;
      }
    } catch (err) {
      console.error(`${game.id} room creation error:`, err);
      setShowEntryTransition(false);
      setTransitionConfig(null);
    }
  };

  // Handle transition complete - navigate to room
  const handleTransitionComplete = () => {
    if (transitionConfig) {
      // Don't reset transition state - let it stay visible during navigation
      // The transition overlay (z-9999) covers everything while the lobby loads underneath
      // It disappears naturally when this component unmounts on page change
      router.push(transitionConfig.path);
    }
  };

  const handleGameClick = (game) => {
    // Redirect to coming soon page for unreleased games (founders bypass)
    if (game.comingSoon && !userIsFounder) {
      router.push(`/coming-soon/${game.id}`);
      return;
    }

    // Local games (like Mime) - no restrictions, direct navigation
    if (game.local) {
      createAndNavigateToGame(game);
      return;
    }

    // Block guests from creating games - they can only join
    if (user?.isAnonymous) {
      setShowGuestWarning(true);
      return;
    }

    // Check hearts for non-Pro users (0 hearts = blocked)
    // Ne pas bloquer pendant le chargement de l'abonnement
    if (!subscriptionLoading && !isPro && !canPlayHearts) {
      setShowHeartsModal(true);
      return;
    }

    // Show Create or Join selector for all multiplayer games
    setPendingGame(game);
    setShowCreateOrJoinSelector(true);
  };

  // Handle Create or Join selection
  const handleCreateSelect = () => {
    if (!pendingGame) return;

    setShowCreateOrJoinSelector(false);

    // Check if game supports Party Mode - show mode selector
    const roomType = ROOM_TYPES.find(rt => rt.id === pendingGame.id);
    if (roomType?.supportsPartyMode) {
      setShowModeSelector(true);
      return;
    }

    // No party mode - create game directly (default gamemaster mode)
    createAndNavigateToGame(pendingGame);
    setPendingGame(null);
  };

  const handleJoinSelect = () => {
    setShowCreateOrJoinSelector(false);
    setPendingGame(null);

    // Redirect to join page
    router.push('/join');
  };

  // Handle mode selection from GameModeSelector
  const handleModeSelect = (mode) => {
    if (!pendingGame) return;

    // For blindtest, show audio mode selector next
    if (pendingGame.id === 'blindtest') {
      setSelectedGameMasterMode(mode);
      setShowModeSelector(false);
      setShowAudioModeSelector(true);
      return;
    }

    // For other games, create directly (no audio mode)
    setShowModeSelector(false);
    createAndNavigateToGame(pendingGame, mode);
    setPendingGame(null);
  };

  // Handle audio mode selection from AudioModeSelector
  const handleAudioModeSelect = async (audioMode) => {
    if (!pendingGame || !selectedGameMasterMode) return;

    setShowAudioModeSelector(false);

    // Create room with both gameMasterMode and audioMode
    await createAndNavigateToGame(pendingGame, selectedGameMasterMode, audioMode);

    // Reset states
    setPendingGame(null);
    setSelectedGameMasterMode(null);
  };

  // Handle recharging hearts via rewarded ad
  const handleRechargeHearts = async () => {
    const result = await rechargeHearts();
    if (result?.recharged) {
      setShowHeartsModal(false);
      if (result.adPlayed) {
        toast.success('❤ +5 cœurs rechargés !');
      } else {
        toast.success('❤ +5 cœurs rechargés ! (pub non dispo)');
      }
    }
  };

  // Handle upgrade to Pro
  const handleUpgradeToPro = () => {
    setPendingGame(null);
    router.push('/subscribe');
  };

  // Handle showing help for a game
  const handleShowHelp = (gameId) => {
    setHelpGameId(gameId);
    setShowHowToPlay(true);
  };

  // Handlers for guest warning modal sign-in
  const handleGuestWarningGoogle = async () => {
    try {
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
        setShowGuestWarning(false);
        // User state updates via onAuthStateChanged
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  const handleGuestWarningApple = async () => {
    try {
      const result = await signInWithApple();
      if (result?.user) {
        await initializeUserProfile(result.user);
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
        setShowGuestWarning(false);
      }
    } catch (err) {
      console.error('Apple sign-in error:', err);
    }
  };

  // Filter out founders-only games for non-founders, then apply Remote Config overrides
  const userIsFounder = isFounder(user);

  // Memoize visible games (only recalculate when user or config changes)
  const visibleGames = useMemo(() => {
    return applyRemoteConfig(getVisibleGames(userIsFounder), gamesConfig);
  }, [userIsFounder, gamesConfig]);

  // Memoize favorite games
  const favoriteGames = useMemo(() => {
    return visibleGames.filter(game => favorites.includes(game.id));
  }, [visibleGames, favorites]);

  // Memoize filtered & sorted games (only recalculate when filters change)
  const allGames = useMemo(() => {
    let games = visibleGames;
    games = searchGames(games, searchQuery);
    games = filterByPlayerCount(games, playerCountFilter);
    games = sortGames(games, sortBy, playCounts);
    return games;
  }, [visibleGames, searchQuery, playerCountFilter, sortBy, playCounts]);


  return (
    <motion.div
      className="home-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      <main className="home-content">
        {/* Modern Header 2025 */}
        <HomeHeader
          displayName={profile?.pseudo || cachedPseudo || user?.displayName?.split(' ')[0] || 'Joueur'}
          avatarInitial={(profile?.pseudo?.[0] || cachedPseudo?.[0] || user?.displayName?.[0] || 'J').toUpperCase()}
          isPro={isPro}
          heartsRemaining={heartsRemaining}
          heartsVisible={!subscriptionLoading}
          onHeartsClick={() => setShowHeartsModal(true)}
        />

        {/* Rejoin Banner - Show when player has an active game */}
        {activeGame && showRejoinBanner && (
          <RejoinBanner
            activeGame={activeGame}
            onDismiss={() => {
              setShowRejoinBanner(false);
              storage.remove('last_game');
            }}
          />
        )}

        {/* Daily Games Section */}
        <DailyGamesSection />

        {/* Search & Filter Bar */}
        <GameFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          playerCountFilter={playerCountFilter}
          onPlayerCountChange={setPlayerCountFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Favorites Section */}
        {favoriteGames.length > 0 && (
          <motion.section
            className="favorites-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="section-title">
              <Heart weight="fill" className="title-icon" size={24} style={{ color: 'var(--brand-rose)' }} />
              Favoris
            </h2>
            <div className="favorites-grid">
              {favoriteGames.map((game) => (
                <motion.div
                  key={game.id}
                  className="grid-item"
                  layout
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                >
                  <GameCard
                    game={game}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    onClick={handleGameClick}
                    onShowHelp={handleShowHelp}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* All Games Section */}
        <motion.section
          className="games-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          {favoriteGames.length > 0 && (
            <h2 className="section-title">
              <GameController weight="fill" className="title-icon" size={24} />
              Tous les Jeux
            </h2>
          )}
          <div className="games-grid">
            {allGames.map((game) => (
              <motion.div
                key={game.id}
                className="grid-item"
                layout
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              >
                <GameCard
                  game={game}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={handleGameClick}
                  onShowHelp={handleShowHelp}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>


        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>


      {/* Guest Warning Modal - Blocks game creation for guests */}
      <GuestWarningModal
        isOpen={showGuestWarning}
        onClose={() => setShowGuestWarning(false)}
        onSignInGoogle={handleGuestWarningGoogle}
        onSignInApple={handleGuestWarningApple}
        context="home"
      />

      {/* Hearts Modal - Info / recharge cœurs */}
      <HeartsModal
        isOpen={showHeartsModal}
        onClose={() => setShowHeartsModal(false)}
        heartsRemaining={heartsRemaining}
        canRecharge={canRecharge}
        isWatchingAd={isRecharging}
        onWatchAd={handleRechargeHearts}
        onUpgrade={() => { router.push('/subscribe'); setShowHeartsModal(false); }}
      />

      {/* Create or Join Selector - First step for all multiplayer games */}
      <CreateOrJoinSelector
        isOpen={showCreateOrJoinSelector}
        onClose={() => {
          setShowCreateOrJoinSelector(false);
          setPendingGame(null);
        }}
        onSelectCreate={handleCreateSelect}
        onSelectJoin={handleJoinSelect}
        game={pendingGame}
      />

      {/* Game Mode Selector - Choose between Game Master and Party Mode */}
      <GameModeSelector
        isOpen={showModeSelector}
        onClose={() => {
          setShowModeSelector(false);
          setPendingGame(null);
        }}
        onSelectMode={handleModeSelect}
        game={pendingGame}
      />

      {/* Audio Mode Selector - Choose where audio plays (DeezTest only) */}
      <AudioModeSelector
        isOpen={showAudioModeSelector}
        onClose={() => {
          setShowAudioModeSelector(false);
          setPendingGame(null);
          setSelectedGameMasterMode(null);
        }}
        onSelectMode={handleAudioModeSelect}
        game={pendingGame}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        gameType={helpGameId}
      />

      {/* Entry Transition - Door opening animation before entering lobby */}
      {showEntryTransition && transitionConfig && (
        <LobbyEntryTransition
          key={transitionConfig.path}
          gameColor={transitionConfig.color}
          playerName={transitionConfig.playerName}
          onComplete={handleTransitionComplete}
          duration={2000}
        />
      )}
    </motion.div>
  );
}

// Wrap with Suspense for useSearchParams (used by useDevAuth)
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
