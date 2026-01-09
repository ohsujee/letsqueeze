'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

// useLayoutEffect côté client, useEffect côté serveur
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook pour ajuster automatiquement la taille du texte pour qu'il rentre dans son conteneur
 *
 * @param {Object} options
 * @param {number} options.minFontSize - Taille minimale en pixels (default: 12)
 * @param {number} options.maxFontSize - Taille maximale en pixels (default: 32)
 * @param {number} options.step - Pas de réduction en pixels (default: 1)
 * @param {string} options.text - Le texte à afficher (pour déclencher le recalcul)
 *
 * @returns {Object} { containerRef, textRef, fontSize }
 */
export function useFitText({
  minFontSize = 12,
  maxFontSize = 32,
  step = 1,
  text = ''
} = {}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(minFontSize); // Commencer petit pour éviter le flash

  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    const textEl = textRef.current;

    if (!container || !textEl) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Attendre que le conteneur ait des dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      // Réessayer après un court délai
      requestAnimationFrame(() => calculateFontSize());
      return;
    }

    // Recherche binaire pour trouver la taille optimale (plus rapide)
    let low = minFontSize;
    let high = maxFontSize;
    let bestSize = minFontSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      textEl.style.fontSize = `${mid}px`;

      // Forcer un reflow pour obtenir les bonnes dimensions
      const textWidth = textEl.scrollWidth;
      const textHeight = textEl.scrollHeight;

      if (textWidth <= containerWidth && textHeight <= containerHeight) {
        bestSize = mid;
        low = mid + 1; // Essayer plus grand
      } else {
        high = mid - 1; // Trop grand, essayer plus petit
      }
    }

    setFontSize(bestSize);
  }, [minFontSize, maxFontSize]);

  // Recalculer quand le texte change
  useIsomorphicLayoutEffect(() => {
    calculateFontSize();
  }, [text, calculateFontSize]);

  // Observer les changements de taille du conteneur
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateFontSize();
    });

    resizeObserver.observe(container);

    // Calcul initial après un petit délai pour laisser le DOM se stabiliser
    const timer = setTimeout(calculateFontSize, 50);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [calculateFontSize]);

  return { containerRef, textRef, fontSize };
}

/**
 * Composant wrapper pour le texte auto-fit
 * Plus simple à utiliser que le hook directement
 */
export function FitText({
  children,
  minFontSize = 12,
  maxFontSize = 32,
  className = '',
  style = {}
}) {
  const text = typeof children === 'string' ? children : '';
  const { containerRef, textRef, fontSize } = useFitText({
    minFontSize,
    maxFontSize,
    text
  });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.35,
          textAlign: 'center',
          wordBreak: 'break-word',
          maxWidth: '100%',
          padding: '0 4px',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default useFitText;
