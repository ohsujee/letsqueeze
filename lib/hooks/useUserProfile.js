import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { initializeUserProfile, getUserProfile } from '../userProfile';

/**
 * Custom hook to manage user profile data
 * @returns {Object} { user, profile, stats, subscription, settings, loading, error }
 */
export function useUserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setError(null);

      if (currentUser) {
        setUser(currentUser);

        try {
          // Initialize profile if new user
          await initializeUserProfile(currentUser);

          // Listen to profile changes in real-time
          const profileRef = ref(db, `users/${currentUser.uid}/profile`);
          const statsRef = ref(db, `users/${currentUser.uid}/stats`);
          const subRef = ref(db, `users/${currentUser.uid}/subscription`);
          const settingsRef = ref(db, `users/${currentUser.uid}/settings`);

          const unsubscribeProfile = onValue(profileRef, (snapshot) => {
            setProfile(snapshot.val());
          });

          const unsubscribeStats = onValue(statsRef, (snapshot) => {
            setStats(snapshot.val());
          });

          const unsubscribeSub = onValue(subRef, (snapshot) => {
            setSubscription(snapshot.val());
          });

          const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
            setSettings(snapshot.val());
          });

          setLoading(false);

          // Cleanup listeners
          return () => {
            unsubscribeProfile();
            unsubscribeStats();
            unsubscribeSub();
            unsubscribeSettings();
          };
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
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
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
    displayName: profile?.displayName || user?.displayName || 'Joueur',
  };
}
