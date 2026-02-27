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
  signInWithCustomToken,
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

let _app = null, _auth = null, _db = null;
try {
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    // ➜ Persistance locale - reste connecté même après refresh/navigation
    setPersistence(_auth, browserLocalPersistence).catch(() => {});
    _db = getDatabase(_app);
  }
} catch {}

export const auth = _auth;
export const db = _db;

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
    // Remote debug log — visible dans Firebase console > debug_logs/
    try {
      set(ref(db, `debug_logs/${Date.now()}`), {
        fn: 'signInWithGoogle',
        uid: auth.currentUser?.uid || null,
        code: error.code || null,
        msg: error.message || String(error),
        ts: Date.now(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }).catch(() => {});
    } catch {}
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
 * Sign in with Apple
 * Uses native plugin on iOS (Capacitor), popup on web
 * If current user is anonymous, links the account to preserve stats
 * @returns {Promise<UserCredential>}
 */
export const signInWithApple = async () => {
  try {
    const currentUser = auth.currentUser;
    const isAnonymous = currentUser?.isAnonymous;

    // Check if running in native Capacitor app (iOS)
    if (Capacitor.isNativePlatform()) {
      // Dynamic import to avoid SSR issues
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

      // Use skipNativeAuth: true to get the credential without auto-signing in
      // This lets us sign in on the web layer so auth state is properly synced
      const result = await FirebaseAuthentication.signInWithApple({
        skipNativeAuth: true
      });

      console.log('[Auth] Apple credential received, signing in on web layer');

      // Create Firebase credential from the Apple result
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: result.credential?.idToken,
        rawNonce: result.credential?.nonce
      });

      // If anonymous, try to link account
      if (isAnonymous && currentUser) {
        try {
          const userCredential = await linkWithCredential(currentUser, credential);
          console.log('[Auth] Anonymous account linked to Apple');
          return userCredential;
        } catch (linkError) {
          if (linkError.code === 'auth/credential-already-in-use') {
            console.log('[Auth] Apple account already exists, signing in');
            const userCredential = await signInWithCredential(auth, credential);
            return userCredential;
          }
          throw linkError;
        }
      }

      // Sign in to Firebase web SDK with the credential
      const userCredential = await signInWithCredential(auth, credential);
      console.log('[Auth] Apple Sign-In completed on web layer');
      return userCredential;
    } else {
      // Web: if anonymous, link account
      if (isAnonymous && currentUser) {
        try {
          const result = await linkWithPopup(currentUser, appleProvider);
          console.log('[Auth] Anonymous account linked to Apple');
          return result;
        } catch (linkError) {
          // If linking fails, sign in normally
          if (linkError.code === 'auth/credential-already-in-use') {
            console.log('[Auth] Apple account already exists, signing in');
            const result = await signInWithPopup(auth, appleProvider);
            return result;
          }
          throw linkError;
        }
      }

      // Web: use popup method
      const result = await signInWithPopup(auth, appleProvider);
      return result;
    }
  } catch (error) {
    // Remote debug log — visible dans Firebase console > debug_logs/
    try {
      set(ref(db, `debug_logs/${Date.now()}`), {
        fn: 'signInWithApple',
        uid: auth.currentUser?.uid || null,
        code: error.code || null,
        msg: error.message || String(error),
        ts: Date.now(),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }).catch(() => {});
    } catch {}
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
  signInAnonymously, onAuthStateChanged, signInWithCustomToken,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, getRedirectResult, signOut
};
