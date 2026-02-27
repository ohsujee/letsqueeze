import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * Compare deux versions semver (ex: "1.0.2" vs "1.0.1")
 * Retourne -1 si v1 < v2, 0 si égal, 1 si v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = String(v1).split('.').map(Number);
  const parts2 = String(v2).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

/**
 * Vérifie si une mise à jour forcée est requise.
 * Lit config/forceUpdateVersion dans Firebase.
 * Si la version installée < minVersion → forceUpdate = true.
 */
export function useForceUpdate() {
  const [forceUpdate, setForceUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let unsubscribe;

    const init = async () => {
      let App;
      try {
        const mod = await import('@capacitor/app');
        App = mod.App;
      } catch {
        return;
      }

      const info = await App.getInfo();
      const version = info.version; // ex: "1.0.2"
      setCurrentVersion(version);

      const configRef = ref(db, 'config/forceUpdateVersion');
      unsubscribe = onValue(configRef, (snap) => {
        const minVersion = snap.val();
        if (!minVersion || minVersion === '0.0.0') {
          setForceUpdate(false);
          return;
        }
        setForceUpdate(compareVersions(version, minVersion) < 0);
      });
    };

    init();

    return () => unsubscribe?.();
  }, []);

  return { forceUpdate, currentVersion };
}
