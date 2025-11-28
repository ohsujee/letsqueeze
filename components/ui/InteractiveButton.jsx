'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Bouton avec effet ripple au clic
 */
export function RippleButton({ children, onClick, className = '', disabled = false, ...props }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    if (disabled) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      x,
      y,
      id: Date.now()
    };

    setRipples(prev => [...prev, newRipple]);

    // Supprimer le ripple après l'animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    if (onClick) onClick(e);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{
            width: 300,
            height: 300,
            opacity: 0
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </motion.button>
  );
}

/**
 * Bouton avec effet de shine au survol
 */
export function ShineButton({ children, onClick, className = '', disabled = false, ...props }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      {...props}
    >
      {children}

      {/* Shine effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}

/**
 * Bouton avec effet de glow pulsant
 */
export function GlowButton({ children, onClick, className = '', disabled = false, glowColor = 'rgba(59, 130, 246, 0.5)', ...props }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${className}`}
      whileHover={!disabled ? {
        scale: 1.02,
        boxShadow: `0 0 20px ${glowColor}`
      } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      animate={!disabled ? {
        boxShadow: [
          `0 0 0px ${glowColor}`,
          `0 0 15px ${glowColor}`,
          `0 0 0px ${glowColor}`
        ]
      } : {}}
      transition={{
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 400, damping: 25 }
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Card interactive avec effet de lift au survol
 */
export function InteractiveCard({ children, onClick, className = '', ...props }) {
  return (
    <motion.div
      onClick={onClick}
      className={`cursor-pointer ${className}`}
      whileHover={{
        y: -4,
        boxShadow: "0 12px 24px rgba(0, 0, 0, 0.15)"
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Bouton avec effet de rotation 3D au survol
 */
export function FlipButton({ children, onClick, className = '', disabled = false, ...props }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileHover={!disabled ? {
        rotateY: 5,
        rotateX: -5,
        scale: 1.05
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      style={{ transformStyle: 'preserve-3d' }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Badge avec animation de bounce
 */
export function BounceBadge({ children, className = '', ...props }) {
  return (
    <motion.span
      className={className}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 15
      }}
      whileHover={{ scale: 1.1 }}
      {...props}
    >
      {children}
    </motion.span>
  );
}

/**
 * Input avec focus animation
 */
export function AnimatedInput({ className = '', ...props }) {
  return (
    <motion.input
      className={className}
      whileFocus={{
        scale: 1.01,
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.2)"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    />
  );
}

/**
 * Checkbox animé
 */
export function AnimatedCheckbox({ checked, onChange, label, className = '' }) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <motion.div
        className="relative w-6 h-6 border-2 border-gray-400 rounded flex items-center justify-center"
        animate={{
          backgroundColor: checked ? '#10B981' : 'transparent',
          borderColor: checked ? '#10B981' : '#94A3B8'
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {checked && (
          <motion.svg
            className="w-4 h-4 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </motion.svg>
        )}
      </motion.div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label && <span>{label}</span>}
    </label>
  );
}
