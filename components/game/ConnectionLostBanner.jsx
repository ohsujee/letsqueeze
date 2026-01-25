'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Banner affiché quand la connexion Firebase est perdue
 * Principalement pour l'hôte qui attend que les joueurs répondent
 *
 * Affiche un message invitant à interagir pour reconnecter
 */
export default function ConnectionLostBanner() {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const connectedRef = ref(db, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      setIsConnected(connected);

      if (!connected) {
        // Petit délai avant d'afficher le banner pour éviter les micro-coupures
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 2000); // 2 secondes de délai

        return () => clearTimeout(timer);
      } else {
        setShowBanner(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Quand l'utilisateur interagit, le navigateur se réveille et reconnecte
  const handleInteraction = () => {
    // Forcer un petit état pour montrer qu'on essaie de reconnecter
    setShowBanner(false);
  };

  if (!showBanner || isConnected) {
    return null;
  }

  return (
    <div className="connection-lost-banner" onClick={handleInteraction} onTouchStart={handleInteraction}>
      <div className="banner-content">
        <div className="banner-icon">
          <WifiOff size={22} />
        </div>
        <div className="banner-text">
          <span className="banner-title">Connexion perdue</span>
          <span className="banner-subtitle">Touchez l'écran pour reconnecter</span>
        </div>
        <div className="banner-action">
          <RefreshCw size={18} className="spin" />
        </div>
      </div>

      <style jsx>{`
        .connection-lost-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9995;
          padding: 12px 16px;
          padding-top: calc(12px + env(safe-area-inset-top));
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.98), rgba(185, 28, 28, 0.98));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          cursor: pointer;
          animation: slideDown 0.3s ease-out;
          -webkit-tap-highlight-color: transparent;
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
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          flex-shrink: 0;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.95);
            opacity: 0.8;
          }
        }

        .banner-text {
          flex: 1;
          min-width: 0;
        }

        .banner-title {
          display: block;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: white;
        }

        .banner-subtitle {
          display: block;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 2px;
        }

        .banner-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: white;
          flex-shrink: 0;
        }

        .banner-action :global(.spin) {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Effet de pulsation sur tout le banner pour attirer l'attention */
        .connection-lost-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.1);
          opacity: 0;
          animation: attention 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes attention {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
