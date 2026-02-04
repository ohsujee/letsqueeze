'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

/**
 * PageTransition - Smooth page transitions for (main) layout
 * Uses pathname as key to trigger animations on route change
 *
 * Mode "popLayout" permet un crossfade où les deux pages sont visibles
 * brièvement, évitant le flash noir entre les pages.
 */
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{
          type: 'tween',
          ease: 'easeInOut',
          duration: 0.2,
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
