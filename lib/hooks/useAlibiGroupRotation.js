'use client';

import { useCallback, useMemo } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { ALIBI_GROUP_CONFIG } from '@/lib/config/rooms';

/**
 * useAlibiGroupRotation - Gestion de la rotation des rôles en Alibi Party Mode
 *
 * Gère la rotation :
 * - Groupe Inspecteur : pose les questions
 * - Groupe Accusé : répond aux questions
 * - Groupes Spectateurs : observent en temps réel
 *
 * Exemple avec 3 groupes :
 * Round 1: G1 (inspecteur) → G2 (accusé), G3 (spectateur)
 * Round 2: G2 (inspecteur) → G3 (accusé), G1 (spectateur)
 * Round 3: G3 (inspecteur) → G1 (accusé), G2 (spectateur)
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {Object} options.meta - Métadonnées de la room
 * @param {Object} options.state - État de la room
 * @param {Object} options.groups - Données des groupes
 * @param {Array} options.players - Liste des joueurs
 * @param {string} options.myUid - UID de l'utilisateur actuel
 * @param {boolean} options.isHost - Si l'utilisateur est l'hôte
 */
export function useAlibiGroupRotation({
  roomCode,
  meta,
  state,
  groups = {},
  players = [],
  myUid,
  isHost = false
}) {
  const code = roomCode?.toUpperCase();
  const isPartyMode = meta?.gameMasterMode === 'party';
  const groupCount = meta?.groupCount || 2;

  // État de la rotation
  const currentRound = state?.currentRound || 0;
  const totalRounds = state?.totalRounds || 0;
  const roundRotation = state?.roundRotation || [];
  const inspectorGroupId = state?.inspectorGroupId || null;
  const accusedGroupId = state?.accusedGroupId || null;

  // IDs des groupes
  const groupIds = useMemo(() => {
    return Object.keys(groups).filter(id => id.startsWith('group')).sort();
  }, [groups]);

  // Groupe inspecteur actuel (avec données complètes)
  const inspectorGroup = useMemo(() => {
    if (!inspectorGroupId || !groups[inspectorGroupId]) return null;
    return {
      id: inspectorGroupId,
      ...groups[inspectorGroupId],
      players: players.filter(p => p.groupId === inspectorGroupId)
    };
  }, [inspectorGroupId, groups, players]);

  // Groupe accusé actuel (avec données complètes)
  const accusedGroup = useMemo(() => {
    if (!accusedGroupId || !groups[accusedGroupId]) return null;
    return {
      id: accusedGroupId,
      ...groups[accusedGroupId],
      players: players.filter(p => p.groupId === accusedGroupId)
    };
  }, [accusedGroupId, groups, players]);

  // Groupes spectateurs (tous sauf inspecteur et accusé)
  const spectatorGroups = useMemo(() => {
    return groupIds
      .filter(id => id !== inspectorGroupId && id !== accusedGroupId)
      .map(id => ({
        id,
        ...groups[id],
        players: players.filter(p => p.groupId === id)
      }));
  }, [groupIds, inspectorGroupId, accusedGroupId, groups, players]);

  // Mon groupe
  const myGroupId = useMemo(() => {
    const player = players.find(p => p.uid === myUid);
    return player?.groupId || null;
  }, [players, myUid]);

  // Mon rôle actuel
  const myRole = useMemo(() => {
    if (!isPartyMode || !myGroupId) return null;
    if (myGroupId === inspectorGroupId) return 'inspector';
    if (myGroupId === accusedGroupId) return 'accused';
    return 'spectator';
  }, [isPartyMode, myGroupId, inspectorGroupId, accusedGroupId]);

  // Vérifications de rôle
  const isInspectorGroup = useCallback((groupId) => {
    return groupId === inspectorGroupId;
  }, [inspectorGroupId]);

  const isAccusedGroup = useCallback((groupId) => {
    return groupId === accusedGroupId;
  }, [accusedGroupId]);

  const isSpectatorGroup = useCallback((groupId) => {
    return groupId !== inspectorGroupId && groupId !== accusedGroupId;
  }, [inspectorGroupId, accusedGroupId]);

  /**
   * Génère la séquence complète des rounds
   * Chaque groupe interroge chaque autre groupe une fois par "cycle"
   */
  const generateRoundRotation = useCallback((groupIdList, questionsPerGroup) => {
    const rotation = [];
    const numGroups = groupIdList.length;

    // Pour chaque groupe en tant qu'inspecteur
    for (let cycle = 0; cycle < questionsPerGroup; cycle++) {
      for (let i = 0; i < numGroups; i++) {
        const inspectorIdx = i;
        // L'accusé est le groupe suivant dans la rotation
        const accusedIdx = (i + 1 + cycle) % numGroups;

        // Éviter qu'un groupe s'interroge lui-même
        if (inspectorIdx !== accusedIdx) {
          rotation.push({
            inspector: groupIdList[inspectorIdx],
            accused: groupIdList[accusedIdx],
            questionIndex: cycle
          });
        }
      }
    }

    return rotation;
  }, []);

  /**
   * Initialise la rotation au lancement de la partie
   * Appelé par l'hôte depuis handleStartGame
   */
  const initializeRotation = useCallback(async () => {
    if (!code || !isPartyMode || groupIds.length < 2) return null;

    const questionsPerGroup = ALIBI_GROUP_CONFIG.QUESTIONS_PER_GROUP[groupCount] || 8;

    // Mélanger les groupes pour un ordre aléatoire
    const shuffledGroups = [...groupIds].sort(() => Math.random() - 0.5);

    // Générer la rotation complète
    const rotation = generateRoundRotation(shuffledGroups, questionsPerGroup);

    if (rotation.length === 0) return null;

    // Premier round
    const firstRound = rotation[0];

    const rotationState = {
      roundRotation: rotation,
      totalRounds: rotation.length,
      currentRound: 0,
      inspectorGroupId: firstRound.inspector,
      accusedGroupId: firstRound.accused
    };

    await update(ref(db, `rooms_alibi/${code}/state`), rotationState);

    return rotationState;
  }, [code, isPartyMode, groupIds, groupCount, generateRoundRotation]);

  /**
   * Passe au round suivant
   * Appelé après chaque question validée/skippée
   */
  const advanceToNextRound = useCallback(async () => {
    if (!code || !isPartyMode || roundRotation.length === 0) return false;

    const nextRoundIndex = currentRound + 1;

    // Vérifier si la partie est terminée
    if (nextRoundIndex >= roundRotation.length) {
      // Fin de partie
      await update(ref(db, `rooms_alibi/${code}/state`), {
        phase: 'end'
      });
      return false;
    }

    // Passer au round suivant
    const nextRound = roundRotation[nextRoundIndex];

    await update(ref(db, `rooms_alibi/${code}/state`), {
      currentRound: nextRoundIndex,
      inspectorGroupId: nextRound.inspector,
      accusedGroupId: nextRound.accused,
      // Reset l'état de l'interrogation pour le nouveau round
      'interrogation/state': 'waiting',
      'interrogation/responses': null,
      'interrogation/verdict': null
    });

    return true;
  }, [code, isPartyMode, roundRotation, currentRound]);

  /**
   * Obtenir les infos du prochain round (pour preview)
   */
  const getNextRoundInfo = useCallback(() => {
    if (!isPartyMode || roundRotation.length === 0) return null;

    const nextIndex = currentRound + 1;
    if (nextIndex >= roundRotation.length) return null;

    const nextRound = roundRotation[nextIndex];
    return {
      round: nextIndex + 1,
      totalRounds: roundRotation.length,
      inspector: {
        id: nextRound.inspector,
        ...groups[nextRound.inspector]
      },
      accused: {
        id: nextRound.accused,
        ...groups[nextRound.accused]
      }
    };
  }, [isPartyMode, roundRotation, currentRound, groups]);

  /**
   * Vérifie si le jeu est terminé
   */
  const isGameComplete = useMemo(() => {
    if (!isPartyMode || totalRounds === 0) return false;
    return currentRound >= totalRounds - 1 && state?.phase === 'end';
  }, [isPartyMode, currentRound, totalRounds, state?.phase]);

  /**
   * Progression du jeu (pour affichage)
   */
  const gameProgress = useMemo(() => {
    if (!isPartyMode || totalRounds === 0) return null;
    return {
      current: currentRound + 1,
      total: totalRounds,
      percentage: Math.round(((currentRound + 1) / totalRounds) * 100)
    };
  }, [isPartyMode, currentRound, totalRounds]);

  /**
   * Nombre de rounds restants pour mon groupe en tant qu'accusé
   */
  const myRemainingRoundsAsAccused = useMemo(() => {
    if (!isPartyMode || !myGroupId || roundRotation.length === 0) return 0;

    return roundRotation
      .slice(currentRound + 1)
      .filter(r => r.accused === myGroupId)
      .length;
  }, [isPartyMode, myGroupId, roundRotation, currentRound]);

  return {
    // État
    isPartyMode,
    currentRound,
    totalRounds,
    roundRotation,

    // Groupes actuels
    inspectorGroupId,
    accusedGroupId,
    inspectorGroup,
    accusedGroup,
    spectatorGroups,

    // Mon état
    myGroupId,
    myRole,
    myRemainingRoundsAsAccused,

    // Vérifications
    isInspectorGroup,
    isAccusedGroup,
    isSpectatorGroup,
    isGameComplete,

    // Progression
    gameProgress,
    getNextRoundInfo,

    // Actions
    initializeRotation,
    advanceToNextRound
  };
}

export default useAlibiGroupRotation;
