'use client';

import { forwardRef } from 'react';
import ExitButton from '@/lib/components/ExitButton';
import LobbySettings from '@/components/game/LobbySettings';
import ShareModal from '@/lib/components/ShareModal';
import { HelpCircle, Share2 } from 'lucide-react';
import { useHowToPlay } from '@/lib/context/HowToPlayContext';

/**
 * LobbyHeader — Header flat pour tous les lobbys
 * Layout : [Settings/Help] [CODE ↗] ... [Exit]
 */
const LobbyHeader = forwardRef(function LobbyHeader({
  variant = 'quiz',
  code,
  isHost,
  players = [],
  hostUid,
  onHostExit,
  onPlayerExit,
  joinUrl,
  gameMode
}, ref) {
  const { openManually } = useHowToPlay();

  const roomPrefixMap = {
    quiz: 'rooms', deeztest: 'rooms_blindtest', alibi: 'rooms_alibi',
    laregle: 'rooms_laregle', mindlink: 'rooms_mindlink',
    mime: 'rooms_mime', lol: 'rooms_lol', imposteur: 'rooms_imposteur'
  };
  const roomPrefix = roomPrefixMap[variant] || 'rooms';

  const hostConfirmMessage = "Voulez-vous vraiment quitter ? La partie sera fermée pour tous les joueurs.";
  const playerConfirmMessage = "Voulez-vous vraiment quitter le lobby ?";

  return (
    <header className={`lobby-header ${variant}`}>
      {/* Gauche : Settings (host) ou Help (player) */}
      <div className="header-left">
        {isHost ? (
          <LobbySettings
            players={players}
            roomCode={code}
            roomPrefix={roomPrefix}
            hostUid={hostUid}
            variant={variant}
            gameMode={gameMode}
          />
        ) : (
          openManually && (
            <button className="header-help-btn" onClick={openManually}>
              <HelpCircle size={20} />
            </button>
          )
        )}
      </div>

      {/* Centre : Room code cliquable → ouvre le share modal */}
      <ShareModal ref={ref} roomCode={code} joinUrl={joinUrl} gameType={variant} />

      {/* Droite : Exit (isolé) */}
      <div className="header-right">
        <ExitButton
          variant="header"
          onExit={isHost ? onHostExit : onPlayerExit}
          confirmMessage={isHost ? hostConfirmMessage : playerConfirmMessage}
        />
      </div>
    </header>
  );
});

export default LobbyHeader;
