'use client';

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, HelpCircle, Users, Sparkles } from 'lucide-react';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';
import { PlayerList } from '@/components/game/PlayerManager';
import './LobbySettings.css';

/**
 * LobbySettings - Bouton settings + Modal avec Comment jouer + PlayerList (réutilisé)
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

  const closeSettings = useCallback(() => setIsOpen(false), []);
  useBackHandler(closeSettings, isOpen);

  const activeCount = players.filter(p =>
    (!p.status || p.status === 'active') &&
    (!p.activityStatus || p.activityStatus === 'active')
  ).length;
  const hasIssues = activeCount < players.length;

  const handleHowToPlay = () => {
    setIsOpen(false);
    setTimeout(() => { openManually?.(); }, 150);
  };

  return (
    <>
      {/* Bouton Settings */}
      <button
        className="settings-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Paramètres"
      >
        <Settings size={20} strokeWidth={2} />
        {hasIssues && <span className="settings-trigger-badge" />}
      </button>

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

                {/* Comment jouer */}
                <button className="how-to-play-btn" onClick={handleHowToPlay}>
                  <HelpCircle size={20} />
                  <span>Comment jouer</span>
                </button>

                {/* Game Mode */}
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

                {/* Player list — réutilise PlayerList de PlayerManager */}
                <div className="players-section">
                  <PlayerList
                    players={players}
                    roomCode={roomCode}
                    roomPrefix={roomPrefix}
                    hostUid={hostUid}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
