'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { HowToPlayProvider } from '@/lib/context/HowToPlayContext';

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
  const router = useRouter();

  // Gestion du bouton retour système (Android/iOS)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('backButton', ({ canGoBack }) => {
      // Pages principales où on minimise au lieu de quitter
      const mainPages = ['/home', '/splash', '/'];
      const isMainPage = mainPages.includes(pathname);

      if (isMainPage) {
        // Minimiser l'app au lieu de quitter
        App.minimizeApp();
      } else if (canGoBack) {
        // Naviguer en arrière
        router.back();
      } else {
        // Fallback : aller à home
        router.push('/home');
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [pathname, router]);

  // Deep linking: handle QR code scans and universal links
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        // Build the internal path with query params
        const path = parsed.pathname + parsed.search;

        if (path && path !== '/') {
          // Store deep link in sessionStorage for cold start handling
          // This ensures the link persists through auth initialization
          sessionStorage.setItem('lq_pending_deeplink', path);

          // Try immediate navigation (works if app is already running)
          router.push(path);
        }
      } catch {
        // Invalid URL, ignore
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [router]);

  // Process pending deep link after app initialization
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Wait for auth to be ready (small delay to ensure Firebase is initialized)
    const timer = setTimeout(() => {
      const pendingLink = sessionStorage.getItem('lq_pending_deeplink');

      if (pendingLink) {
        // Check if user has completed onboarding
        // Note: storage.set() adds 'lq_' prefix, so 'hasSeenOnboarding' becomes 'lq_hasSeenOnboarding'
        const hasCompletedOnboarding = localStorage.getItem('lq_hasSeenOnboarding') === 'true';

        // Only navigate if:
        // 1. User has completed onboarding OR
        // 2. The link is not /join (allow other paths like /home, /profile, etc.)
        const isJoinLink = pendingLink.startsWith('/join');

        if (hasCompletedOnboarding || !isJoinLink) {
          // Clear the pending link to avoid re-navigation
          sessionStorage.removeItem('lq_pending_deeplink');

          // Navigate to the deep link
          router.push(pendingLink);
        }
        // If user hasn't completed onboarding and it's a /join link,
        // keep the link in sessionStorage - it will be processed after onboarding
      }
    }, 1000); // 1 second delay to ensure Firebase auth is ready

    return () => clearTimeout(timer);
  }, [router, pathname]); // Re-run when pathname changes (e.g., after onboarding)

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
      <HowToPlayProvider>
        {children}
      </HowToPlayProvider>
    </div>
  );
}
