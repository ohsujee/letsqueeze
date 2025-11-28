'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Composant de transition de page universelle
 * Wrap le contenu de chaque page avec ce composant pour des transitions fluides
 */
export default function PageTransition({ children, className = '' }) {
  const pathname = usePathname();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    enter: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Variante pour les éléments qui doivent s'animer séquentiellement dans la page
 * Utiliser comme enfant de PageTransition
 */
export function FadeInItem({ children, delay = 0, className = '' }) {
  const itemVariants = {
    initial: {
      opacity: 0,
      y: 15
    },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate="enter"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Transition de slide pour les modals ou panels
 */
export function SlideIn({ children, direction = 'bottom', className = '' }) {
  const directions = {
    top: { y: -100 },
    bottom: { y: 100 },
    left: { x: -100 },
    right: { x: 100 }
  };

  const slideVariants = {
    initial: {
      ...directions[direction],
      opacity: 0
    },
    enter: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    },
    exit: {
      ...directions[direction],
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <motion.div
      variants={slideVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Transition de scale pour les éléments qui apparaissent/disparaissent
 */
export function ScaleIn({ children, className = '' }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container pour animer plusieurs enfants séquentiellement
 */
export function StaggerContainer({ children, staggerDelay = 0.1, className = '' }) {
  const containerVariants = {
    initial: {},
    enter: {
      transition: {
        staggerChildren: staggerDelay
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="enter"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Enfant à utiliser avec StaggerContainer
 */
export function StaggerItem({ children, className = '' }) {
  const itemVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
