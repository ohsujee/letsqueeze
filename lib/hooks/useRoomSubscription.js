"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  ref,
  onValue,
  update,
  onAuthStateChanged,
  signInAnonymously,
} from "@/lib/firebase";
import { useToast } from "@/lib/hooks/useToast";

/**
 * Hook réutilisable pour gérer la souscription à une room et la détection
 * du départ de l'hôte. Fonctionne pour tous les types de jeux.
 *
 * @param {string} code - Le code de la room
 * @param {string} roomPath - Le chemin Firebase de la room (ex: "rooms", "rooms_alibi")
 * @param {Object} options - Options supplémentaires
 * @param {Function} options.onMetaUpdate - Callback quand les meta sont mises à jour
 * @param {Function} options.onPlayersUpdate - Callback quand les joueurs sont mis à jour
 * @param {Function} options.onStateUpdate - Callback quand l'état du jeu change
 * @returns {Object} - { meta, players, isHost, handleHostExit, loading }
 */
export function useRoomSubscription(code, roomPath = "rooms", options = {}) {
  const router = useRouter();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  const roomWasValidRef = useRef(false);
  const { onMetaUpdate, onPlayersUpdate, onStateUpdate } = options;

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsHost(meta?.hostUid === user.uid);
      } else {
        signInAnonymously(auth).catch(() => {});
      }
    });
    return () => unsub();
  }, [meta?.hostUid]);

  // Room subscriptions
  useEffect(() => {
    if (!code) return;

    // Meta listener with host leave detection
    const metaUnsub = onValue(ref(db, `${roomPath}/${code}/meta`), (snap) => {
      const m = snap.val();
      if (m) {
        // Check if room was closed by host
        if (m.closed) {
          // Only show toast if not the host (host already knows they're leaving)
          const currentUid = auth.currentUser?.uid;
          if (currentUid !== m.hostUid) {
            toast.warning("L'hôte a quitté la partie");
          }
          router.push('/home');
          return;
        }
        setMeta(m);
        roomWasValidRef.current = true;
        setLoading(false);
        if (onMetaUpdate) onMetaUpdate(m);
      } else if (roomWasValidRef.current) {
        // Room was deleted (host left) - show toast only for non-hosts
        toast.warning("L'hôte a quitté la partie");
        router.push('/home');
      }
    });

    // Players listener
    const playersUnsub = onValue(ref(db, `${roomPath}/${code}/players`), (snap) => {
      const p = snap.val() || {};
      const playersList = Object.values(p);
      setPlayers(playersList);
      if (onPlayersUpdate) onPlayersUpdate(playersList);
    });

    // State listener (optional - for game phase changes)
    let stateUnsub = () => {};
    if (onStateUpdate) {
      stateUnsub = onValue(ref(db, `${roomPath}/${code}/state`), (snap) => {
        const state = snap.val();
        if (state) onStateUpdate(state);
      });
    }

    return () => {
      metaUnsub();
      playersUnsub();
      stateUnsub();
    };
  }, [code, roomPath, router, toast, onMetaUpdate, onPlayersUpdate, onStateUpdate]);

  // Host exit handler - mark room as closed so all players are notified
  const handleHostExit = async () => {
    if (isHost) {
      // Mark room as closed - triggers redirect for all players
      await update(ref(db, `${roomPath}/${code}/meta`), { closed: true });
    }
    router.push('/home');
  };

  return {
    meta,
    players,
    isHost,
    handleHostExit,
    loading,
    currentUser: auth.currentUser,
  };
}

/**
 * Props pour ExitButton quand utilisé avec useRoomSubscription
 */
export function getHostExitProps(isHost, handleHostExit) {
  if (!isHost) return {};

  return {
    onExit: handleHostExit,
    confirmMessage: "Voulez-vous vraiment quitter ? La partie sera fermée pour tous les joueurs.",
  };
}
