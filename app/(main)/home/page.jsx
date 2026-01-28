'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth, db, ref, set, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useGameLimits } from '@/lib/hooks/useGameLimits';
import { useDevAuth } from '@/lib/hooks/useDevAuth';
import { storage } from '@/lib/utils/storage';
import GameCard from '@/lib/components/GameCard';
import GuestAccountPromptModal from '@/components/ui/GuestAccountPromptModal';
import GuestWarningModal from '@/components/ui/GuestWarningModal';
import GameLimitModal from '@/components/ui/GameLimitModal';
import GameModeSelector from '@/components/ui/GameModeSelector';
import RejoinBanner from '@/components/ui/RejoinBanner';
import { useActiveGameCheck } from '@/lib/hooks/usePlayerCleanup';
import { useToast } from '@/lib/hooks/useToast';
import { Gamepad2, Heart, ChevronsUp, Crown, Search, Users, X, Minus, Plus, ArrowUpDown, TrendingUp, Clock, SortAsc } from 'lucide-react';
import { genUniqueCode } from '@/lib/utils';
import { isFounder } from '@/lib/admin';
import { GAMES, getVisibleGames, filterByPlayerCount, sortGames, searchGames } from '@/lib/config/games';
import { useGlobalPlayCounts } from '@/lib/hooks/useGlobalPlayCounts';
import { ROOM_TYPES } from '@/lib/config/rooms';

function HomePageContent() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [showGameLimit, setShowGameLimit] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingGame, setPendingGame] = useState(null);
  const { isPro } = useSubscription(user);
  const { profile } = useUserProfile();
  const [showRejoinBanner, setShowRejoinBanner] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [playerCountFilter, setPlayerCountFilter] = useState(null);
  const [sortBy, setSortBy] = useState('default'); // 'default', 'popular', 'newest', 'alphabetical'
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const playerModalRef = useRef(null);
  const sortModalRef = useRef(null);

  // Global play counts for "popular" sort
  const { playCounts } = useGlobalPlayCounts();

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (playerModalRef.current && !playerModalRef.current.contains(e.target) && !e.target.closest('.player-filter-btn')) {
        setShowPlayerModal(false);
      }
      if (sortModalRef.current && !sortModalRef.current.contains(e.target) && !e.target.closest('.sort-filter-btn')) {
        setShowSortModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort options with icons
  const sortOptions = [
    { value: 'default', label: 'Par défaut', icon: ArrowUpDown },
    { value: 'popular', label: 'Les plus joués', icon: TrendingUp },
    { value: 'newest', label: 'Nouveautés', icon: Clock },
    { value: 'alphabetical', label: 'A-Z', icon: SortAsc },
  ];

  const currentSortOption = sortOptions.find(o => o.value === sortBy) || sortOptions[0];
  const SortIcon = currentSortOption.icon;

  // Check for active game the player can rejoin
  const activeGame = useActiveGameCheck(user?.uid);

  // Toast notifications
  const toast = useToast();

  // Game limits for quiz (most common game type)
  const {
    canPlayFree,
    canWatchAdForGame,
    isBlocked,
    rewardedGamesRemaining,
    isWatchingAd,
    watchAdForExtraGame,
    recordGamePlayed,
  } = useGameLimits('quiz', isPro);

  // Dev auth bypass - allows ?devAuth=UID to auto-login (localhost only)
  const { isDevAuth, loading: devAuthLoading, error: devAuthError } = useDevAuth();

  // Check if player was kicked from a room (show notification)
  useEffect(() => {
    const wasKicked = sessionStorage.getItem('lq_wasKicked');
    if (wasKicked) {
      sessionStorage.removeItem('lq_wasKicked');
      // Small delay to ensure toast provider is ready
      setTimeout(() => {
        toast.error('Tu as été exclu de la partie par l\'hôte');
      }, 100);
    }
  }, [toast]);

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

        // Check if we should show guest account prompt
        if (currentUser.isAnonymous) {
          checkGuestPrompt();
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Check if we should show the guest account prompt
  const checkGuestPrompt = () => {
    // Check if user just returned from a game
    const returnedFromGame = storage.get('returnedFromGame');
    if (!returnedFromGame) return;

    // Clear the flag
    storage.remove('returnedFromGame');

    // Increment games played counter
    const gamesPlayed = (storage.get('guestGamesPlayed') || 0) + 1;
    storage.set('guestGamesPlayed', gamesPlayed);

    // Check cooldown (24h since last dismiss)
    const dismissedAt = storage.get('guestPromptDismissedAt');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - dismissedAt) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) return; // Still in cooldown
    }

    // Show prompt after 3 games
    if (gamesPlayed >= 3) {
      // Small delay so page loads first
      setTimeout(() => setShowGuestPrompt(true), 500);
    }
  };

  const handleToggleFavorite = (gameId) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];

    setFavorites(newFavorites);
    storage.set('favorites', newFavorites);
  };

  // Actually create the game room and navigate
  const createAndNavigateToGame = async (game, gameMasterMode = 'gamemaster') => {
    const c = await genUniqueCode();
    const now = Date.now();

    // NOTE: recordGamePlayed() is now called on END pages, not here
    // This ensures a game is only counted when actually completed

    if (game.id === 'quiz') {
      router.push(`/room/${c}`);
      Promise.all([
        set(ref(db, `rooms/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          hostName: profile?.pseudo || user?.displayName?.split(' ')[0] || 'Animateur',
          expiresAt: now + 12 * 60 * 60 * 1000,
          mode: "individuel",
          teamCount: 0,
          quizId: "general",
          teams: {},
          gameMasterMode // 'gamemaster' ou 'party'
        }),
        set(ref(db, `rooms/${c}/state`), {
          phase: "lobby",
          currentIndex: 0,
          revealed: false,
          lockUid: null,
          buzzBanner: "",
          lastRevealAt: 0
        }),
        set(ref(db, `rooms/${c}/__health__`), { aliveAt: now })
      ]).catch(err => console.error('Room creation error:', err));

    } else if (game.id === 'alibi') {
      router.push(`/alibi/room/${c}`);
      Promise.all([
        set(ref(db, `rooms_alibi/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          expiresAt: now + 12 * 60 * 60 * 1000,
          alibiId: null,
          gameType: "alibi"
        }),
        set(ref(db, `rooms_alibi/${c}/teams`), {
          inspectors: [],
          suspects: []
        }),
        set(ref(db, `rooms_alibi/${c}/state`), {
          phase: "lobby",
          currentQuestion: 0,
          prepTimeLeft: 90,
          questionTimeLeft: 30,
          allAnswered: false
        }),
        set(ref(db, `rooms_alibi/${c}/score`), {
          correct: 0,
          total: 10
        })
      ]).catch(err => console.error('Alibi room creation error:', err));

    } else if (game.id === 'blindtest') {
      router.push(`/blindtest/room/${c}`);
      Promise.all([
        set(ref(db, `rooms_blindtest/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          hostName: profile?.pseudo || user?.displayName?.split(' ')[0] || 'Animateur',
          expiresAt: now + 12 * 60 * 60 * 1000,
          mode: "individuel",
          teamCount: 0,
          teams: {},
          spotifyConnected: false,
          playlist: null,
          playlistsUsed: 0,
          gameType: "blindtest",
          gameMasterMode // 'gamemaster' ou 'party'
        }),
        set(ref(db, `rooms_blindtest/${c}/state`), {
          phase: "lobby",
          currentIndex: 0,
          revealed: false,
          snippetLevel: 0,
          lockUid: null,
          buzzBanner: "",
          lastRevealAt: 0,
          elapsedAcc: 0,
          pausedAt: null,
          lockedAt: null
        })
      ]).catch(err => console.error('Blindtest room creation error:', err));
    } else if (game.id === 'deeztest') {
      Promise.all([
        set(ref(db, `rooms_deeztest/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          hostName: profile?.pseudo || user?.displayName?.split(' ')[0] || 'Animateur',
          expiresAt: now + 12 * 60 * 60 * 1000,
          mode: "individuel",
          teamCount: 0,
          teams: {},
          playlist: null,
          playlistsUsed: 0,
          gameType: "deeztest",
          gameMasterMode // 'gamemaster' ou 'party'
        }),
        set(ref(db, `rooms_deeztest/${c}/state`), {
          phase: "lobby",
          currentIndex: 0,
          revealed: false,
          snippetLevel: 0,
          lockUid: null,
          buzzBanner: "",
          lastRevealAt: 0,
          elapsedAcc: 0,
          pausedAt: null,
          lockedAt: null
        })
      ]).then(() => {
        router.push(`/deeztest/room/${c}`);
      }).catch(err => {
        console.error('Deeztest room creation error:', err);
      });
    } else if (game.id === 'mime') {
      // Jeu local - pas de Firebase, navigation directe
      router.push('/mime');
      return; // Pas besoin de recordGamePlayed pour un jeu local
    } else if (game.id === 'laloi') {
      Promise.all([
        set(ref(db, `rooms_laloi/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          expiresAt: now + 12 * 60 * 60 * 1000,
          gameType: "laloi",
          mode: "classic",
          timerDuration: 300,
          investigatorCount: 1
        }),
        set(ref(db, `rooms_laloi/${c}/state`), {
          phase: "lobby",
          investigatorUids: [],
          currentRule: null,
          ruleOptions: [],
          votes: {},
          rerollsUsed: 0,
          guessAttempts: 0,
          guesses: [],
          roundNumber: 1,
          playedRuleIds: []
        })
      ]).then(() => {
        router.push(`/laloi/room/${c}`);
      }).catch(err => {
        console.error('LaLoi room creation error:', err);
      });
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

    // Check game limits for non-Pro users
    if (!isPro) {
      if (isBlocked) {
        // No free games and no rewarded games left
        setPendingGame(game);
        setShowGameLimit(true);
        return;
      }

      if (!canPlayFree && canWatchAdForGame) {
        // Out of free games but can watch ad
        setPendingGame(game);
        setShowGameLimit(true);
        return;
      }
    }

    // Check if game supports Party Mode - show selector
    const roomType = ROOM_TYPES.find(rt => rt.id === game.id);
    if (roomType?.supportsPartyMode) {
      setPendingGame(game);
      setShowModeSelector(true);
      return;
    }

    // Can play - create game (default gamemaster mode)
    createAndNavigateToGame(game);
  };

  // Handle mode selection from GameModeSelector
  const handleModeSelect = (mode) => {
    if (pendingGame) {
      createAndNavigateToGame(pendingGame, mode);
      setPendingGame(null);
    }
  };

  // Handle watching ad for extra game
  const handleWatchAdForGame = async () => {
    const success = await watchAdForExtraGame();
    if (success && pendingGame) {
      setShowGameLimit(false);
      createAndNavigateToGame(pendingGame);
      setPendingGame(null);
    }
  };

  // Handle upgrade to Pro
  const handleUpgradeToPro = () => {
    setShowGameLimit(false);
    setPendingGame(null);
    router.push('/subscribe');
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

  // Filter out founders-only games for non-founders
  const userIsFounder = isFounder(user);
  const visibleGames = getVisibleGames(userIsFounder);

  const favoriteGames = visibleGames.filter(game => favorites.includes(game.id));

  // Apply search, filter, and sort to games
  let filteredGames = visibleGames;
  filteredGames = searchGames(filteredGames, searchQuery);
  filteredGames = filterByPlayerCount(filteredGames, playerCountFilter);
  filteredGames = sortGames(filteredGames, sortBy, playCounts);
  const allGames = filteredGames;

  // Check if any filters are active
  const hasActiveFilters = searchQuery || playerCountFilter || sortBy !== 'default';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setPlayerCountFilter(null);
    setSortBy('default');
  };

  // Player count stepper handlers
  const incrementPlayerCount = () => {
    if (playerCountFilter === null) {
      setPlayerCountFilter(2);
    } else if (playerCountFilter < 20) {
      setPlayerCountFilter(playerCountFilter + 1);
    }
  };

  const decrementPlayerCount = () => {
    if (playerCountFilter !== null && playerCountFilter > 2) {
      setPlayerCountFilter(playerCountFilter - 1);
    } else {
      setPlayerCountFilter(null);
    }
  };

  return (
    <div className="home-container">
      <main className="home-content">
        {/* Modern Header 2025 */}
        <header className="home-header-modern">
          <div className="avatar-container">
            <div className="avatar-placeholder">
              {(profile?.pseudo?.[0] || user?.displayName?.[0] || 'J').toUpperCase()}
            </div>
            <div className="avatar-status"></div>
          </div>

          <h1 className="user-name">{profile?.pseudo || user?.displayName?.split(' ')[0] || 'Joueur'}</h1>

          <div className="header-actions">
            {isPro ? (
              <motion.div
                className="pro-badge-circle"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Membre Pro"
              >
                <Crown size={20} strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.button
                className="upgrade-btn-circle"
                onClick={() => router.push('/subscribe')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Passer Pro"
              >
                <ChevronsUp size={20} strokeWidth={2.5} />
              </motion.button>
            )}
          </div>
        </header>

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

        {/* Search & Filter Bar - Gaming Style */}
        <div className="game-filter-bar">
          {/* Search Input with Glow */}
          <div className="game-search-wrapper">
            <Search className="game-search-icon" size={20} />
            <input
              type="text"
              className="game-search-input"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="game-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="game-filter-actions">
            {/* Player Count Button */}
            <div className="player-filter-wrapper">
              <motion.button
                className={`player-filter-btn ${playerCountFilter ? 'active' : ''}`}
                onClick={() => {
                  setShowPlayerModal(!showPlayerModal);
                  setShowSortModal(false);
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Users size={18} />
                {playerCountFilter && <span className="player-count-badge">{playerCountFilter}</span>}
              </motion.button>

              {/* Player Count Mini-Modal */}
              {showPlayerModal && (
                <motion.div
                  ref={playerModalRef}
                  className="player-modal"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="player-modal-header">Nombre de joueurs</div>
                  <div className="player-stepper">
                    <motion.button
                      className="stepper-btn minus"
                      onClick={decrementPlayerCount}
                      whileTap={{ scale: 0.9 }}
                      disabled={playerCountFilter === null}
                    >
                      <Minus size={18} />
                    </motion.button>
                    <div className="stepper-value">
                      {playerCountFilter !== null ? (
                        <span className="value-number">{playerCountFilter}</span>
                      ) : (
                        <span className="value-all">Tous</span>
                      )}
                    </div>
                    <motion.button
                      className="stepper-btn plus"
                      onClick={incrementPlayerCount}
                      whileTap={{ scale: 0.9 }}
                      disabled={playerCountFilter === 20}
                    >
                      <Plus size={18} />
                    </motion.button>
                  </div>
                  {playerCountFilter && (
                    <button
                      className="player-modal-reset"
                      onClick={() => {
                        setPlayerCountFilter(null);
                        setShowPlayerModal(false);
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            {/* Sort Button with Modal */}
            <div className="sort-filter-wrapper">
              <motion.button
                className={`sort-filter-btn ${sortBy !== 'default' ? 'active' : ''}`}
                onClick={() => {
                  setShowSortModal(!showSortModal);
                  setShowPlayerModal(false);
                }}
                whileTap={{ scale: 0.95 }}
              >
                <SortIcon size={18} />
              </motion.button>

              {/* Sort Modal */}
              {showSortModal && (
                <motion.div
                  ref={sortModalRef}
                  className="sort-modal"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="sort-modal-header">Trier par</div>
                  <div className="sort-options">
                    {sortOptions.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <button
                          key={option.value}
                          className={`sort-option ${sortBy === option.value ? 'active' : ''}`}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortModal(false);
                          }}
                        >
                          <OptionIcon size={16} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {sortBy !== 'default' && (
                    <button
                      className="sort-modal-reset"
                      onClick={() => {
                        setSortBy('default');
                        setShowSortModal(false);
                      }}
                    >
                      Réinitialiser
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        {favoriteGames.length > 0 && (
          <motion.section
            className="favorites-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h2 className="section-title">
              <Heart className="title-icon" size={24} fill="var(--brand-rose)" stroke="var(--brand-rose)" />
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
          <h2 className="section-title">
            <Gamepad2 className="title-icon" size={24} strokeWidth={2.5} />
            Tous les Jeux
          </h2>
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
                />
              </motion.div>
            ))}
          </div>
        </motion.section>


        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>


      {/* Guest Account Prompt Modal */}
      <GuestAccountPromptModal
        isOpen={showGuestPrompt}
        onClose={() => setShowGuestPrompt(false)}
        onConnected={() => {
          // Refresh user state after connection
          setUser(auth.currentUser);
        }}
      />

      {/* Guest Warning Modal - Blocks game creation for guests */}
      <GuestWarningModal
        isOpen={showGuestWarning}
        onClose={() => setShowGuestWarning(false)}
        onSignInGoogle={handleGuestWarningGoogle}
        onSignInApple={handleGuestWarningApple}
        context="home"
      />

      {/* Game Limit Modal - Shows when free games exhausted */}
      <GameLimitModal
        isOpen={showGameLimit}
        onClose={() => {
          setShowGameLimit(false);
          setPendingGame(null);
        }}
        onWatchAd={handleWatchAdForGame}
        onUpgrade={handleUpgradeToPro}
        rewardedGamesRemaining={rewardedGamesRemaining}
        isWatchingAd={isWatchingAd}
        isBlocked={isBlocked}
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
    </div>
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
