'use client';

import { useCallback, useMemo } from 'react';
import { ref, update, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { ALIBI_GROUP_CONFIG } from '@/lib/config/rooms';

/**
 * useAlibiGroups - Gestion des groupes pour Alibi Party Mode
 *
 * Gère :
 * - Création/configuration des groupes
 * - Assignation des joueurs aux groupes
 * - Modification des noms de groupes (par les joueurs)
 * - Attribution des alibis par groupe
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {Object} options.meta - Métadonnées de la room
 * @param {Object} options.groups - Données des groupes depuis Firebase
 * @param {Array} options.players - Liste des joueurs
 * @param {string} options.myUid - UID de l'utilisateur actuel
 * @param {boolean} options.isHost - Si l'utilisateur est l'hôte
 */
export function useAlibiGroups({
  roomCode,
  meta,
  groups = {},
  players = [],
  myUid,
  isHost = false
}) {
  const code = roomCode?.toUpperCase();
  const isPartyMode = meta?.gameMasterMode === 'party';
  const groupCount = meta?.groupCount || 2;

  // Liste des IDs de groupes actifs
  const groupIds = useMemo(() => {
    return Object.keys(groups).filter(id => id.startsWith('group'));
  }, [groups]);

  // Mon groupe (pour les joueurs)
  const myGroup = useMemo(() => {
    if (!myUid || !isPartyMode) return null;
    const player = players.find(p => p.uid === myUid);
    if (!player?.groupId) return null;
    return {
      id: player.groupId,
      ...groups[player.groupId]
    };
  }, [myUid, isPartyMode, players, groups]);

  // Joueurs par groupe
  const playersByGroup = useMemo(() => {
    const result = {};
    groupIds.forEach(groupId => {
      result[groupId] = players.filter(p => p.groupId === groupId);
    });
    // Joueurs non assignés
    result.unassigned = players.filter(p => !p.groupId);
    return result;
  }, [groupIds, players]);

  // Vérifier si un groupe a assez de joueurs
  const isGroupValid = useCallback((groupId) => {
    const groupPlayers = playersByGroup[groupId] || [];
    return groupPlayers.length >= ALIBI_GROUP_CONFIG.MIN_PLAYERS_PER_GROUP;
  }, [playersByGroup]);

  // Vérifier si tous les groupes sont valides (pour lancer la partie)
  const allGroupsValid = useMemo(() => {
    return groupIds.every(groupId => isGroupValid(groupId));
  }, [groupIds, isGroupValid]);

  // Vérifier si tous les groupes ont un alibi assigné
  const allGroupsHaveAlibi = useMemo(() => {
    return groupIds.every(groupId => groups[groupId]?.alibiId);
  }, [groupIds, groups]);

  /**
   * Initialiser les groupes au lancement en mode Party
   */
  const initializeGroups = useCallback(async (count) => {
    if (!isHost || !code) return;

    const newGroups = {};
    for (let i = 0; i < count; i++) {
      const groupId = `group${i + 1}`;
      newGroups[groupId] = {
        id: groupId,
        name: ALIBI_GROUP_CONFIG.DEFAULT_NAMES[i],
        color: ALIBI_GROUP_CONFIG.COLORS[i],
        alibiId: null,
        alibiData: null,
        score: { correct: 0, total: 0 }
      };
    }

    await update(ref(db, `rooms_alibi/${code}`), {
      'meta/groupCount': count,
      'groups': newGroups
    });

    return newGroups;
  }, [isHost, code]);

  /**
   * Changer le nombre de groupes
   */
  const setGroupCount = useCallback(async (count) => {
    if (!isHost || !code) return;

    const validCount = Math.max(
      ALIBI_GROUP_CONFIG.MIN_GROUPS,
      Math.min(ALIBI_GROUP_CONFIG.MAX_GROUPS, count)
    );

    // Recréer les groupes avec le nouveau nombre
    await initializeGroups(validCount);

    // Reset les assignations des joueurs
    const updates = {};
    players.forEach(p => {
      updates[`rooms_alibi/${code}/players/${p.uid}/groupId`] = null;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  }, [isHost, code, players, initializeGroups]);

  /**
   * Modifier le nom d'un groupe (peut être fait par n'importe quel membre)
   */
  const updateGroupName = useCallback(async (groupId, newName) => {
    if (!code || !groupId) return;

    // Validation du nom
    const trimmed = newName.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      throw new Error('Le nom doit contenir entre 2 et 20 caractères');
    }

    // Vérifier que l'utilisateur est membre du groupe (ou host)
    const player = players.find(p => p.uid === myUid);
    if (!isHost && player?.groupId !== groupId) {
      throw new Error('Vous ne pouvez modifier que le nom de votre groupe');
    }

    await update(ref(db, `rooms_alibi/${code}/groups/${groupId}`), {
      name: trimmed
    });
  }, [code, myUid, isHost, players]);

  /**
   * Assigner un joueur à un groupe
   */
  const assignToGroup = useCallback(async (playerUid, groupId) => {
    if (!isHost || !code) return;

    await update(ref(db, `rooms_alibi/${code}/players/${playerUid}`), {
      groupId: groupId || null
    });
  }, [isHost, code]);

  /**
   * Retirer un joueur de son groupe
   */
  const removeFromGroup = useCallback(async (playerUid) => {
    if (!isHost || !code) return;

    await update(ref(db, `rooms_alibi/${code}/players/${playerUid}`), {
      groupId: null
    });
  }, [isHost, code]);

  /**
   * Auto-répartir les joueurs dans les groupes
   */
  const autoAssignPlayers = useCallback(async () => {
    if (!isHost || !code || groupIds.length === 0) return;

    // Mélanger les joueurs (Fisher-Yates)
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assigner en round-robin
    const updates = {};
    shuffled.forEach((player, index) => {
      const groupIndex = index % groupIds.length;
      updates[`rooms_alibi/${code}/players/${player.uid}/groupId`] = groupIds[groupIndex];
    });

    await update(ref(db), updates);
  }, [isHost, code, players, groupIds]);

  /**
   * Reset toutes les assignations
   */
  const resetAssignments = useCallback(async () => {
    if (!isHost || !code) return;

    const updates = {};
    players.forEach(p => {
      updates[`rooms_alibi/${code}/players/${p.uid}/groupId`] = null;
    });

    await update(ref(db), updates);
  }, [isHost, code, players]);

  /**
   * Assigner un alibi à un groupe
   */
  const assignAlibiToGroup = useCallback(async (groupId, alibiId, alibiData) => {
    if (!isHost || !code || !groupId) return;

    await update(ref(db, `rooms_alibi/${code}/groups/${groupId}`), {
      alibiId,
      alibiData: alibiData || null
    });
  }, [isHost, code]);

  /**
   * Reset tous les alibis des groupes
   */
  const resetGroupAlibis = useCallback(async () => {
    if (!isHost || !code) return;

    const updates = {};
    groupIds.forEach(groupId => {
      updates[`rooms_alibi/${code}/groups/${groupId}/alibiId`] = null;
      updates[`rooms_alibi/${code}/groups/${groupId}/alibiData`] = null;
    });

    await update(ref(db), updates);
  }, [isHost, code, groupIds]);

  /**
   * Reset les scores des groupes (pour rejouer)
   */
  const resetGroupScores = useCallback(async () => {
    if (!code) return;

    const updates = {};
    groupIds.forEach(groupId => {
      updates[`rooms_alibi/${code}/groups/${groupId}/score`] = { correct: 0, total: 0 };
    });

    await update(ref(db), updates);
  }, [code, groupIds]);

  /**
   * Obtenir le nombre de questions par groupe selon le nombre de groupes
   */
  const getQuestionsPerGroup = useCallback(() => {
    return ALIBI_GROUP_CONFIG.QUESTIONS_PER_GROUP[groupCount] || 8;
  }, [groupCount]);

  return {
    // État
    isPartyMode,
    groupCount,
    groups,
    groupIds,
    myGroup,
    playersByGroup,

    // Validations
    isGroupValid,
    allGroupsValid,
    allGroupsHaveAlibi,

    // Actions Host
    initializeGroups,
    setGroupCount,
    assignToGroup,
    removeFromGroup,
    autoAssignPlayers,
    resetAssignments,
    assignAlibiToGroup,
    resetGroupAlibis,
    resetGroupScores,

    // Actions Joueur
    updateGroupName,

    // Utils
    getQuestionsPerGroup
  };
}

export default useAlibiGroups;
