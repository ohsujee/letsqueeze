"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const TOAST_ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

// Couleurs basées sur le guide de style UI
const TOAST_COLORS = {
  success: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'var(--success, #22c55e)',
    text: 'var(--success-glow, #4ade80)',
    glow: 'rgba(34, 197, 94, 0.3)'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'var(--danger, #ef4444)',
    text: 'var(--danger-glow, #f87171)',
    glow: 'rgba(239, 68, 68, 0.3)'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'var(--warning, #f59e0b)',
    text: 'var(--alibi-glow, #fbbf24)',
    glow: 'rgba(245, 158, 11, 0.3)'
  },
  info: {
    bg: 'rgba(139, 92, 246, 0.15)',
    border: 'var(--quiz-primary, #8b5cf6)',
    text: 'var(--quiz-glow, #a78bfa)',
    glow: 'rgba(139, 92, 246, 0.3)'
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
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        minWidth: '300px',
        maxWidth: '500px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.3), 0 0 30px ${colors.glow}`,
        marginBottom: '0.75rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem', filter: `drop-shadow(0 0 8px ${colors.glow})` }}>{TOAST_ICONS[type]}</span>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            fontFamily: "var(--font-body, 'Inter'), sans-serif",
            color: 'var(--text-primary, #ffffff)'
          }}>
            {message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(id)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: colors.text,
            fontSize: '1.25rem',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            e.target.style.transform = 'scale(1)';
          }}
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
        top: '1.25rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
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
