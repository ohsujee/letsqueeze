'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';

// useLayoutEffect côté client, useEffect côté serveur
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook pour ajuster automatiquement la taille du texte pour qu'il rentre dans son conteneur
 *
 * @param {Object} options
 * @param {number} options.minFontSize - Taille minimale en pixels (default: 10)
 * @param {number} options.maxFontSize - Taille maximale en pixels (default: 32)
 * @param {number} options.step - Pas de réduction en pixels (default: 1)
 * @param {string} options.text - Le texte à afficher (pour déclencher le recalcul)
 *
 * @returns {Object} { containerRef, textRef, fontSize, needsScroll }
 */
export function useFitText({
  minFontSize = 10,
  maxFontSize = 32,
  step = 1,
  text = ''
} = {}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(minFontSize);
  const [needsScroll, setNeedsScroll] = useState(false);

  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    const textEl = textRef.current;

    if (!container || !textEl) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Attendre que le conteneur ait des dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      requestAnimationFrame(() => calculateFontSize());
      return;
    }

    // Recherche binaire pour trouver la taille optimale
    let low = minFontSize;
    let high = maxFontSize;
    let bestSize = minFontSize;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      textEl.style.fontSize = `${mid}px`;
      // Line-height adaptatif: plus serré pour petites tailles
      textEl.style.lineHeight = mid <= 14 ? '1.25' : mid <= 18 ? '1.3' : '1.35';

      const textWidth = textEl.scrollWidth;
      const textHeight = textEl.scrollHeight;

      if (textWidth <= containerWidth && textHeight <= containerHeight) {
        bestSize = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Vérifier si même à la taille minimum ça ne rentre pas
    textEl.style.fontSize = `${bestSize}px`;
    textEl.style.lineHeight = bestSize <= 14 ? '1.25' : bestSize <= 18 ? '1.3' : '1.35';

    const finalOverflow = textEl.scrollHeight > containerHeight || textEl.scrollWidth > containerWidth;
    setNeedsScroll(finalOverflow && bestSize === minFontSize);
    setFontSize(bestSize);
  }, [minFontSize, maxFontSize]);

  useIsomorphicLayoutEffect(() => {
    calculateFontSize();
  }, [text, calculateFontSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateFontSize();
    });

    resizeObserver.observe(container);
    const timer = setTimeout(calculateFontSize, 50);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [calculateFontSize]);

  return { containerRef, textRef, fontSize, needsScroll };
}

/**
 * Composant wrapper pour le texte auto-fit
 * Gère automatiquement le scroll si le texte est trop long même à la taille minimum
 */
export function FitText({
  children,
  minFontSize = 10,
  maxFontSize = 32,
  className = '',
  textAlign = 'left',
  style = {}
}) {
  const text = typeof children === 'string' ? children : '';
  const { containerRef, textRef, fontSize, needsScroll } = useFitText({
    minFontSize,
    maxFontSize,
    text
  });

  // Line-height adaptatif selon la taille
  const lineHeight = fontSize <= 14 ? 1.25 : fontSize <= 18 ? 1.3 : 1.35;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: needsScroll ? 'auto' : 'hidden',
        display: 'flex',
        alignItems: needsScroll ? 'flex-start' : 'center',
        justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
        boxSizing: 'border-box',
        // Masquer la scrollbar mais permettre le scroll
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        ...style
      }}
    >
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight,
          textAlign,
          wordBreak: 'break-word',
          maxWidth: '100%',
          padding: needsScroll ? '8px 4px' : '0 4px',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default useFitText;
