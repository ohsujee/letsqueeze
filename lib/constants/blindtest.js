/**
 * Constantes partagées pour le Blind Test
 * Utilisées par le host ET les players pour garantir la synchronisation
 */

// Niveaux de snippets avec durées et points
export const SNIPPET_LEVELS = [
  { duration: 1500, label: "1.5s", start: 200, floor: 150 },
  { duration: 3000, label: "3s", start: 150, floor: 100 },
  { duration: 10000, label: "10s", start: 100, floor: 75 },
  { duration: null, label: "25s", start: 50, floor: 25 }
];

// Durée de blocage après mauvaise réponse (en ms)
export const LOCKOUT_MS = 8000;

// Pénalité pour mauvaise réponse (points)
export const WRONG_PENALTY = 25;

/**
 * Récupère les points pour un niveau donné
 * @param {number} level - Index du niveau (0-3)
 * @returns {number} Points pour ce niveau
 */
export function getPointsForLevel(level) {
  if (level < 0 || level >= SNIPPET_LEVELS.length) {
    return SNIPPET_LEVELS[0].start; // Fallback au premier niveau
  }
  return SNIPPET_LEVELS[level].start;
}

/**
 * Valide qu'un niveau est valide
 * @param {number} level - Index du niveau
 * @returns {boolean}
 */
export function isValidLevel(level) {
  return level >= 0 && level < SNIPPET_LEVELS.length;
}
