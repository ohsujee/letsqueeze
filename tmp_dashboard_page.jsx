import { getStats, getActiveRooms, getStoreStats, getAndroidStats } from '@/lib/data';
import StatCard from '@/components/StatCard';
import UserChart from '@/components/UserChart';
import ActiveRooms from '@/components/ActiveRooms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData() {
  try {
    const [stats, rooms, storeStats, androidStats] = await Promise.all([
      getStats('30d'),
      getActiveRooms(),
      getStoreStats(),
      getAndroidStats(),
    ]);
    return { stats, rooms, storeStats, androidStats };
  } catch (e) {
    console.error('[Dashboard]', e);
    return { stats: null, rooms: null, storeStats: null, androidStats: null };
  }
}

export default async function DashboardPage() {
  const { stats, rooms, storeStats, androidStats } = await getData();

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
          Erreur de connexion à Firebase. Vérifier le service account.
        </div>
      </div>
    );
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1 capitalize">{dateStr}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-600 font-mono">Dernière maj</div>
          <div className="text-xs text-zinc-400 font-mono">{timeStr}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Utilisateurs"
          value={stats.totalUsers.toLocaleString('fr-FR')}
          sub="Total tous comptes"
          color="violet"
        />
        <StatCard
          title="Nouveaux · 30j"
          value={`+${stats.newUsers.toLocaleString('fr-FR')}`}
          sub="Inscrits ce mois"
          color="green"
        />
        <StatCard
          title="Rooms actives"
          value={rooms?.totalActive ?? 0}
          sub="En ce moment"
          color="blue"
          live
        />
        <StatCard
          title="Jeux daily · auj."
          value={stats.dailyGames.total}
          sub={`Mot Mystère ${stats.dailyGames.motMystere} · Sémantique ${stats.dailyGames.semantique}`}
          color="orange"
        />
      </div>

      {/* Chart + Rooms */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <UserChart initialData={stats.chartData} initialPeriod="30d" />
        </div>
        <div>
          <ActiveRooms initialData={rooms} />
        </div>
      </div>

      {/* Daily games detail */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Mot Mystère · Aujourd'hui</div>
          <div className="text-2xl font-bold text-orange-400">{stats.dailyGames.motMystere}</div>
          <div className="text-xs text-zinc-500 mt-1">Parties jouées</div>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Sémantique · Aujourd'hui</div>
          <div className="text-2xl font-bold text-blue-400">{stats.dailyGames.semantique}</div>
          <div className="text-xs text-zinc-500 mt-1">Parties jouées</div>
        </div>
      </div>

      {/* Store Stats */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Téléchargements App Store</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {storeStats ? (
            <>
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">iOS · 7 derniers jours</div>
                <div className="text-3xl font-bold text-violet-400 tabular-nums">{storeStats.last7d}</div>
                <div className="text-xs text-zinc-500 mt-1">Téléchargements cumulés</div>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">iOS · Dernier jour dispo</div>
                <div className="text-3xl font-bold text-violet-300 tabular-nums">{storeStats.latestDay}</div>
                {storeStats.latestDate && (
                  <div className="text-xs text-zinc-500 mt-1">{storeStats.latestDate}</div>
                )}
              </div>
              {androidStats ? (
                <>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Android · 7 derniers jours</div>
                    <div className="text-3xl font-bold text-green-400 tabular-nums">{androidStats.last7d}</div>
                    <div className="text-xs text-zinc-500 mt-1">Installations cumulées</div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Android · Dernier jour dispo</div>
                    <div className="text-3xl font-bold text-green-300 tabular-nums">{androidStats.latestDay}</div>
                    {androidStats.latestDate && (
                      <div className="text-xs text-zinc-500 mt-1">{androidStats.latestDate}</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xs text-zinc-600 mb-1">Android</div>
                    <div className="text-xs text-zinc-600">Stats non disponibles</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="xl:col-span-3 bg-[#18181b] border border-[#27272a] rounded-xl p-5">
              <div className="text-xs text-zinc-600">Stats App Store non disponibles — vérifier APP_STORE_* dans .env</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
