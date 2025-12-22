'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import { getUserStats, formatStats } from '@/lib/services/statsService';
import { ArrowLeft, Trophy, Target, Flame, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.isAnonymous) {
        router.push('/profile');
      } else {
        setUser(currentUser);
        const rawStats = await getUserStats(currentUser.uid);
        setStats(formatStats(rawStats));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="stats-page">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
        <style jsx>{`
          .stats-page {
            min-height: 100dvh;
            background: #0a0a0f;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(139, 92, 246, 0.2);
            border-top-color: #8b5cf6;
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

  const games = [
    {
      id: 'quiz',
      title: 'Quiz Buzzer',
      image: '/images/quiz-buzzer.png',
      available: true,
      stats: [
        { label: 'Parties', value: stats?.quiz?.gamesPlayed || 0, icon: Target },
        { label: 'Victoires', value: stats?.quiz?.wins || 0, icon: Trophy },
        { label: 'Meilleur', value: stats?.quiz?.bestScore || 0, icon: Flame }
      ]
    },
    {
      id: 'alibi',
      title: 'Alibi',
      image: '/images/alibi.png',
      available: true,
      stats: [
        { label: 'Parties', value: stats?.alibi?.gamesPlayed || 0, icon: Target },
        { label: 'Victoires', value: stats?.alibi?.totalWins || 0, icon: Trophy },
        { label: 'Meilleur', value: `${stats?.alibi?.bestPercentage || 0}%`, icon: Flame }
      ]
    },
    {
      id: 'blindtest',
      title: 'Blind Test',
      image: '/images/blind-test.png',
      available: false,
      stats: []
    },
    {
      id: 'memory',
      title: 'Memory',
      image: '/images/memory.png',
      available: false,
      stats: []
    }
  ];

  return (
    <div className="stats-page">
      {/* Background */}
      <div className="stats-bg" />

      {/* Header */}
      <header className="stats-header">
        <button className="back-btn" onClick={() => router.push('/profile')}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="stats-title">Mes Statistiques</h1>
      </header>

      {/* Content */}
      <main className="stats-content">
        {/* Total Summary */}
        <motion.div
          className="total-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="total-number">{stats?.totalGames || 0}</div>
          <div className="total-label">parties jouées</div>
        </motion.div>

        {/* Game Cards Grid */}
        <div className="games-grid">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              className={`stat-game-card ${!game.available ? 'disabled' : ''}`}
              data-game={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
            >
              {/* Background Image */}
              <div
                className="card-bg"
                style={{ backgroundImage: `url(${game.image})` }}
              />

              {/* Overlay */}
              <div className="card-overlay" />

              {/* Coming Soon Badge */}
              {!game.available && (
                <div className="coming-soon-badge">
                  <Lock size={12} />
                  <span>Bientôt</span>
                </div>
              )}

              {/* Game Title - Top */}
              <div className="game-title-wrap">
                <h2 className="game-name">{game.title}</h2>
              </div>

              {/* Stats - Bottom */}
              {game.available ? (
                <div className="stats-row">
                  {game.stats.map((stat, i) => (
                    <div key={i} className="stat-box">
                      <stat.icon size={18} className="stat-icon" />
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stats-row coming-soon">
                  <span className="coming-soon-text">Stats bientôt disponibles</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      <style jsx global>{`
        .stats-page {
          min-height: 100dvh;
          background: #0a0a0f;
          position: relative;
        }

        /* Background */
        .stats-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
        }

        /* Header */
        .stats-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          padding-top: calc(16px + env(safe-area-inset-top));
          background: rgba(10, 10, 15, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }

        .stats-header .back-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .stats-header .back-btn:hover {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .stats-header .stats-title {
          font-family: 'Bungee', cursive;
          font-size: 1.25rem;
          font-weight: 400;
          color: white;
          margin: 0;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }

        /* Content */
        .stats-content {
          position: relative;
          z-index: 1;
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
        }

        /* Total Card */
        .total-card {
          text-align: center;
          padding: 32px 24px;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 20px;
          margin-bottom: 24px;
          box-shadow:
            0 0 40px rgba(139, 92, 246, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .total-card .total-number {
          font-family: 'Bungee', cursive;
          font-size: 4rem;
          color: #a78bfa;
          line-height: 1;
          text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
        }

        .total-card .total-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* Games Grid - Same as Home */
        .games-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        /* Game Card - Compact version for stats */
        .stat-game-card {
          position: relative;
          width: 100%;
          aspect-ratio: 5 / 4;
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .stat-game-card:hover:not(.disabled) {
          transform: translateY(-4px);
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .stat-game-card.disabled {
          opacity: 0.6;
          filter: grayscale(0.3);
        }

        /* Background Image */
        .stat-game-card .card-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transition: transform 0.4s ease;
        }

        .stat-game-card:hover .card-bg {
          transform: scale(1.05);
        }

        /* Overlay - Darker for readability */
        .stat-game-card .card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(0, 0, 0, 0.2) 40%,
            rgba(0, 0, 0, 0.7) 100%
          );
          z-index: 1;
          pointer-events: none;
        }

        /* Coming Soon Badge */
        .stat-game-card .coming-soon-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          z-index: 4;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Game Title - TOP of card */
        .stat-game-card .game-title-wrap {
          position: absolute;
          top: 16px;
          left: 0;
          right: 0;
          z-index: 2;
          text-align: center;
          padding: 0 10px;
        }

        .stat-game-card .game-name {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.1rem, 6vw, 1.6rem);
          font-weight: 400;
          color: white;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          line-height: 1.1;
        }

        /* Quiz glow */
        .stat-game-card[data-game="quiz"] .game-name {
          text-shadow:
            0 0 10px #a78bfa,
            0 0 20px #a78bfa,
            0 0 40px #8b5cf6;
        }

        /* Alibi glow */
        .stat-game-card[data-game="alibi"] .game-name {
          text-shadow:
            0 0 10px #fbbf24,
            0 0 20px #fbbf24,
            0 0 40px #f59e0b;
        }

        /* Blind Test glow */
        .stat-game-card[data-game="blindtest"] .game-name {
          text-shadow:
            0 0 10px #34d399,
            0 0 20px #34d399,
            0 0 40px #10b981;
        }

        /* Memory glow */
        .stat-game-card[data-game="memory"] .game-name {
          text-shadow:
            0 0 10px #f472b6,
            0 0 20px #f472b6,
            0 0 40px #ec4899;
        }

        /* Stats Row - BOTTOM of card */
        .stat-game-card .stats-row {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 2;
          display: flex;
          justify-content: space-around;
          padding: 14px 10px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-game-card .stats-row.coming-soon {
          justify-content: center;
          padding: 16px;
        }

        .stat-game-card .coming-soon-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Stat Box */
        .stat-game-card .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          flex: 1;
        }

        .stat-game-card .stat-icon {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 4px;
        }

        /* Quiz stat icon color */
        .stat-game-card[data-game="quiz"] .stat-icon {
          color: #a78bfa;
        }

        /* Alibi stat icon color */
        .stat-game-card[data-game="alibi"] .stat-icon {
          color: #fbbf24;
        }

        .stat-game-card .stat-value {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.2rem, 5vw, 1.5rem);
          color: white;
          line-height: 1;
        }

        .stat-game-card .stat-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.7);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Responsive - Single column on very small screens */
        @media (max-width: 360px) {
          .games-grid {
            grid-template-columns: 1fr;
          }

          .stat-game-card .game-name {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
