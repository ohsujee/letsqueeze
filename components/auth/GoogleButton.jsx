'use client';

/**
 * GoogleButton - Bouton de connexion Google
 *
 * Usage:
 *   <GoogleButton onClick={handleGoogleSignIn} disabled={loading} />
 *   <GoogleButton onClick={handleGoogleSignIn} variant="outline" />
 */
export default function GoogleButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'filled', // 'filled' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = true,
  text = 'Continuer avec Google',
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
      className={`google-button ${variant} ${className}`}
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
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span>{text}</span>

      <style jsx>{`
        .google-button {
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

        .google-button.filled {
          background: white;
          color: #1a1a1a;
        }

        .google-button.filled:hover:not(:disabled) {
          background: #f5f5f5;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .google-button.outline {
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .google-button.outline:hover:not(:disabled) {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.05);
        }

        .google-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .google-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .btn-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: #4285F4;
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
