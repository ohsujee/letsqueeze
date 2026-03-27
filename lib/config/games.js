/**
 * Games Configuration
 * Single source of truth for all games in the app
 * Used by Home page and Stats page
 */

import { Target, UserSearch, Music, Brain, Theater, Search, Laugh, BrainCircuit, EyeOff } from 'lucide-react';

export const GAMES = [
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    Icon: Target,
    packLimit: 3,
    image: '/images/optimized/quiz-buzzer.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2024-01-01',
    available: true,
  },
  {
    id: 'alibi',
    name: 'Alibi',
    Icon: UserSearch,
    packLimit: 3,
    image: '/images/optimized/alibi.webp',
    minPlayers: 3,
    maxPlayers: 10,
    addedAt: '2024-06-01',
    available: true,
  },
  {
    id: 'blindtest',
    name: 'Blind Test',
    Icon: Music,
    packLimit: 3,
    image: '/images/optimized/blind-test.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2024-09-01',
    poweredBy: 'deezer',
    available: true,
  },
  {
    id: 'mime',
    name: 'Mime',
    Icon: Theater,
    packLimit: null,
    image: '/images/optimized/mime-game.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2024-08-01',
    available: true,
  },
  {
    id: 'laregle',
    name: 'La Règle',
    Icon: Search,
    packLimit: null,
    image: '/images/optimized/laregle.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2026-02-12',
    available: true,
    isNew: true,
    themeColor: '#06b6d4',
  },
  {
    id: 'lol',
    name: 'LOL',
    Icon: Laugh,
    packLimit: null,
    image: '/images/optimized/lol.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2026-03-13',
    available: true,
    superFoundersOnly: true,
    isNew: true,
  },
  {
    id: 'mindlink',
    name: 'Mind Link',
    Icon: BrainCircuit,
    packLimit: null,
    image: '/images/optimized/mindlink.webp',
    minPlayers: 3,
    maxPlayers: 20,
    addedAt: '2026-03-13',
    available: true,
    superFoundersOnly: true,
    isNew: true,
    themeColor: '#ec4899',
  },
  {
    id: 'imposteur',
    name: 'Imposteur',
    Icon: EyeOff,
    packLimit: null,
    image: '/images/optimized/imposteur.webp',
    minPlayers: 3,
    maxPlayers: 12,
    addedAt: '2026-03-27',
    available: true,
    superFoundersOnly: true,
    isNew: true,
    themeColor: '#e11d48',
  },
  {
    id: 'memory',
    name: 'Memory',
    Icon: Brain,
    packLimit: 3,
    image: '/images/optimized/memory.webp',
    minPlayers: 2,
    maxPlayers: 20,
    addedAt: '2026-03-01',
    comingSoon: true,
    available: false,
    superFoundersOnly: true,
  },
];

/**
 * Get visible games for a user
 * @param {boolean} isFounder - Is the user a founder?
 * @param {boolean} isSuperFounder - Is the user a super founder?
 * @returns {Array} - Filtered games array
 */
export function getVisibleGames(isFounder = false, isSuperFounder = false) {
  return GAMES.filter(game => {
    if (game.superFoundersOnly) return isSuperFounder;
    if (game.foundersOnly) return isFounder || isSuperFounder;
    return true;
  });
}

/**
 * Get game by ID
 * @param {string} gameId - Game ID
 * @returns {Object|undefined} - Game config or undefined
 */
export function getGameById(gameId) {
  return GAMES.find(game => game.id === gameId);
}

/**
 * Filter games by player count
 * @param {Array} games - Games array
 * @param {number|null} playerCount - Number of players (null = no filter)
 * @returns {Array} - Filtered games
 */
export function filterByPlayerCount(games, playerCount) {
  if (!playerCount) return games;
  return games.filter(game => {
    const min = game.minPlayers || 1;
    const max = game.maxPlayers || Infinity;
    return playerCount >= min && playerCount <= max;
  });
}

/**
 * Sort games by criteria
 * Coming soon games are always at the bottom
 * @param {Array} games - Games array
 * @param {string} sortBy - Sort criteria: 'popular', 'newest', 'alphabetical'
 * @param {Object} playCounts - Global play counts { gameId: count }
 * @returns {Array} - Sorted games (new array)
 */
export function sortGames(games, sortBy, playCounts = {}) {
  // Separate: new games first, then available, then coming soon
  const newGames = games.filter(g => g.isNew && !g.comingSoon);
  const availableGames = games.filter(g => !g.comingSoon && !g.isNew);
  const comingSoonGames = games.filter(g => g.comingSoon);

  // Only sort available games
  switch (sortBy) {
    case 'popular':
      // Sort by play count descending, then by name
      availableGames.sort((a, b) => {
        const countA = playCounts[a.id] || 0;
        const countB = playCounts[b.id] || 0;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name);
      });
      break;
    case 'newest':
      // Sort by addedAt descending
      availableGames.sort((a, b) => {
        const dateA = new Date(a.addedAt || '2000-01-01');
        const dateB = new Date(b.addedAt || '2000-01-01');
        return dateB - dateA;
      });
      break;
    case 'alphabetical':
      availableGames.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      // Default order (as defined in config)
      break;
  }

  // New games first, then available, then coming soon at the bottom
  return [...newGames, ...availableGames, ...comingSoonGames];
}

/**
 * Search games by name
 * @param {Array} games - Games array
 * @param {string} query - Search query
 * @returns {Array} - Filtered games
 */
export function searchGames(games, query) {
  if (!query || !query.trim()) return games;
  const q = query.toLowerCase().trim();
  return games.filter(game =>
    game.name.toLowerCase().includes(q)
  );
}

/**
 * Apply Remote Config overrides and auto-unlock logic
 * @param {Array} games - Base games array
 * @param {Object} remoteOverrides - Overrides from Remote Config { gameId: { available, comingSoon, releaseDate } }
 * @returns {Array} - Games with overrides applied
 */
export function applyRemoteConfig(games, remoteOverrides = {}) {
  const now = new Date();

  return games.map(game => {
    // Merge remote overrides if they exist for this game
    const override = remoteOverrides[game.id] || {};
    const merged = { ...game, ...override };

    // Auto-unlock logic: if releaseDate has passed and not force-locked
    if (merged.releaseDate && override.available !== false) {
      const releaseDate = new Date(merged.releaseDate);
      if (now >= releaseDate) {
        merged.available = true;
        merged.comingSoon = false;
      }
    }

    return merged;
  });
}

export default GAMES;
