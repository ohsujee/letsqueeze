import { useCallback, useMemo } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * useAskerRotation - Gère la rotation des joueurs qui posent les questions en mode Party
 *
 * En mode Party:
 * - Mode individuel: Les joueurs posent à tour de rôle (A → B → C → A...)
 * - Mode équipes: Les équipes alternent, un membre aléatoire pose pour son équipe
 *
 * @param {Object} params
 * @param {string} params.roomCode - Code de la room
 * @param {string} params.roomPrefix - Préfixe Firebase (ex: 'rooms')
 * @param {Object} params.meta - Métadonnées de la room (mode, teams, gameMasterMode)
 * @param {Object} params.state - État de la room (askerRotation, askerIndex, currentAskerUid)
 * @param {Array} params.players - Liste des joueurs actifs
 * @param {boolean} params.isHost - Si l'utilisateur est l'hôte (en mode gamemaster)
 */
export function useAskerRotation({
  roomCode,
  roomPrefix = 'rooms',
  meta,
  state,
  players = [],
  isHost = false
}) {
  const isPartyMode = meta?.gameMasterMode === 'party';
  const isTeamMode = meta?.mode === 'équipes';
  const teams = meta?.teams || {};

  // Joueurs actifs (non déconnectés)
  const activePlayers = useMemo(() => {
    return players.filter(p => p.status !== 'disconnected' && p.status !== 'left');
  }, [players]);

  // Équipes actives (avec au moins un joueur actif)
  const activeTeams = useMemo(() => {
    if (!isTeamMode) return [];
    const teamIds = Object.keys(teams);
    return teamIds.filter(teamId => {
      const teamPlayers = activePlayers.filter(p => p.teamId === teamId);
      return teamPlayers.length > 0;
    });
  }, [isTeamMode, teams, activePlayers]);

  // Joueur/équipe qui pose actuellement
  const currentAskerUid = state?.currentAskerUid || null;
  const currentAskerTeamId = state?.currentAskerTeamId || null;
  const askerRotation = state?.askerRotation || [];
  const askerIndex = state?.askerIndex || 0;

  // Info sur le poseur actuel
  const currentAsker = useMemo(() => {
    if (!isPartyMode || !currentAskerUid) return null;

    const player = players.find(p => p.uid === currentAskerUid);
    if (!player) return null;

    return {
      uid: player.uid,
      name: player.name,
      teamId: player.teamId,
      teamName: isTeamMode && player.teamId ? teams[player.teamId]?.name : null,
      teamColor: isTeamMode && player.teamId ? teams[player.teamId]?.color : null
    };
  }, [isPartyMode, currentAskerUid, players, teams, isTeamMode]);

  // Vérifie si un UID donné est le poseur actuel
  const isCurrentAsker = useCallback((uid) => {
    if (!isPartyMode || !uid || !currentAskerUid) return false;
    return currentAskerUid === uid;
  }, [isPartyMode, currentAskerUid]);

  // Vérifie si une équipe est celle qui pose (en mode équipes)
  const isAskerTeam = useCallback((teamId) => {
    if (!isPartyMode || !isTeamMode) return false;
    return currentAskerTeamId === teamId;
  }, [isPartyMode, isTeamMode, currentAskerTeamId]);

  // Vérifie si un joueur peut buzzer (n'est pas le poseur ni dans l'équipe qui pose)
  const canBuzz = useCallback((uid, teamId) => {
    if (!isPartyMode) return true; // Mode gamemaster: tout le monde peut buzzer
    if (!uid) return false; // Pas d'UID = ne peut pas buzzer

    // Le poseur ne peut pas buzzer
    if (currentAskerUid && uid === currentAskerUid) return false;

    // En mode équipes, toute l'équipe du poseur ne peut pas buzzer
    if (isTeamMode && teamId && currentAskerTeamId && teamId === currentAskerTeamId) return false;

    return true;
  }, [isPartyMode, currentAskerUid, isTeamMode, currentAskerTeamId]);

  /**
   * Initialise la rotation au lancement de la partie
   * Appelé par l'hôte quand il démarre la partie
   */
  const initializeRotation = useCallback(async (playersList) => {
    if (!roomCode || !isPartyMode) return;

    const activeList = playersList.filter(p => p.status !== 'disconnected' && p.status !== 'left');

    if (isTeamMode) {
      // Mode équipes: rotation par équipe
      const teamIds = Object.keys(teams).filter(teamId => {
        const teamPlayers = activeList.filter(p => p.teamId === teamId);
        return teamPlayers.length > 0;
      });

      if (teamIds.length === 0) return;

      // Mélanger les équipes pour l'ordre initial
      const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

      // Choisir un membre aléatoire de la première équipe
      const firstTeamPlayers = activeList.filter(p => p.teamId === shuffledTeams[0]);
      const firstAsker = firstTeamPlayers[Math.floor(Math.random() * firstTeamPlayers.length)];

      await update(ref(db, `${roomPrefix}/${roomCode}/state`), {
        askerRotation: shuffledTeams, // Rotation des équipes
        askerIndex: 0,
        currentAskerUid: firstAsker.uid,
        currentAskerTeamId: shuffledTeams[0]
      });
    } else {
      // Mode individuel: rotation des joueurs
      if (activeList.length === 0) return;

      // Mélanger les joueurs pour l'ordre initial
      const shuffledPlayers = [...activeList].sort(() => Math.random() - 0.5);
      const rotation = shuffledPlayers.map(p => p.uid);

      await update(ref(db, `${roomPrefix}/${roomCode}/state`), {
        askerRotation: rotation,
        askerIndex: 0,
        currentAskerUid: rotation[0],
        currentAskerTeamId: null
      });
    }
  }, [roomCode, roomPrefix, isPartyMode, isTeamMode, teams]);

  /**
   * Passe au poseur suivant dans la rotation
   * Appelé après chaque question (validate, skip, wrong si plus de buzzers)
   */
  const advanceToNextAsker = useCallback(async () => {
    if (!roomCode || !isPartyMode || askerRotation.length === 0) return;

    const nextIndex = (askerIndex + 1) % askerRotation.length;

    if (isTeamMode) {
      // Mode équipes: passer à l'équipe suivante
      const nextTeamId = askerRotation[nextIndex];

      // Trouver les joueurs actifs de cette équipe
      let teamPlayers = activePlayers.filter(p => p.teamId === nextTeamId);

      // Si l'équipe n'a plus de joueurs actifs, passer à la suivante
      let attempts = 0;
      let currentIndex = nextIndex;
      while (teamPlayers.length === 0 && attempts < askerRotation.length) {
        currentIndex = (currentIndex + 1) % askerRotation.length;
        const teamId = askerRotation[currentIndex];
        teamPlayers = activePlayers.filter(p => p.teamId === teamId);
        attempts++;
      }

      if (teamPlayers.length === 0) {
        console.warn('[AskerRotation] Aucune équipe avec des joueurs actifs');
        return;
      }

      // Choisir un membre aléatoire de l'équipe
      const nextAsker = teamPlayers[Math.floor(Math.random() * teamPlayers.length)];

      await update(ref(db, `${roomPrefix}/${roomCode}/state`), {
        askerIndex: currentIndex,
        currentAskerUid: nextAsker.uid,
        currentAskerTeamId: askerRotation[currentIndex]
      });
    } else {
      // Mode individuel: passer au joueur suivant
      let nextUid = askerRotation[nextIndex];

      // Si le joueur n'est plus actif, chercher le suivant
      let attempts = 0;
      let currentIndex = nextIndex;
      while (!activePlayers.find(p => p.uid === nextUid) && attempts < askerRotation.length) {
        currentIndex = (currentIndex + 1) % askerRotation.length;
        nextUid = askerRotation[currentIndex];
        attempts++;
      }

      if (!activePlayers.find(p => p.uid === nextUid)) {
        console.warn('[AskerRotation] Aucun joueur actif trouvé dans la rotation');
        return;
      }

      await update(ref(db, `${roomPrefix}/${roomCode}/state`), {
        askerIndex: currentIndex,
        currentAskerUid: nextUid,
        currentAskerTeamId: null
      });
    }
  }, [roomCode, roomPrefix, isPartyMode, isTeamMode, askerRotation, askerIndex, activePlayers]);

  /**
   * Gère le cas où le poseur actuel se déconnecte
   * Passe immédiatement au suivant
   */
  const handleAskerDisconnect = useCallback(async () => {
    if (!isPartyMode || !currentAskerUid) return;

    // Vérifier si le poseur actuel est toujours actif
    const askerStillActive = activePlayers.find(p => p.uid === currentAskerUid);

    if (!askerStillActive) {
      console.log('[AskerRotation] Poseur déconnecté, passage au suivant');
      await advanceToNextAsker();
    }
  }, [isPartyMode, currentAskerUid, activePlayers, advanceToNextAsker]);

  return {
    // État
    isPartyMode,
    currentAsker,
    currentAskerUid,
    currentAskerTeamId,
    askerRotation,
    askerIndex,

    // Checks
    isCurrentAsker,
    isAskerTeam,
    canBuzz,

    // Actions
    initializeRotation,
    advanceToNextAsker,
    handleAskerDisconnect
  };
}
