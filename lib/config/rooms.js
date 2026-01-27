/**
 * Room Types Configuration
 *
 * Centralized configuration for all game room types.
 * Add new games here and they'll automatically work with join/create.
 */

/**
 * Game Master Modes (Quiz, BlindTest, DeezTest)
 *
 * - "gamemaster": Le créateur anime le jeu mais ne joue pas (mode actuel)
 * - "party": Tous les joueurs jouent, chacun pose une question à tour de rôle
 *
 * En mode "party", la rotation est gérée par:
 * - state.currentAskerUid: UID du joueur qui pose la question
 * - state.currentAskerTeamId: En mode équipes, l'équipe qui pose
 * - state.askerRotation: Ordre pré-calculé au lancement
 * - state.askerIndex: Position dans la rotation
 */
export const GAME_MASTER_MODES = {
  GAME_MASTER: 'gamemaster',
  PARTY: 'party'
};

export const ROOM_TYPES = [
  {
    id: 'quiz',
    prefix: 'rooms',
    path: '/room',
    supportsPartyMode: true, // Ce jeu supporte le mode Party
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
    supportsPartyMode: true, // Ce jeu supporte le mode Party
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
    supportsPartyMode: true, // Ce jeu supporte le mode Party
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
