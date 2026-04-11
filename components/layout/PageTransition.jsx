'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * PageTransition - Smooth page transitions for (main) layout
 *
 * mode="wait" — séquentiel : l'ancienne page sort AVANT que la nouvelle entre.
 * Évite le double-rendu simultané qui causait des saccades.
 * Le fond #0e0e1a du layout reste visible entre les deux → pas de flash.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          type: 'tween',
          ease: 'easeOut',
          duration: 0.12,
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
