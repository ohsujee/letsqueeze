'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, UserX, WifiOff, Crown } from 'lucide-react';
import { ref, remove, update } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * PlayerManager - Bouton + Modal pour gérer/kick les joueurs
 * S'intègre dans le header des pages host et lobbys
 *
 * @param {Object} props
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.roomCode - Code de la room
 * @param {string} props.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', 'rooms_alibi')
 * @param {string} props.hostUid - UID de l'hôte (pour ne pas pouvoir se kick soi-même)
 * @param {string} props.variant - 'quiz' | 'blindtest' | 'alibi' (pour les couleurs)
 * @param {string} props.phase - 'lobby' | 'playing' (pour le comportement du kick)
 */
export default function PlayerManager({
  players = [],
  roomCode,
  roomPrefix = 'rooms',
  hostUid,
  variant = 'quiz',
  phase = 'lobby',
  hideCount = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmKick, setConfirmKick] = useState(null);

  // Couleurs par variante
  const colors = {
    quiz: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
    blindtest: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
    alibi: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' }
  };
  const color = colors[variant] || colors.quiz;

  // Compter les joueurs actifs vs déconnectés
  const activeCount = players.filter(p => !p.status || p.status === 'active').length;
  const hasDisconnected = activeCount < players.length;

  const handleKick = async (player) => {
    if (!roomCode || !player.uid) return;

    const code = String(roomCode).toUpperCase();
    const playerPath = `${roomPrefix}/${code}/players/${player.uid}`;

    if (phase === 'lobby') {
      // En lobby : supprimer complètement le joueur
      await remove(ref(db, playerPath));
    } else {
      // En jeu : marquer comme kicked (supprimé définitivement)
      await remove(ref(db, playerPath));
    }

    setConfirmKick(null);
  };

  // Ne pas afficher si pas de joueurs ou si on n'est pas l'hôte
  if (players.length === 0) return null;

  return (
    <>
      {/* Bouton dans le header */}
      <button
        className={`player-manager-btn ${hideCount ? 'icon-only' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Gérer les joueurs"
      >
        <Users size={20} strokeWidth={2} />
        {hasDisconnected && <span className="disconnect-badge" />}
        {!hideCount && <span className="player-count">{activeCount}</span>}
      </button>

      {/* Modal - Portal wraps AnimatePresence for correct behavior */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="pm-wrapper"
              className="pm-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            >
              <motion.div
                key="pm-modal"
                className="pm-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pm-header">
                  <h3 className="pm-title">Joueurs</h3>
                  <span className="pm-count">{activeCount}/{players.length}</span>
                  <button className="pm-close" onClick={() => setIsOpen(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="pm-list">
                  {players.map((player) => {
                    const isHost = player.uid === hostUid;
                    const isDisconnected = player.status === 'disconnected' || player.status === 'left';

                    return (
                      <div
                        key={player.uid}
                        className={`pm-player ${isDisconnected ? 'disconnected' : ''}`}
                      >
                        <div className="pm-player-info">
                          <div className="pm-player-avatar">
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="pm-player-name">
                            {player.name}
                            {isHost && <Crown size={14} className="host-icon" />}
                          </span>
                          {isDisconnected && (
                            <span className="pm-status">
                              <WifiOff size={12} />
                              Déconnecté
                            </span>
                          )}
                        </div>

                        {!isHost && (
                          <button
                            className="pm-kick-btn"
                            onClick={() => setConfirmKick(player)}
                            title="Exclure ce joueur"
                          >
                            <UserX size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confirmation de kick */}
                <AnimatePresence>
                  {confirmKick && (
                    <motion.div
                      className="pm-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <p className="pm-confirm-text">
                        Exclure <strong>{confirmKick.name}</strong> de la partie ?
                      </p>
                      <div className="pm-confirm-actions">
                        <button
                          className="pm-btn pm-btn-cancel"
                          onClick={() => setConfirmKick(null)}
                        >
                          Annuler
                        </button>
                        <button
                          className="pm-btn pm-btn-kick"
                          onClick={() => handleKick(confirmKick)}
                        >
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

      <style jsx>{`
        .player-manager-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .player-manager-btn.icon-only {
          width: 40px;
          height: 40px;
          padding: 0;
        }

        .player-manager-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: ${color.primary};
          color: #fff;
        }

        .player-count {
          min-width: 18px;
          text-align: center;
        }

        .disconnect-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid rgba(10, 10, 15, 0.95);
        }
      `}</style>

      <style jsx global>{`
        .pm-wrapper {
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

        .pm-modal {
          width: 100%;
          max-width: 400px;
          max-height: 80vh;
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

        .pm-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .pm-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1rem;
          color: ${color.primary};
          margin: 0;
          flex: 1;
        }

        .pm-count {
          font-family: var(--font-mono, 'Roboto Mono'), monospace;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .pm-close {
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

        .pm-close:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .pm-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pm-player {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .pm-player:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .pm-player.disconnected {
          opacity: 0.5;
        }

        .pm-player.disconnected .pm-player-avatar {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
        }

        .pm-player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .pm-player-avatar {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${color.primary}20;
          border: 1px solid ${color.primary}40;
          border-radius: 10px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          color: ${color.primary};
          flex-shrink: 0;
        }

        .pm-player-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9rem;
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

        .pm-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          padding: 3px 8px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .pm-kick-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          color: #f87171;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .pm-kick-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          transform: scale(1.05);
        }

        .pm-confirm {
          padding: 16px 20px;
          background: rgba(239, 68, 68, 0.08);
          border-top: 1px solid rgba(239, 68, 68, 0.2);
        }

        .pm-confirm-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 12px 0;
          text-align: center;
        }

        .pm-confirm-text strong {
          color: #fff;
        }

        .pm-confirm-actions {
          display: flex;
          gap: 10px;
        }

        .pm-btn {
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

        .pm-btn-cancel {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.8);
        }

        .pm-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .pm-btn-kick {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .pm-btn-kick:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.25));
          transform: scale(1.02);
        }

        .pm-list::-webkit-scrollbar { width: 4px; }
        .pm-list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
        .pm-list::-webkit-scrollbar-thumb { background: ${color.primary}60; border-radius: 2px; }
      `}</style>
    </>
  );
}
