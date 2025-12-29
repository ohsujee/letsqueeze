import { ref, set, get, update, serverTimestamp } from './firebase';
import { db } from './firebase';

/**
 * User Profile Schema in Firebase:
 *
 * users/{uid}/
 *   ├─ profile/
 *   │   ├─ displayName: string
 *   │   ├─ email: string | null
 *   │   ├─ photoURL: string | null
 *   │   ├─ pseudo: string | null (nom affiché dans les jeux)
 *   │   ├─ createdAt: timestamp
 *   │   └─ lastLoginAt: timestamp
 *   ├─ stats/
 *   │   ├─ gamesPlayed: number
 *   │   ├─ wins: number
 *   │   ├─ totalScore: number
 *   │   ├─ quizGamesPlayed: number
 *   │   ├─ alibiGamesPlayed: number
 *   │   ├─ level: number
 *   │   └─ xp: number
 *   ├─ subscription/
 *   │   ├─ tier: "free" | "pro"
 *   │   ├─ expiresAt: timestamp | null
 *   │   └─ subscriptionId: string | null
 *   └─ settings/
 *       ├─ theme: "light" | "dark"
 *       ├─ soundEnabled: boolean
 *       └─ vibrationEnabled: boolean
 */

/**
 * Initialize or update user profile in Firebase
 * Called after login/signup
 * @param {Object} user - Firebase Auth user object
 * @returns {Promise<void>}
 */
export async function initializeUserProfile(user) {
  if (!user) return;

  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    // New user - create full profile
    await set(userRef, {
      profile: {
        displayName: user.displayName || 'Joueur',
        email: user.email || null,
        photoURL: user.photoURL || null,
        pseudo: null, // Sera défini dans l'onboarding
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      },
      stats: {
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        quizGamesPlayed: 0,
        alibiGamesPlayed: 0,
        level: 1,
        xp: 0,
      },
      subscription: {
        tier: 'free',
        expiresAt: null,
        subscriptionId: null,
      },
      settings: {
        theme: 'dark',
        soundEnabled: true,
        vibrationEnabled: true,
      },
    });
  } else {
    // Existing user - update last login
    await update(ref(db, `users/${user.uid}/profile`), {
      lastLoginAt: serverTimestamp(),
      // Update profile info if changed
      displayName: user.displayName || snapshot.val().profile?.displayName || 'Joueur',
      email: user.email || snapshot.val().profile?.email || null,
      photoURL: user.photoURL || snapshot.val().profile?.photoURL || null,
    });
  }
}

/**
 * Get user profile data
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    return snapshot.val();
  }

  return null;
}

/**
 * Update user stats after a game
 * @param {string} uid - User ID
 * @param {Object} gameResult
 * @param {string} gameResult.mode - "quiz" | "alibi"
 * @param {number} gameResult.score - Score earned
 * @param {boolean} gameResult.won - Did the player win?
 * @param {number} gameResult.xpEarned - XP earned
 * @returns {Promise<void>}
 */
export async function updateUserStats(uid, gameResult) {
  if (!uid) return;

  const statsRef = ref(db, `users/${uid}/stats`);
  const snapshot = await get(statsRef);

  if (!snapshot.exists()) {
    // Initialize stats if not exists
    await initializeUserProfile({ uid });
    return updateUserStats(uid, gameResult);
  }

  const currentStats = snapshot.val();

  const updates = {
    gamesPlayed: (currentStats.gamesPlayed || 0) + 1,
    totalScore: (currentStats.totalScore || 0) + (gameResult.score || 0),
    xp: (currentStats.xp || 0) + (gameResult.xpEarned || 0),
  };

  if (gameResult.won) {
    updates.wins = (currentStats.wins || 0) + 1;
  }

  if (gameResult.mode === 'quiz') {
    updates.quizGamesPlayed = (currentStats.quizGamesPlayed || 0) + 1;
  } else if (gameResult.mode === 'alibi') {
    updates.alibiGamesPlayed = (currentStats.alibiGamesPlayed || 0) + 1;
  }

  // Calculate level from XP
  const newXP = updates.xp;
  const newLevel = calculateLevel(newXP);
  updates.level = newLevel;

  await update(statsRef, updates);
}

/**
 * Calculate level from XP
 * Level 1 = 0 XP
 * Level 2 = 100 XP
 * Level 3 = 250 XP
 * Level 50 = 50,000 XP
 * @param {number} xp - Current XP
 * @returns {number} - Level (1-50)
 */
export function calculateLevel(xp) {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 450) return 3;
  if (xp < 700) return 4;
  if (xp < 1000) return 5;

  // Level 6-50: exponential curve
  // XP needed = 1000 + (level - 5) * 200
  for (let level = 6; level <= 50; level++) {
    const xpNeeded = 1000 + (level - 5) * 200;
    if (xp < xpNeeded) return level - 1;
  }

  return 50; // Max level
}

/**
 * Calculate XP needed for next level
 * @param {number} currentLevel - Current level
 * @returns {number} - XP needed for next level
 */
export function getXPForNextLevel(currentLevel) {
  if (currentLevel >= 50) return 0; // Max level

  const levels = [0, 100, 250, 450, 700, 1000];

  if (currentLevel < 5) {
    return levels[currentLevel];
  }

  // Level 6-50
  return 1000 + (currentLevel - 4) * 200;
}

/**
 * Calculate XP progress percentage to next level
 * @param {number} currentXP - Current XP
 * @param {number} currentLevel - Current level
 * @returns {number} - Progress percentage (0-100)
 */
export function getXPProgress(currentXP, currentLevel) {
  if (currentLevel >= 50) return 100; // Max level

  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  return Math.round((xpInCurrentLevel / xpNeededForLevel) * 100);
}

/**
 * Update user subscription status
 * @param {string} uid - User ID
 * @param {Object} subscription
 * @param {string} subscription.tier - "free" | "pro"
 * @param {number} subscription.expiresAt - Expiration timestamp
 * @param {string} subscription.subscriptionId - Subscription ID
 * @returns {Promise<void>}
 */
export async function updateSubscription(uid, subscription) {
  if (!uid) return;

  const subRef = ref(db, `users/${uid}/subscription`);
  await update(subRef, {
    tier: subscription.tier || 'free',
    expiresAt: subscription.expiresAt || null,
    subscriptionId: subscription.subscriptionId || null,
  });
}

/**
 * Update user settings
 * @param {string} uid - User ID
 * @param {Object} settings - Settings to update
 * @returns {Promise<void>}
 */
export async function updateUserSettings(uid, settings) {
  if (!uid) return;

  const settingsRef = ref(db, `users/${uid}/settings`);
  await update(settingsRef, settings);
}

/**
 * Get user's game history (can be implemented later with more data)
 * @param {string} uid - User ID
 * @param {number} limit - Number of games to fetch
 * @returns {Promise<Array>}
 */
export async function getUserGameHistory(uid, limit = 10) {
  // TODO: Implement game history tracking
  // For now, return empty array
  return [];
}

/**
 * Calculate XP earned from a game
 * @param {Object} gameData
 * @param {number} gameData.score - Score earned
 * @param {boolean} gameData.won - Did the player win?
 * @param {boolean} gameData.perfectScore - Got all questions correct?
 * @returns {number} - XP earned
 */
export function calculateXPEarned(gameData) {
  let xp = 50; // Base XP for participation

  if (gameData.won) {
    xp += 100; // Bonus for winning
  }

  if (gameData.perfectScore) {
    xp += 50; // Bonus for perfect score
  }

  return xp;
}

/**
 * Update user pseudo (game display name)
 * @param {string} uid - User ID
 * @param {string} pseudo - New pseudo
 * @returns {Promise<void>}
 */
export async function updateUserPseudo(uid, pseudo) {
  if (!uid || !pseudo) return;

  const profileRef = ref(db, `users/${uid}/profile`);
  await update(profileRef, { pseudo });
}

/**
 * Validate pseudo format
 * @param {string} pseudo - Pseudo to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePseudo(pseudo) {
  if (!pseudo || pseudo.trim().length < 2) {
    return { valid: false, error: "Minimum 2 caractères" };
  }
  if (pseudo.length > 16) {
    return { valid: false, error: "Maximum 16 caractères" };
  }
  // Lettres (dont accents), chiffres, espaces, underscore, tiret
  const PSEUDO_REGEX = /^[\p{L}\p{N}\s_-]{2,16}$/u;
  if (!PSEUDO_REGEX.test(pseudo)) {
    return { valid: false, error: "Caractères non autorisés" };
  }
  return { valid: true };
}
