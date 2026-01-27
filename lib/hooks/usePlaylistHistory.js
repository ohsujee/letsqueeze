'use client';

import { useCallback } from 'react';
import { storage } from '@/lib/utils/storage';

const HISTORY_KEY = 'playlist_history';
const MAX_PLAYLISTS = 30;

/**
 * Hook pour gérer l'historique des tracks jouées par playlist
 * Permet d'éviter de rejouer les mêmes tracks lors de parties successives
 *
 * Stockage: localStorage via le wrapper storage (préfixé 'lq_')
 * Limite: 30 playlists max, les plus anciennes sont supprimées
 */
export function usePlaylistHistory() {

  /**
   * Récupérer l'historique complet
   */
  const getHistory = useCallback(() => {
    try {
      return storage.get(HISTORY_KEY) || {};
    } catch {
      return {};
    }
  }, []);

  /**
   * Récupérer les IDs des tracks déjà jouées pour une playlist
   * @param {string|number} playlistId
   * @returns {number[]} - Array des track IDs déjà joués
   */
  const getPlayedTracks = useCallback((playlistId) => {
    const history = getHistory();
    const key = String(playlistId);
    return history[key]?.trackIds || [];
  }, [getHistory]);

  /**
   * Marquer des tracks comme jouées pour une playlist
   * @param {string|number} playlistId
   * @param {number[]} trackIds - IDs des tracks à marquer
   */
  const markTracksAsPlayed = useCallback((playlistId, trackIds) => {
    try {
      const history = getHistory();
      const key = String(playlistId);

      // Récupérer ou créer l'entrée
      const existing = history[key] || { trackIds: [], lastPlayed: 0 };

      // Ajouter les nouveaux IDs (sans doublons)
      const newTrackIds = [...new Set([...existing.trackIds, ...trackIds])];

      history[key] = {
        trackIds: newTrackIds,
        lastPlayed: Date.now()
      };

      // Nettoyer si trop de playlists (garder les 30 plus récentes)
      const keys = Object.keys(history);
      if (keys.length > MAX_PLAYLISTS) {
        const sorted = keys.sort((a, b) =>
          (history[b].lastPlayed || 0) - (history[a].lastPlayed || 0)
        );
        const toRemove = sorted.slice(MAX_PLAYLISTS);
        toRemove.forEach(k => delete history[k]);
      }

      storage.set(HISTORY_KEY, history);
    } catch (e) {
      console.warn('[PlaylistHistory] Failed to save:', e);
    }
  }, [getHistory]);

  /**
   * Reset l'historique d'une playlist
   * @param {string|number} playlistId
   */
  const resetPlaylist = useCallback((playlistId) => {
    try {
      const history = getHistory();
      const key = String(playlistId);
      delete history[key];
      storage.set(HISTORY_KEY, history);
    } catch (e) {
      console.warn('[PlaylistHistory] Failed to reset:', e);
    }
  }, [getHistory]);

  /**
   * Filtrer les tracks pour exclure celles déjà jouées
   * Si toutes ont été jouées, reset l'historique et retourne toutes les tracks
   *
   * @param {string|number} playlistId
   * @param {Array} tracks - Tracks de la playlist [{id, ...}, ...]
   * @param {number} minRequired - Nombre minimum de tracks requises (default: 10)
   * @returns {Array} - Tracks filtrées
   */
  const filterUnplayedTracks = useCallback((playlistId, tracks, minRequired = 10) => {
    if (!tracks || tracks.length === 0) return tracks;

    const playedIds = getPlayedTracks(playlistId);
    const playedSet = new Set(playedIds);

    // Filtrer les tracks non jouées
    const unplayed = tracks.filter(t => !playedSet.has(t.id));

    // Si assez de tracks non jouées, les retourner
    if (unplayed.length >= minRequired) {
      return unplayed;
    }

    // Sinon, reset l'historique et retourner toutes les tracks
    console.log(`[PlaylistHistory] Only ${unplayed.length} unplayed tracks, resetting history`);
    resetPlaylist(playlistId);
    return tracks;
  }, [getPlayedTracks, resetPlaylist]);

  /**
   * Sélectionner des tracks aléatoires en évitant celles déjà jouées
   *
   * @param {string|number} playlistId
   * @param {Array} allTracks - Toutes les tracks de la playlist
   * @param {number} count - Nombre de tracks à sélectionner
   * @returns {Array} - Tracks sélectionnées (mélangées)
   */
  const selectRandomTracks = useCallback((playlistId, allTracks, count) => {
    if (!allTracks || allTracks.length === 0) return [];

    // Filtrer les tracks non jouées
    const available = filterUnplayedTracks(playlistId, allTracks, count);

    // Mélanger (Fisher-Yates)
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Retourner le nombre demandé
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [filterUnplayedTracks]);

  return {
    getPlayedTracks,
    markTracksAsPlayed,
    resetPlaylist,
    filterUnplayedTracks,
    selectRandomTracks
  };
}

export default usePlaylistHistory;
