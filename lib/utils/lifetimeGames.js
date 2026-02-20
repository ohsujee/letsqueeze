/**
 * Lifetime Games Tracker
 *
 * Compteur global de parties jouées (toutes typologies confondues).
 * Ne se reset jamais (contrairement aux limites quotidiennes).
 *
 * Utilisé pour débloquer les pubs après AD_UNLOCK_THRESHOLD parties :
 * - Évite de montrer des pubs dès le premier lancement (friction UX)
 * - Retarde l'initialisation d'AdMob → conformité ATT Apple
 */

import { storage } from '@/lib/utils/storage';

const STORAGE_KEY = 'lifetime_games';

// Nombre de parties à jouer avant que les pubs se débloquent
export const AD_UNLOCK_THRESHOLD = 3;

/**
 * Retourne le nombre total de parties jouées (lifetime)
 * @returns {number}
 */
export function getLifetimeGamesCount() {
  if (typeof window === 'undefined') return 0;
  return storage.get(STORAGE_KEY) || 0;
}

/**
 * Incrémente le compteur de parties jouées
 * @returns {number} Nouveau total
 */
export function incrementLifetimeGamesCount() {
  if (typeof window === 'undefined') return 0;
  const current = getLifetimeGamesCount();
  const next = current + 1;
  storage.set(STORAGE_KEY, next);
  return next;
}

/**
 * Indique si les pubs sont débloquées (≥ AD_UNLOCK_THRESHOLD parties jouées)
 * @returns {boolean}
 */
export function hasUnlockedAds() {
  return getLifetimeGamesCount() >= AD_UNLOCK_THRESHOLD;
}
