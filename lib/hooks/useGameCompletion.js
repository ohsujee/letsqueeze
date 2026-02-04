/**
 * useGameCompletion Hook
 *
 * Enregistre qu'une partie a été complétée (joueur a vu le classement final).
 * Utilisé sur les pages END de chaque jeu.
 *
 * - Enregistre une seule fois par session (pas sur refresh)
 * - Ne gère PAS returnedFromGame (déjà fait dans les pages END)
 * - Incrémente aussi le compteur global de parties jouées
 */

import { useEffect, useRef } from 'react';
import { useGameLimits } from '@/lib/hooks/useGameLimits';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { incrementGlobalPlayCount } from '@/lib/hooks/useGlobalPlayCounts';
import { incrementGamesCompleted } from '@/lib/hooks/useAppReview';
import { auth } from '@/lib/firebase';

/**
 * Hook pour enregistrer la complétion d'une partie
 * @param {Object} options
 * @param {string} options.gameType - Type de jeu ('quiz', 'deeztest', 'alibi', 'mime')
 * @param {string} options.roomCode - Code de la room (pour éviter double comptage)
 */
export function useGameCompletion({ gameType = 'quiz', roomCode = '' } = {}) {
  const recordedRef = useRef(false);
  const { isPro } = useSubscription(auth.currentUser);
  const { recordGamePlayed } = useGameLimits(gameType, isPro);

  useEffect(() => {
    // Skip si déjà enregistré cette session
    if (recordedRef.current) return;

    // Vérifier si cette partie a déjà été comptée (via sessionStorage avec roomCode)
    const completedKey = `gameCompleted_${roomCode}`;
    const alreadyCompleted = roomCode && sessionStorage.getItem(completedKey);

    if (alreadyCompleted) {
      recordedRef.current = true;
      return;
    }

    // Enregistrer la partie comme jouée (pour les limites)
    recordGamePlayed();
    recordedRef.current = true;

    // Incrémenter le compteur global de parties jouées
    incrementGlobalPlayCount(gameType);

    // Incrémenter le compteur pour la demande de review
    incrementGamesCompleted();

    // Marquer cette room comme complétée (pour éviter double comptage sur refresh)
    if (roomCode) {
      sessionStorage.setItem(completedKey, 'true');
    }

  }, [roomCode, recordGamePlayed]);

  return {
    recorded: recordedRef.current
  };
}

export default useGameCompletion;
