'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth, db, ref, set } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { storage } from '@/lib/utils/storage';
import GameCard from '@/lib/components/GameCard';
import BottomNav from '@/lib/components/BottomNav';
import { Target, UserSearch, Gamepad2, Heart, Sparkles, Music, Brain } from 'lucide-react';
import { genCode } from '@/lib/utils';

const GAMES = [
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    Icon: Target,
    packLimit: 3,
    image: '/images/quiz-buzzer.png',
  },
  {
    id: 'alibi',
    name: 'Alibi',
    Icon: UserSearch,
    packLimit: 3,
    image: '/images/alibi.png',
  },
  {
    id: 'blindtest',
    name: 'Blind Test',
    Icon: Music,
    packLimit: 3,
    image: '/images/blind-test.png',
    comingSoon: true,
  },
  {
    id: 'memory',
    name: 'Memory',
    Icon: Brain,
    packLimit: 3,
    image: '/images/memory.png',
    comingSoon: true,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const { isPro, isAdmin, tier } = useSubscription(user);

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
  }, [router]);

  const handleToggleFavorite = (gameId) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];

    setFavorites(newFavorites);
    storage.set('favorites', newFavorites);
  };

  const handleGameClick = async (game) => {
    // Redirect to coming soon page for unreleased games
    if (game.comingSoon) {
      router.push(`/coming-soon/${game.id}`);
      return;
    }

    const c = genCode();
    const now = Date.now();

    if (game.id === 'quiz') {
      // Créer une room Quiz
      await set(ref(db, `rooms/${c}/meta`), {
        code: c,
        createdAt: now,
        hostUid: auth.currentUser.uid,
        expiresAt: now + 12 * 60 * 60 * 1000,
        mode: "individuel",
        teamCount: 0,
        quizId: "general",
        teams: {}
      });
      await set(ref(db, `rooms/${c}/state`), {
        phase: "lobby",
        currentIndex: 0,
        revealed: false,
        lockUid: null,
        buzzBanner: "",
        lastRevealAt: 0
      });
      await set(ref(db, `rooms/${c}/__health__`), { aliveAt: now });
      router.push(`/room/${c}`);
    } else if (game.id === 'alibi') {
      // Créer une room Alibi
      await set(ref(db, `rooms_alibi/${c}/meta`), {
        code: c,
        createdAt: now,
        hostUid: auth.currentUser.uid,
        expiresAt: now + 12 * 60 * 60 * 1000,
        alibiId: null,
        gameType: "alibi"
      });
      await set(ref(db, `rooms_alibi/${c}/teams`), {
        inspectors: [],
        suspects: []
      });
      await set(ref(db, `rooms_alibi/${c}/state`), {
        phase: "lobby",
        currentQuestion: 0,
        prepTimeLeft: 90,
        questionTimeLeft: 30,
        allAnswered: false
      });
      await set(ref(db, `rooms_alibi/${c}/score`), {
        correct: 0,
        total: 10
      });
      router.push(`/alibi/room/${c}`);
    }
  };

  const favoriteGames = GAMES.filter(game => favorites.includes(game.id));
  const allGames = GAMES;

  return (
    <div className="home-container">
      <main className="home-content">
        {/* Modern Header 2025 */}
        <header className="home-header-modern">
          <div className="profile-section">
            <div className="avatar-container">
              <div className="avatar-placeholder">
                {(user?.displayName?.[0] || 'J').toUpperCase()}
              </div>
              <div className="avatar-status"></div>
            </div>

            <div className="user-info">
              <p className="greeting-text">Bienvenue</p>
              <h1 className="user-name">{user?.displayName?.split(' ')[0] || 'Joueur'}</h1>
            </div>
          </div>

          <div className="header-actions">
            {isAdmin ? (
              <div className="admin-badge-modern">
                <span>👑</span>
                <span>ADMIN</span>
              </div>
            ) : isPro ? (
              <div className="pro-badge-modern">
                <Sparkles size={14} />
                <span>PRO</span>
              </div>
            ) : (
              <motion.button
                className="upgrade-btn-header"
                onClick={() => router.push('/profile')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles size={14} />
                <span>Mise à niveau</span>
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
                    isLocked={!isPro && !game.isFree}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    onClick={handleGameClick}
                    user={user}
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
                  isLocked={!isPro && !game.isFree}
                  isFavorite={favorites.includes(game.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={handleGameClick}
                  user={user}
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
    </div>
  );
}
