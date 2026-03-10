import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { version as pkgVersion } from '../../package.json';

/**
 * Retourne la version native (iOS/Android) si disponible,
 * sinon fallback sur package.json.
 */
export function useAppVersion() {
  const [version, setVersion] = useState(pkgVersion);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        if (info.version) setVersion(info.version);
      } catch {}
    })();
  }, []);

  return version;
}
