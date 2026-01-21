'use client';

import { UserCircle } from 'lucide-react';

/**
 * GuestButton - Bouton de connexion en mode invité
 *
 * Usage:
 *   <GuestButton onClick={handleGuestSignIn} disabled={loading} />
 *   <GuestButton onClick={handleGuestSignIn} variant="outline" />
 */
export default function GuestButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'outline', // 'filled' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = true,
  text = 'Continuer en mode invité',
  showIcon = true,
  className = '',
}) {
  const sizeStyles = {
    sm: { padding: '10px 16px', fontSize: '0.875rem', gap: '8px', iconSize: 16 },
    md: { padding: '14px 20px', fontSize: '1rem', gap: '10px', iconSize: 18 },
    lg: { padding: '16px 24px', fontSize: '1.125rem', gap: '12px', iconSize: 20 },
  };

  const { padding, fontSize, gap, iconSize } = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`guest-button ${variant} ${className}`}
      style={{
        padding,
        fontSize,
        gap,
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {loading ? (
        <div className="btn-spinner" />
      ) : (
        showIcon && <UserCircle size={iconSize} />
      )}
      <span>{text}</span>

      <style jsx>{`
        .guest-button {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .guest-button.filled {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
        }

        .guest-button.filled:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .guest-button.outline {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .guest-button.outline:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.3);
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .guest-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .guest-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
