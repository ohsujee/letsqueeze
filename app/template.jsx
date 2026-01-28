'use client';

import { motion } from 'framer-motion';

/**
 * Template de transition de page globale
 * Contrairement au layout, le template est recréé à chaque navigation
 * → Permet d'animer l'entrée de chaque page sans casser les transitions in-game
 */
export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ display: 'contents' }}
    >
      {children}
    </motion.div>
  );
}
