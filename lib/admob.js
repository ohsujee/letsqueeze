/**
 * AdMob Service
 * Gestion des publicités (interstitial + rewarded ads)
 */

import { Capacitor } from '@capacitor/core';

// Ad Unit IDs - Console AdMob
// https://admob.google.com/
const AD_UNIT_IDS = {
  ios: {
    interstitial: 'ca-app-pub-1140758415112389/1338984749',  // Gigglz Interstitial (iOS)
    rewarded: 'ca-app-pub-1140758415112389/5594671010',      // Gigglz Rewarded - Extra Game (iOS)
  },
  android: {
    interstitial: 'ca-app-pub-1140758415112389/3587047598',  // Gigglz Interstitial (Android)
    rewarded: 'ca-app-pub-1140758415112389/6397628551',      // Gigglz Rewarded - Extra Game (Android)
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
    interstitial: 'ca-app-pub-3940256099942544/4411468910',  // Google test interstitial iOS
    rewarded: 'ca-app-pub-3940256099942544/1712485313'
  },
  android: {
    interstitial: 'ca-app-pub-3940256099942544/1033173712',  // Google test interstitial Android
    rewarded: 'ca-app-pub-3940256099942544/5224354917'
  }
};

let isInitialized = false;
let AdMob = null;

/**
 * Demande le consentement (GDPR + ATT) puis initialise AdMob
 * GDPR pour users EU (iOS + Android)
 * ATT pour tous les users iOS (après GDPR si EU)
 *
 * @returns {Promise<boolean>}
 */
export async function requestConsentAndInitialize() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    const admobModule = await import('@capacitor-community/admob');
    AdMob = admobModule.AdMob;

    // 1. Demander le consentement (UMP SDK)
    // Gère automatiquement:
    // - GDPR pour users EU (iOS + Android)
    // - ATT pour iOS (après GDPR si EU, directement si hors EU)
    console.log('[AdMob] Requesting consent (GDPR + ATT)...');

    const consentInfo = await AdMob.requestConsentInfo();
    console.log('[AdMob] Consent info:', consentInfo);

    // Si un formulaire de consentement est disponible (EU users)
    if (consentInfo.isConsentFormAvailable) {
      console.log('[AdMob] Showing consent form...');
      await AdMob.showConsentForm();
    }

    // 2. Initialiser AdMob avec ATT activé
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: USE_TEST_ADS ? ['DEVICE_ID'] : [],
      initializeForTesting: USE_TEST_ADS
    });

    isInitialized = true;
    console.log('[AdMob] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[AdMob] Consent/Init error:', error);
    return false;
  }
}

/**
 * Initialise AdMob (legacy - sans consentement)
 * Utiliser requestConsentAndInitialize() à la place
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
 * Affiche une pub rewarded et attend la récompense
 * @returns {Promise<{success: boolean, reward?: {type: string, amount: number}, error?: string}>}
 */
export async function showRewardedAd() {
  // Sur le web, simuler pour le développement
  if (!Capacitor.isNativePlatform()) {
    return {
      success: true,
      reward: { type: 'extra_game', amount: 1 },
      simulated: true
    };
  }

  if (!isInitialized) {
    const initSuccess = await initAdMob();
    if (!initSuccess) {
      console.error('[AdMob] Failed to initialize');
      return { success: false, error: 'init_failed' };
    }
  }

  if (!AdMob) {
    console.error('[AdMob] AdMob module not available');
    return { success: false, error: 'module_not_available' };
  }

  // Préparer la pub (peut échouer si pas de fill)
  try {
    const adUnitId = getAdUnitId('rewarded');
    await AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: USE_TEST_ADS });
  } catch (error) {
    console.error('[AdMob] Prepare rewarded error:', error);
    return { success: false, error: error.message || 'prepare_failed' };
  }

  // addListener retourne Promise<PluginListenerHandle> en Capacitor v6+
  // Il faut await chaque listener pour obtenir le vrai handle (avec .remove())
  return new Promise(async (resolve) => {
    let rewarded = false;
    let rewardData = null;
    const handles = [];

    const cleanup = () => handles.forEach(h => h?.remove?.());

    try {
      handles.push(await AdMob.addListener('onRewardedVideoAdReward', (reward) => {
        rewarded = true;
        rewardData = reward;
      }));

      handles.push(await AdMob.addListener('onRewardedVideoAdDismissed', () => {
        cleanup();
        resolve(rewarded
          ? { success: true, reward: rewardData || { type: 'extra_game', amount: 1 } }
          : { success: false, error: 'not_completed' }
        );
      }));

      handles.push(await AdMob.addListener('onRewardedVideoAdFailedToShow', (error) => {
        console.error('[AdMob] Rewarded ad failed to show:', error);
        cleanup();
        resolve({ success: false, error: 'show_failed' });
      }));

      AdMob.showRewardVideoAd().catch((error) => {
        console.error('[AdMob] showRewardVideoAd error:', error);
        cleanup();
        resolve({ success: false, error: error.message || 'show_failed' });
      });
    } catch (error) {
      console.error('[AdMob] Listener setup error:', error);
      cleanup();
      resolve({ success: false, error: error.message || 'listener_error' });
    }
  });
}

/**
 * Vérifie si les pubs sont disponibles sur cette plateforme
 */
export function isAdsAvailable() {
  return Capacitor.isNativePlatform();
}

// ============================================
// INTERSTITIAL ADS
// ============================================

/**
 * Affiche une pub interstitielle
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function showInterstitialAd() {
  // Sur le web, simuler pour le développement
  if (!Capacitor.isNativePlatform()) {
    return { success: true, simulated: true };
  }

  if (!isInitialized) {
    await initAdMob();
  }

  // Préparer la pub (peut échouer si pas de fill)
  try {
    const adUnitId = getAdUnitId('interstitial');
    await AdMob.prepareInterstitial({ adId: adUnitId, isTesting: USE_TEST_ADS });
  } catch (error) {
    console.error('[AdMob] Prepare interstitial error:', error);
    return { success: false, error: error.message || 'prepare_failed' };
  }

  // Note: les événements interstitielles n'ont PAS de préfixe "on" (contrairement aux rewarded)
  // Correct: "interstitialAdDismissed" / "interstitialAdFailedToShow"
  return new Promise(async (resolve) => {
    const handles = [];

    const cleanup = () => handles.forEach(h => h?.remove?.());

    try {
      handles.push(await AdMob.addListener('interstitialAdDismissed', () => {
        cleanup();
        resolve({ success: true });
      }));

      handles.push(await AdMob.addListener('interstitialAdFailedToShow', (error) => {
        console.error('[AdMob] Interstitial failed to show:', error);
        cleanup();
        resolve({ success: false, error: 'show_failed' });
      }));

      AdMob.showInterstitial().catch((error) => {
        console.error('[AdMob] Show interstitial error:', error);
        cleanup();
        resolve({ success: false, error: error.message || 'show_failed' });
      });
    } catch (error) {
      console.error('[AdMob] Interstitial listener setup error:', error);
      cleanup();
      resolve({ success: false, error: error.message || 'listener_error' });
    }
  });
}

