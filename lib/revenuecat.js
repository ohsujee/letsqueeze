/**
 * RevenueCat Service
 * Gestion des achats in-app via RevenueCat
 */

import { Capacitor } from '@capacitor/core';

// API Keys RevenueCat - À récupérer dans le dashboard RevenueCat
const REVENUECAT_API_KEYS = {
  ios: 'appl_XXXXXXXXXXXXXXXX',     // TODO: Remplacer par ta clé iOS
  android: 'goog_XXXXXXXXXXXXXXXX'  // TODO: Remplacer par ta clé Android
};

// Product IDs (doivent matcher ceux dans App Store Connect / Play Console)
export const PRODUCT_IDS = {
  MONTHLY: 'gigglz_pro_monthly',
  ANNUAL: 'gigglz_pro_annual'
};

// Entitlement ID (défini dans RevenueCat)
export const ENTITLEMENT_ID = 'pro';

// Flag pour le mode test (bypass RevenueCat)
const TEST_MODE = process.env.NODE_ENV === 'development';

let purchasesInstance = null;

/**
 * Initialise RevenueCat avec l'utilisateur
 * @param {string} userId - Firebase UID de l'utilisateur
 */
export async function initRevenueCat(userId) {
  // Skip sur le web (RevenueCat ne fonctionne que sur mobile natif)
  if (!Capacitor.isNativePlatform()) {
    console.log('[RevenueCat] Skipped - not a native platform');
    return false;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');

    const platform = Capacitor.getPlatform();
    const apiKey = platform === 'ios'
      ? REVENUECAT_API_KEYS.ios
      : REVENUECAT_API_KEYS.android;

    await Purchases.configure({
      apiKey,
      appUserID: userId
    });

    purchasesInstance = Purchases;
    console.log('[RevenueCat] Initialized for user:', userId);
    return true;
  } catch (error) {
    console.error('[RevenueCat] Init error:', error);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur a un abonnement Pro actif
 * @returns {Promise<boolean>}
 */
export async function checkProStatus() {
  // Mode test : retourne false par défaut
  if (TEST_MODE || !Capacitor.isNativePlatform()) {
    console.log('[RevenueCat] Test mode - returning false');
    return false;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();

    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] Pro status:', isPro);
    return isPro;
  } catch (error) {
    console.error('[RevenueCat] Check status error:', error);
    return false;
  }
}

/**
 * Récupère les offres disponibles
 * @returns {Promise<Object|null>}
 */
export async function getOfferings() {
  if (!Capacitor.isNativePlatform()) {
    // Retourner des offres mock pour le développement web
    return {
      current: {
        monthly: {
          identifier: PRODUCT_IDS.MONTHLY,
          product: {
            priceString: '3,99 €',
            price: 3.99
          }
        },
        annual: {
          identifier: PRODUCT_IDS.ANNUAL,
          product: {
            priceString: '29,99 €',
            price: 29.99
          }
        }
      }
    };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    console.log('[RevenueCat] Offerings:', offerings);
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Get offerings error:', error);
    return null;
  }
}

/**
 * Achète un abonnement
 * @param {string} packageType - 'monthly' ou 'annual'
 * @returns {Promise<{success: boolean, customerInfo?: Object, error?: string}>}
 */
export async function purchaseSubscription(packageType) {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: 'Les achats ne sont disponibles que dans l\'application mobile.'
    };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      return { success: false, error: 'Aucune offre disponible' };
    }

    // Trouver le bon package
    const packageId = packageType === 'annual' ? PRODUCT_IDS.ANNUAL : PRODUCT_IDS.MONTHLY;
    const pkg = offerings.current.availablePackages?.find(
      p => p.product.identifier === packageId
    );

    if (!pkg) {
      return { success: false, error: 'Offre non trouvée' };
    }

    // Effectuer l'achat
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

    // Vérifier si l'entitlement Pro est actif
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (isPro) {
      console.log('[RevenueCat] Purchase successful!');
      return {
        success: true,
        customerInfo,
        expiresAt: customerInfo.entitlements.active[ENTITLEMENT_ID]?.expirationDate
      };
    } else {
      return { success: false, error: 'Achat non confirmé' };
    }
  } catch (error) {
    console.error('[RevenueCat] Purchase error:', error);

    // Gérer les erreurs spécifiques
    if (error.code === 'PURCHASE_CANCELLED') {
      return { success: false, error: 'cancelled' };
    }

    return { success: false, error: error.message || 'Erreur lors de l\'achat' };
  }
}

/**
 * Restaure les achats précédents
 * @returns {Promise<{success: boolean, isPro: boolean, error?: string}>}
 */
export async function restorePurchases() {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      isPro: false,
      error: 'Restauration disponible uniquement dans l\'application mobile.'
    };
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();

    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    console.log('[RevenueCat] Restore result - isPro:', isPro);

    return {
      success: true,
      isPro,
      expiresAt: isPro
        ? customerInfo.entitlements.active[ENTITLEMENT_ID]?.expirationDate
        : null
    };
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error);
    return { success: false, isPro: false, error: error.message };
  }
}

/**
 * Récupère les infos client (pour debug/support)
 * @returns {Promise<Object|null>}
 */
export async function getCustomerInfo() {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Get customer info error:', error);
    return null;
  }
}

/**
 * Ouvre la page de gestion des abonnements (App Store / Play Store)
 */
export async function openManageSubscriptions() {
  if (!Capacitor.isNativePlatform()) {
    // Sur le web, ouvrir les pages de gestion
    const platform = navigator.userAgent.toLowerCase();
    if (platform.includes('iphone') || platform.includes('ipad')) {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
    return;
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    // RevenueCat n'a pas de méthode native pour ça, on utilise les URLs
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
    }
  } catch (error) {
    console.error('[RevenueCat] Open manage error:', error);
  }
}

export default {
  initRevenueCat,
  checkProStatus,
  getOfferings,
  purchaseSubscription,
  restorePurchases,
  getCustomerInfo,
  openManageSubscriptions,
  PRODUCT_IDS,
  ENTITLEMENT_ID
};
