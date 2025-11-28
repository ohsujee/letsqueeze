"use client";
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

export const AnimatedScore = ({ value, label = "Score", className = "" }) => {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.5
  });

  const display = useTransform(spring, current =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.div
      className={`score-display ${className}`}
      animate={value > 0 ? {
        scale: [1, 1.2, 1],
        rotate: [0, -5, 5, 0]
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {label && <div className="score-label text-sm opacity-70">{label}</div>}
      <motion.div className="score-value font-black text-2xl">
        {display}
      </motion.div>
    </motion.div>
  );
};
