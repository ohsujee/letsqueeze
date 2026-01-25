'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Clock } from 'lucide-react';
import { HOST_GRACE_PERIOD_MS } from '@/lib/hooks/useHostDisconnect';

/**
 * Banner affiché aux joueurs quand l'hôte est temporairement déconnecté
 * Affiche un compte à rebours avant la fermeture de la room
 *
 * @param {Object} props
 * @param {boolean} props.isHostTemporarilyDisconnected - Si l'hôte est déconnecté
 * @param {number} props.hostDisconnectedAt - Timestamp de la déconnexion
 */
export default function HostDisconnectedBanner({
  isHostTemporarilyDisconnected,
  hostDisconnectedAt
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!isHostTemporarilyDisconnected || !hostDisconnectedAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const elapsed = Date.now() - hostDisconnectedAt;
      const remaining = Math.max(0, Math.ceil((HOST_GRACE_PERIOD_MS - elapsed) / 1000));
      setRemainingSeconds(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [isHostTemporarilyDisconnected, hostDisconnectedAt]);

  if (!isHostTemporarilyDisconnected) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}s`;

  return (
    <div className="host-disconnected-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <WifiOff size={20} />
        </div>
        <div className="banner-text">
          <span className="banner-title">L'hôte semble déconnecté</span>
          <span className="banner-subtitle">Reconnexion en cours...</span>
        </div>
        <div className="banner-timer">
          <Clock size={14} />
          <span>{timeDisplay}</span>
        </div>
      </div>

      <style jsx>{`
        .host-disconnected-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9990;
          padding: 8px 16px;
          padding-top: calc(8px + env(safe-area-inset-top));
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(234, 88, 12, 0.95));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 600px;
          margin: 0 auto;
        }

        .banner-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          color: white;
          flex-shrink: 0;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        .banner-text {
          flex: 1;
          min-width: 0;
        }

        .banner-title {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          color: white;
        }

        .banner-subtitle {
          display: block;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .banner-timer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          color: white;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
