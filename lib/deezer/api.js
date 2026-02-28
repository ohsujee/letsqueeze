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
 * Get playlist tracks (single page)
 * @param {string} playlistId - Deezer playlist ID
 * @param {number} limit - Number of tracks (max 100 per request)
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
 * Get ALL playlist tracks with pagination
 * Fetches all tracks from a playlist, handling Deezer's 100-track limit per request
 * @param {string} playlistId - Deezer playlist ID
 * @returns {Promise<Array>}
 */
export async function getAllPlaylistTracks(playlistId) {
  const allTracks = [];
  let index = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const data = await deezerFetch(`/playlist/${playlistId}/tracks?limit=${limit}&index=${index}`);
    const tracks = data.data || [];

    if (tracks.length === 0) {
      hasMore = false;
    } else {
      const formatted = tracks
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

      allTracks.push(...formatted);
      index += limit;

      // Si on a reçu moins que la limite, c'est la dernière page
      if (tracks.length < limit) {
        hasMore = false;
      }
    }
  }

  return allTracks;
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
 * Get random tracks from a playlist, excluding already-played tracks
 * @param {string} playlistId - Deezer playlist ID
 * @param {number} count - Number of tracks to select
 * @param {number[]} excludeIds - Track IDs to exclude (already played)
 * @returns {Promise<Array>}
 */
export async function getRandomTracksFromPlaylist(playlistId, count = 20, excludeIds = []) {
  // Fetch ALL tracks from the playlist
  const allTracks = await getAllPlaylistTracks(playlistId);

  if (allTracks.length === 0) {
    throw new Error('Cette playlist est vide ou n\'a pas de previews disponibles.');
  }

  // Filter out already-played tracks
  const excludeSet = new Set(excludeIds.map(id => Number(id)));
  let availableTracks = allTracks.filter(t => !excludeSet.has(Number(t.id)));

  // If not enough unplayed tracks, use all tracks (reset behavior)
  if (availableTracks.length < count) {
    console.log(`[Deezer] Only ${availableTracks.length} unplayed tracks, using all ${allTracks.length} tracks`);
    availableTracks = allTracks;
  }

  if (availableTracks.length < 5) {
    throw new Error(`Seulement ${availableTracks.length} titres disponibles. Choisissez une playlist avec plus de contenu.`);
  }

  // Deduplicate by track ID before shuffle
  const seenIds = new Set();
  const uniqueTracks = availableTracks.filter(t => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  // Fisher-Yates shuffle
  const shuffled = [...uniqueTracks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get a single random unplayed track from a playlist
 * Used for shuffle functionality during game
 * @param {string} playlistId - Deezer playlist ID
 * @param {number[]} excludeIds - Track IDs to exclude (already played + currently loaded)
 * @returns {Promise<Object|null>} - Single track or null if none available
 */
export async function getRandomUnplayedTrack(playlistId, excludeIds = []) {
  const allTracks = await getAllPlaylistTracks(playlistId);

  if (allTracks.length === 0) {
    return null;
  }

  // Filter out excluded tracks
  const excludeSet = new Set(excludeIds.map(id => Number(id)));
  const availableTracks = allTracks.filter(t => !excludeSet.has(Number(t.id)));

  if (availableTracks.length === 0) {
    return null;
  }

  // Return a random unplayed track
  const randomIdx = Math.floor(Math.random() * availableTracks.length);
  return availableTracks[randomIdx];
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
  getAllPlaylistTracks,
  getChartTracks,
  getFeaturedPlaylists,
  getRandomTracksFromPlaylist,
  getRandomUnplayedTrack,
  formatTracksForGame,
};
