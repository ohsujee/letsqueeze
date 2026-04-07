'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getUserStats, formatStats } from '@/lib/services/statsService';
import { ArrowLeft, Trophy, Target, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { getVisibleGames } from '@/lib/config/games';
import { useAuthProtect } from '@/lib/hooks/useAuthProtect';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import LoadingScreen from '@/components/ui/LoadingScreen';
import './stats.css';

export default function StatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthProtect();
  const { isFounder: userIsFounder, isSuperFounder: userIsSuperFounder } = useUserProfile();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load stats when user is available
  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      const rawStats = await getUserStats(user.uid);
      setStats(formatStats(rawStats));
      setStatsLoading(false);
    };

    loadStats();
  }, [user]);

  const loading = authLoading || statsLoading;

  // Get visible games based on founder status (must be before any early return)
  const visibleGames = getVisibleGames(userIsFounder, userIsSuperFounder);

  // Map stats to each visible game (must be before any early return)
  const games = useMemo(() => {
    const statsMap = {
      quiz: [
        { label: 'Parties', value: stats?.quiz?.gamesPlayed || 0, icon: Target },
        { label: 'Victoires', value: stats?.quiz?.wins || 0, icon: Trophy },
        { label: 'Meilleur', value: stats?.quiz?.bestScore || 0, icon: Flame }
      ],
      alibi: [
        { label: 'Parties', value: stats?.alibi?.gamesPlayed || 0, icon: Target },
        { label: 'Victoires', value: stats?.alibi?.totalWins || 0, icon: Trophy },
        { label: 'Meilleur', value: stats?.alibi?.bestScore || 0, icon: Flame }
      ],
      deeztest: [
        { label: 'Parties', value: stats?.deeztest?.gamesPlayed || 0, icon: Target },
        { label: 'Victoires', value: stats?.deeztest?.wins || 0, icon: Trophy },
        { label: 'Meilleur', value: stats?.deeztest?.bestScore || 0, icon: Flame }
      ],
      mime: [] // Local game, no online stats
    };

    return visibleGames.map(game => ({
      id: game.id,
      title: game.name,
      image: game.image,
      available: game.available && !game.comingSoon,
      stats: statsMap[game.id] || []
    }));
  }, [visibleGames, stats]);

  if (loading) {
    return <LoadingScreen game="quiz" />;
  }

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

              {/* Game Title - Top */}
              <div className="game-title-wrap">
                <h2 className="game-name">{game.title}</h2>
              </div>

              {/* Stats - Bottom (only for available games) */}
              {game.available && (
                <div className="stats-row">
                  {game.stats.map((stat, i) => (
                    <div key={i} className="stat-box">
                      <stat.icon size={18} className="stat-icon" />
                      <div className="stat-value">{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </main>

    </div>
  );
}
