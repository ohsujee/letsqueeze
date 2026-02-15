'use client';

import { useState, useEffect } from 'react';
import { useATTPrompt } from '@/lib/hooks/useATTPrompt';
import ATTPromptModal from '@/components/modals/ATTPromptModal';

/**
 * Composant universel pour gérer le prompt ATT
 * À utiliser dans les lobbies (pour hôtes) et sur la page home (pour joueurs)
 *
 * @param {Object} props
 * @param {boolean} props.enabled - Active/désactive le handler
 * @param {number} props.delay - Délai avant affichage (ms), défaut 3000
 * @param {string} props.context - 'lobby' ou 'join'
 */
export default function ATTPromptHandler({
  enabled = true,
  delay = 3000,
  context = 'lobby'
}) {
  const [showModal, setShowModal] = useState(false);
  const { shouldShow, showPrompt } = useATTPrompt({ enabled });

  useEffect(() => {
    if (!enabled || !shouldShow) return;

    // Délai seulement pour les lobbies (contexte calme)
    // Pour join, affichage immédiat
    const timer = setTimeout(() => {
      setShowModal(true);
    }, context === 'lobby' ? delay : 0);

    return () => clearTimeout(timer);
  }, [enabled, shouldShow, delay, context]);

  const handleContinue = async () => {
    setShowModal(false);
    // Afficher le vrai prompt ATT (GDPR + ATT)
    await showPrompt();
  };

  return (
    <ATTPromptModal
      isOpen={showModal}
      onContinue={handleContinue}
    />
  );
}
