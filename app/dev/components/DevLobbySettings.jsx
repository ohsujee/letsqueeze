'use client';

/**
 * DevLobbySettings — Copie dev de LobbySettings
 * Différences vs original :
 * - Icônes Phosphor au lieu de Lucide
 * - Bouton trigger avec couleur du jeu subtile au repos
 * - Kick = no-op (pas de Firebase en dev)
 */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GearSix, X, Question, UserMinus,
  WifiSlash, Moon, Crown, Users, Sparkle,
} from '@phosphor-icons/react';
import { useDevHowToPlay } from '@/app/dev/context/DevHowToPlayContext';

const VARIANT_COLORS = {
  quiz:     { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
  deeztest: { primary: '#A238FF', glow: 'rgba(162, 56, 255, 0.5)' },
  alibi:    { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)'  },
  laregle:  { primary: '#00e5ff', glow: 'rgba(0, 229, 255, 0.5)'   },
};

export default function DevLobbySettings({
  players = [],
  hostUid,
  variant = 'laregle',
  gameMode,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmKick, setConfirmKick] = useState(null);
  const { openManually } = useDevHowToPlay();

  const color = useMemo(() => VARIANT_COLORS[variant] || VARIANT_COLORS.laregle, [variant]);

  const activeCount = players.filter(p =>
    (!p.status || p.status === 'active') &&
    (!p.activityStatus || p.activityStatus === 'active')
  ).length;
  const hasIssues = activeCount < players.length;

  const handleHowToPlay = () => {
    setIsOpen(false);
    setTimeout(() => openManually?.(), 150);
  };

  // No-op en dev
  const handleKick = (player) => {
    console.log('[DEV] Kick simulé pour', player.name);
    setConfirmKick(null);
  };

  return (
    <>
      {/* Bouton trigger */}
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
          border: `1.5px solid ${color.primary}30`,
          borderRadius: '10px',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
        }}
        whileHover={{
          background: `${color.primary}15`,
          borderColor: `${color.primary}80`,
          color: color.primary,
        }}
        whileTap={{ scale: 0.95 }}
      >
        <GearSix size={20} weight="bold" />
        {hasIssues && (
          <span style={{
            position: 'absolute', top: '5px', right: '5px',
            width: '6px', height: '6px',
            background: '#ef4444', borderRadius: '50%',
          }} />
        )}
      </motion.button>

      {/* Modal via portal */}
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
                onClick={e => e.stopPropagation()}
              >
                <div className="settings-header">
                  <h3 className="settings-title">Paramètres</h3>
                  <button className="settings-close" onClick={() => setIsOpen(false)}>
                    <X size={20} weight="bold" />
                  </button>
                </div>

                <button className="how-to-play-btn" onClick={handleHowToPlay}>
                  <Question size={20} weight="fill" />
                  <span>Comment jouer</span>
                </button>

                {gameMode && (
                  <div className="game-mode-info">
                    {gameMode === 'party' ? (
                      <>
                        <Sparkle size={16} weight="fill" />
                        <span>Party Mode</span>
                        <span className="game-mode-desc">Tout le monde joue</span>
                      </>
                    ) : (
                      <>
                        <Users size={16} weight="bold" />
                        <span>Game Master</span>
                        <span className="game-mode-desc">L'hôte anime</span>
                      </>
                    )}
                  </div>
                )}

                <div className="settings-divider" />

                <div className="players-section">
                  <div className="players-header">
                    <span className="players-label">Joueurs</span>
                    <span className="players-count">{activeCount}/{players.length}</span>
                  </div>

                  <div className="players-list">
                    {players.map(player => {
                      const isHost       = player.uid === hostUid;
                      const isDisconnect = player.status === 'disconnected' || player.status === 'left';
                      const isInactive   = player.activityStatus === 'inactive';

                      return (
                        <div
                          key={player.uid}
                          className={`player-row ${isDisconnect ? 'disconnected' : isInactive ? 'inactive' : ''}`}
                        >
                          <div className="player-info">
                            <div className="player-avatar">
                              {player.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="player-name">
                              {player.name}
                              {isHost && <Crown size={14} weight="fill" className="host-icon" />}
                            </span>
                            {isDisconnect ? (
                              <span className="player-status disconnected">
                                <WifiSlash size={12} weight="bold" />
                              </span>
                            ) : isInactive ? (
                              <span className="player-status inactive">
                                <Moon size={12} weight="fill" />
                              </span>
                            ) : null}
                          </div>

                          {!isHost && (
                            <button
                              className="kick-btn"
                              onClick={() => setConfirmKick(player)}
                              title="Exclure"
                            >
                              <UserMinus size={16} weight="bold" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

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
                          <UserMinus size={16} weight="bold" />
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

      {/* Styles — copie exacte de LobbySettings + couleur laregle */}
      <style jsx global>{`
        .settings-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .settings-modal {
          width: 100%; max-width: 360px; max-height: 70vh;
          background: rgba(20,20,30,0.95);
          backdrop-filter: blur(20px);
          border: 1px solid ${color.primary}40;
          border-radius: 20px;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${color.glow};
        }
        .settings-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        .settings-title {
          font-family: var(--font-title,'Bungee'),cursive;
          font-size: 1rem; color: #fff; margin: 0;
        }
        .settings-close {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: rgba(255,255,255,0.6); cursor: pointer;
          transition: all 0.2s ease;
        }
        .settings-close:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.4); color: #f87171;
        }
        .how-to-play-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; margin: 16px; padding: 14px 20px;
          background: ${color.primary}20;
          border: 2px solid ${color.primary}40;
          border-radius: 12px; color: ${color.primary};
          font-family: var(--font-display,'Space Grotesk'),sans-serif;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .how-to-play-btn:hover {
          background: ${color.primary}30;
          border-color: ${color.primary}60;
          transform: translateY(-1px);
        }
        .game-mode-info {
          display: flex; align-items: center; gap: 8px;
          margin: 0 16px 16px; padding: 10px 14px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px; color: rgba(255,255,255,0.6); font-size: 0.85rem;
        }
        .game-mode-info svg { color: ${color.primary}; flex-shrink: 0; }
        .game-mode-info span:first-of-type { font-weight: 600; color: rgba(255,255,255,0.9); }
        .game-mode-desc { margin-left: auto; font-size: 0.75rem; color: rgba(255,255,255,0.4); }
        .settings-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 0 16px; }
        .players-section {
          flex: 1; display: flex; flex-direction: column;
          min-height: 0; padding: 16px;
        }
        .players-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px;
        }
        .players-label {
          font-family: var(--font-display,'Space Grotesk'),sans-serif;
          font-size: 0.8rem; font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .players-count {
          font-size: 0.75rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.08);
          padding: 4px 10px; border-radius: 8px;
        }
        .players-list {
          flex: 1; overflow-y: auto;
          display: flex; flex-direction: column; gap: 8px;
        }
        .player-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; transition: all 0.2s ease;
        }
        .player-row:hover { background: rgba(255,255,255,0.06); }
        .player-row.disconnected { opacity: 0.5; }
        .player-row.inactive { opacity: 0.7; }
        .player-info {
          display: flex; align-items: center; gap: 10px;
          flex: 1; min-width: 0;
        }
        .player-avatar {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: ${color.primary}20;
          border: 1px solid ${color.primary}40;
          border-radius: 8px;
          font-family: var(--font-display,'Space Grotesk'),sans-serif;
          font-weight: 700; font-size: 0.85rem; color: ${color.primary};
          flex-shrink: 0;
        }
        .player-name {
          font-family: var(--font-display,'Space Grotesk'),sans-serif;
          font-size: 0.875rem; font-weight: 600; color: #fff;
          display: flex; align-items: center; gap: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .host-icon { color: #fbbf24; flex-shrink: 0; }
        .player-status { flex-shrink: 0; }
        .player-status.disconnected { color: #ef4444; }
        .player-status.inactive { color: #f59e0b; }
        .kick-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px; color: #f87171; cursor: pointer;
          transition: all 0.2s ease; flex-shrink: 0;
        }
        .kick-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); }
        .kick-confirm {
          padding: 16px;
          background: rgba(239,68,68,0.08);
          border-top: 1px solid rgba(239,68,68,0.2);
        }
        .kick-text {
          font-size: 0.875rem; color: rgba(255,255,255,0.9);
          margin: 0 0 12px; text-align: center;
        }
        .kick-text strong { color: #fff; }
        .kick-actions { display: flex; gap: 10px; }
        .btn-cancel, .btn-kick {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 6px; padding: 10px 16px; border-radius: 10px;
          font-family: var(--font-display,'Space Grotesk'),sans-serif;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-cancel {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.8);
        }
        .btn-kick {
          background: linear-gradient(135deg,rgba(239,68,68,0.3),rgba(239,68,68,0.15));
          border: 1px solid rgba(239,68,68,0.4); color: #f87171;
        }
        .players-list::-webkit-scrollbar { width: 4px; }
        .players-list::-webkit-scrollbar-thumb { background: ${color.primary}60; border-radius: 2px; }
      `}</style>
    </>
  );
}
