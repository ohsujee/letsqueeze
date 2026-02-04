'use client';

import { useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';

// Default team names and colors (must match visual effects in Leaderboard.jsx)
const TEAM_NAMES = ['Blaze', 'Frost', 'Venom', 'Solar'];
const TEAM_COLORS = [
  '#FF2D55', // Blaze - red/fire
  '#00D4FF', // Frost - cyan/ice
  '#50C832', // Venom - green/toxic
  '#FFB800'  // Solar - golden/sun
];

/**
 * Hook centralisé pour la gestion du mode équipe
 *
 * @param {Object} options
 * @param {string} options.roomCode - Code de la room
 * @param {string} options.roomPrefix - Préfixe Firebase ('rooms', 'rooms_blindtest', 'rooms_alibi')
 * @param {Object} options.meta - Métadonnées de la room (pour mode, teams, teamCount)
 * @param {Array} options.players - Liste des joueurs
 * @param {boolean} options.isHost - Si l'utilisateur est l'hôte
 * @returns {Object} Fonctions pour gérer les équipes
 */
export function useTeamMode({
  roomCode,
  roomPrefix = 'rooms',
  meta,
  players = [],
  isHost = false
}) {
  const code = roomCode?.toUpperCase();
  const teams = meta?.teams || {};
  const teamCount = meta?.teamCount || 2;
  const mode = meta?.mode || 'individuel';
  const isTeamMode = mode === 'équipes';

  /**
   * Crée les équipes par défaut pour un nombre donné
   */
  const createTeamsForCount = useCallback((count) => {
    const newTeams = {};
    for (let i = 0; i < count; i++) {
      newTeams[`team${i + 1}`] = {
        name: `Équipe ${TEAM_NAMES[i]}`,
        color: TEAM_COLORS[i],
        score: 0
      };
    }
    return newTeams;
  }, []);

  /**
   * Toggle entre mode individuel et équipes
   */
  const handleModeToggle = useCallback(async () => {
    if (!isHost || !code) return;

    const newMode = mode === 'équipes' ? 'individuel' : 'équipes';

    if (newMode === 'équipes' && (!teams || Object.keys(teams).length === 0)) {
      // Passer en mode équipes - créer les équipes par défaut
      const count = teamCount || 2;
      const defaultTeams = createTeamsForCount(count);
      await update(ref(db, `${roomPrefix}/${code}/meta`), {
        mode: newMode,
        teams: defaultTeams,
        teamCount: count
      });
    } else if (newMode === 'individuel') {
      // Passer en mode individuel - retirer les joueurs des équipes
      const updates = {};
      players.forEach(p => {
        updates[`${roomPrefix}/${code}/players/${p.uid}/teamId`] = '';
      });
      updates[`${roomPrefix}/${code}/meta/mode`] = newMode;
      await update(ref(db), updates);
    } else {
      await update(ref(db, `${roomPrefix}/${code}/meta`), { mode: newMode });
    }
  }, [isHost, code, mode, teams, teamCount, players, roomPrefix, createTeamsForCount]);

  /**
   * Changer le nombre d'équipes (2, 3, ou 4)
   */
  const handleTeamCountChange = useCallback(async (count) => {
    if (!isHost || !code) return;

    const newTeams = createTeamsForCount(count);
    const validTeamIds = Object.keys(newTeams);

    // Reset les joueurs qui étaient dans des équipes supprimées
    const updates = {};
    players.forEach(p => {
      if (p.teamId && !validTeamIds.includes(p.teamId)) {
        updates[`${roomPrefix}/${code}/players/${p.uid}/teamId`] = '';
      }
    });

    updates[`${roomPrefix}/${code}/meta/teamCount`] = count;
    updates[`${roomPrefix}/${code}/meta/teams`] = newTeams;

    await update(ref(db), updates);
  }, [isHost, code, players, roomPrefix, createTeamsForCount]);

  /**
   * Assigner un joueur à une équipe
   */
  const handleAssignToTeam = useCallback(async (playerUid, teamId) => {
    if (!isHost || !code) return;
    await update(ref(db, `${roomPrefix}/${code}/players/${playerUid}`), { teamId });
  }, [isHost, code, roomPrefix]);

  /**
   * Retirer un joueur de son équipe
   */
  const handleRemoveFromTeam = useCallback(async (playerUid) => {
    if (!isHost || !code) return;
    await update(ref(db, `${roomPrefix}/${code}/players/${playerUid}`), { teamId: '' });
  }, [isHost, code, roomPrefix]);

  /**
   * Répartir automatiquement les joueurs dans les équipes
   */
  const handleAutoBalance = useCallback(async () => {
    if (!isHost || !code || !teams || Object.keys(teams).length === 0) return;

    const teamIds = Object.keys(teams).slice(0, teamCount);
    const updates = {};

    // Mélanger les joueurs
    const shuffledPlayers = [...players];
    for (let i = shuffledPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
    }

    // Assigner en round-robin
    shuffledPlayers.forEach((player, index) => {
      const teamIndex = index % teamIds.length;
      updates[`${roomPrefix}/${code}/players/${player.uid}/teamId`] = teamIds[teamIndex];
    });

    await update(ref(db), updates);
  }, [isHost, code, teams, teamCount, players, roomPrefix]);

  /**
   * Réinitialiser toutes les assignations d'équipe
   */
  const handleResetTeams = useCallback(async () => {
    if (!isHost || !code) return;

    const updates = {};
    players.forEach(p => {
      updates[`${roomPrefix}/${code}/players/${p.uid}/teamId`] = '';
    });

    await update(ref(db), updates);
  }, [isHost, code, players, roomPrefix]);

  /**
   * Réinitialiser les scores des équipes (utilisé au retour au lobby)
   */
  const resetTeamScores = useCallback(async () => {
    if (!code || !teams) return;

    const updates = {};
    Object.keys(teams).forEach(teamId => {
      updates[`${roomPrefix}/${code}/meta/teams/${teamId}/score`] = 0;
    });

    await update(ref(db), updates);
  }, [code, teams, roomPrefix]);

  return {
    // State
    mode,
    isTeamMode,
    teams,
    teamCount,

    // Actions
    handleModeToggle,
    handleTeamCountChange,
    handleAssignToTeam,
    handleRemoveFromTeam,
    handleAutoBalance,
    handleResetTeams,
    resetTeamScores,

    // Utils
    createTeamsForCount
  };
}

export default useTeamMode;
