'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth, db, ref, set, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useGameLimits } from '@/lib/hooks/useGameLimits';
import { storage } from '@/lib/utils/storage';
import GameCard from '@/lib/components/GameCard';
import BottomNav from '@/lib/components/BottomNav';
import GuestAccountPromptModal from '@/components/ui/GuestAccountPromptModal';
import GuestWarningModal from '@/components/ui/GuestWarningModal';
import GameLimitModal from '@/components/ui/GameLimitModal';
import { Target, UserSearch, Gamepad2, Heart, Sparkles, Music, Brain, ChevronsUp, Crown } from 'lucide-react';
import { genCode } from '@/lib/utils';

const GAMES = [
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    Icon: Target,
    packLimit: 3,
    image: '/images/quiz-buzzer.png',
    minPlayers: 2,
  },
  {
    id: 'alibi',
    name: 'Alibi',
    Icon: UserSearch,
    packLimit: 3,
    image: '/images/alibi.png',
    minPlayers: 3,
  },
  {
    id: 'blindtest',
    name: 'Blind Test',
    Icon: Music,
    packLimit: 3,
    image: '/images/blind-test.png',
    minPlayers: 2,
    comingSoon: true,
  },
  {
    id: 'memory',
    name: 'Memory',
    Icon: Brain,
    packLimit: 3,
    image: '/images/memory.png',
    minPlayers: 2,
    comingSoon: true,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [showGameLimit, setShowGameLimit] = useState(false);
  const [pendingGame, setPendingGame] = useState(null);
  const { isPro } = useSubscription(user);
  const { profile } = useUserProfile();

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
  const createAndNavigateToGame = (game) => {
    const c = genCode();
    const now = Date.now();

    // Record game played (for limits tracking)
    recordGamePlayed();

    if (game.id === 'quiz') {
      router.push(`/room/${c}`);
      Promise.all([
        set(ref(db, `rooms/${c}/meta`), {
          code: c,
          createdAt: now,
          hostUid: auth.currentUser.uid,
          expiresAt: now + 12 * 60 * 60 * 1000,
          mode: "individuel",
          teamCount: 0,
          quizId: "general",
          teams: {}
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
    }
  };

  const handleGameClick = (game) => {
    // Redirect to coming soon page for unreleased games
    if (game.comingSoon) {
      router.push(`/coming-soon/${game.id}`);
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

    // Can play - create game
    createAndNavigateToGame(game);
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

  const favoriteGames = GAMES.filter(game => favorites.includes(game.id));
  const allGames = GAMES;

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
            <motion.div
              className="favorites-grid"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {favoriteGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  className="grid-item"
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.9 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 18,
                    mass: 0.5
                  }}
                >
                  <GameCard
                    game={game}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    onClick={handleGameClick}
                  />
                </motion.div>
              ))}
            </motion.div>
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
          <motion.div
            className="games-grid"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {allGames.map((game, index) => (
              <motion.div
                key={game.id}
                className="grid-item"
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.8 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }
                }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 18,
                  mass: 0.5
                }}
              >
                <GameCard
                  game={game}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={handleGameClick}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>


        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

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
    </div>
  );
}
