'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { CheckCircle, XCircle, Warning, Info, X } from '@phosphor-icons/react';

/**
 * Dev preview — redesigned toasts (flat + subtle glow, Phosphor icons, progress bar).
 * Once validated, this replaces components/shared/Toast.jsx
 */

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    accent: '#22c55e',
    bg: '#22c55e',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    textColor: '#fff',
    closeColor: 'rgba(255, 255, 255, 0.5)',
    progressColor: 'rgba(255, 255, 255, 0.35)',
  },
  error: {
    icon: XCircle,
    accent: '#ef4444',
    bg: '#ef4444',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    textColor: '#fff',
    closeColor: 'rgba(255, 255, 255, 0.5)',
    progressColor: 'rgba(255, 255, 255, 0.35)',
  },
  warning: {
    icon: Warning,
    accent: '#f59e0b',
    bg: '#f59e0b',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    textColor: '#fff',
    closeColor: 'rgba(255, 255, 255, 0.5)',
    progressColor: 'rgba(255, 255, 255, 0.35)',
  },
  info: {
    icon: Info,
    accent: '#8b5cf6',
    bg: '#8b5cf6',
    iconBg: 'rgba(255, 255, 255, 0.2)',
    textColor: '#fff',
    closeColor: 'rgba(255, 255, 255, 0.5)',
    progressColor: 'rgba(255, 255, 255, 0.35)',
  },
};

function DevToast({ id, type = 'info', message, duration = 5000, onDismiss }) {
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'relative',
        background: config.bg,
        borderRadius: '12px',
        border: 'none',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        marginBottom: '8px',
        overflow: 'hidden',
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 14px',
      }}>
        {/* Icon */}
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '8px',
          background: config.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={17} weight="fill" color="#fff" />
        </div>

        {/* Message */}
        <p style={{
          margin: 0,
          flex: 1,
          fontSize: '0.82rem',
          fontWeight: 600,
          fontFamily: "'Space Grotesk', sans-serif",
          color: config.textColor,
          lineHeight: 1.4,
          letterSpacing: '0.01em',
        }}>
          {message}
        </p>

        {/* Close */}
        <button
          onClick={() => onDismiss(id)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: config.closeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            borderRadius: '6px',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = config.closeColor; }}
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: config.progressColor,
            transformOrigin: 'left',
          }}
        />
      )}
    </motion.div>
  );
}

function DevToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 'calc(16px + env(safe-area-inset-top, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <DevToast
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

// ─── Standalone context for dev preview ─────────────────────────────────────

const DevToastContext = createContext(null);

export function DevToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const value = useMemo(() => ({
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
  }), [showToast]);

  return (
    <DevToastContext.Provider value={value}>
      {children}
      <DevToastContainer toasts={toasts} onDismiss={dismissToast} />
    </DevToastContext.Provider>
  );
}

export function useDevToast() {
  return useContext(DevToastContext);
}
