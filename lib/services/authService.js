/**
 * AuthService - Service d'authentification multi-plateforme
 *
 * Gère Google et Apple Sign-In sur Web, Android et iOS
 * Détecte automatiquement la plateforme et utilise la méthode appropriée
 */

import { Capacitor } from '@capacitor/core';
import {
  auth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
} from '@/lib/firebase';

// Providers Firebase
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Variable pour stocker l'instance SocialLogin (lazy load)
let socialLoginInstance = null;

/**
 * Initialise le plugin SocialLogin (une seule fois)
 */
const initSocialLogin = async () => {
  if (!Capacitor.isNativePlatform()) return null;

  if (!socialLoginInstance) {
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    socialLoginInstance = SocialLogin;

    // Initialiser avec les configurations
    await SocialLogin.initialize({
      google: {
        webClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        mode: 'online',
      },
      apple: {
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
        redirectUrl: process.env.NEXT_PUBLIC_APPLE_REDIRECT_URL || '',
      },
    });
  }

  return socialLoginInstance;
};

/**
 * Détecte la plateforme actuelle
 * @returns {'web' | 'ios' | 'android'}
 */
export const getPlatform = () => {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform(); // 'ios' ou 'android'
  }
  return 'web';
};

/**
 * Vérifie si on est sur iOS (natif ou Safari)
 * @returns {boolean}
 */
export const isIOSDevice = () => {
  const platform = getPlatform();
  if (platform === 'ios') return true;

  // Détection iOS Safari pour le web
  if (typeof window !== 'undefined') {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
  return false;
};

/**
 * Vérifie si on est sur Android
 * @returns {boolean}
 */
export const isAndroidDevice = () => {
  const platform = getPlatform();
  if (platform === 'android') return true;

  if (typeof window !== 'undefined') {
    return /Android/.test(navigator.userAgent);
  }
  return false;
};

/**
 * Vérifie si Apple Sign-In doit être affiché
 * Obligatoire sur iOS si on propose d'autres logins
 * @returns {boolean}
 */
export const shouldShowAppleSignIn = () => {
  const platform = getPlatform();

  // Toujours afficher sur iOS natif (obligatoire App Store)
  if (platform === 'ios') return true;

  // Afficher sur iOS Safari (pour cohérence)
  if (isIOSDevice()) return true;

  // Sur Android et Web desktop, optionnel mais on l'affiche pour cohérence
  return true;
};

/**
 * Sign in avec Google
 * @returns {Promise<UserCredential>}
 */
export const signInWithGoogle = async () => {
  const platform = getPlatform();

  if (platform === 'ios' || platform === 'android') {
    return signInWithGoogleNative();
  } else {
    return signInWithGoogleWeb();
  }
};

/**
 * Google Sign-In pour le Web (Firebase popup)
 */
const signInWithGoogleWeb = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    // Si popup bloquée, essayer redirect
    if (error.code === 'auth/popup-blocked') {
      console.log('Popup blocked, trying redirect...');
      await signInWithRedirect(auth, googleProvider);
      return getRedirectResult(auth);
    }
    console.error('Google Sign-In Web Error:', error);
    throw error;
  }
};

/**
 * Google Sign-In pour Mobile natif (Capacitor plugin)
 */
const signInWithGoogleNative = async () => {
  try {
    const SocialLogin = await initSocialLogin();

    if (!SocialLogin) {
      console.warn('SocialLogin not available, falling back to web');
      return signInWithGoogleWeb();
    }

    const result = await SocialLogin.login({
      provider: 'google',
      options: {
        scopes: ['email', 'profile'],
      },
    });

    if (!result?.result?.idToken) {
      throw new Error('No ID token received from Google');
    }

    // Créer le credential Firebase avec le token
    const credential = GoogleAuthProvider.credential(result.result.idToken);
    return signInWithCredential(auth, credential);
  } catch (error) {
    console.error('Google Sign-In Native Error:', error);
    // Fallback vers web en cas d'erreur
    if (error.message?.includes('not available')) {
      return signInWithGoogleWeb();
    }
    throw error;
  }
};

/**
 * Sign in avec Apple
 * @returns {Promise<UserCredential>}
 */
export const signInWithApple = async () => {
  const platform = getPlatform();

  if (platform === 'ios') {
    return signInWithAppleNative();
  } else {
    return signInWithAppleWeb();
  }
};

/**
 * Apple Sign-In pour le Web (Firebase popup)
 */
const signInWithAppleWeb = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return result;
  } catch (error) {
    // Si popup bloquée, essayer redirect
    if (error.code === 'auth/popup-blocked') {
      console.log('Popup blocked, trying redirect...');
      await signInWithRedirect(auth, appleProvider);
      return getRedirectResult(auth);
    }
    console.error('Apple Sign-In Web Error:', error);
    throw error;
  }
};

/**
 * Apple Sign-In pour iOS natif (Capacitor plugin)
 */
const signInWithAppleNative = async () => {
  try {
    const SocialLogin = await initSocialLogin();

    if (!SocialLogin) {
      console.warn('SocialLogin not available, falling back to web');
      return signInWithAppleWeb();
    }

    const result = await SocialLogin.login({
      provider: 'apple',
      options: {
        scopes: ['email', 'name'],
      },
    });

    if (!result?.result?.idToken) {
      throw new Error('No ID token received from Apple');
    }

    // Créer le credential Firebase
    const credential = OAuthProvider.credential({
      idToken: result.result.idToken,
      rawNonce: result.result.nonce,
    });
    return signInWithCredential(auth, credential);
  } catch (error) {
    console.error('Apple Sign-In Native Error:', error);
    // Fallback vers web en cas d'erreur
    if (error.message?.includes('not available')) {
      return signInWithAppleWeb();
    }
    throw error;
  }
};

/**
 * Gère le résultat de redirect (pour les cas où popup est bloquée)
 * À appeler au chargement de l'app
 */
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return result;
    }
  } catch (error) {
    console.error('Redirect result error:', error);
  }
  return null;
};

/**
 * Déconnexion des providers sociaux
 */
export const signOutSocial = async () => {
  if (Capacitor.isNativePlatform() && socialLoginInstance) {
    try {
      await socialLoginInstance.logout({ provider: 'google' });
      await socialLoginInstance.logout({ provider: 'apple' });
    } catch (error) {
      console.log('Social logout error (non-critical):', error);
    }
  }
};

export default {
  getPlatform,
  isIOSDevice,
  isAndroidDevice,
  shouldShowAppleSignIn,
  signInWithGoogle,
  signInWithApple,
  handleRedirectResult,
  signOutSocial,
};
