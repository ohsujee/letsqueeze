'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, UserX, WifiOff, Crown } from 'lucide-react';
import { ref, remove, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import './PlayerManager.css';

/**
 * PlayerList — Liste de joueurs avec kick (réutilisable)
 * Rendu inline (pas de modal), utilisé par PlayerManager et LobbySettings.
 */
export function PlayerList({ players = [], roomCode, roomPrefix = 'rooms', hostUid, showHeader = true }) {
  const [confirmKick, setConfirmKick] = useState(null);

  const activeCount = players.filter(p => !p.status || p.status === 'active').length;

  const handleKick = async (player) => {
    if (!roomCode || !player.uid) return;
    const code = String(roomCode).toUpperCase();
    await set(ref(db, `${roomPrefix}/${code}/kickedPlayers/${player.uid}`), { at: Date.now(), by: hostUid });
    await remove(ref(db, `${roomPrefix}/${code}/players/${player.uid}`));
    await remove(ref(db, `${roomPrefix}/${code}/presence/${player.uid}`)).catch(() => {});
    setConfirmKick(null);
  };

  return (
    <>
      {showHeader && (
        <div className="pm-header-inline">
          <span className="pm-label">Joueurs</span>
          <span className="pm-count">{activeCount}/{players.length}</span>
        </div>
      )}

      <div className="pm-list">
        {players.map((player) => {
          const isHost = player.uid === hostUid;
          const isDisconnected = player.status === 'disconnected' || player.status === 'left';

          return (
            <div key={player.uid} className={`pm-player ${isDisconnected ? 'disconnected' : ''}`}>
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
                <button className="pm-kick-btn" onClick={() => setConfirmKick(player)} title="Exclure ce joueur">
                  <UserX size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {confirmKick && (
          <motion.div className="pm-confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <p className="pm-confirm-text">
              Exclure <strong>{confirmKick.name}</strong> de la partie ?
            </p>
            <div className="pm-confirm-actions">
              <button className="pm-btn pm-btn-cancel" onClick={() => setConfirmKick(null)}>Annuler</button>
              <button className="pm-btn pm-btn-kick" onClick={() => handleKick(confirmKick)}>
                <UserX size={16} /> Exclure
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * PlayerManager — Bouton + Modal pour gérer les joueurs en jeu
 * Utilise PlayerList en interne.
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

  const closeManager = useCallback(() => setIsOpen(false), []);
  useBackHandler(closeManager, isOpen);

  const colors = {
    quiz: { primary: '#8b5cf6' },
    deeztest: { primary: '#A238FF' },
    alibi: { primary: '#f59e0b' },
  };
  const color = colors[variant] || colors.quiz;

  const activeCount = players.filter(p => !p.status || p.status === 'active').length;
  const hasDisconnected = activeCount < players.length;

  if (players.length === 0) return null;

  return (
    <>
      <button
        className={`player-manager-btn ${hideCount ? 'icon-only' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Gérer les joueurs"
      >
        <Users size={20} strokeWidth={2} />
        {hasDisconnected && <span className="disconnect-badge" />}
        {!hideCount && <span className="player-count">{activeCount}</span>}
      </button>

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

                <PlayerList
                  players={players}
                  roomCode={roomCode}
                  roomPrefix={roomPrefix}
                  hostUid={hostUid}
                  showHeader={false}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
