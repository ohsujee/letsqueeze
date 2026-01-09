/**
 * Room Types Configuration
 *
 * Centralized configuration for all game room types.
 * Add new games here and they'll automatically work with join/create.
 */

export const ROOM_TYPES = [
  {
    id: 'quiz',
    prefix: 'rooms',
    path: '/room',
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    })
  },
  {
    id: 'blindtest',
    prefix: 'rooms_blindtest',
    path: '/blindtest/room',
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    })
  },
  {
    id: 'deeztest',
    prefix: 'rooms_deeztest',
    path: '/deeztest/room',
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    })
  },
  {
    id: 'alibi',
    prefix: 'rooms_alibi',
    path: '/alibi/room',
    playerSchema: (uid, name) => ({
      uid,
      name,
      team: null,
      joinedAt: Date.now()
    })
  },
  {
    id: 'trouveregle',
    prefix: 'rooms_trouveregle',
    path: '/trouveregle/room',
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      role: 'player', // 'player' | 'investigator'
      joinedAt: Date.now()
    })
  }
];
