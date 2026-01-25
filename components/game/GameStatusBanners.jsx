'use client';

import ConnectionLostBanner from './ConnectionLostBanner';
import HostDisconnectedBanner from './HostDisconnectedBanner';

/**
 * Wrapper global pour les banners de statut de connexion en jeu
 *
 * Combine :
 * - ConnectionLostBanner : Pour tout le monde quand la connexion Firebase est perdue
 * - HostDisconnectedBanner : Pour les joueurs quand l'hôte est temporairement déconnecté
 *
 * Usage dans les pages de jeu (host et play) :
 *
 * ```jsx
 * const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({...});
 *
 * <GameStatusBanners
 *   isHost={isHost}
 *   isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
 *   hostDisconnectedAt={hostDisconnectedAt}
 * />
 * ```
 *
 * @param {Object} props
 * @param {boolean} props.isHost - Si l'utilisateur actuel est l'hôte
 * @param {boolean} props.isHostTemporarilyDisconnected - Si l'hôte est temporairement déconnecté (from useRoomGuard)
 * @param {number} props.hostDisconnectedAt - Timestamp de déconnexion de l'hôte (from useRoomGuard)
 */
export default function GameStatusBanners({
  isHost = false,
  isHostTemporarilyDisconnected = false,
  hostDisconnectedAt = null
}) {
  return (
    <>
      {/* Banner de connexion perdue - pour tout le monde */}
      <ConnectionLostBanner />

      {/* Banner hôte déconnecté - seulement pour les joueurs (pas l'hôte) */}
      {!isHost && (
        <HostDisconnectedBanner
          isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
          hostDisconnectedAt={hostDisconnectedAt}
        />
      )}
    </>
  );
}
