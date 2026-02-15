/**
 * useATTPromptInLobby Hook
 * Hook universel pour afficher le prompt ATT dans les lobbies
 * Gère automatiquement le timing, l'affichage du modal, et le prompt système
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useATTPrompt } from './useATTPrompt';
import ATTPromptModal from '@/components/modals/ATTPromptModal';

/**
 * Affiche le prompt ATT dans un lobby (pour les hôtes uniquement)
 * @param {boolean} isHost - Si l'utilisateur est l'hôte de la room
 * @param {number} delay - Délai avant affichage (ms), défaut 3000
 */
export function useATTPromptInLobby(isHost, delay = 3000) {
  const [showModal, setShowModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { shouldShow, showPrompt } = useATTPrompt({ enabled: isHost });

  // Attendre que le DOM soit monté (pour createPortal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Afficher le modal après le délai si nécessaire
  useEffect(() => {
    if (!isHost || !shouldShow) return;

    const timer = setTimeout(() => {
      setShowModal(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isHost, shouldShow, delay]);

  const handleContinue = async () => {
    setShowModal(false);
    // Afficher le vrai prompt ATT (GDPR + ATT)
    await showPrompt();
  };

  // Rendu du modal via portal (pour être au-dessus de tout)
  if (!isMounted || !showModal) return null;

  return createPortal(
    <ATTPromptModal
      isOpen={showModal}
      onContinue={handleContinue}
    />,
    document.body
  );
}
