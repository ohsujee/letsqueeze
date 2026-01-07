/**
 * Games Configuration
 * Single source of truth for all games in the app
 * Used by Home page and Stats page
 */

import { Target, UserSearch, Music, Brain, Theater, Search } from 'lucide-react';

export const GAMES = [
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    Icon: Target,
    packLimit: 3,
    image: '/images/quiz-buzzer.png',
    minPlayers: 2,
    available: true,
  },
  {
    id: 'alibi',
    name: 'Alibi',
    Icon: UserSearch,
    packLimit: 3,
    image: '/images/alibi.png',
    minPlayers: 3,
    available: true,
  },
  {
    id: 'deeztest',
    name: 'Blind Test',
    Icon: Music,
    packLimit: 3,
    image: '/images/blind-test.png',
    minPlayers: 2,
    poweredBy: 'deezer', // Shows "Powered by Deezer" pill
    available: true,
  },
  {
    id: 'blindtest',
    name: 'Blind Test',
    Icon: Music,
    packLimit: 3,
    image: '/images/blind-test.png',
    minPlayers: 2,
    foundersOnly: true, // Hidden until Spotify Extended Quota approved
    poweredBy: 'spotify',
    available: true,
  },
  {
    id: 'mime',
    name: 'Mime',
    Icon: Theater,
    packLimit: null,
    image: '/images/mime-game.png',
    minPlayers: 2,
    local: true, // Local game, no Firebase room
    available: true,
  },
  {
    id: 'trouveregle',
    name: 'Trouve la Règle',
    Icon: Search,
    packLimit: null,
    image: '/images/trouve-la-regle.png',
    minPlayers: 3, // 1 enquêteur + 2 joueurs minimum
    available: true,
    themeColor: '#06b6d4', // Cyan
  },
  {
    id: 'memory',
    name: 'Memory',
    Icon: Brain,
    packLimit: 3,
    image: '/images/memory.png',
    minPlayers: 2,
    comingSoon: true,
    available: false,
  },
];

/**
 * Get visible games for a user
 * @param {boolean} isFounder - Is the user a founder?
 * @returns {Array} - Filtered games array
 */
export function getVisibleGames(isFounder = false) {
  return GAMES.filter(game => !game.foundersOnly || isFounder);
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
 * Check if a game is available (not coming soon)
 * @param {string} gameId - Game ID
 * @param {boolean} isFounder - Is the user a founder?
 * @returns {boolean}
 */
export function isGameAvailable(gameId, isFounder = false) {
  const game = getGameById(gameId);
  if (!game) return false;
  if (game.foundersOnly && !isFounder) return false;
  return game.available && !game.comingSoon;
}

export default GAMES;
