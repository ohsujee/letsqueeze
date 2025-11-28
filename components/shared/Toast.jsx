"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

// Couleurs basées sur les variables CSS du design system
const TOAST_COLORS = {
  success: {
    bg: 'var(--glow-green)',
    border: 'var(--brand-green)',
    text: 'var(--brand-green)'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'var(--brand-red)',
    text: 'var(--brand-red)'
  },
  warning: {
    bg: 'var(--glow-yellow)',
    border: 'var(--brand-yellow)',
    text: 'var(--brand-yellow)'
  },
  info: {
    bg: 'var(--glow-blue)',
    border: 'var(--brand-blue)',
    text: 'var(--brand-blue)'
  }
};

export function Toast({ id, type = 'info', message, duration = 5000, onDismiss }) {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4) var(--space-5)',
        minWidth: '300px',
        maxWidth: '500px',
        backdropFilter: 'blur(var(--glass-blur))',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: 'var(--space-3)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{ fontSize: 'var(--font-size-2xl)' }}>{TOAST_ICONS[type]}</span>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0,
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)'
          }}>
            {message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.text,
            fontSize: 'var(--font-size-xl)',
            cursor: 'pointer',
            padding: '0 var(--space-1)',
            opacity: 0.7,
            transition: 'opacity var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 'var(--space-5)',
        right: 'var(--space-5)',
        zIndex: 'var(--z-tooltip)',
        pointerEvents: 'none'
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onDismiss={onDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
