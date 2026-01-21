'use client';

/**
 * AppleButton - Bouton de connexion Apple
 *
 * Usage:
 *   <AppleButton onClick={handleAppleSignIn} disabled={loading} />
 *   <AppleButton onClick={handleAppleSignIn} variant="outline" />
 */
export default function AppleButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'filled', // 'filled' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = true,
  text = 'Continuer avec Apple',
  className = '',
}) {
  const sizeStyles = {
    sm: { padding: '10px 16px', fontSize: '0.875rem', gap: '8px', iconSize: 18 },
    md: { padding: '14px 20px', fontSize: '1rem', gap: '12px', iconSize: 20 },
    lg: { padding: '16px 24px', fontSize: '1.125rem', gap: '14px', iconSize: 24 },
  };

  const { padding, fontSize, gap, iconSize } = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`apple-button ${variant} ${className}`}
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
        <svg viewBox="0 0 24 24" fill="currentColor" width={iconSize} height={iconSize}>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      )}
      <span>{text}</span>

      <style jsx>{`
        .apple-button {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .apple-button.filled {
          background: #000000;
          color: white;
        }

        .apple-button.filled:hover:not(:disabled) {
          background: #1a1a1a;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .apple-button.outline {
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .apple-button.outline:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.05);
        }

        .apple-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .apple-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .btn-spinner {
          width: 20px;
          height: 20px;
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
