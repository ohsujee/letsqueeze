'use client';

import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ExitButton from '@/lib/components/ExitButton';
import LobbySettings from '@/components/game/LobbySettings';
import ShareModal from '@/lib/components/ShareModal';

/**
 * LobbyHeader - Header unifié pour tous les lobbys de jeux
 *
 * @param {Object} props
 * @param {'quiz'|'blindtest'|'deeztest'|'alibi'} props.variant - Thème couleur
 * @param {string} props.code - Code de la room
 * @param {boolean} props.isHost - Si l'utilisateur est l'hôte
 * @param {Array} props.players - Liste des joueurs
 * @param {string} props.hostUid - UID de l'hôte
 * @param {function} props.onHostExit - Callback quand l'hôte quitte
 * @param {function} props.onPlayerExit - Callback quand un joueur quitte
 * @param {function} props.onShowHowToPlay - Callback pour ouvrir le modal "Comment jouer"
 * @param {string} props.joinUrl - URL de join pour le partage
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
  joinUrl
}) {
  const router = useRouter();

  // Config par variante
  const config = {
    quiz: {
      roomPrefix: 'rooms',
      spectatePath: `/spectate/${code}`,
    },
    blindtest: {
      roomPrefix: 'rooms_blindtest',
      spectatePath: `/blindtest/spectate/${code}`,
    },
    deeztest: {
      roomPrefix: 'rooms_deeztest',
      spectatePath: `/deeztest/spectate/${code}`,
    },
    alibi: {
      roomPrefix: 'rooms_alibi',
      spectatePath: `/spectate/${code}`,
    }
  };

  const { roomPrefix, spectatePath } = config[variant] || config.quiz;

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
          <span className="room-code">{code}</span>
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
          />
        ) : (
          <motion.button
            className="spectator-btn"
            onClick={() => router.push(spectatePath)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Mode spectateur"
          >
            <Eye size={18} />
          </motion.button>
        )}
        <ShareModal roomCode={code} joinUrl={joinUrl} gameType={variant} />
      </div>
    </header>
  );
}
