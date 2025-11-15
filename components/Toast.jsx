"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const TOAST_COLORS = {
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: '#22c55e',
    text: '#22c55e'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: '#ef4444',
    text: '#ef4444'
  },
  warning: {
    bg: 'rgba(251, 191, 36, 0.15)',
    border: '#fbbf24',
    text: '#fbbf24'
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    border: '#3b82f6',
    text: '#3b82f6'
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
        borderRadius: '12px',
        padding: '16px 20px',
        minWidth: '300px',
        maxWidth: '500px',
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 32px ${colors.border}40`,
        marginBottom: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{TOAST_ICONS[type]}</span>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '600',
            color: '#ffffff'
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
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
            opacity: 0.7,
            transition: 'opacity 0.2s'
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
        top: '20px',
        right: '20px',
        zIndex: 9999,
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
