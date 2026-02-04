'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

/**
 * AppShell - Wrapper global pour le viewport
 *
 * GÈRE AUTOMATIQUEMENT :
 * - --app-height : vraie hauteur viewport (fix Android/iOS barre d'adresse)
 * - --safe-area-top-fallback : padding pour status bar Android (env() ne fonctionne pas)
 * - safe-area-inset-top : espace pour notch/caméra (via CSS dans globals.css)
 * - overflow: hidden global
 *
 * RÈGLES POUR LES PAGES (voir globals.css pour détails) :
 * - Pages de jeu : flex: 1; min-height: 0; display: flex; flex-direction: column;
 * - Pages avec scroll : flex: 1; min-height: 0; overflow-y: auto;
 * - NE PAS utiliser height: 100vh/dvh ou padding-top: safe-area dans les pages
 */
export function AppShell({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    const setAppHeight = () => {
      // Calcule la vraie hauteur visible (sans barre d'adresse, etc.)
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    };

    // Sur Android Capacitor, env(safe-area-inset-top) retourne 0
    // On utilise une valeur de fallback pour la status bar (24dp standard)
    const setSafeAreaFallback = () => {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        // 24dp est la hauteur standard de la status bar Android
        // Sur les appareils avec notch, ça peut être plus, mais 24dp couvre la plupart des cas
        const statusBarHeight = 24;
        document.documentElement.style.setProperty('--safe-area-top-fallback', `${statusBarHeight}px`);
      } else {
        document.documentElement.style.setProperty('--safe-area-top-fallback', '0px');
      }
    };

    // Set initial values
    setAppHeight();
    setSafeAreaFallback();

    // Update on resize and orientation change
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', () => {
      // Delay pour laisser le temps au navigateur de recalculer
      setTimeout(setAppHeight, 100);
    });

    // Recalcul quand l'app revient au premier plan (Android)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(setAppHeight, 50);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Recalcul après chaque navigation (fix Android WebView)
  useEffect(() => {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${vh}px`);
  }, [pathname]);

  return (
    <div className="app-shell">
      {children}
    </div>
  );
}
