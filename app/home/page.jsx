'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged, auth, db, ref, set } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import GameCard from '@/lib/components/GameCard';
import BottomNav from '@/lib/components/BottomNav';
import { Target, UserSearch, Gamepad2, Heart, Sparkles } from 'lucide-react';
import { genCode } from '@/lib/utils';

const GAMES = [
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    Icon: Target,
    players: '2-8 joueurs',
    packLimit: 3,
    image: '/images/quiz-buzzer.png',
  },
  {
    id: 'alibi',
    name: 'Alibi',
    Icon: UserSearch,
    players: '3-8 joueurs',
    packLimit: 3,
    image: '/images/alibi.png',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const { isPro, isAdmin, tier } = useSubscription(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);

        // Load favorites from localStorage
        const savedFavorites = localStorage.getItem('favorites');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleToggleFavorite = (gameId) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];

    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const handleGameClick = async (game) => {
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-primary);
            border-top-color: var(--brand-blue);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
            ) : null}
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

        {/* Free User Banner */}
        {!isPro && (
          <motion.section
            className="upgrade-banner"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.4,
              type: "spring",
              stiffness: 80
            }}
          >
            <div className="banner-content">
              <Sparkles className="banner-icon" size={40} strokeWidth={2} />
              <div className="banner-text">
                <h3 className="banner-title">Passez à Pro</h3>
                <p className="banner-description">
                  Déverrouillez tous les jeux et supprimez les publicités
                </p>
              </div>
              <motion.button
                className="banner-btn"
                onClick={() => router.push('/profile')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Upgrade
              </motion.button>
            </div>
          </motion.section>
        )}

        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }

        .home-content {
          padding: var(--space-6);
          padding-bottom: 100px;
          max-width: 1200px;
          margin: 0 auto;
          animation: fadeIn 0.4s ease;
          position: relative;
          z-index: 1;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Modern Header 2025 */
        .home-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-8);
          padding: var(--space-6);
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          animation: slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .avatar-container {
          position: relative;
        }

        .avatar-placeholder {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-full);
          border: 3px solid var(--brand-electric);
          box-shadow: 0 0 20px var(--glow-electric);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          color: white;
          font-family: var(--font-display);
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-black);
        }

        .avatar-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 16px;
          height: 16px;
          background: #10B981;
          border-radius: var(--radius-full);
          border: 3px solid var(--bg-primary);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
          animation: pulse-status 2s ease-in-out infinite;
        }

        @keyframes pulse-status {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .greeting-text {
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .user-name {
          font-family: var(--font-display);
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-black);
          color: var(--text-primary);
          line-height: var(--line-height-tight);
          margin: 0;
          letter-spacing: var(--letter-spacing-tight);
        }

        .header-actions {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }

        .pro-badge-modern, .admin-badge-modern {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          backdrop-filter: blur(10px);
          transition: all 0.2s ease;
        }

        .pro-badge-modern {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(251, 191, 36, 0.2));
          border: 1px solid rgba(255, 215, 0, 0.3);
          color: #FFD700;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }

        .admin-badge-modern {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(217, 70, 239, 0.2));
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 6px 10px;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
        }

        .pro-badge-modern:hover, .admin-badge-modern:hover {
          transform: scale(1.05);
        }

        /* Modern Section Title 2025 */
        .section-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          color: var(--text-secondary);
          margin-bottom: var(--space-5);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .title-icon {
          color: var(--brand-electric);
          opacity: 0.8;
        }

        /* Favorites Section */
        .favorites-section {
          margin-bottom: var(--space-12);
          animation: slideUp 0.6s ease 0.1s both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .favorites-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-4);
          padding: var(--space-4) 0;
          align-items: start;
        }


        /* Games Section */
        .games-section {
          margin-bottom: var(--space-12);
          animation: slideUp 0.6s ease 0.2s both;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: var(--space-4) 0;
          align-items: start;
        }

        /* Grid items - explicit sizing */
        .grid-item {
          width: 100%;
        }

        /* Prevent overlap on hover by ensuring proper stacking context */
        .grid-item:hover {
          z-index: 10;
          position: relative;
        }

        /* Upgrade Banner - Glassmorphism */
        .upgrade-banner {
          margin-bottom: var(--space-10);
          animation: slideUp 0.6s ease 0.3s both;
        }

        .banner-content {
          position: relative;
          background: var(--gradient-primary);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          display: flex;
          align-items: center;
          gap: var(--space-5);
          box-shadow:
            var(--shadow-lg),
            0 0 40px var(--glow-electric);
          border: 1px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
          transition: all 0.3s var(--spring-bounce);
        }

        .banner-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at top right,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 60%
          );
          pointer-events: none;
        }

        .banner-content:hover {
          transform: translateY(-4px);
          box-shadow:
            var(--shadow-xl),
            0 0 60px var(--glow-electric),
            0 0 80px var(--glow-violet);
        }

        .banner-content :global(.banner-icon) {
          flex-shrink: 0;
          color: white;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .banner-text {
          flex: 1;
          z-index: 1;
        }

        .banner-title {
          font-family: var(--font-display);
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-extrabold);
          color: white;
          margin-bottom: var(--space-1);
          letter-spacing: var(--letter-spacing-tight);
        }

        .banner-description {
          font-size: var(--font-size-sm);
          color: rgba(255, 255, 255, 0.95);
          font-weight: var(--font-weight-medium);
        }

        .banner-btn {
          padding: var(--space-3) var(--space-6);
          background: white;
          color: var(--brand-electric);
          border: none;
          border-radius: var(--radius-full);
          font-family: var(--font-display);
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-extrabold);
          cursor: pointer;
          transition: all 0.2s var(--spring-bounce);
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          z-index: 1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .banner-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.5);
        }

        .banner-btn:active {
          transform: scale(0.95);
        }

        /* Bottom padding for nav */
        .bottom-padding {
          height: 96px; /* 72px nav + 24px spacing */
        }

        /* Tablet & Desktop */
        @media (min-width: 640px) {
          .games-grid,
          .favorites-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Desktop */
        @media (min-width: 1024px) {
          .games-grid,
          .favorites-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 20px !important;
          }
        }

        /* Large Desktop */
        @media (min-width: 1280px) {
          .games-grid,
          .favorites-grid {
            grid-template-columns: repeat(5, 1fr) !important;
          }
        }

        /* Mobile small */
        @media (max-width: 375px) {
          .welcome-title {
            font-size: 1.5rem;
          }

          .banner-content {
            flex-direction: column;
            text-align: center;
          }

          .banner-btn {
            width: 100%;
          }
        }

      `}</style>
    </div>
  );
}
