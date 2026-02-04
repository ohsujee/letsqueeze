'use client';

import ExitButton from '@/lib/components/ExitButton';
import LobbySettings from '@/components/game/LobbySettings';
import ShareModal from '@/lib/components/ShareModal';
import { HelpCircle } from 'lucide-react';

/**
 * LobbyHeader - Header unifié pour tous les lobbys de jeux
 *
 * @param {Object} props
 * @param {'quiz'|'deeztest'|'alibi'|'laregle'|'mime'} props.variant - Thème couleur
 * @param {string} props.code - Code de la room
 * @param {boolean} props.isHost - Si l'utilisateur est l'hôte
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.hostUid - UID de l'hôte
 * @param {function} props.onHostExit - Callback quand l'hôte quitte
 * @param {function} props.onPlayerExit - Callback quand un joueur quitte
 * @param {function} props.onShowHowToPlay - Callback pour ouvrir le modal "Comment jouer"
 * @param {string} props.joinUrl - URL de join pour le partage
 * @param {'gamemaster'|'party'} props.gameMode - Mode de jeu (optionnel)
 */
export default function LobbyHeader({
  variant = 'quiz',
  code,
  isHost,
  players = [],
  hostUid,
  onHostExit,
  onPlayerExit,
  onShowHowToPlay,
  joinUrl,
  gameMode
}) {
  // Config par variante
  const roomPrefixMap = {
    quiz: 'rooms',
    deeztest: 'rooms_blindtest',
    alibi: 'rooms_alibi',
    laregle: 'rooms_laregle',
    mime: 'rooms_mime'
  };

  const roomPrefix = roomPrefixMap[variant] || 'rooms';

  // Messages de confirmation
  const hostConfirmMessage = "Voulez-vous vraiment quitter ? La partie sera fermée pour tous les joueurs.";
  const playerConfirmMessage = "Voulez-vous vraiment quitter le lobby ?";

  return (
    <header className={`lobby-header ${variant}`}>
      <div className="header-left">
        <ExitButton
          variant="header"
          onExit={isHost ? onHostExit : onPlayerExit}
          confirmMessage={isHost ? hostConfirmMessage : playerConfirmMessage}
        />
        <div className="header-title-row">
          <h1 className="lobby-title">Lobby</h1>
          <span className="lobby-divider">•</span>
          <span className="room-code selectable">{code}</span>
        </div>
      </div>
      <div className="header-right">
        {isHost ? (
          <LobbySettings
            players={players}
            roomCode={code}
            roomPrefix={roomPrefix}
            hostUid={hostUid}
            variant={variant}
            onShowHowToPlay={onShowHowToPlay}
            gameMode={gameMode}
          />
        ) : (
          /* Help button for non-host players */
          onShowHowToPlay && (
            <button className="header-help-btn" onClick={onShowHowToPlay}>
              <HelpCircle size={22} />
            </button>
          )
        )}
        <ShareModal roomCode={code} joinUrl={joinUrl} gameType={variant} />
      </div>
    </header>
  );
}
