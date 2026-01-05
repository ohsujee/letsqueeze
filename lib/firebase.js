import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  linkWithCredential,
  linkWithPopup,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import {
  getDatabase, ref, set, get, onValue, update, remove, runTransaction, serverTimestamp
} from "firebase/database";
import { Capacitor } from '@capacitor/core';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
// ➜ Persistance locale - reste connecté même après refresh/navigation
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getDatabase(app);

// Google Sign-In Provider
const googleProvider = new GoogleAuthProvider();

// Apple Sign-In Provider
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

/**
 * Sign in with Google
 * Uses native plugin on mobile (Capacitor), popup on web
 * If current user is anonymous, links the account to preserve stats
 * @returns {Promise<UserCredential>}
 */
export const signInWithGoogle = async () => {
  try {
    const currentUser = auth.currentUser;
    const isAnonymous = currentUser?.isAnonymous;

    // Check if running in native Capacitor app
    if (Capacitor.isNativePlatform()) {
      // Dynamic import to avoid SSR issues
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

      // Sign in with native Google
      const result = await FirebaseAuthentication.signInWithGoogle();

      // Get the ID token and create Firebase credential
      const credential = GoogleAuthProvider.credential(result.credential?.idToken);

      // If anonymous, link account to preserve stats
      if (isAnonymous && currentUser) {
        try {
          const userCredential = await linkWithCredential(currentUser, credential);
          console.log('[Auth] Anonymous account linked to Google');
          return userCredential;
        } catch (linkError) {
          // If linking fails (e.g., account already exists), sign in normally
          if (linkError.code === 'auth/credential-already-in-use') {
            console.log('[Auth] Google account already exists, signing in');
            const userCredential = await signInWithCredential(auth, credential);
            return userCredential;
          }
          throw linkError;
        }
      }

      // Sign in to Firebase with the credential
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential;
    } else {
      // Web: if anonymous, link account
      if (isAnonymous && currentUser) {
        try {
          const result = await linkWithPopup(currentUser, googleProvider);
          console.log('[Auth] Anonymous account linked to Google');
          return result;
        } catch (linkError) {
          // If linking fails, sign in normally
          if (linkError.code === 'auth/credential-already-in-use') {
            console.log('[Auth] Google account already exists, signing in');
            const result = await signInWithPopup(auth, googleProvider);
            return result;
          }
          throw linkError;
        }
      }

      // Web: use popup method
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

/**
 * Sign in with Google (redirect method - better for mobile)
 * @returns {Promise<void>}
 */
export const signInWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Google Sign-In Redirect Error:", error);
    throw error;
  }
};

/**
 * Sign in with Apple (popup method)
 * If current user is anonymous, links the account to preserve stats
 * @returns {Promise<UserCredential>}
 */
export const signInWithApple = async () => {
  try {
    const currentUser = auth.currentUser;
    const isAnonymous = currentUser?.isAnonymous;

    // If anonymous, link account to preserve stats
    if (isAnonymous && currentUser) {
      try {
        const result = await linkWithPopup(currentUser, appleProvider);
        console.log('[Auth] Anonymous account linked to Apple');
        return result;
      } catch (linkError) {
        // If linking fails (e.g., account already exists), sign in normally
        if (linkError.code === 'auth/credential-already-in-use') {
          console.log('[Auth] Apple account already exists, signing in');
          const result = await signInWithPopup(auth, appleProvider);
          return result;
        }
        throw linkError;
      }
    }

    const result = await signInWithPopup(auth, appleProvider);
    return result;
  } catch (error) {
    console.error("Apple Sign-In Error:", error);
    throw error;
  }
};

/**
 * Get redirect result after sign-in
 * @returns {Promise<UserCredential|null>}
 */
export const getGoogleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error("Google Redirect Result Error:", error);
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign Out Error:", error);
    throw error;
  }
};

export {
  ref, set, get, onValue, update, remove, runTransaction, serverTimestamp,
  signInAnonymously, onAuthStateChanged,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, signOut
};
