import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import {
  getDatabase, ref, set, get, onValue, update, remove, runTransaction, serverTimestamp
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAE0ef6GaqSHHfZieU9-KyhCIv4UwfBV5o",
  authDomain: "letsqueeze.firebaseapp.com",
  databaseURL: "https://letsqueeze-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "letsqueeze",
  storageBucket: "letsqueeze.firebasestorage.app",
  messagingSenderId: "1027748327177",
  appId: "1:1027748327177:web:5b7dbf0df09fc91fcd6dd8",
  measurementId: "G-89JBBC0DYN"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
// ➜ Persistance locale - reste connecté même après refresh/navigation
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = getDatabase(app);

// Google Sign-In Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google (popup method - better for desktop)
 * @returns {Promise<UserCredential>}
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
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
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut
};
