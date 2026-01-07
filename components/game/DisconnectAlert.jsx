'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * DisconnectAlert - Affiche une alerte quand le joueur est marqué déconnecté
 *
 * @param {Object} props
 * @param {string} props.roomCode - Code de la room
 * @param {string} props.roomPrefix - Préfixe Firebase
 * @param {string} props.playerUid - UID du joueur
 * @param {function} props.onReconnect - Callback pour se reconnecter (markActive)
 */
export default function DisconnectAlert({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  onReconnect
}) {
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Écouter le status du joueur
  useEffect(() => {
    if (!roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerRef = ref(db, `${roomPrefix}/${code}/players/${playerUid}/status`);

    const unsub = onValue(playerRef, (snap) => {
      const status = snap.val();
      setIsDisconnected(status === 'disconnected' || status === 'left');
    });

    return () => unsub();
  }, [roomCode, roomPrefix, playerUid]);

  const handleReconnect = async () => {
    if (isReconnecting) return;

    setIsReconnecting(true);
    try {
      await onReconnect?.();
      // Le status sera mis à jour via le listener
    } catch (error) {
      console.error('[DisconnectAlert] Reconnect failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isDisconnected && (
        <motion.div
          className="disconnect-alert-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="disconnect-alert-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="disconnect-alert-icon">
              <WifiOff size={40} />
            </div>
            <h2 className="disconnect-alert-title">Connexion perdue</h2>
            <p className="disconnect-alert-text">
              Tu as été déconnecté de la partie. Appuie sur le bouton pour revenir.
            </p>
            <motion.button
              className="disconnect-alert-btn"
              onClick={handleReconnect}
              disabled={isReconnecting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isReconnecting ? (
                <>
                  <RefreshCw size={20} className="spin" />
                  <span>Reconnexion...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>Revenir dans la partie</span>
                </>
              )}
            </motion.button>
          </motion.div>

          <style jsx global>{`
            .disconnect-alert-overlay {
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
            }

            .disconnect-alert-card {
              width: 100%;
              max-width: 340px;
              background: rgba(20, 20, 30, 0.95);
              border: 1px solid rgba(239, 68, 68, 0.4);
              border-radius: 20px;
              padding: 32px 24px;
              text-align: center;
              box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.5),
                0 0 40px rgba(239, 68, 68, 0.2);
            }

            .disconnect-alert-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(239, 68, 68, 0.15);
              border: 2px solid rgba(239, 68, 68, 0.3);
              border-radius: 50%;
              color: #ef4444;
            }

            .disconnect-alert-title {
              font-family: 'Bungee', cursive;
              font-size: 1.25rem;
              color: #ef4444;
              margin: 0 0 12px 0;
              text-transform: uppercase;
            }

            .disconnect-alert-text {
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.5;
              margin: 0 0 24px 0;
            }

            .disconnect-alert-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              width: 100%;
              padding: 16px 24px;
              background: linear-gradient(135deg, #22c55e, #16a34a);
              border: none;
              border-radius: 12px;
              color: white;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              box-shadow:
                0 4px 15px rgba(34, 197, 94, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
              transition: all 0.2s ease;
            }

            .disconnect-alert-btn:disabled {
              opacity: 0.7;
              cursor: wait;
            }

            .disconnect-alert-btn .spin {
              animation: disconnect-spin 1s linear infinite;
            }

            @keyframes disconnect-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
