'use client';

/**
 * useSemanticKeyboard — gestion du clavier iOS/Android pour Sémantique.
 *
 * Logique :
 *  - iOS natif (Capacitor) : `native-keyboard-show/hide` envoyés par ViewController.swift.
 *    Hauteur finale exacte, avant animation. Sur iPad, on ignore height=0 (quirk double notif).
 *  - Android / web : fallback visualViewport resize.
 *
 * Expose des refs à attacher sur `<main>`, la scroll area et l'input zone,
 * ainsi que les handlers à poser sur l'input.
 */

import { useEffect, useRef } from 'react';

export function useSemanticKeyboard() {
  const scrollAreaRef = useRef(null);
  const mainRef = useRef(null);
  const inputZoneRef = useRef(null);
  const nativeKbActiveRef = useRef(false);

  useEffect(() => {
    const baseHeightRef = { current: window.innerHeight };

    const applyKb = (kb) => {
      const mainEl = mainRef.current;
      if (!mainEl) return;
      if (kb > 0) {
        const topOffset = mainEl.getBoundingClientRect().top;
        mainEl.style.height = `${baseHeightRef.current - kb - topOffset}px`;
        mainEl.style.flex = 'none';
        const inputEl = inputZoneRef.current;
        if (inputEl) inputEl.style.paddingBottom = '12px';
      } else {
        mainEl.style.height = '';
        mainEl.style.flex = '';
        const inputEl = inputZoneRef.current;
        if (inputEl) inputEl.style.paddingBottom = '';
        baseHeightRef.current = window.innerHeight;
      }
    };

    // iOS natif — ignore les events avec height=0 (quirk iPad : double notification)
    const onNativeShow = (e) => {
      nativeKbActiveRef.current = true;
      window.scrollTo(0, 0);
      if (e.detail.height > 0) {
        applyKb(e.detail.height);
        setTimeout(() => {
          const scrollEl = scrollAreaRef.current;
          if (scrollEl) scrollEl.style.overflowY = '';
        }, 350);
      }
    };
    const onNativeHide = () => { nativeKbActiveRef.current = false; applyKb(0); };
    window.addEventListener('native-keyboard-show', onNativeShow);
    window.addEventListener('native-keyboard-hide', onNativeHide);

    // visualViewport fallback (Android/web uniquement)
    const vv = window.visualViewport;
    const onVvResize = vv ? () => {
      if (nativeKbActiveRef.current) return;
      const kbHeight = window.innerHeight - vv.height;
      if (kbHeight > 0) applyKb(kbHeight);
      else applyKb(0);
    } : null;
    if (vv && onVvResize) vv.addEventListener('resize', onVvResize);

    return () => {
      window.removeEventListener('native-keyboard-show', onNativeShow);
      window.removeEventListener('native-keyboard-hide', onNativeHide);
      if (vv && onVvResize) vv.removeEventListener('resize', onVvResize);
    };
  }, []);

  const onInputFocus = () => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl) return;
    scrollEl.style.overflowY = 'hidden';
    scrollEl.scrollTop = 0;

    // Filet de sécurité : poll visualViewport au cas où native-keyboard-show
    // a renvoyé height=0 (bug iPad double-notification keyboardWillShow)
    const vv = window.visualViewport;
    if (vv) {
      [150, 300, 500].forEach((delay) => {
        setTimeout(() => {
          const kbHeight = window.innerHeight - vv.height;
          const mainEl = mainRef.current;
          if (!mainEl || kbHeight <= 50) return;
          const topOffset = mainEl.getBoundingClientRect().top;
          const expectedH = window.innerHeight - kbHeight - topOffset;
          const currentH = mainEl.style.height ? parseFloat(mainEl.style.height) : 0;
          if (!currentH || currentH > expectedH + 10) {
            mainEl.style.height = `${expectedH}px`;
            mainEl.style.flex = 'none';
          }
        }, delay);
      });
    }
  };

  const onInputBlur = () => {
    const scrollEl = scrollAreaRef.current;
    if (scrollEl) scrollEl.style.overflowY = '';
  };

  return { scrollAreaRef, mainRef, inputZoneRef, onInputFocus, onInputBlur };
}
