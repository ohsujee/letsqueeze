import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getDatabase, ref, set, get, onValue, update, runTransaction, serverTimestamp
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
// ➜ Une session par onglet (pas partagée entre onglets)
setPersistence(auth, browserSessionPersistence).catch(() => {});

export const db = getDatabase(app);
export {
  ref, set, get, onValue, update, runTransaction, serverTimestamp,
  signInAnonymously, onAuthStateChanged
};
