"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X } from '@phosphor-icons/react';

/**
 * AlibiBottomSheet — Shared bottom-sheet wrapper for Alibi modals.
 *
 * Handles:
 *   - Portal into document.body
 *   - Backdrop fade + click-to-close
 *   - Drag-to-dismiss (100px offset or 500 velocity)
 *   - Escape key close
 *   - Body scroll lock while open
 *   - Header with title + close button
 *
 * The modal content (list, buttons, etc.) is rendered via children.
 * Additional content above the list (e.g. description strips) can be
 * placed in `headerExtra`, rendered just below the header.
 *
 * Extra classes can be appended to the inner panel via `sheetClassName`.
 */
export default function AlibiBottomSheet({
  isOpen,
  onClose,
  title,
  sheetClassName = '',
  headerExtra = null,
  children,
}) {
  const [mounted, setMounted] = useState(false);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [1, 0]);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleDragEnd = (_, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    } else {
      dragY.set(0);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="alibi-modal-wrapper open"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="alibi-modal-backdrop"
            onClick={onClose}
            style={{ opacity: backdropOpacity }}
          />

          <motion.div
            className={`alibi-modal ${sheetClassName}`.trim()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y: dragY }}
          >
            <div className="alibi-modal-handle" />

            <div className="alibi-modal-header">
              <h2 className="alibi-modal-title">{title}</h2>
              <button className="alibi-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {headerExtra}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
