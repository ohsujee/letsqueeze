/**
 * Stats Service - Manages user game statistics in Firebase
 *
 * Structure in Firebase:
 * users/{uid}/stats/
 *   quiz/
 *     gamesPlayed: number
 *     wins: number
 *     bestScore: number
 *   alibi/
 *     gamesPlayed: number
 *     winsAsAccused: number
 *     winsAsDetective: number
 *     bestPercentage: number
 */

import { db, auth } from '@/lib/firebase';
import { ref, get, update, increment, runTransaction } from 'firebase/database';

/**
 * Get current user's stats
 */
export async function getUserStats(uid) {
  if (!uid) {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous) return null;
    uid = currentUser.uid;
  }

  try {
    const statsRef = ref(db, `users/${uid}/stats`);
    const snapshot = await get(statsRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    // Return default stats if none exist
    return {
      quiz: {
        gamesPlayed: 0,
        wins: 0,
        bestScore: 0
      },
      alibi: {
        gamesPlayed: 0,
        winsAsAccused: 0,
        winsAsDetective: 0,
        bestPercentage: 0
      }
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

/**
 * Record a completed Quiz game
 * @param {Object} params
 * @param {boolean} params.won - Did the player win?
 * @param {number} params.score - Player's final score
 * @param {number} params.position - Final position (1st, 2nd, etc.)
 */
export async function recordQuizGame({ won = false, score = 0, position = 0 }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    console.log('Stats not saved: guest user');
    return false;
  }

  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/quiz`);

    // First, get current best score
    const snapshot = await get(statsRef);
    const currentStats = snapshot.val() || { bestScore: 0 };
    const newBestScore = Math.max(currentStats.bestScore || 0, score);

    const updates = {
      gamesPlayed: increment(1),
      bestScore: newBestScore
    };

    if (won) {
      updates.wins = increment(1);
    }

    await update(statsRef, updates);
    console.log('Quiz stats saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving quiz stats:', error);
    return false;
  }
}

/**
 * Record a completed Alibi game
 * @param {Object} params
 * @param {string} params.role - 'accused' or 'detective'
 * @param {boolean} params.won - Did the player's team win?
 * @param {number} params.score - Number of correct answers
 */
export async function recordAlibiGame({ role, won = false, score = 0 }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) {
    console.log('Stats not saved: guest user');
    return false;
  }

  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/alibi`);

    // First, get current best score
    const snapshot = await get(statsRef);
    const currentStats = snapshot.val() || { bestScore: 0 };
    const newBestScore = Math.max(currentStats.bestScore || 0, score);

    const updates = {
      gamesPlayed: increment(1),
      bestScore: newBestScore
    };

    if (won) {
      if (role === 'accused') {
        updates.winsAsAccused = increment(1);
      } else {
        updates.winsAsDetective = increment(1);
      }
    }

    await update(statsRef, updates);
    console.log('Alibi stats saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving alibi stats:', error);
    return false;
  }
}

/**
 * Record a completed Blindtest/DeezTest game
 */
export async function recordDeezTestGame({ won = false, score = 0 }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/deeztest`);
    const snapshot = await get(statsRef);
    const currentStats = snapshot.val() || { bestScore: 0 };
    const updates = {
      gamesPlayed: increment(1),
      bestScore: Math.max(currentStats.bestScore || 0, score),
    };
    if (won) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving deeztest stats:', error);
    return false;
  }
}

/**
 * Record a completed La Règle game
 */
export async function recordLaregleGame({ won = false }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/laregle`);
    const updates = { gamesPlayed: increment(1) };
    if (won) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving laregle stats:', error);
    return false;
  }
}

/**
 * Record a completed Mime game
 */
export async function recordMimeGame({ won = false, score = 0 }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/mime`);
    const snapshot = await get(statsRef);
    const currentStats = snapshot.val() || { bestScore: 0 };
    const updates = {
      gamesPlayed: increment(1),
      bestScore: Math.max(currentStats.bestScore || 0, score),
    };
    if (won) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving mime stats:', error);
    return false;
  }
}

/**
 * Record a completed LOL game
 */
export async function recordLolGame({ survived = false }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/lol`);
    const updates = { gamesPlayed: increment(1) };
    if (survived) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving lol stats:', error);
    return false;
  }
}

/**
 * Record a completed MindLink game
 */
export async function recordMindlinkGame({ won = false }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/mindlink`);
    const updates = { gamesPlayed: increment(1) };
    if (won) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving mindlink stats:', error);
    return false;
  }
}

/**
 * Record a completed Imposteur game
 */
export async function recordImposteurGame({ won = false, score = 0 }) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.isAnonymous) return false;
  try {
    const statsRef = ref(db, `users/${currentUser.uid}/stats/imposteur`);
    const snapshot = await get(statsRef);
    const currentStats = snapshot.val() || { bestScore: 0 };
    const updates = {
      gamesPlayed: increment(1),
      bestScore: Math.max(currentStats.bestScore || 0, score),
    };
    if (won) updates.wins = increment(1);
    await update(statsRef, updates);
    return true;
  } catch (error) {
    console.error('Error saving imposteur stats:', error);
    return false;
  }
}

/**
 * Get formatted stats for display
 */
export function formatStats(stats) {
  if (!stats) {
    return {
      quiz: { gamesPlayed: 0, wins: 0, bestScore: 0 },
      alibi: { gamesPlayed: 0, totalWins: 0, bestScore: 0 },
      totalGames: 0
    };
  }

  const quiz = stats.quiz || {};
  const alibi = stats.alibi || {};
  const deeztest = stats.deeztest || {};
  const laregle = stats.laregle || {};
  const mime = stats.mime || {};
  const lol = stats.lol || {};
  const mindlink = stats.mindlink || {};
  const imposteur = stats.imposteur || {};

  const alibiTotalWins = (alibi.winsAsAccused || 0) + (alibi.winsAsDetective || 0);

  const totalGames = [quiz, alibi, deeztest, laregle, mime, lol, mindlink, imposteur]
    .reduce((sum, g) => sum + (g.gamesPlayed || 0), 0);

  return {
    quiz: {
      gamesPlayed: quiz.gamesPlayed || 0,
      wins: quiz.wins || 0,
      bestScore: quiz.bestScore || 0
    },
    alibi: {
      gamesPlayed: alibi.gamesPlayed || 0,
      totalWins: alibiTotalWins,
      bestScore: alibi.bestScore || 0
    },
    deeztest: {
      gamesPlayed: deeztest.gamesPlayed || 0,
      wins: deeztest.wins || 0,
      bestScore: deeztest.bestScore || 0
    },
    laregle: { gamesPlayed: laregle.gamesPlayed || 0, wins: laregle.wins || 0 },
    mime: { gamesPlayed: mime.gamesPlayed || 0 },
    lol: { gamesPlayed: lol.gamesPlayed || 0 },
    mindlink: { gamesPlayed: mindlink.gamesPlayed || 0 },
    imposteur: { gamesPlayed: imposteur.gamesPlayed || 0 },
    totalGames
  };
}
