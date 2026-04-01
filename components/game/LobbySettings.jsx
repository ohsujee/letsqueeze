'use client';

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, HelpCircle, UserX, WifiOff, Moon, Crown, Users, Sparkles } from 'lucide-react';
import { ref, remove } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import './LobbySettings.css';

// Couleurs par variante (statique - hors composant)
const VARIANT_COLORS = {
  quiz: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
  deeztest: { primary: '#A238FF', glow: 'rgba(162, 56, 255, 0.5)' },
  alibi: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
  laregle: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)' }
};

/**
 * LobbySettings - Bouton settings + Modal avec liste joueurs et accès Comment jouer
 * Remplace PlayerManager + bouton HelpCircle
 *
 * @param {Object} props
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.roomCode - Code de la room
 * @param {string} props.roomPrefix - Préfixe Firebase
 * @param {string} props.hostUid - UID de l'hôte
 * @param {'quiz'|'deeztest'|'alibi'|'laregle'} props.variant - Thème couleur
 * @param {'gamemaster'|'party'} props.gameMode - Mode de jeu (optionnel)
 */
export default function LobbySettings({
  players = [],
  roomCode,
  roomPrefix = 'rooms',
  hostUid,
  variant = 'quiz',
  gameMode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { openManually } = useHowToPlay();
  const [confirmKick, setConfirmKick] = useState(null);

  const closeSettings = useCallback(() => setIsOpen(false), []);
  useBackHandler(closeSettings, isOpen);

  const color = useMemo(() => VARIANT_COLORS[variant] || VARIANT_COLORS.quiz, [variant]);

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
    // Petit délai pour laisser la modal settings se fermer
    setTimeout(() => {
      openManually?.();
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
              style={{ '--ls-primary': color.primary, '--ls-glow': color.glow }}
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

                {/* Game Mode indicator (if applicable) */}
                {gameMode && (
                  <div className="game-mode-info">
                    {gameMode === 'party' ? (
                      <>
                        <Sparkles size={16} />
                        <span>Party Mode</span>
                        <span className="game-mode-desc">Tout le monde joue</span>
                      </>
                    ) : (
                      <>
                        <Users size={16} />
                        <span>Game Master</span>
                        <span className="game-mode-desc">L'hôte anime</span>
                      </>
                    )}
                  </div>
                )}

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

    </>
  );
}
