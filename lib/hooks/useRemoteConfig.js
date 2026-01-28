import { useState, useEffect } from 'react';
import { fetchRemoteConfig, getGamesConfig, isMaintenanceMode } from '@/lib/remoteConfig';

/**
 * Hook to access Firebase Remote Config values
 * Fetches config on mount and when app returns to foreground
 *
 * @returns {Object} { gamesConfig, isLoading, maintenanceMode }
 */
export function useRemoteConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [gamesConfig, setGamesConfig] = useState({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      await fetchRemoteConfig();
      if (mounted) {
        setGamesConfig(getGamesConfig());
        setMaintenanceMode(isMaintenanceMode());
        setIsLoading(false);
      }
    };

    loadConfig();

    // Refresh quand l'app revient au premier plan
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadConfig();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { gamesConfig, isLoading, maintenanceMode };
}

export default useRemoteConfig;
