'use client';

import { motion } from 'framer-motion';

/**
 * TrophyIcon — Animated trophy SVG for victory
 */
export function TrophyIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute', inset: -15, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.6) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M6 4H18V9C18 12.5 15.5 14 12 14C8.5 14 6 12.5 6 9V4Z"
          fill="url(#trophyGold)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
        />
        <motion.path
          d="M6 5H4.5C4 5 3.5 5.5 3.5 6V7.5C3.5 8.5 4.5 9.5 5.5 9.5H6"
          stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        <motion.path
          d="M18 5H19.5C20 5 20.5 5.5 20.5 6V7.5C20.5 8.5 19.5 9.5 18.5 9.5H18"
          stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        />
        <motion.rect
          x="10" y="14" width="4" height="4" fill="#f59e0b"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
          style={{ transformOrigin: '12px 14px' }}
        />
        <motion.path
          d="M8 18H16V20C16 20.5 15.5 21 15 21H9C8.5 21 8 20.5 8 20V18Z"
          fill="#d97706"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 1.1, type: "spring" }}
        />
        <defs>
          <linearGradient id="trophyGold" x1="6" y1="4" x2="18" y2="14">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

/**
 * DefeatIcon — Animated skull SVG for defeat
 */
export function DefeatIcon({ size = 80 }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: 10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
      style={{ position: 'relative', width: size, height: size }}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          position: 'absolute', inset: -15, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }}
      />
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <motion.path
          d="M12 2C7 2 4 6 4 10C4 13 5 15 7 16V19C7 20 8 21 9 21H15C16 21 17 20 17 19V16C19 15 20 13 20 10C20 6 17 2 12 2Z"
          fill="url(#skullGrad)"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        />
        <motion.path
          d="M8 9L10 11M10 9L8 11" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
        <motion.path
          d="M14 9L16 11M16 9L14 11" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />
        <motion.path
          d="M12 12V14" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, delay: 1 }}
        />
        <motion.path
          d="M9 17V19M12 17V19M15 17V19" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 1.1 }}
        />
        <defs>
          <linearGradient id="skullGrad" x1="4" y1="2" x2="20" y2="21">
            <stop stopColor="#f87171" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}
