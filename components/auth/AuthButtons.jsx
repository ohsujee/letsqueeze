'use client';

import GoogleButton from './GoogleButton';
import AppleButton from './AppleButton';
import GuestButton from './GuestButton';

/**
 * AuthButtons - Groupe de boutons d'authentification
 *
 * Affiche les boutons Google, Apple et Guest avec un divider.
 * Gère les états de chargement individuels.
 *
 * Usage:
 *   <AuthButtons
 *     onGoogle={handleGoogle}
 *     onApple={handleApple}
 *     onGuest={handleGuest}
 *     loadingGoogle={isGoogleLoading}
 *   />
 *
 *   // Sans guest button
 *   <AuthButtons
 *     onGoogle={handleGoogle}
 *     onApple={handleApple}
 *     showGuest={false}
 *   />
 */
export default function AuthButtons({
  onGoogle,
  onApple,
  onGuest,
  disabled = false,
  loadingGoogle = false,
  loadingApple = false,
  loadingGuest = false,
  showGoogle = true,
  showApple = true,
  showGuest = true,
  showDivider = true,
  size = 'md',
  className = '',
}) {
  const isAnyLoading = loadingGoogle || loadingApple || loadingGuest;

  return (
    <div className={`auth-buttons ${className}`}>
      {/* OAuth Buttons */}
      <div className="auth-buttons-oauth">
        {showGoogle && (
          <GoogleButton
            onClick={onGoogle}
            disabled={disabled || isAnyLoading}
            loading={loadingGoogle}
            size={size}
          />
        )}

        {showApple && (
          <AppleButton
            onClick={onApple}
            disabled={disabled || isAnyLoading}
            loading={loadingApple}
            size={size}
          />
        )}
      </div>

      {/* Divider */}
      {showGuest && showDivider && (
        <div className="auth-divider">
          <div className="divider-line" />
          <span className="divider-text">ou</span>
          <div className="divider-line" />
        </div>
      )}

      {/* Guest Button */}
      {showGuest && (
        <GuestButton
          onClick={onGuest}
          disabled={disabled || isAnyLoading}
          loading={loadingGuest}
          size={size}
        />
      )}

      <style jsx>{`
        .auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .auth-buttons-oauth {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 8px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .divider-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}
