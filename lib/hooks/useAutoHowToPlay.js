/**
 * useAutoHowToPlay
 * Gère l'ouverture automatique de la modale "Comment jouer" à l'entrée d'un jeu.
 *
 * - S'ouvre automatiquement après 400ms si l'user ne l'a pas dismissée
 * - dismissForever() → enregistre le choix en localStorage, ne réapparaît plus
 * - openManually() → ouvre sans le bouton "Ne plus afficher"
 *
 * Stockage: localStorage via storage utility (clé: 'htp_dismissed_<gameType>')
 */

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/utils/storage';

const STORAGE_PREFIX = 'htp_dismissed_';

/**
 * @param {string} gameType - identifiant du jeu (ex: 'quiz', 'deeztest', 'alibi', ...)
 */
export function useAutoHowToPlay(gameType) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Auto-ouverture au montage si pas encore dismissée
  useEffect(() => {
    if (!gameType || typeof window === 'undefined') return;

    const dismissed = storage.get(`${STORAGE_PREFIX}${gameType}`);
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsAutoMode(true);
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [gameType]);

  // Fermer (sans dismiss permanent)
  const close = useCallback(() => {
    setIsOpen(false);
    setIsAutoMode(false);
  }, []);

  // Dismiss permanent → ne plus jamais auto-ouvrir pour ce jeu
  const dismissForever = useCallback(() => {
    if (gameType) {
      storage.set(`${STORAGE_PREFIX}${gameType}`, true);
    }
    setIsOpen(false);
    setIsAutoMode(false);
  }, [gameType]);

  // Ouverture manuelle (via ? ou settings) → pas de bouton "Ne plus afficher"
  const openManually = useCallback(() => {
    setIsAutoMode(false);
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    isAutoMode,   // true = ouverture auto → afficher "Ne plus afficher"
    close,
    dismissForever,
    openManually,
  };
}

export default useAutoHowToPlay;
