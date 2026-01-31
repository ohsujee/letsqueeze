/**
 * Room Types Configuration
 *
 * Centralized configuration for all game room types.
 * Add new games here and they'll automatically work with join/create.
 */

/**
 * Game Master Modes (Quiz, BlindTest, DeezTest, Alibi)
 *
 * - "gamemaster": Le créateur anime le jeu mais ne joue pas (mode actuel)
 * - "party": Tous les joueurs jouent, chacun pose une question à tour de rôle
 *
 * En mode "party", la rotation est gérée par:
 * - state.currentAskerUid: UID du joueur qui pose la question
 * - state.currentAskerTeamId: En mode équipes, l'équipe qui pose
 * - state.askerRotation: Ordre pré-calculé au lancement
 * - state.askerIndex: Position dans la rotation
 *
 * Pour Alibi Party Mode spécifiquement:
 * - state.inspectorGroupId: Groupe qui pose la question
 * - state.accusedGroupId: Groupe qui répond
 * - state.roundRotation: Séquence des rounds [{inspector, accused}, ...]
 * - state.currentRound: Index du round actuel
 */
export const GAME_MASTER_MODES = {
  GAME_MASTER: 'gamemaster',
  PARTY: 'party'
};

/**
 * Alibi Party Mode - Configuration des groupes
 */
export const ALIBI_GROUP_CONFIG = {
  MIN_GROUPS: 2,
  MAX_GROUPS: 4,
  MIN_PLAYERS_PER_GROUP: 2,
  DEFAULT_NAMES: ['Équipe 1', 'Équipe 2', 'Équipe 3', 'Équipe 4'],
  COLORS: ['#FF2D55', '#00D4FF', '#50C832', '#FFB800'],
  QUESTIONS_PER_GROUP: {
    2: 10,  // 2 groupes = 10 questions chacun
    3: 8,   // 3 groupes = 8 questions chacun
    4: 8    // 4 groupes = 8 questions chacun
  }
};

export const ROOM_TYPES = [
  {
    id: 'quiz',
    prefix: 'rooms',
    path: '/room',
    supportsPartyMode: true,
    navigateBeforeCreate: true, // Navigate immediately, create in background
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    }),
    createMeta: ({ code, now, hostUid, hostName, gameMasterMode }) => ({
      code,
      createdAt: now,
      hostUid,
      hostName,
      expiresAt: now + 12 * 60 * 60 * 1000,
      mode: "individuel",
      teamCount: 0,
      quizId: "general",
      teams: {},
      gameMasterMode
    }),
    createState: () => ({
      phase: "lobby",
      currentIndex: 0,
      revealed: false,
      lockUid: null,
      buzzBanner: "",
      lastRevealAt: 0
    }),
    createExtra: ({ code, now }) => ({
      [`__health__`]: { aliveAt: now }
    })
  },
  {
    id: 'blindtest',
    prefix: 'rooms_blindtest',
    path: '/blindtest/room',
    supportsPartyMode: true,
    navigateBeforeCreate: true,
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    }),
    createMeta: ({ code, now, hostUid, hostName, gameMasterMode }) => ({
      code,
      createdAt: now,
      hostUid,
      hostName,
      expiresAt: now + 12 * 60 * 60 * 1000,
      mode: "individuel",
      teamCount: 0,
      teams: {},
      spotifyConnected: false,
      playlist: null,
      playlistsUsed: 0,
      gameType: "blindtest",
      gameMasterMode
    }),
    createState: () => ({
      phase: "lobby",
      currentIndex: 0,
      revealed: false,
      snippetLevel: 0,
      lockUid: null,
      buzzBanner: "",
      lastRevealAt: 0,
      elapsedAcc: 0,
      pausedAt: null,
      lockedAt: null
    })
  },
  {
    id: 'deeztest',
    prefix: 'rooms_deeztest',
    path: '/deeztest/room',
    supportsPartyMode: true,
    navigateBeforeCreate: false, // Wait for creation before navigating
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      teamId: "",
      blockedUntil: 0,
      joinedAt: Date.now()
    }),
    createMeta: ({ code, now, hostUid, hostName, gameMasterMode }) => ({
      code,
      createdAt: now,
      hostUid,
      hostName,
      expiresAt: now + 12 * 60 * 60 * 1000,
      mode: "individuel",
      teamCount: 0,
      teams: {},
      playlist: null,
      playlistsUsed: 0,
      gameType: "deeztest",
      gameMasterMode
    }),
    createState: () => ({
      phase: "lobby",
      currentIndex: 0,
      revealed: false,
      snippetLevel: 0,
      lockUid: null,
      buzzBanner: "",
      lastRevealAt: 0,
      elapsedAcc: 0,
      pausedAt: null,
      lockedAt: null
    })
  },
  {
    id: 'alibi',
    prefix: 'rooms_alibi',
    path: '/alibi/room',
    supportsPartyMode: true,
    navigateBeforeCreate: true,
    playerSchema: (uid, name, options = {}) => ({
      uid,
      name,
      team: options.team || null,      // Game Master mode: 'inspectors' | 'suspects'
      groupId: options.groupId || null, // Party mode: 'group1' | 'group2' | etc.
      joinedAt: Date.now()
    }),
    createMeta: ({ code, now, hostUid, hostName, gameMasterMode }) => ({
      code,
      createdAt: now,
      hostUid,
      hostName,
      expiresAt: now + 12 * 60 * 60 * 1000,
      alibiId: null,              // Game Master mode: single alibi ID
      gameType: "alibi",
      gameMasterMode: gameMasterMode || 'gamemaster',
      groupCount: gameMasterMode === 'party' ? 2 : null  // Party mode: 2-4 groups
    }),
    createState: ({ gameMasterMode }) => ({
      phase: "lobby",
      currentQuestion: 0,
      prepTimeLeft: 90,
      questionTimeLeft: 30,
      allAnswered: false,
      // Party mode specific (initialized at game start)
      ...(gameMasterMode === 'party' ? {
        currentRound: 0,
        totalRounds: 0,
        inspectorGroupId: null,
        accusedGroupId: null,
        roundRotation: []
      } : {})
    }),
    createExtra: ({ gameMasterMode }) => {
      if (gameMasterMode === 'party') {
        // Party mode: groups instead of teams
        return {
          groups: {},  // Populated when groups are configured in lobby
          // No global score - each group has its own score
        };
      }
      // Game Master mode: original structure
      return {
        teams: { inspectors: [], suspects: [] },
        score: { correct: 0, total: 10 }
      };
    }
  },
  {
    id: 'laloi',
    prefix: 'rooms_laloi',
    path: '/laloi/room',
    navigateBeforeCreate: false,
    playerSchema: (uid, name) => ({
      uid,
      name,
      score: 0,
      role: 'player',
      joinedAt: Date.now()
    }),
    createMeta: ({ code, now, hostUid }) => ({
      code,
      createdAt: now,
      hostUid,
      expiresAt: now + 12 * 60 * 60 * 1000,
      gameType: "laloi",
      mode: "classic",
      timerDuration: 300,
      investigatorCount: 1
    }),
    createState: () => ({
      phase: "lobby",
      investigatorUids: [],
      currentRule: null,
      ruleOptions: [],
      votes: {},
      rerollsUsed: 0,
      guessAttempts: 0,
      guesses: [],
      roundNumber: 1,
      playedRuleIds: []
    })
  }
];

/**
 * Get room type config by game ID
 */
export function getRoomType(gameId) {
  return ROOM_TYPES.find(rt => rt.id === gameId);
}

/**
 * Create a room for a game
 * @param {Object} params
 * @param {string} params.gameId - Game ID (quiz, blindtest, etc.)
 * @param {string} params.code - Room code
 * @param {string} params.hostUid - Host user ID
 * @param {string} params.hostName - Host display name
 * @param {string} params.gameMasterMode - 'gamemaster' or 'party'
 * @param {Object} params.db - Firebase database instance
 * @param {Function} params.ref - Firebase ref function
 * @param {Function} params.set - Firebase set function
 * @returns {Promise<{path: string, navigateBeforeCreate: boolean}>}
 */
export async function createRoom({ gameId, code, hostUid, hostName, gameMasterMode = 'gamemaster', db, ref, set }) {
  const roomType = getRoomType(gameId);
  if (!roomType) {
    throw new Error(`Unknown game type: ${gameId}`);
  }

  const now = Date.now();
  const prefix = roomType.prefix;
  const params = { code, now, hostUid, hostName, gameMasterMode };

  // Build writes array
  // Pass params to createState for games that need gameMasterMode (like Alibi)
  const stateData = roomType.createState(params);
  const writes = [
    set(ref(db, `${prefix}/${code}/meta`), roomType.createMeta(params)),
    set(ref(db, `${prefix}/${code}/state`), stateData)
  ];

  // Add extra data if defined (teams, score, health, etc.)
  if (roomType.createExtra) {
    const extra = roomType.createExtra(params);
    for (const [key, value] of Object.entries(extra)) {
      writes.push(set(ref(db, `${prefix}/${code}/${key}`), value));
    }
  }

  // Execute all writes
  const writePromise = Promise.all(writes);

  // Return info for navigation
  return {
    path: `${roomType.path}/${code}`,
    navigateBeforeCreate: roomType.navigateBeforeCreate,
    writePromise
  };
}
