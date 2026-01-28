import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { initializeUserProfile, getUserProfile } from '../userProfile';

const PSEUDO_CACHE_KEY = 'lq_cached_pseudo';

// Read cached pseudo synchronously (available before Firebase loads)
const getCachedPseudo = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PSEUDO_CACHE_KEY);
};

// Update cache when pseudo changes
const setCachedPseudo = (pseudo) => {
  if (typeof window === 'undefined') return;
  if (pseudo) {
    localStorage.setItem(PSEUDO_CACHE_KEY, pseudo);
  } else {
    localStorage.removeItem(PSEUDO_CACHE_KEY);
  }
};

/**
 * Custom hook to manage user profile data
 * @returns {Object} { user, profile, stats, subscription, settings, loading, error }
 */
export function useUserProfile() {
  const [user, setUser] = useState(null);
  const [cachedPseudo] = useState(() => getCachedPseudo()); // Read once on mount
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribeUserData = null;

    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Cleanup previous user data listener
      if (unsubscribeUserData) {
        unsubscribeUserData();
        unsubscribeUserData = null;
      }

      setLoading(true);
      setError(null);

      if (currentUser) {
        setUser(currentUser);

        try {
          // Initialize profile if new user
          await initializeUserProfile(currentUser);

          // Single listener on parent node (optimized: 1 connection instead of 4)
          const userRef = ref(db, `users/${currentUser.uid}`);

          unsubscribeUserData = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              setProfile(data.profile || null);
              setStats(data.stats || null);
              setSubscription(data.subscription || null);
              setSettings(data.settings || null);
              // Cache pseudo for instant display on next visit
              setCachedPseudo(data.profile?.pseudo || null);
            } else {
              setProfile(null);
              setStats(null);
              setSubscription(null);
              setSettings(null);
              setCachedPseudo(null);
            }
            setLoading(false);
          });
        } catch (err) {
          console.error('Error loading user profile:', err);
          setError(err.message);
          setLoading(false);
        }
      } else {
        // No user logged in
        setUser(null);
        setProfile(null);
        setStats(null);
        setSubscription(null);
        setSettings(null);
        setCachedPseudo(null); // Clear cache on logout
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserData) {
        unsubscribeUserData();
      }
    };
  }, []);

  return {
    user,
    profile,
    stats,
    subscription,
    settings,
    loading,
    error,
    // Helper values
    isLoggedIn: !!user,
    isPro: subscription?.tier === 'pro',
    level: stats?.level || 1,
    xp: stats?.xp || 0,
    // Cached pseudo for instant display (before Firebase loads)
    cachedPseudo,
    // Priority: profile pseudo > cached pseudo > Google displayName > fallback
    displayName: profile?.pseudo || cachedPseudo || user?.displayName || 'Joueur',
  };
}
