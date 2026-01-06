'use client';

import { useEffect } from 'react';

/**
 * AppShell - Wrapper global pour le viewport
 *
 * GÈRE AUTOMATIQUEMENT :
 * - --app-height : vraie hauteur viewport (fix Android/iOS barre d'adresse)
 * - safe-area-inset-top : espace pour notch/caméra (via CSS dans globals.css)
 * - overflow: hidden global
 *
 * RÈGLES POUR LES PAGES (voir globals.css pour détails) :
 * - Pages de jeu : flex: 1; min-height: 0; display: flex; flex-direction: column;
 * - Pages avec scroll : flex: 1; min-height: 0; overflow-y: auto;
 * - NE PAS utiliser height: 100vh/dvh ou padding-top: safe-area dans les pages
 */
export function AppShell({ children }) {
  useEffect(() => {
    const setAppHeight = () => {
      // Calcule la vraie hauteur visible (sans barre d'adresse, etc.)
      const vh = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${vh}px`);
    };

    // Set initial height
    setAppHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', () => {
      // Delay pour laisser le temps au navigateur de recalculer
      setTimeout(setAppHeight, 100);
    });

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  return (
    <div className="app-shell">
      {children}
    </div>
  );
}
