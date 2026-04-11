'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getUserStats, formatStats } from '@/lib/services/statsService';
import { ArrowLeft, Trophy, GameController, Fire } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { getVisibleGames } from '@/lib/config/games';
import { GAME_COLORS } from '@/lib/config/colors';
import { useAuthProtect } from '@/lib/hooks/useAuthProtect';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import LoadingScreen from '@/components/ui/LoadingScreen';
import './stats.css';

// Couleurs fallback par game id
const COLOR_MAP = {
  quiz: '#8b5cf6',
  blindtest: '#A238FF',
  alibi: '#f59e0b',
  laregle: '#06b6d4',
  mime: '#34d399',
  lol: '#EF4444',
  mindlink: '#ec4899',
  imposteur: '#84cc16',
};

function getGameColor(gameId) {
  if (GAME_COLORS[gameId]?.primary) return GAME_COLORS[gameId].primary;
  // blindtest uses deeztest in GAME_COLORS
  if (gameId === 'blindtest' && GAME_COLORS.deeztest?.primary) return GAME_COLORS.deeztest.primary;
  return COLOR_MAP[gameId] || '#8b5cf6';
}

export default function StatsPage() {
  useAppShellBg('#0e0e1a');
  const router = useRouter();
  const { user, loading: authLoading } = useAuthProtect();
  const { isFounder: userIsFounder, isSuperFounder: userIsSuperFounder } = useUserProfile();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
  const visibleGames = getVisibleGames(userIsFounder, userIsSuperFounder);

  const games = useMemo(() => {
    // Map game.id to the stats key (blindtest → deeztest in Firebase)
    const statsKeyMap = { blindtest: 'deeztest' };

    return visibleGames
      .filter(g => g.available && !g.comingSoon)
      .map(game => {
        const statsKey = statsKeyMap[game.id] || game.id;
        const gs = stats?.[statsKey] || {};
        const color = getGameColor(game.id);

        return {
          id: game.id,
          title: game.name,
          image: game.image,
          color,
          stats: [
            { label: 'Parties', value: gs.gamesPlayed || 0, icon: GameController },
            { label: 'Victoires', value: gs.wins || gs.totalWins || 0, icon: Trophy },
            { label: 'Meilleur', value: gs.bestScore || 0, icon: Fire },
          ],
        };
      });
  }, [visibleGames, stats]);

  const totalGames = stats?.totalGames || 0;

  if (loading) {
    return <LoadingScreen game="quiz" />;
  }

  return (
    <div className="stats-page">
      {/* Header */}
      <header className="stats-header">
        <button className="stats-back-btn" onClick={() => router.push('/profile')}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 className="stats-title">Mes Statistiques</h1>
      </header>

      {/* Content */}
      <main className="stats-content">
        {/* Total */}
        <motion.div
          className="stats-total-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="stats-total-number">{totalGames}</div>
          <div className="stats-total-label">parties jouées</div>
        </motion.div>

        {/* Game list */}
        <div className="stats-games-list">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              className="stats-game-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (index + 1) }}
            >
              {/* Game image + title header */}
              <div className="stats-game-header" style={{ backgroundColor: game.color }}>
                {game.image && (
                  <img
                    src={game.image}
                    alt=""
                    className="stats-game-img"
                    draggable={false}
                  />
                )}
                <h2 className="stats-game-name">{game.title}</h2>
              </div>

              {/* Stats row */}
              <div className="stats-game-body">
                {game.stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="stats-stat-item">
                      <div className="stats-stat-icon">
                        <Icon size={14} weight="fill" />
                      </div>
                      <div className="stats-stat-info">
                        <span className="stats-stat-label">{stat.label}</span>
                        <span className="stats-stat-value">{stat.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
