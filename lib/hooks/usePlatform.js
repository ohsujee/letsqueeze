import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to detect the current platform
 * Detects native apps via Capacitor and browser via user agent
 * @returns {{ platform: 'ios' | 'android' | 'web', isNative: boolean, isAndroid: boolean, isIOS: boolean }}
 */
export function usePlatform() {
  const [platform, setPlatform] = useState('web');
  const [isNative, setIsNative] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const detectedPlatform = Capacitor.getPlatform();
    const native = Capacitor.isNativePlatform();

    setPlatform(detectedPlatform);
    setIsNative(native);

    // Native app detection
    if (native) {
      setIsAndroid(detectedPlatform === 'android');
      setIsIOS(detectedPlatform === 'ios');
    } else {
      // Browser detection via user agent
      if (typeof window !== 'undefined') {
        const ua = navigator.userAgent;
        setIsAndroid(/Android/i.test(ua));
        setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);
      }
    }
  }, []);

  return {
    platform,
    isNative,
    isAndroid,
    isIOS,
    isWeb: platform === 'web' && !isNative,
  };
}
