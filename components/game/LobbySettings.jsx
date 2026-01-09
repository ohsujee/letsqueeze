'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, HelpCircle, UserX, WifiOff, Moon, Crown } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * LobbySettings - Bouton settings + Modal avec liste joueurs et accès Comment jouer
 * Remplace PlayerManager + bouton HelpCircle
 *
 * @param {Object} props
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.roomCode - Code de la room
 * @param {string} props.roomPrefix - Préfixe Firebase
 * @param {string} props.hostUid - UID de l'hôte
 * @param {'quiz'|'blindtest'|'deeztest'|'alibi'|'trouveregle'} props.variant - Thème couleur
 * @param {function} props.onShowHowToPlay - Callback pour ouvrir le modal Comment jouer
 */
export default function LobbySettings({
  players = [],
  roomCode,
  roomPrefix = 'rooms',
  hostUid,
  variant = 'quiz',
  onShowHowToPlay
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmKick, setConfirmKick] = useState(null);

  // Couleurs par variante
  const colors = {
    quiz: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
    blindtest: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
    deeztest: { primary: '#A238FF', glow: 'rgba(162, 56, 255, 0.5)' },
    alibi: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
    trouveregle: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)' }
  };
  const color = colors[variant] || colors.quiz;

  // Compter les joueurs actifs vs déconnectés/inactifs
  const activeCount = players.filter(p =>
    (!p.status || p.status === 'active') &&
    (!p.activityStatus || p.activityStatus === 'active')
  ).length;
  const hasIssues = activeCount < players.length;

  const handleKick = async (player) => {
    if (!roomCode || !player.uid) return;
    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${player.uid}`;
    await remove(ref(db, playerPath));
    setConfirmKick(null);
  };

  const handleHowToPlay = () => {
    setIsOpen(false);
    // Petit délai pour laisser la modal se fermer
    setTimeout(() => {
      onShowHowToPlay?.();
    }, 150);
  };

  return (
    <>
      {/* Bouton Settings */}
      <motion.button
        onClick={() => setIsOpen(true)}
        aria-label="Paramètres"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: `2px solid rgba(255, 255, 255, 0.12)`,
          borderRadius: '10px',
          color: 'rgba(255, 255, 255, 0.8)',
          cursor: 'pointer',
        }}
        whileHover={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderColor: color.primary,
          color: '#fff',
        }}
        whileTap={{ scale: 0.95 }}
      >
        <Settings size={20} strokeWidth={2} />
        {hasIssues && (
          <span style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '6px',
            height: '6px',
            background: '#ef4444',
            borderRadius: '50%',
          }} />
        )}
      </motion.button>

      {/* Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="settings-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            >
              <motion.div
                className="settings-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="settings-header">
                  <h3 className="settings-title">Paramètres</h3>
                  <button className="settings-close" onClick={() => setIsOpen(false)}>
                    <X size={20} />
                  </button>
                </div>

                {/* Comment jouer button */}
                <button className="how-to-play-btn" onClick={handleHowToPlay}>
                  <HelpCircle size={20} />
                  <span>Comment jouer</span>
                </button>

                {/* Divider */}
                <div className="settings-divider" />

                {/* Players section */}
                <div className="players-section">
                  <div className="players-header">
                    <span className="players-label">Joueurs</span>
                    <span className="players-count">{activeCount}/{players.length}</span>
                  </div>

                  <div className="players-list">
                    {players.map((player) => {
                      const isHost = player.uid === hostUid;
                      const isDisconnected = player.status === 'disconnected' || player.status === 'left';
                      const isInactive = player.activityStatus === 'inactive';

                      return (
                        <div
                          key={player.uid}
                          className={`player-row ${isDisconnected ? 'disconnected' : isInactive ? 'inactive' : ''}`}
                        >
                          <div className="player-info">
                            <div className="player-avatar">
                              {player.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="player-name">
                              {player.name}
                              {isHost && <Crown size={14} className="host-icon" />}
                            </span>
                            {isDisconnected ? (
                              <span className="player-status disconnected">
                                <WifiOff size={12} />
                              </span>
                            ) : isInactive && (
                              <span className="player-status inactive">
                                <Moon size={12} />
                              </span>
                            )}
                          </div>

                          {!isHost && (
                            <button
                              className="kick-btn"
                              onClick={() => setConfirmKick(player)}
                              title="Exclure"
                            >
                              <UserX size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Kick confirmation */}
                <AnimatePresence>
                  {confirmKick && (
                    <motion.div
                      className="kick-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <p className="kick-text">
                        Exclure <strong>{confirmKick.name}</strong> ?
                      </p>
                      <div className="kick-actions">
                        <button className="btn-cancel" onClick={() => setConfirmKick(null)}>
                          Annuler
                        </button>
                        <button className="btn-kick" onClick={() => handleKick(confirmKick)}>
                          <UserX size={16} />
                          Exclure
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style jsx global>{`
        .settings-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .settings-modal {
          width: 100%;
          max-width: 360px;
          max-height: 70vh;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid ${color.primary}40;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 40px ${color.glow};
        }

        .settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .settings-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: ${color.primary};
          margin: 0;
        }

        .settings-close {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .settings-close:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .how-to-play-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 16px;
          padding: 14px 20px;
          background: ${color.primary}20;
          border: 2px solid ${color.primary}40;
          border-radius: 12px;
          color: ${color.primary};
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .how-to-play-btn:hover {
          background: ${color.primary}30;
          border-color: ${color.primary}60;
          transform: translateY(-1px);
        }

        .settings-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 16px;
        }

        .players-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          padding: 16px;
        }

        .players-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .players-label {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .players-count {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .players-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .player-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .player-row:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .player-row.disconnected {
          opacity: 0.5;
        }

        .player-row.disconnected .player-avatar {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .player-avatar {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${color.primary}20;
          border: 1px solid ${color.primary}40;
          border-radius: 8px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          color: ${color.primary};
          flex-shrink: 0;
        }

        .player-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .host-icon {
          color: #fbbf24;
          flex-shrink: 0;
        }

        .player-status {
          flex-shrink: 0;
        }

        .player-status.disconnected {
          color: #ef4444;
        }

        .player-status.inactive {
          color: #f59e0b;
        }

        .player-row.inactive {
          opacity: 0.7;
        }

        .player-row.inactive .player-avatar {
          background: rgba(245, 158, 11, 0.15);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .kick-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .kick-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          transform: scale(1.05);
        }

        .kick-confirm {
          padding: 16px;
          background: rgba(239, 68, 68, 0.08);
          border-top: 1px solid rgba(239, 68, 68, 0.2);
        }

        .kick-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 12px 0;
          text-align: center;
        }

        .kick-text strong {
          color: #fff;
        }

        .kick-actions {
          display: flex;
          gap: 10px;
        }

        .btn-cancel,
        .btn-kick {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 10px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
        }

        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-kick {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .btn-kick:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.25));
          transform: scale(1.02);
        }

        .players-list::-webkit-scrollbar { width: 4px; }
        .players-list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
        .players-list::-webkit-scrollbar-thumb { background: ${color.primary}60; border-radius: 2px; }
      `}</style>
    </>
  );
}
