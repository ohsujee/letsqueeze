'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';

/**
 * HostDisconnectAlert - Affiche une alerte quand l'hôte est marqué déconnecté
 *
 * @param {Object} props
 * @param {boolean} props.isDisconnected - Si l'hôte est marqué déconnecté
 * @param {boolean} props.isFirebaseConnected - Si Firebase est connecté
 * @param {Function} props.onReconnect - Fonction pour forcer la reconnexion
 */
export default function HostDisconnectAlert({
  isDisconnected,
  isFirebaseConnected = true,
  onReconnect
}) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async (e) => {
    e.stopPropagation();
    if (isReconnecting || !onReconnect) return;

    setIsReconnecting(true);
    try {
      await onReconnect();
    } finally {
      // Small delay to show feedback
      setTimeout(() => setIsReconnecting(false), 500);
    }
  };

  // Also handle overlay click
  const handleOverlayClick = () => {
    if (!isReconnecting && onReconnect) {
      handleReconnect({ stopPropagation: () => {} });
    }
  };

  return (
    <AnimatePresence>
      {isDisconnected && (
        <motion.div
          className="host-disconnect-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="host-disconnect-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="host-disconnect-icon">
              <WifiOff size={40} />
            </div>
            <h2 className="host-disconnect-title">Connexion interrompue</h2>
            <p className="host-disconnect-text">
              {isFirebaseConnected
                ? "Ta connexion semble avoir été perdue. Les joueurs voient que tu es déconnecté."
                : "Connexion au serveur perdue. Vérifie ta connexion internet."}
            </p>

            <button
              className={`host-disconnect-btn ${isReconnecting ? 'loading' : ''}`}
              onClick={handleReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>Reconnexion...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>Se reconnecter</span>
                </>
              )}
            </button>

            {!isFirebaseConnected && (
              <p className="host-disconnect-status">
                ⚠️ Serveur non joignable
              </p>
            )}
          </motion.div>

          <style jsx global>{`
            .host-disconnect-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              cursor: pointer;
            }

            .host-disconnect-card {
              width: 100%;
              max-width: 340px;
              background: rgba(20, 20, 30, 0.95);
              border: 1px solid rgba(251, 146, 60, 0.4);
              border-radius: 20px;
              padding: 32px 24px;
              text-align: center;
              box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.5),
                0 0 40px rgba(251, 146, 60, 0.2);
            }

            .host-disconnect-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(251, 146, 60, 0.15);
              border: 2px solid rgba(251, 146, 60, 0.3);
              border-radius: 50%;
              color: #fb923c;
            }

            .host-disconnect-title {
              font-family: 'Bungee', cursive;
              font-size: 1.25rem;
              color: #fb923c;
              margin: 0 0 12px 0;
              text-transform: uppercase;
            }

            .host-disconnect-text {
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.5;
              margin: 0 0 24px 0;
            }

            .host-disconnect-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              width: 100%;
              padding: 16px 24px;
              background: linear-gradient(135deg, #fb923c, #f97316);
              border: none;
              border-radius: 12px;
              color: white;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 20px rgba(251, 146, 60, 0.4);
            }

            .host-disconnect-btn:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 6px 25px rgba(251, 146, 60, 0.5);
            }

            .host-disconnect-btn:active:not(:disabled) {
              transform: translateY(0);
            }

            .host-disconnect-btn:disabled {
              opacity: 0.7;
              cursor: not-allowed;
            }

            .host-disconnect-btn .spin {
              animation: spin 1s linear infinite;
            }

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            .host-disconnect-status {
              margin: 16px 0 0 0;
              font-family: 'Inter', sans-serif;
              font-size: 0.8125rem;
              color: rgba(251, 146, 60, 0.8);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
