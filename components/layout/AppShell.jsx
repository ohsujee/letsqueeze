'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { HowToPlayProvider } from '@/lib/context/HowToPlayContext';

// Référence module-level pour l'AudioContext iOS (persist entre re-renders)
let _iosAudioCtx = null;

function unlockAudioOnFirstTouch() {
  try {
    // 1. Silent HTMLMediaElement — lève la restriction iOS sur new Audio().play()
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silent.play().catch(() => {});

    // 2. AudioContext — réchauffe le process WKWebContent pour tous les sons futurs
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    _iosAudioCtx = ctx;
    ctx.resume().then(() => {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }).catch(() => {});
  } catch (e) {}
}

function resumeAudioContext() {
  try {
    if (_iosAudioCtx && _iosAudioCtx.state === 'suspended') {
      _iosAudioCtx.resume().catch(() => {});
    }
  } catch (e) {}
}

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
    const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

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
    // iOS Capacitor : pas de barre d'adresse → resize ne vient que du clavier.
    // On ignore resize pour éviter que --app-height change à l'ouverture du clavier.
    // Seul orientationchange met à jour (rotation d'écran).
    if (!isIOSNative) {
      window.addEventListener('resize', setAppHeight);
    }
    window.addEventListener('orientationchange', () => {
      // Delay pour laisser le temps au navigateur de recalculer
      setTimeout(setAppHeight, 100);
    });

    // Recalcul quand l'app revient au premier plan (Android)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(setAppHeight, 50);
        // iOS : réactiver le process audio WKWebContent après retour d'arrière-plan.
        // WebKit Bug 237878 : AudioContext se suspend automatiquement après backgrounding.
        // Sans ça, new Audio().play() échoue silencieusement après un switch d'app.
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
          resumeAudioContext();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // iOS : forcer window.scrollTo(0,0) quand le clavier apparaît.
    // Même avec isScrollEnabled=false dans ViewController.swift, iOS peut décaler
    // la WebView via scrollRectToVisible. Ce reset JS est le filet de sécurité.
    //
    // AUSSI : figer --safe-area-bottom à sa valeur physique (avant clavier).
    // Swift anime additionalSafeAreaInsets.bottom → env(safe-area-inset-bottom) gonfle
    // de ~34px à ~334px → .app-shell padding-bottom explose → tout le contenu remonte.
    // On capture la valeur initiale et on la fige en inline sur :root pendant le clavier.
    // Capturer la safe area physique au montage (clavier fermé, valeur fiable).
    // Swift anime additionalSafeAreaInsets.bottom à l'ouverture du clavier ce qui
    // gonfle env(safe-area-inset-bottom) → .app-shell padding-bottom explose → header bouge.
    // On fige cette valeur pendant toute la durée du clavier.
    const physicalSafeBottom = isIOSNative
      ? getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom').trim() || '0px'
      : null;
    const handleNativeKbShow = () => {
      window.scrollTo(0, 0);
      if (physicalSafeBottom) {
        document.documentElement.style.setProperty('--safe-area-bottom', physicalSafeBottom);
      }
    };
    const handleNativeKbHide = () => {
      document.documentElement.style.removeProperty('--safe-area-bottom');
    };
    window.addEventListener('native-keyboard-show', handleNativeKbShow);
    window.addEventListener('native-keyboard-hide', handleNativeKbHide);

    // iOS : empêcher tout scroll résiduel sur le document (overflow:hidden sur app-shell
    // garantit que window.scrollY doit toujours être 0)
    const handleScroll = () => { if (window.scrollY !== 0) window.scrollTo(0, 0); };
    window.addEventListener('scroll', handleScroll, { passive: false });

    // iOS : activer le process audio WKWebContent sur le premier tap utilisateur.
    // mediaTypesRequiringUserActionForPlayback=[] (ViewController.swift) supprime la
    // restriction de geste pour HTMLMediaElement, mais iOS 18 peut ignorer ce flag.
    // Ce "warm-up" garantit que new Audio().play() depuis des callbacks Firebase
    // fonctionne sur tous les téléphones sans action supplémentaire du joueur.
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      document.addEventListener('touchstart', unlockAudioOnFirstTouch, { once: true, passive: true });
    }

    return () => {
      if (!isIOSNative) window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('native-keyboard-show', handleNativeKbShow);
      window.removeEventListener('native-keyboard-hide', handleNativeKbHide);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', unlockAudioOnFirstTouch);
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
