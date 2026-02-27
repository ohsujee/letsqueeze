/**
 * useHeartsLobbyGuard
 *
 * Affiche une modale bloquante (non-fermable) si le joueur entre dans un lobby
 * sans cœurs restants. À utiliser dans toutes les pages de lobby.
 *
 * Sorties possibles pour le joueur bloqué :
 *   - Regarder une pub  → recharge 5 cœurs → modale se ferme
 *   - Devenir Pro       → sauvegarde l'URL courante → /subscribe → retour
 *   - Retour à l'accueil
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @param {Object} options
 * @param {boolean} options.isPro        - L'utilisateur est Pro (pas de guard)
 * @param {boolean} options.canPlay      - A encore des cœurs
 * @param {boolean} options.canRecharge  - Peut regarder une pub pour recharger
 * @param {Function} options.rechargeHearts - Fonction async qui lance la pub et recharge
 * @param {boolean} options.isRecharging - Pub en cours de chargement
 */
export function useHeartsLobbyGuard({
  isPro = false,
  canPlay = true,
  canRecharge = false,
  rechargeHearts,
  isRecharging = false,
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  // Évite de re-déclencher la modale après une recharge ou si canPlay revient à true
  const hasTriggeredRef = useRef(false);

  // Ouvrir la modale dès que canPlay devient false (après chargement des hearts data)
  // canPlay=true par défaut pendant le chargement → on attend qu'il soit stable à false
  useEffect(() => {
    if (!isPro && !canPlay && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      setShowModal(true);
    }
  }, [isPro, canPlay]);

  // Fermer la modale automatiquement si les cœurs ont été rechargés
  useEffect(() => {
    if (showModal && canPlay) {
      setShowModal(false);
    }
  }, [canPlay, showModal]);

  const handleGoHome = useCallback(() => {
    router.push('/home');
  }, [router]);

  const handleUpgrade = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('returnAfterSubscribe', window.location.pathname);
    }
    router.push('/subscribe');
  }, [router]);

  const handleWatchAd = useCallback(async () => {
    if (!rechargeHearts) return;
    await rechargeHearts();
    // La fermeture est gérée par l'effect canPlay ci-dessus
  }, [rechargeHearts]);

  return {
    showHeartsModal: showModal,
    heartsModalProps: {
      canClose: false,
      canRecharge,
      onGoHome: handleGoHome,
      onUpgrade: handleUpgrade,
      onWatchAd: handleWatchAd,
      isWatchingAd: isRecharging,
    },
  };
}

export default useHeartsLobbyGuard;
