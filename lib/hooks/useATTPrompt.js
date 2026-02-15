/**
 * useATTPrompt Hook
 * Gère l'affichage du prompt ATT (App Tracking Transparency)
 * Affiche le pre-prompt après 3 parties jouées, puis déclenche le prompt système
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { storage } from '@/lib/utils/storage';

/**
 * Hook pour gérer l'affichage du prompt ATT
 * @param {Object} options - Options du hook
 * @param {boolean} options.enabled - Active/désactive le hook
 * @returns {Object} - { shouldShow, showPrompt, markShown }
 */
export function useATTPrompt({ enabled = true } = {}) {
  const [shouldShow, setShouldShow] = useState(false);
  const [attStatus, setAttStatus] = useState(null);

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) {
      return;
    }

    checkATTStatus();
  }, [enabled]);

  /**
   * Vérifie si on doit afficher le prompt ATT
   */
  async function checkATTStatus() {
    try {
      // Vérifier si déjà affiché
      const alreadyShown = storage.get('attPromptShown');
      if (alreadyShown) {
        setShouldShow(false);
        return;
      }

      // Vérifier le statut ATT via AdMob
      const { AdMob } = await import('@capacitor-community/admob');
      const trackingStatus = await AdMob.trackingAuthorizationStatus();

      setAttStatus(trackingStatus.status);

      // Si jamais demandé (notDetermined)
      if (trackingStatus.status === 'notDetermined') {
        // Vérifier le nombre de parties jouées
        const gamesPlayed = storage.get('gamesPlayedCount') || 0;

        if (gamesPlayed >= 3) {
          setShouldShow(true);
        }
      }
    } catch (error) {
      console.error('[useATTPrompt] Error checking status:', error);
      setShouldShow(false);
    }
  }

  /**
   * Affiche le prompt ATT (appelé après le pre-prompt custom)
   */
  async function showPrompt() {
    try {
      const { requestConsentAndInitialize } = await import('@/lib/admob');
      await requestConsentAndInitialize();

      // Marquer comme affiché
      markShown();
    } catch (error) {
      console.error('[useATTPrompt] Error showing prompt:', error);
    }
  }

  /**
   * Marque le prompt comme affiché (ne plus jamais re-afficher)
   */
  function markShown() {
    storage.set('attPromptShown', true);
    setShouldShow(false);
  }

  return {
    shouldShow,
    attStatus,
    showPrompt,
    markShown
  };
}
