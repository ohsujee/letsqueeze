'use client';

import { useEffect, useCallback } from 'react';

// Stack module-level — partagé entre tous les composants
// Le dernier handler enregistré est appelé en premier (LIFO)
const backHandlerStack = [];

/**
 * Tente d'exécuter le handler le plus récent du stack.
 * @returns {boolean} true si un handler a été exécuté, false sinon
 */
export function consumeBackHandler() {
  if (backHandlerStack.length > 0) {
    const handler = backHandlerStack[backHandlerStack.length - 1];
    handler();
    return true;
  }
  return false;
}

/**
 * Hook pour enregistrer un handler de bouton retour.
 * Quand le bouton retour système est pressé, le handler le plus récent
 * est appelé à la place de la navigation par défaut.
 *
 * @param {Function} callback - Fonction à appeler (ex: fermer une modale)
 * @param {boolean} enabled - Si true, le handler est actif (ex: modale ouverte)
 *
 * @example
 * // Dans une modale
 * useBackHandler(() => onClose(), isOpen);
 */
export function useBackHandler(callback, enabled = true) {
  const stableCallback = useCallback(() => {
    callback();
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    backHandlerStack.push(stableCallback);

    return () => {
      const idx = backHandlerStack.indexOf(stableCallback);
      if (idx !== -1) backHandlerStack.splice(idx, 1);
    };
  }, [stableCallback, enabled]);
}
