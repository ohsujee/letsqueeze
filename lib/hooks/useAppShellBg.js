'use client';

import { useEffect } from 'react';

/**
 * useAppShellBg — Override the AppShell's background color for a specific page.
 *
 * The AppShell applies `background: var(--bg-primary, #0a0a0f)` which shows
 * in the safe-area-top (notch / Dynamic Island) and safe-area-bottom zones.
 * By default that color is a generic dark, which creates a visible seam
 * between the safe-area and pages that have a different background.
 *
 * This hook sets `--bg-primary` to a page-specific color on mount, so the
 * safe-area zones visually blend with the page content. On unmount, the
 * previous value is restored.
 *
 * RULE: Every page that renders edge-to-edge content or has a distinctive
 * background color MUST call this hook with the color of its TOPMOST visible
 * element. This ensures the notch area and the bottom home-indicator area
 * extend the page's visual universe instead of showing a neutral dark bar.
 *
 * @param {string|null|undefined} color - CSS color for the safe areas.
 *        Pass null/undefined to skip (useful for conditional overrides).
 *
 * @example
 * // Alibi play page (dark brown interrogation room)
 * useAppShellBg('#0a0605');
 *
 * @example
 * // Alibi prep page (aged paper / beige document)
 * useAppShellBg('#e8dcc0');
 *
 * @example
 * // Quiz lobby (dark violet)
 * useAppShellBg('#0e0e1a');
 */
export function useAppShellBg(color) {
  useEffect(() => {
    if (!color) return;
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--bg-primary');
    root.style.setProperty('--bg-primary', color);

    return () => {
      if (previous) root.style.setProperty('--bg-primary', previous);
      else root.style.removeProperty('--bg-primary');
    };
  }, [color]);
}

export default useAppShellBg;
