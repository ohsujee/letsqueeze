'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './spotlight-tip.css';

/**
 * SpotlightTip — Tutorial spotlight overlay
 * Highlights a target element with a dark overlay + cutout + tooltip.
 */
export default function SpotlightTip({ targetRef, message, show, onDismiss, onTargetClick, position = 'bottom' }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!show || !targetRef?.current) return;

    const measure = () => {
      const el = targetRef.current;
      if (!el) return;
      const target = el.querySelector('.avatar-placeholder') || el;
      const r = target.getBoundingClientRect();
      setRect({
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        radius: Math.max(r.width, r.height) / 2 + 2,
        bottom: r.bottom,
        top: r.top,
      });
    };

    // Wait for layout animations to settle, then measure multiple times
    const t1 = setTimeout(measure, 100);
    const t2 = setTimeout(measure, 300);
    const t3 = setTimeout(measure, 600);

    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', measure);
    };
  }, [show, targetRef]);

  if (!show || !rect) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="spotlight-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* SVG mask with cutout */}
        <svg className="spotlight-svg" width="100%" height="100%">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <circle cx={rect.x} cy={rect.y} r={rect.radius} fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(8, 8, 15, 0.88)" mask="url(#spotlight-mask)" />
          {/* Border ring around cutout with breathing */}
          <circle
            cx={rect.x}
            cy={rect.y}
            r={rect.radius}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="5"
            className="spotlight-ring"
            style={{ '--ring-r': `${rect.radius}px` }}
          />
        </svg>

        {/* Clickable zone over the cutout — lets user tap the avatar */}
        <div
          className="spotlight-cutout-click"
          style={{
            left: rect.x - rect.radius,
            top: rect.y - rect.radius,
            width: rect.radius * 2,
            height: rect.radius * 2,
          }}
          onClick={() => { onDismiss(); onTargetClick?.(); }}
        />

        {/* Tooltip — centered on screen */}
        <motion.div
          className="spotlight-tooltip"
          style={{
            top: position === 'bottom' ? rect.bottom + 24 : undefined,
            bottom: position === 'top' ? `calc(100% - ${rect.top}px + 24px)` : undefined,
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <p className="spotlight-message">{message}</p>
          <button className="spotlight-dismiss" onClick={onDismiss}>
            Compris !
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
