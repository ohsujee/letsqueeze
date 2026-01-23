'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, onValue, update } from 'firebase/database';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/lib/hooks/useToast';
import { storage } from '@/lib/utils/storage';

/**
 * Hook centralisé pour surveiller l'état de la room et du joueur.
 * Gère automatiquement:
 * - La détection du kick (joueur supprimé par l'hôte)
 * - La détection de la fermeture de room (hôte quitte)
 * - La redirection vers home avec messages appropriés
 *
 * À utiliser dans TOUTES les pages de jeu (lobby, play, host, end)
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', 'rooms_alibi')
 * @param {string} options.playerUid - UID du joueur actuel
 * @param {boolean} options.isHost - Si le joueur actuel est l'hôte
 * @param {boolean} options.enabled - Activer/désactiver la surveillance (default: true)
 * @param {boolean} options.skipKickRedirect - Désactiver la redirection auto sur kick (pour lobby avec LobbyDisconnectAlert)
 */
export function useRoomGuard({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  isHost = false,
  enabled = true,
  skipKickRedirect = false
}) {
  const router = useRouter();
  const toast = useToast();

  // État de validation - true tant qu'on n'a pas confirmé que la room est valide
  const [isValidating, setIsValidating] = useState(true);

  // Refs pour éviter les redirections multiples
  const hasRedirectedRef = useRef(false);
  const playerExistedRef = useRef(false);
  const isLeavingVoluntarilyRef = useRef(false);

  // Fonction pour marquer un départ volontaire (à appeler avant de quitter)
  const markVoluntaryLeave = useCallback(() => {
    isLeavingVoluntarilyRef.current = true;
  }, []);

  // Fonction pour fermer la room (hôte uniquement)
  const closeRoom = useCallback(async () => {
    if (!roomCode || !isHost) return;

    const code = String(roomCode).toUpperCase();
    isLeavingVoluntarilyRef.current = true;
    await update(ref(db, `${roomPrefix}/${code}/meta`), { closed: true });
  }, [roomCode, roomPrefix, isHost]);

  // Surveillance de l'état du joueur (détection kick)
  useEffect(() => {
    // Skip si désactivé, pas de code/uid, si host, ou si skipKickRedirect (lobby avec LobbyDisconnectAlert)
    if (!enabled || !roomCode || !playerUid || isHost || skipKickRedirect) return;

    const code = String(roomCode).toUpperCase();
    const playerRef = ref(db, `${roomPrefix}/${code}/players/${playerUid}`);

    const unsubPlayer = onValue(playerRef, (snap) => {
      const playerData = snap.val();

      if (playerData) {
        // Le joueur existe toujours
        playerExistedRef.current = true;
      } else if (playerExistedRef.current && !hasRedirectedRef.current && !isLeavingVoluntarilyRef.current) {
        // Le joueur existait mais n'existe plus (kick ou déconnexion)
        hasRedirectedRef.current = true;
        router.push('/home');
      }
    });

    return () => unsubPlayer();
  }, [enabled, roomCode, roomPrefix, playerUid, isHost, skipKickRedirect, router, toast]);

  // Surveillance de l'état de la room (détection fermeture par l'hôte)
  useEffect(() => {
    if (!enabled || !roomCode) {
      setIsValidating(false);
      return;
    }

    const code = String(roomCode).toUpperCase();
    const metaRef = ref(db, `${roomPrefix}/${code}/meta`);

    const unsubMeta = onValue(metaRef, (snap) => {
      const meta = snap.val();

      // Room n'existe pas → invalide
      if (!meta) {
        if (!hasRedirectedRef.current && !isLeavingVoluntarilyRef.current) {
          hasRedirectedRef.current = true;
          storage.remove('last_game');
          if (!isHost) {
            toast.error("Cette partie n'existe plus");
          }
          router.push('/home');
        }
        // Ne PAS mettre isValidating à false - la room est invalide
        return;
      }

      // Room fermée → invalide
      if (meta.closed) {
        if (!hasRedirectedRef.current && !isLeavingVoluntarilyRef.current) {
          hasRedirectedRef.current = true;
          storage.remove('last_game');
          if (!isHost) {
            toast.warning("L'hôte a terminé la partie");
          }
          router.push('/home');
        }
        // Ne PAS mettre isValidating à false - la room est invalide
        return;
      }

      // Room existe et n'est pas fermée → validation terminée
      setIsValidating(false);
    });

    return () => unsubMeta();
  }, [enabled, roomCode, roomPrefix, isHost, router, toast]);

  return {
    markVoluntaryLeave,
    closeRoom,
    isValidating
  };
}

/**
 * Version simplifiée pour les pages qui utilisent déjà usePlayers
 * Surveille uniquement le kick du joueur actuel
 */
export function useKickDetection({
  roomCode,
  roomPrefix = 'rooms',
  playerUid,
  enabled = true
}) {
  const router = useRouter();
  const toast = useToast();

  const hasRedirectedRef = useRef(false);
  const playerExistedRef = useRef(false);
  const isLeavingVoluntarilyRef = useRef(false);

  const markVoluntaryLeave = useCallback(() => {
    isLeavingVoluntarilyRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled || !roomCode || !playerUid) return;

    const code = String(roomCode).toUpperCase();
    const playerRef = ref(db, `${roomPrefix}/${code}/players/${playerUid}`);

    const unsubPlayer = onValue(playerRef, (snap) => {
      const playerData = snap.val();

      if (playerData) {
        playerExistedRef.current = true;
      } else if (playerExistedRef.current && !hasRedirectedRef.current && !isLeavingVoluntarilyRef.current) {
        hasRedirectedRef.current = true;
        router.push('/home');
      }
    });

    return () => unsubPlayer();
  }, [enabled, roomCode, roomPrefix, playerUid, router]);

  return { markVoluntaryLeave };
}
