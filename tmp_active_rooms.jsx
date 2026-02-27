'use client';

import { useEffect, useState } from 'react';

const GAME_STYLES = {
  'Quiz':     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'DeezTest': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  'Alibi':    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'La Règle': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const PHASE_LABELS = {
  lobby: 'Lobby',
  playing: 'En jeu',
  prep: 'Prép.',
  choosing: 'Choix',
  guessing: 'Devinette',
  ended: 'Fin',
};

export default function ActiveRooms({ initialData }) {
  const [data, setData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/rooms');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {}
    setRefreshing(false);
  }

  useEffect(() => {
    setLastUpdated(new Date());
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const allRooms = data?.games?.flatMap(g => g.rooms) || [];
  const totalActive = data?.totalActive || 0;

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-white">Rooms actives</div>
          <div className="text-[11px] text-zinc-600 mt-0.5">
            {lastUpdated?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '—'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Rafraîchir"
          >
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400 tabular-nums">{totalActive}</span>
          </div>
        </div>
      </div>

      {/* Rooms list */}
      {allRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-2xl mb-2 opacity-30">🎮</div>
          <div className="text-sm text-zinc-600">Aucune room active</div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {allRooms.map(room => (
            <div
              key={`${room.game}-${room.code}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${GAME_STYLES[room.game] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {room.game}
                </span>
                <span className="text-xs font-mono text-zinc-300 tracking-wider">{room.code}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>{PHASE_LABELS[room.phase] || room.phase}</span>
                <span className="text-zinc-700">·</span>
                <span>{room.playerCount}P</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary by game */}
      {data?.games && totalActive > 0 && (
        <div className="mt-4 pt-3 border-t border-[#27272a] grid grid-cols-2 gap-1.5">
          {data.games.filter(g => g.count > 0).map(g => (
            <div key={g.game} className="flex items-center gap-1.5 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${GAME_STYLES[g.game]?.includes('violet') ? 'bg-violet-400' : GAME_STYLES[g.game]?.includes('fuchsia') ? 'bg-fuchsia-400' : GAME_STYLES[g.game]?.includes('orange') ? 'bg-orange-400' : 'bg-cyan-400'}`} />
              <span className="text-zinc-400">{g.game}</span>
              <span className="text-white font-medium">{g.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
