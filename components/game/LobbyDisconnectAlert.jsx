'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Home, AlertCircle } from 'lucide-react';

/**
 * LobbyDisconnectAlert - Affiche une alerte quand le joueur est supprimé du lobby
 *
 * Différent de DisconnectAlert (pour la phase playing):
 * - En lobby, le joueur est SUPPRIMÉ (pas juste marqué disconnected)
 * - Propose de rejoindre à nouveau ou de retourner à l'accueil
 * - Affiche le statut du rejoin (en cours, succès, échec)
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Afficher l'alerte
 * @param {boolean} props.isRejoining - Rejoin en cours
 * @param {function} props.onRejoin - Callback pour tenter de rejoindre
 * @param {function} props.onGoHome - Callback pour retourner à l'accueil
 * @param {string} props.error - Message d'erreur si rejoin échoué
 * @param {string} props.gameColor - Couleur du jeu (défaut: cyan)
 */
export default function LobbyDisconnectAlert({
  isVisible,
  isRejoining = false,
  onRejoin,
  onGoHome,
  error = null,
  gameColor = '#06b6d4'
}) {
  const router = useRouter();
  const [localError, setLocalError] = useState(null);

  const handleRejoin = async () => {
    setLocalError(null);
    try {
      await onRejoin?.();
    } catch (err) {
      setLocalError(err?.message || 'Impossible de rejoindre');
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.push('/home');
    }
  };

  const displayError = error || localError;
  const showRoomClosed = displayError?.includes('closed') || displayError?.includes('fermée');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="lobby-disconnect-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="lobby-disconnect-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Icon */}
            <motion.div
              className="lobby-disconnect-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 15 }}
            >
              {showRoomClosed ? (
                <AlertCircle size={40} />
              ) : (
                <WifiOff size={40} />
              )}
            </motion.div>

            {/* Title */}
            <h2 className="lobby-disconnect-title">
              {showRoomClosed ? 'Partie terminée' : 'Déconnecté'}
            </h2>

            {/* Description */}
            <p className="lobby-disconnect-text">
              {showRoomClosed
                ? "L'hôte a fermé la partie ou elle n'existe plus."
                : "Tu as été déconnecté du lobby. Tu peux essayer de rejoindre à nouveau."
              }
            </p>

            {/* Error message */}
            {displayError && !showRoomClosed && (
              <motion.div
                className="lobby-disconnect-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </motion.div>
            )}

            {/* Buttons */}
            <div className="lobby-disconnect-buttons">
              {!showRoomClosed && (
                <motion.button
                  className="lobby-disconnect-btn primary"
                  onClick={handleRejoin}
                  disabled={isRejoining}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    '--btn-color': gameColor,
                    '--btn-glow': `${gameColor}66`
                  }}
                >
                  {isRejoining ? (
                    <>
                      <RefreshCw size={20} className="spin" />
                      <span>Reconnexion...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      <span>Rejoindre à nouveau</span>
                    </>
                  )}
                </motion.button>
              )}

              <motion.button
                className="lobby-disconnect-btn secondary"
                onClick={handleGoHome}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Home size={20} />
                <span>Retour à l'accueil</span>
              </motion.button>
            </div>
          </motion.div>

          <style jsx global>{`
            .lobby-disconnect-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;
              background: rgba(0, 0, 0, 0.9);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }

            .lobby-disconnect-card {
              width: 100%;
              max-width: 360px;
              background: rgba(20, 20, 30, 0.98);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 24px;
              padding: 36px 28px;
              text-align: center;
              box-shadow:
                0 25px 80px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            }

            .lobby-disconnect-icon {
              width: 88px;
              height: 88px;
              margin: 0 auto 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05));
              border: 2px solid rgba(251, 191, 36, 0.25);
              border-radius: 50%;
              color: #fbbf24;
            }

            .lobby-disconnect-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 1.35rem;
              color: #fbbf24;
              margin: 0 0 12px 0;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }

            .lobby-disconnect-text {
              font-family: var(--font-body, 'Inter'), sans-serif;
              font-size: 0.95rem;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.6;
              margin: 0 0 24px 0;
            }

            .lobby-disconnect-error {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              padding: 12px 16px;
              margin-bottom: 20px;
              background: rgba(239, 68, 68, 0.1);
              border: 1px solid rgba(239, 68, 68, 0.25);
              border-radius: 10px;
              font-family: var(--font-body, 'Inter'), sans-serif;
              font-size: 0.85rem;
              color: #f87171;
            }

            .lobby-disconnect-buttons {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .lobby-disconnect-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              width: 100%;
              padding: 16px 24px;
              border: none;
              border-radius: 14px;
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .lobby-disconnect-btn.primary {
              background: linear-gradient(135deg, var(--btn-color, #06b6d4), color-mix(in srgb, var(--btn-color, #06b6d4), #000 20%));
              color: #0a0a0f;
              box-shadow:
                0 4px 20px var(--btn-glow, rgba(6, 182, 212, 0.4)),
                inset 0 1px 0 rgba(255, 255, 255, 0.25);
            }

            .lobby-disconnect-btn.primary:hover:not(:disabled) {
              box-shadow:
                0 6px 25px var(--btn-glow, rgba(6, 182, 212, 0.5)),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }

            .lobby-disconnect-btn.primary:disabled {
              opacity: 0.7;
              cursor: wait;
            }

            .lobby-disconnect-btn.secondary {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: rgba(255, 255, 255, 0.8);
            }

            .lobby-disconnect-btn.secondary:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.25);
            }

            .lobby-disconnect-btn .spin {
              animation: lobby-disconnect-spin 1s linear infinite;
            }

            @keyframes lobby-disconnect-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }

            /* Override icon color for room closed state */
            .lobby-disconnect-card:has(.lobby-disconnect-icon [data-lucide="alert-circle"]) .lobby-disconnect-icon {
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
              border-color: rgba(239, 68, 68, 0.25);
              color: #ef4444;
            }

            .lobby-disconnect-card:has(.lobby-disconnect-icon [data-lucide="alert-circle"]) .lobby-disconnect-title {
              color: #f87171;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
