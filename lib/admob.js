/**
 * AdMob Service
 * Gestion des publicités récompensées (rewarded ads)
 */

import { Capacitor } from '@capacitor/core';

// Ad Unit IDs - Console AdMob
// https://admob.google.com/
const AD_UNIT_IDS = {
  ios: {
    rewarded: 'ca-app-pub-1140758415112389/5594671010',  // Gigglz Rewarded - Extra Game (iOS)
  },
  android: {
    rewarded: 'ca-app-pub-1140758415112389/6397628551',  // Gigglz Rewarded - Extra Game (Android)
  }
};

// App IDs (pour la config Capacitor)
export const ADMOB_APP_IDS = {
  ios: 'ca-app-pub-1140758415112389~9949860754',      // Gigglz iOS
  android: 'ca-app-pub-1140758415112389~6606152744'   // Gigglz Android
};

// Test mode - utilise les IDs de test Google
const USE_TEST_ADS = process.env.NODE_ENV === 'development';

// Test Ad Unit IDs (fournis par Google pour les tests)
const TEST_AD_UNIT_IDS = {
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313'
  },
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917'
  }
};

let isInitialized = false;
let AdMob = null;

/**
 * Initialise AdMob
 */
export async function initAdMob() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;

    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: USE_TEST_ADS ? ['DEVICE_ID'] : [],
      initializeForTesting: USE_TEST_ADS
    });

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('[AdMob] Init error:', error);
    return false;
  }
}

/**
 * Récupère l'Ad Unit ID approprié
 */
function getAdUnitId(type = 'rewarded') {
  const platform = Capacitor.getPlatform();
  const ids = USE_TEST_ADS ? TEST_AD_UNIT_IDS : AD_UNIT_IDS;

  if (platform === 'ios') {
    return ids.ios[type];
  }
  return ids.android[type];
}

/**
 * Prépare une pub rewarded (à appeler en avance pour éviter le chargement)
 */
export async function prepareRewardedAd() {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return false;
  }

  try {
    const adUnitId = getAdUnitId('rewarded');

    await AdMob.prepareRewardedAd({
      adId: adUnitId,
      isTesting: USE_TEST_ADS
    });

    console.log('[AdMob] Rewarded ad prepared');
    return true;
  } catch (error) {
    console.error('[AdMob] Prepare rewarded error:', error);
    return false;
  }
}

/**
 * Affiche une pub rewarded et attend la récompense
 * @returns {Promise<{success: boolean, reward?: {type: string, amount: number}, error?: string}>}
 */
export async function showRewardedAd() {
  // Sur le web, simuler pour le développement
  if (!Capacitor.isNativePlatform()) {
    console.log('[AdMob] Web simulation - returning success');
    return {
      success: true,
      reward: { type: 'extra_game', amount: 1 },
      simulated: true
    };
  }

  if (!isInitialized) {
    await initAdMob();
  }

  try {
    const adUnitId = getAdUnitId('rewarded');

    // Préparer la pub si pas déjà fait
    await AdMob.prepareRewardedAd({
      adId: adUnitId,
      isTesting: USE_TEST_ADS
    });

    // Créer une promesse pour attendre le résultat
    return new Promise((resolve) => {
      let rewarded = false;
      let rewardData = null;

      // Listener pour la récompense
      const rewardListener = AdMob.addListener('onRewardedVideoAdReward', (reward) => {
        console.log('[AdMob] Reward received:', reward);
        rewarded = true;
        rewardData = reward;
      });

      // Listener pour la fermeture
      const dismissListener = AdMob.addListener('onRewardedVideoAdDismissed', () => {
        console.log('[AdMob] Ad dismissed, rewarded:', rewarded);

        // Nettoyer les listeners
        rewardListener.remove();
        dismissListener.remove();
        failListener.remove();

        if (rewarded) {
          resolve({
            success: true,
            reward: rewardData || { type: 'extra_game', amount: 1 }
          });
        } else {
          resolve({
            success: false,
            error: 'not_completed'
          });
        }
      });

      // Listener pour les erreurs
      const failListener = AdMob.addListener('onRewardedVideoAdFailedToLoad', (error) => {
        console.error('[AdMob] Ad failed to load:', error);

        rewardListener.remove();
        dismissListener.remove();
        failListener.remove();

        resolve({
          success: false,
          error: 'load_failed'
        });
      });

      // Afficher la pub
      AdMob.showRewardedAd().catch((error) => {
        console.error('[AdMob] Show error:', error);

        rewardListener.remove();
        dismissListener.remove();
        failListener.remove();

        resolve({
          success: false,
          error: error.message || 'show_failed'
        });
      });
    });
  } catch (error) {
    console.error('[AdMob] Show rewarded error:', error);
    return {
      success: false,
      error: error.message || 'unknown_error'
    };
  }
}

/**
 * Vérifie si les pubs sont disponibles sur cette plateforme
 */
export function isAdsAvailable() {
  return Capacitor.isNativePlatform();
}

/**
 * Vérifie si une pub rewarded est prête
 */
export async function isRewardedAdReady() {
  if (!Capacitor.isNativePlatform() || !isInitialized) {
    return false;
  }

  try {
    // AdMob Capacitor ne fournit pas cette méthode directement
    // On retourne true car on prépare à la volée
    return true;
  } catch {
    return false;
  }
}

export default {
  initAdMob,
  prepareRewardedAd,
  showRewardedAd,
  isAdsAvailable,
  isRewardedAdReady
};
