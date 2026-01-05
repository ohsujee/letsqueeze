/**
 * Deezer Public API (via server-side proxy)
 *
 * No authentication required - completely public API
 * All tracks have 30-second previews available
 *
 * Uses /api/deezer proxy to avoid CORS issues
 */

/**
 * Helper to call Deezer API via proxy
 * @param {string} endpoint - Deezer API endpoint (e.g., /search?q=...)
 * @returns {Promise<Object>}
 */
async function deezerFetch(endpoint) {
  const response = await fetch(`/api/deezer?endpoint=${encodeURIComponent(endpoint)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Deezer API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Search for tracks
 * @param {string} query - Search query
 * @param {number} limit - Number of results (max 100)
 * @returns {Promise<Array>}
 */
export async function searchTracks(query, limit = 25) {
  const data = await deezerFetch(`/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return data.data || [];
}

/**
 * Search for playlists
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
export async function searchPlaylists(query, limit = 25) {
  const data = await deezerFetch(`/search/playlist?q=${encodeURIComponent(query)}&limit=${limit}`);

  return (data.data || []).map(playlist => ({
    id: playlist.id,
    name: playlist.title,
    image: playlist.picture_medium || playlist.picture,
    totalTracks: playlist.nb_tracks,
    creator: playlist.user?.name || 'Deezer',
  }));
}

/**
 * Get playlist details
 * @param {string} playlistId - Deezer playlist ID
 * @returns {Promise<Object>}
 */
export async function getPlaylist(playlistId) {
  const data = await deezerFetch(`/playlist/${playlistId}`);

  return {
    id: data.id,
    name: data.title,
    description: data.description,
    image: data.picture_medium || data.picture_big || data.picture,
    totalTracks: data.nb_tracks,
    creator: data.creator?.name || 'Deezer',
  };
}

/**
 * Get playlist tracks
 * @param {string} playlistId - Deezer playlist ID
 * @param {number} limit - Number of tracks (max 100)
 * @returns {Promise<Array>}
 */
export async function getPlaylistTracks(playlistId, limit = 100) {
  const data = await deezerFetch(`/playlist/${playlistId}/tracks?limit=${limit}`);

  return (data.data || [])
    .filter(track => track.preview) // Only tracks with previews
    .map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      albumArt: track.album?.cover_medium || track.album?.cover,
      previewUrl: track.preview,
      duration: track.duration * 1000, // Convert to ms
    }));
}

/**
 * Get chart/popular tracks
 * @param {number} limit - Number of tracks
 * @returns {Promise<Array>}
 */
export async function getChartTracks(limit = 50) {
  const data = await deezerFetch(`/chart/0/tracks?limit=${limit}`);

  return (data.data || [])
    .filter(track => track.preview)
    .map(track => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || 'Unknown',
      album: track.album?.title || '',
      albumArt: track.album?.cover_medium || track.album?.cover,
      previewUrl: track.preview,
      duration: track.duration * 1000,
    }));
}

/**
 * Get editorial/featured playlists
 * @param {number} limit - Number of playlists
 * @returns {Promise<Array>}
 */
export async function getFeaturedPlaylists(limit = 20) {
  const data = await deezerFetch(`/chart/0/playlists?limit=${limit}`);

  return (data.data || []).map(playlist => ({
    id: playlist.id,
    name: playlist.title,
    image: playlist.picture_medium || playlist.picture,
    totalTracks: playlist.nb_tracks,
    creator: playlist.user?.name || 'Deezer',
  }));
}

/**
 * Get random tracks from a playlist
 * @param {string} playlistId - Deezer playlist ID
 * @param {number} count - Number of tracks to select
 * @returns {Promise<Array>}
 */
export async function getRandomTracksFromPlaylist(playlistId, count = 20) {
  const tracks = await getPlaylistTracks(playlistId, 100);

  if (tracks.length === 0) {
    throw new Error('Cette playlist est vide ou n\'a pas de previews disponibles.');
  }

  if (tracks.length < 5) {
    throw new Error(`Seulement ${tracks.length} titres disponibles. Choisissez une playlist avec plus de contenu.`);
  }

  // Shuffle and select
  const shuffled = [...tracks].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Format tracks for blind test game
 * @param {Array} tracks - Tracks from API
 * @returns {Array}
 */
export function formatTracksForGame(tracks) {
  return tracks.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArt: track.albumArt,
    previewUrl: track.previewUrl,
    duration: track.duration,
  }));
}

export default {
  searchTracks,
  searchPlaylists,
  getPlaylist,
  getPlaylistTracks,
  getChartTracks,
  getFeaturedPlaylists,
  getRandomTracksFromPlaylist,
  formatTracksForGame,
};
