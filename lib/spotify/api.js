/**
 * Spotify Web API
 * Fonctions pour interagir avec l'API Spotify
 */

import { getAccessToken } from './auth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Fait une requête authentifiée à l'API Spotify
 */
async function spotifyFetch(endpoint, options = {}) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Not authenticated with Spotify');
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Spotify session expired. Please reconnect.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Spotify API error: ${response.status}`);
  }

  // Certains endpoints ne retournent pas de JSON (204 No Content)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Récupère le profil de l'utilisateur connecté
 * @returns {Promise<{id: string, display_name: string, product: string, images: Array}>}
 */
export async function getCurrentUser() {
  return spotifyFetch('/me');
}

/**
 * Vérifie si l'utilisateur a un compte Premium
 * @returns {Promise<boolean>}
 */
export async function isPremiumUser() {
  const user = await getCurrentUser();
  return user.product === 'premium';
}

/**
 * Recherche des playlists
 * @param {string} query - Terme de recherche
 * @param {number} limit - Nombre de résultats (max 50)
 * @returns {Promise<Array<{id, name, images, owner, tracks}>>}
 */
export async function searchPlaylists(query, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'playlist',
    limit: limit.toString(),
  });

  const result = await spotifyFetch(`/search?${params}`);

  return result.playlists.items.map(playlist => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || null,
    owner: playlist.owner.display_name,
    totalTracks: playlist.tracks.total,
    uri: playlist.uri,
  }));
}

/**
 * Récupère les playlists de l'utilisateur
 * @param {number} limit - Nombre de résultats
 * @returns {Promise<Array>}
 */
export async function getUserPlaylists(limit = 50) {
  const result = await spotifyFetch(`/me/playlists?limit=${limit}`);

  return result.items.map(playlist => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || null,
    owner: playlist.owner.display_name,
    totalTracks: playlist.tracks.total,
    uri: playlist.uri,
    isOwner: playlist.owner.id === result.href?.split('/')[4],
  }));
}

/**
 * Récupère les tracks d'une playlist
 * @param {string} playlistId - ID de la playlist
 * @param {number} limit - Nombre de tracks à récupérer
 * @returns {Promise<Array<{id, name, artist, album, albumArt, duration, uri, previewUrl}>>}
 */
export async function getPlaylistTracks(playlistId, limit = 100) {
  const result = await spotifyFetch(`/playlists/${playlistId}/tracks?limit=${limit}`);

  return result.items
    .filter(item => item.track && !item.track.is_local) // Exclure les tracks locales
    .map(item => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map(a => a.name).join(', '),
      artistId: item.track.artists[0]?.id,
      album: item.track.album.name,
      albumArt: item.track.album.images?.[0]?.url || null,
      duration: item.track.duration_ms,
      uri: item.track.uri,
      previewUrl: item.track.preview_url,
      popularity: item.track.popularity,
    }));
}

/**
 * Récupère les détails d'une playlist
 * @param {string} playlistId
 */
export async function getPlaylist(playlistId) {
  const playlist = await spotifyFetch(`/playlists/${playlistId}`);

  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || null,
    owner: playlist.owner.display_name,
    totalTracks: playlist.tracks.total,
    uri: playlist.uri,
  };
}

/**
 * Récupère les playlists "Featured" de Spotify (populaires)
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getFeaturedPlaylists(limit = 20) {
  const result = await spotifyFetch(`/browse/featured-playlists?limit=${limit}&country=FR`);

  return result.playlists.items.map(playlist => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    image: playlist.images?.[0]?.url || null,
    owner: playlist.owner.display_name,
    totalTracks: playlist.tracks.total,
    uri: playlist.uri,
  }));
}

/**
 * Sélectionne aléatoirement N tracks d'une playlist
 * @param {string} playlistId
 * @param {number} count - Nombre de tracks à sélectionner
 * @returns {Promise<Array>}
 */
export async function getRandomTracksFromPlaylist(playlistId, count = 20) {
  const tracks = await getPlaylistTracks(playlistId, 100);

  // Filtrer les tracks sans preview URL si possible (mais garder quand même si pas assez)
  const tracksWithPreview = tracks.filter(t => t.previewUrl);
  const pool = tracksWithPreview.length >= count ? tracksWithPreview : tracks;

  // Mélanger et prendre N tracks
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default {
  getCurrentUser,
  isPremiumUser,
  searchPlaylists,
  getUserPlaylists,
  getPlaylistTracks,
  getPlaylist,
  getFeaturedPlaylists,
  getRandomTracksFromPlaylist,
};
