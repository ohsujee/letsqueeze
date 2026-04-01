'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, UserX, WifiOff, Crown } from 'lucide-react';
import { ref, remove, update, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import './PlayerManager.css';

/**
 * PlayerManager - Bouton + Modal pour gérer/kick les joueurs
 * S'intègre dans le header des pages host et lobbys
 *
 * @param {Object} props
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.roomCode - Code de la room
 * @param {string} props.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', 'rooms_alibi')
 * @param {string} props.hostUid - UID de l'hôte (pour ne pas pouvoir se kick soi-même)
 * @param {string} props.variant - 'quiz' | 'deeztest' | 'alibi' (pour les couleurs)
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

  const closeManager = useCallback(() => setIsOpen(false), []);
  useBackHandler(closeManager, isOpen);

  // Couleurs par variante
  const colors = {
    quiz: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
    deeztest: { primary: '#A238FF', glow: 'rgba(162, 56, 255, 0.5)' },
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
    const kickedPath = `${roomPrefix}/${code}/kickedPlayers/${player.uid}`;
    const presencePath = `${roomPrefix}/${code}/presence/${player.uid}`;

    // 1. Marquer comme kicked AVANT de supprimer (permet au client de distinguer kick vs déconnexion)
    await set(ref(db, kickedPath), {
      at: Date.now(),
      by: hostUid
    });

    // 2. Supprimer le joueur
    await remove(ref(db, playerPath));

    // 3. Supprimer la présence
    await remove(ref(db, presencePath)).catch(() => {});

    setConfirmKick(null);
  };

  // Ne pas afficher si pas de joueurs ou si on n'est pas l'hôte
  if (players.length === 0) return null;

  return (
    <>
      {/* Bouton dans le header */}
      <button
        className={`player-manager-btn ${hideCount ? 'icon-only' : ''}`}
        style={{ '--ls-primary': color.primary }}
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
              style={{ '--ls-primary': color.primary, '--ls-glow': color.glow }}
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

    </>
  );
}
