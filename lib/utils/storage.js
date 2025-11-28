/**
 * Utilitaire localStorage avec namespace pour éviter les collisions
 * Préfixe toutes les clés avec 'lq_' (LetsQueeze)
 */

const PREFIX = 'lq_';

export const storage = {
  /**
   * Récupère une valeur du localStorage
   * @param {string} key - Clé sans préfixe
   * @returns {any} Valeur parsée ou null
   */
  get: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn(`[storage] Erreur lecture ${key}:`, e);
      return null;
    }
  },

  /**
   * Stocke une valeur dans localStorage
   * @param {string} key - Clé sans préfixe
   * @param {any} value - Valeur à stocker (sera JSON.stringify)
   */
  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`[storage] Erreur écriture ${key}:`, e);
    }
  },

  /**
   * Supprime une valeur du localStorage
   * @param {string} key - Clé sans préfixe
   */
  remove: (key) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
    } catch (e) {
      console.warn(`[storage] Erreur suppression ${key}:`, e);
    }
  },

  /**
   * Vérifie si une clé existe
   * @param {string} key - Clé sans préfixe
   * @returns {boolean}
   */
  has: (key) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${PREFIX}${key}`) !== null;
  },

  /**
   * Récupère une valeur avec une valeur par défaut
   * @param {string} key - Clé sans préfixe
   * @param {any} defaultValue - Valeur par défaut si la clé n'existe pas
   * @returns {any}
   */
  getOrDefault: (key, defaultValue) => {
    const value = storage.get(key);
    return value !== null ? value : defaultValue;
  }
};

export default storage;
