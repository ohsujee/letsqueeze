/**
 * Centralized Constants Configuration
 *
 * All timings, limits, scoring rules, z-index values, and sizes in one place.
 * Import and use instead of hardcoding magic numbers.
 *
 * Usage:
 *   import { TIMINGS, LIMITS, SCORING } from '@/lib/config/constants';
 */

// ============================================
// TIMINGS (milliseconds unless noted)
// ============================================

export const TIMINGS = {
  // Inactivity detection
  inactivityTimeout: 30000,      // 30s - marks player as inactive
  activityThrottle: 1000,        // 1s - throttle activity updates

  // Buzzer mechanics
  buzzWindow: 150,               // 150ms - window for simultaneous buzzes
  lockoutMs: 8000,               // 8s - penalty after wrong answer

  // Animations
  animationFast: 200,
  animationNormal: 300,
  animationSlow: 500,
  transitionDefault: 300,

  // Game-specific (in seconds for display)
  alibiPrepTime: 90,             // 90s preparation time
  laloiTimerOptions: [3, 5, 7, 10], // minutes

  // API & Network
  spotifyKeepAlive: 15000,       // 15s - Spotify player ping
  apiTimeout: 10000,             // 10s - general API timeout
  cacheManifestDuration: 300000, // 5 min - manifest cache
  tokenMaxAge: 86400,            // 24h - token expiry (seconds)
  deezerPreviewExpiry: 86400000, // 24h - Deezer preview URLs

  // UI
  toastDuration: 3000,           // 3s - toast display time
  debounceDelay: 300,            // 300ms - input debounce
  longPressDelay: 500,           // 500ms - long press detection
  doubleTapWindow: 300,          // 300ms - double tap detection

  // Redirects & Navigation
  redirectDelay: 100,            // 100ms - delay before redirect
  phaseTransitionDelay: 500,     // 500ms - delay between game phases
};

// ============================================
// LIMITS
// ============================================

export const LIMITS = {
  // Free tier limits per game
  quiz: {
    packsFree: 3,
    maxGamesPerDay: 10,
  },
  alibi: {
    scenariosFree: 3,
    maxGamesPerDay: 5,
  },
  blindtest: {
    maxPlaylistsFree: 3,
  },
  deeztest: {
    maxPlaylistsFree: 3,
  },
  laloi: {
    maxRerolls: 3,
    maxGuessAttempts: 3,
  },

  // Global limits
  global: {
    freeGamesBeforeAd: 3,
    guestPromptCooldownHours: 24,
    guestGamesBeforePrompt: 3,
  },

  // Room limits
  room: {
    maxPlayers: 20,
    minPlayers: 2,
    codeLength: 6,
  },

  // Input validation
  input: {
    pseudoMinLength: 2,
    pseudoMaxLength: 16,
    teamNameMaxLength: 20,
  },
};

// ============================================
// SCORING
// ============================================

export const SCORING = {
  laloi: {
    firstAttempt: 10,
    secondAttempt: 7,
    thirdAttempt: 4,
    investigatorsFailed: 5,  // Points for players if investigators fail
  },

  blindtest: {
    wrongPenalty: 25,
    snippetLevels: [
      { duration: 1500, label: '1.5s', start: 150, floor: 150 },
      { duration: 3000, label: '3s', start: 150, floor: 100 },
      { duration: 10000, label: '10s', start: 100, floor: 75 },
      { duration: null, label: 'Full', start: 50, floor: 25 }
    ],
  },

  deeztest: {
    wrongPenalty: 25,
    snippetLevels: [
      { duration: 1500, label: '1.5s', start: 150, floor: 150 },
      { duration: 3000, label: '3s', start: 150, floor: 100 },
      { duration: 10000, label: '10s', start: 100, floor: 75 },
      { duration: null, label: 'Full', start: 50, floor: 25 }
    ],
  },

  quiz: {
    basePoints: 100,
    timeBonus: true,  // Points decrease over time
  },

  alibi: {
    coherentThreshold: 0.5,  // 50% coherent answers needed to win
  },
};

// ============================================
// Z-INDEX SCALE
// ============================================

export const Z_INDEX = {
  background: -1,
  base: 0,
  content: 1,
  header: 10,
  footer: 10,
  elevated: 10,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 9998,
  modal: 9999,
  toast: 10000,
  tooltip: 10001,
};

// ============================================
// SIZES
// ============================================

export const SIZES = {
  maxContentWidth: '500px',
  maxModalWidth: {
    sm: '340px',
    md: '400px',
    lg: '500px',
    xl: '600px',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  avatar: {
    xs: '24px',
    sm: '32px',
    md: '44px',
    lg: '64px',
    xl: '100px',
  },
  button: {
    sm: '36px',
    md: '44px',
    lg: '52px',
    xl: '60px',
  },
  icon: {
    xs: '16px',
    sm: '20px',
    md: '24px',
    lg: '32px',
    xl: '40px',
  },
};

// ============================================
// GAME PHASES
// ============================================

export const PHASES = {
  common: {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    ENDED: 'ended',
  },
  laloi: {
    LOBBY: 'lobby',
    CHOOSING: 'choosing',
    PLAYING: 'playing',
    GUESSING: 'guessing',
    REVEAL: 'reveal',
    ENDED: 'ended',
  },
  alibi: {
    LOBBY: 'lobby',
    PREP: 'prep',
    INTERROGATION: 'interrogation',
    ENDED: 'ended',
  },
};

// ============================================
// PLAYER STATUS
// ============================================

export const PLAYER_STATUS = {
  ACTIVE: 'active',
  DISCONNECTED: 'disconnected',
  LEFT: 'left',
  INACTIVE: 'inactive',
};

export const ACTIVITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  favorites: 'favorites',
  lastGame: 'last_game',
  returnedFromGame: 'returnedFromGame',
  adShownDuringJoin: 'adShownDuringJoin',
  rewardedAdWatched: 'rewardedAdWatched',
  guestPromptShown: 'guestPromptShown',
  onboardingCompleted: 'onboardingCompleted',
};

export default {
  TIMINGS,
  LIMITS,
  SCORING,
  Z_INDEX,
  SIZES,
  PHASES,
  PLAYER_STATUS,
  ACTIVITY_STATUS,
  STORAGE_KEYS,
};
