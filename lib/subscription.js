import { isAdmin } from './admin.js';

/**
 * Subscription Tiers
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro'
};

/**
 * Free Tier Limits
 */
export const FREE_LIMITS = {
  quiz: {
    packs: 3,              // Number of quiz packs available
    maxGamesPerDay: 10     // Daily game limit
  },
  alibi: {
    scenarios: 3,          // Number of alibi scenarios available (Game Master mode)
    scenariosPartyMode: 4, // Number of alibi scenarios in Party Mode (need 1 per group)
    maxGamesPerDay: 5      // Daily game limit
  },
  buzzer: {
    unlimited: true        // Buzzer mode always free
  }
};

/**
 * Pro Subscription Pricing
 */
export const PRO_PRICING = {
  monthly: {
    price: 4.99,
    currency: 'EUR',
    interval: 'month',
    label: 'Mensuel'
  },
  annual: {
    price: 29.99,
    currency: 'EUR',
    interval: 'year',
    savings: 50, // 50% discount (4.99*12 = 59.88 vs 29.99)
    label: 'Annuel',
    monthlyEquivalent: 29.99 / 12 // ~2.50€/mois
  }
};

/**
 * Check if user has Pro access
 * Admins automatically get Pro access
 *
 * @param {Object} user - User object with uid and subscription
 * @returns {boolean} - True if user has Pro access
 */
export const isPro = (user) => {
  if (!user) return false;

  // Admin bypass - always Pro (checks both UID and email)
  if (isAdmin(user)) {
    return true;
  }

  // Check subscription status
  if (!user.subscription) return false;

  const { tier, expiresAt } = user.subscription;

  // Check if Pro and not expired
  return tier === SUBSCRIPTION_TIERS.PRO && expiresAt > Date.now();
};

/**
 * Check if user has access to a specific pack
 *
 * @param {Object} user - User object
 * @param {string} gameType - 'quiz' or 'alibi'
 * @param {number} packIndex - Index of the pack
 * @param {Object} options - Optional settings
 * @param {boolean} options.isPartyMode - True if in Party Mode (Alibi: allows 4 scenarios)
 * @returns {boolean} - True if user can access the pack
 */
export const canAccessPack = (user, gameType, packIndex, options = {}) => {
  // Pro users (including admins) can access everything
  if (isPro(user)) return true;

  // Free users limited by pack count
  let limit;

  if (gameType === 'alibi') {
    // Alibi: different limits for Party Mode vs Game Master mode
    limit = options.isPartyMode
      ? FREE_LIMITS.alibi.scenariosPartyMode
      : FREE_LIMITS.alibi.scenarios;
  } else {
    limit = FREE_LIMITS[gameType]?.packs;
  }

  if (!limit) return false;

  return packIndex < limit;
};

/**
 * Check if user can start a new game today
 *
 * @param {Object} user - User object
 * @param {string} gameType - 'quiz' or 'alibi'
 * @param {number} gamesPlayedToday - Number of games played today
 * @returns {boolean} - True if user can start a game
 */
export const canPlayGame = (user, gameType, gamesPlayedToday = 0) => {
  // Pro users (including admins) have unlimited games
  if (isPro(user)) return true;

  // Buzzer mode is always unlimited
  if (gameType === 'buzzer') return true;

  // Check daily limit for free users
  const limit = FREE_LIMITS[gameType]?.maxGamesPerDay;
  if (!limit) return false;

  return gamesPlayedToday < limit;
};

/**
 * Get user's tier information
 *
 * @param {Object} user - User object
 * @returns {Object} - Tier information
 */
export const getUserTier = (user) => {
  const isProUser = isPro(user);
  const isAdminUser = user ? isAdmin(user) : false;

  return {
    tier: isProUser ? SUBSCRIPTION_TIERS.PRO : SUBSCRIPTION_TIERS.FREE,
    isAdmin: isAdminUser,
    displayName: isAdminUser ? 'Admin (Pro)' : isProUser ? 'Pro' : 'Free',
    benefits: isProUser ? PRO_BENEFITS : FREE_BENEFITS
  };
};

/**
 * Free Tier Benefits
 */
export const FREE_BENEFITS = [
  '3 quiz packs',
  '3 alibi scenarios',
  'Unlimited buzzer mode',
  '10 quiz games/day',
  '5 alibi games/day',
  'Ads supported'
];

/**
 * Pro Tier Benefits
 */
export const PRO_BENEFITS = [
  'All quiz packs unlocked',
  'All alibi scenarios unlocked',
  'Unlimited games',
  'No ads',
  'Custom quiz creator',
  'Advanced statistics',
  'Priority support'
];

/**
 * Get remaining games for today
 *
 * @param {Object} user - User object
 * @param {string} gameType - 'quiz' or 'alibi'
 * @param {number} gamesPlayedToday - Number of games played today
 * @returns {number|null} - Remaining games (null if unlimited)
 */
export const getRemainingGames = (user, gameType, gamesPlayedToday = 0) => {
  // Pro users have unlimited
  if (isPro(user)) return null;

  // Buzzer is unlimited
  if (gameType === 'buzzer') return null;

  const limit = FREE_LIMITS[gameType]?.maxGamesPerDay;
  if (!limit) return 0;

  return Math.max(0, limit - gamesPlayedToday);
};

