/**
 * QA Test Scenarios — Configuration exhaustive par jeu
 *
 * Chaque scénario définit les phases, les actions Firebase pour simuler
 * chaque état de jeu, et les vérifications à effectuer.
 *
 * Utilisé par le QA_RUNBOOK.md comme référence pour l'exécution MCP.
 */

// ─── Helpers pour construire les updates Firebase ─────────────

/**
 * Génère un update Firebase via evaluate_script
 * Usage dans le runbook: evaluate_script avec ce template
 */
const FIREBASE_UPDATE_TEMPLATE = `
  // Accessible dans evaluate_script car Firebase est déjà chargé dans la page
  const { db, ref, update, set } = await import('/lib/firebase.js');
  // OU accéder via window.__firebase si exposé
`;

// ─── QUIZ ─────────────────────────────────────────────────────

const QUIZ = {
  id: 'quiz',
  name: 'Quiz Buzzer',
  url: '/dev/simulation/quiz',
  roomPrefix: 'rooms',
  color: '#8b5cf6',

  modes: {
    gamemaster: { supported: true, default: true },
    party: { supported: true },
    team: { supported: true },
  },

  phases: ['lobby', 'playing', 'ended'],

  scenarios: [
    // ── LOBBY ──
    {
      phase: 'lobby',
      name: 'Lobby initial',
      checks: {
        panels: true,
        interactive: true,
        phase: 'lobby',
        playerCount: 5,
        elements: {
          hostPanel: ['.lobby-header', '.lobby-main'],
          playerPanels: [],
        },
      },
    },

    // ── PLAYING: Question affichée, personne n'a buzzé ──
    {
      phase: 'playing',
      name: 'Question affichée — attente buzz',
      setup: {
        // L'host lance le jeu depuis le lobby (click Start)
        description: 'Lancer la partie depuis le host panel',
      },
      checks: {
        panels: true,
        interactive: true,
        phase: 'playing',
        elements: {
          hostPanel: ['.game-play-header, [class*="header"]'],
          playerPanels: [],
        },
      },
    },

    // ── PLAYING: Un joueur a buzzé (lockUid set) ──
    {
      phase: 'playing',
      name: 'Joueur a buzzé — lock actif',
      firebaseAction: {
        description: 'Simuler un buzz du joueur fake_p1',
        path: '{prefix}/{code}/state',
        update: {
          lockUid: 'fake_p1',
          lockedAt: 'Date.now()',
          buzzBanner: '🔔 Alice a buzzé !',
          pausedAt: 'Date.now()',
        },
      },
      checks: {
        interactive: true,
        custom: [
          { label: 'Buzz banner visible', type: 'textVisible', text: 'buzzé' },
          { label: 'Host voit les boutons validate/wrong', type: 'elementInPanel', panelIndex: 0, selector: 'button' },
        ],
      },
    },

    // ── PLAYING: Bonne réponse → score +points ──
    {
      phase: 'playing',
      name: 'Bonne réponse — score update',
      firebaseAction: {
        description: 'Valider la réponse (correct) — score +100, avancer index',
        updates: {
          '{prefix}/{code}/players/fake_p1/score': 100,
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
          '{prefix}/{code}/state/pausedAt': null,
          '{prefix}/{code}/state/lockedAt': null,
          '{prefix}/{code}/state/revealed': false,
          '{prefix}/{code}/state/currentIndex': 1,
          '{prefix}/{code}/state/elapsedAcc': 0,
        },
      },
      checks: {
        interactive: true,
        custom: [
          { label: 'Score mis à jour dans le leaderboard', type: 'textVisible', text: '100' },
          { label: 'Buzz banner disparue', type: 'textNotVisible', text: 'buzzé' },
        ],
      },
    },

    // ── PLAYING: Mauvaise réponse → pénalité ──
    {
      phase: 'playing',
      name: 'Mauvaise réponse — pénalité 8s',
      firebaseAction: {
        description: 'Mauvaise réponse — score -25, blockedUntil +8s',
        updates: {
          '{prefix}/{code}/players/fake_p1/score': 75,
          '{prefix}/{code}/players/fake_p1/blockedUntil': 'Date.now() + 8000',
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
          '{prefix}/{code}/state/pausedAt': null,
          '{prefix}/{code}/state/lockedAt': null,
        },
      },
      checks: {
        interactive: true,
        custom: [
          { label: 'Joueur pénalisé visible', type: 'textVisible', text: '75' },
        ],
      },
    },

    // ── PLAYING: Reveal question (afficher réponse) ──
    {
      phase: 'playing',
      name: 'Reveal question — réponse affichée',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { revealed: true },
      },
      checks: {
        interactive: true,
      },
    },

    // ── PLAYING: Skip question ──
    {
      phase: 'playing',
      name: 'Skip — passer à la question suivante',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/state/currentIndex': 2,
          '{prefix}/{code}/state/revealed': false,
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
          '{prefix}/{code}/state/elapsedAcc': 0,
        },
      },
      checks: {
        interactive: true,
      },
    },

    // ── ENDED ──
    {
      phase: 'ended',
      name: 'Fin de partie — scores finaux',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { phase: 'ended' },
      },
      checks: {
        panels: true,
        phase: 'ended',
        interactive: false, // End screen, pas d'actions critiques
      },
    },

    // ── RESET LOBBY ──
    {
      phase: 'lobby',
      name: 'Retour lobby — scores reset',
      setup: { description: 'Cliquer "↺ Lobby" dans les contrôles simulation' },
      checks: {
        phase: 'lobby',
        custom: [
          { label: 'Scores remis à 0', type: 'scoreReset' },
        ],
      },
    },
  ],
};

// ─── BLINDTEST ────────────────────────────────────────────────

const BLINDTEST = {
  id: 'blindtest',
  name: 'Blind Test',
  url: '/dev/simulation/blindtest',
  roomPrefix: 'rooms_blindtest',
  color: '#A238FF',

  modes: {
    gamemaster: { supported: true, default: true },
    party: { supported: true },
    team: { supported: true },
  },

  phases: ['lobby', 'playing', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },
    {
      phase: 'playing', name: 'Écoute snippet — attente buzz',
      checks: { panels: true, interactive: true, phase: 'playing' },
    },
    {
      phase: 'playing', name: 'Buzz joueur — lock',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { lockUid: 'fake_p1', lockedAt: 'Date.now()', buzzBanner: '🔔 Alice a buzzé !', pausedAt: 'Date.now()' },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Bonne réponse — reveal screen',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/players/fake_p1/score': 150,
          '{prefix}/{code}/state/revealed': true,
          '{prefix}/{code}/state/lockUid': null,
        },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Mauvaise réponse — pénalité + snippet suivant',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/players/fake_p1/score': 125,
          '{prefix}/{code}/players/fake_p1/blockedUntil': 'Date.now() + 8000',
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
          '{prefix}/{code}/state/snippetLevel': 1,
          '{prefix}/{code}/state/highestSnippetLevel': 1,
        },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Next track',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/state/currentIndex': 1,
          '{prefix}/{code}/state/revealed': false,
          '{prefix}/{code}/state/snippetLevel': 0,
          '{prefix}/{code}/state/highestSnippetLevel': -1,
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/elapsedAcc': 0,
        },
      },
      checks: { interactive: true },
    },
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── LA RÈGLE ─────────────────────────────────────────────────

const LAREGLE = {
  id: 'laregle',
  name: 'La Règle',
  url: '/dev/simulation/laregle',
  roomPrefix: 'rooms_laregle',
  color: '#06b6d4',

  modes: {
    gamemaster: { supported: true, default: true },
  },

  phases: ['lobby', 'choosing', 'playing', 'guessing', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },

    // ── CHOOSING: Vote sur les règles ──
    {
      phase: 'choosing', name: 'Phase de vote — 3 règles proposées',
      checks: { panels: true, interactive: true, phase: 'choosing' },
    },
    {
      phase: 'choosing', name: 'Vote soumis par un joueur',
      firebaseAction: {
        path: '{prefix}/{code}/state/votes/fake_p1',
        set: 'rule_1',
      },
      checks: { interactive: true },
    },
    {
      phase: 'choosing', name: 'Reveal — règle gagnante',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { revealPhase: 'revealing', winningRuleId: 'rule_1' },
      },
      checks: { interactive: true },
    },

    // ── PLAYING: Timer actif, règle en cours ──
    {
      phase: 'playing', name: 'Jeu en cours — timer + règle',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: {
          phase: 'playing',
          currentRule: { id: 'rule_1', text: 'Tout le monde doit parler en chuchotant', category: 'communication', difficulty: 'easy' },
          timerEndAt: 'Date.now() + 300000',
          revealPhase: null,
        },
      },
      checks: { panels: true, interactive: true, phase: 'playing' },
    },
    {
      phase: 'playing', name: 'Timer en pause',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { timerPaused: true, timeLeftWhenPaused: 240 },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Élimination d\'un joueur',
      firebaseAction: {
        path: '{prefix}/{code}/eliminations/fake_p2',
        set: { reportedBy: 'fake_p1', at: 'Date.now()' },
      },
      checks: { interactive: true },
    },

    // ── GUESSING: Enquêteur propose une réponse ──
    {
      phase: 'guessing', name: 'Enquêteur devine — vote des joueurs',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { phase: 'guessing', guessAttempts: 1, guessVotes: null },
      },
      checks: { panels: true, interactive: true, phase: 'guessing' },
    },
    {
      phase: 'guessing', name: 'Vote négatif — retour au jeu',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/state/guessVotes/fake_p1': false,
          '{prefix}/{code}/state/guessVotes/fake_p2': false,
          '{prefix}/{code}/state/guessVotes/fake_p3': false,
        },
      },
      checks: { interactive: true },
    },

    // ── ENDED ──
    {
      phase: 'ended', name: 'Enquêteurs gagnent',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { phase: 'ended', foundByInvestigators: true },
      },
      checks: { panels: true, phase: 'ended' },
    },
    {
      phase: 'ended', name: 'Civils gagnent (timeout)',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { phase: 'ended', foundByInvestigators: false },
      },
      checks: { panels: true, phase: 'ended' },
    },
  ],
};

// ─── ALIBI ────────────────────────────────────────────────────

const ALIBI = {
  id: 'alibi',
  name: 'Alibi',
  url: '/dev/simulation/alibi',
  roomPrefix: 'rooms_alibi',
  color: '#f59e0b',

  modes: {
    gamemaster: { supported: true, default: true },
    party: { supported: true },
  },

  phases: ['lobby', 'prep', 'interrogation', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },

    // ── PREP: Préparation des alibis ──
    { phase: 'prep', name: 'Phase prépa — timer 90s', checks: { panels: true, interactive: true, phase: 'prep' } },

    // ── INTERROGATION ──
    {
      phase: 'interrogation', name: 'Question posée — attente réponses',
      checks: { panels: true, interactive: true, phase: 'interrogation' },
    },
    {
      phase: 'interrogation', name: 'Réponse soumise par un suspect',
      firebaseAction: {
        path: '{prefix}/{code}/interrogation/responses/fake_p1',
        set: 'On était au cinéma à 20h',
      },
      checks: { interactive: true },
    },
    {
      phase: 'interrogation', name: 'Toutes les réponses soumises — verdict',
      firebaseAction: {
        path: '{prefix}/{code}/interrogation',
        update: { state: 'verdict', verdict: 'correct' },
      },
      checks: { interactive: true },
    },
    {
      phase: 'interrogation', name: 'Verdict incorrect',
      firebaseAction: {
        path: '{prefix}/{code}/interrogation',
        update: { state: 'verdict', verdict: 'incorrect' },
      },
      checks: { interactive: true },
    },

    // ── ENDED ──
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── MIME ──────────────────────────────────────────────────────

const MIME = {
  id: 'mime',
  name: 'Mime',
  url: '/dev/simulation/mime',
  roomPrefix: 'rooms_mime',
  color: '#059669',

  modes: {
    gamemaster: { supported: true, default: true },
  },

  phases: ['lobby', 'playing', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },

    // ── PLAYING ──
    { phase: 'playing', name: 'Mimeur actif — mot affiché', checks: { panels: true, interactive: true, phase: 'playing' } },
    {
      phase: 'playing', name: 'Buzz d\'un guesser',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { lockUid: 'fake_p2', lockedAt: 'Date.now()', buzzBanner: 'Bob' },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Bonne devinette — score mimeur + guesser',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/players/fake_p1/score': 50,
          '{prefix}/{code}/players/fake_p2/score': 100,
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
          '{prefix}/{code}/state/currentIndex': 1,
          '{prefix}/{code}/state/revealed': false,
        },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Mauvaise devinette — pénalité guesser',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/players/fake_p2/score': 75,
          '{prefix}/{code}/players/fake_p2/blockedUntil': 'Date.now() + 8000',
          '{prefix}/{code}/state/lockUid': null,
          '{prefix}/{code}/state/buzzBanner': '',
        },
      },
      checks: { interactive: true },
    },
    {
      phase: 'playing', name: 'Rotation mimeur — nouveau joueur mime',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { mimeIndex: 1, currentMimeUid: 'fake_p2', currentIndex: 2, revealed: false },
      },
      checks: { interactive: true },
    },

    // ── ENDED ──
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── LOL ──────────────────────────────────────────────────────

const LOL = {
  id: 'lol',
  name: 'LOL',
  url: '/dev/simulation/lol',
  roomPrefix: 'rooms_lol',
  color: '#EF4444',

  modes: {
    gamemaster: { supported: true, default: true },
  },

  phases: ['lobby', 'playing', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },
    { phase: 'playing', name: 'Jeu en cours — scènes', checks: { panels: true, interactive: true, phase: 'playing' } },
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── MINDLINK ─────────────────────────────────────────────────

const MINDLINK = {
  id: 'mindlink',
  name: 'Mind Link',
  url: '/dev/simulation/mindlink',
  roomPrefix: 'rooms_mindlink',
  color: '#a855f7',

  modes: {
    gamemaster: { supported: true, default: true },
  },

  phases: ['lobby', 'choosing', 'playing', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },
    { phase: 'choosing', name: 'Défenseurs choisissent un mot', checks: { panels: true, interactive: true, phase: 'choosing' } },
    { phase: 'playing', name: 'Attaquants envoient des indices', checks: { panels: true, interactive: true, phase: 'playing' } },
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── IMPOSTEUR ────────────────────────────────────────────────

const IMPOSTEUR = {
  id: 'imposteur',
  name: 'Imposteur',
  url: '/dev/simulation/imposteur',
  roomPrefix: 'rooms_imposteur',
  color: '#84cc16',

  modes: {
    gamemaster: { supported: true, default: true },
  },

  phases: ['lobby', 'roles', 'describing', 'discussion', 'voting', 'elimination', 'roundEnd', 'ended'],

  scenarios: [
    { phase: 'lobby', name: 'Lobby initial', checks: { panels: true, interactive: true, phase: 'lobby', playerCount: 5 } },

    // ── ROLES ──
    { phase: 'roles', name: 'Distribution des rôles', checks: { panels: true, interactive: true, phase: 'roles' } },
    {
      phase: 'roles', name: 'Joueur confirme avoir vu son rôle',
      firebaseAction: {
        path: '{prefix}/{code}/players/fake_p1',
        update: { hasSeenRole: true },
      },
      checks: { interactive: true },
    },

    // ── DESCRIBING ──
    { phase: 'describing', name: 'Tour d\'indices — joueur actif', checks: { panels: true, interactive: true, phase: 'describing' } },
    {
      phase: 'describing', name: 'Indice soumis',
      firebaseAction: {
        path: '{prefix}/{code}/descriptions/1/fake_p1',
        set: 'C\'est rouge',
      },
      checks: { interactive: true },
    },

    // ── DISCUSSION ──
    { phase: 'discussion', name: 'Phase de discussion', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'discussion' } }, checks: { panels: true, interactive: true, phase: 'discussion' } },

    // ── VOTING ──
    { phase: 'voting', name: 'Phase de vote', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'voting' } }, checks: { panels: true, interactive: true, phase: 'voting' } },
    {
      phase: 'voting', name: 'Vote soumis',
      firebaseAction: {
        path: '{prefix}/{code}/votes/1/fake_p1',
        set: 'fake_p3',
      },
      checks: { interactive: true },
    },

    // ── ELIMINATION ──
    {
      phase: 'elimination', name: 'Joueur éliminé — rôle révélé',
      firebaseAction: {
        updates: {
          '{prefix}/{code}/state/phase': 'elimination',
          '{prefix}/{code}/players/fake_p3/alive': false,
          '{prefix}/{code}/revealedRoles/fake_p3': { role: 'undercover', word: 'pomme' },
        },
      },
      checks: { panels: true, interactive: true, phase: 'elimination' },
    },

    // ── ROUND END ──
    {
      phase: 'roundEnd', name: 'Fin de round — civils gagnent',
      firebaseAction: {
        path: '{prefix}/{code}/state',
        update: { phase: 'roundEnd', winner: 'civilians', winReason: 'all_eliminated' },
      },
      checks: { panels: true, phase: 'roundEnd' },
    },

    // ── ENDED ──
    { phase: 'ended', name: 'Fin de partie', firebaseAction: { path: '{prefix}/{code}/state', update: { phase: 'ended' } }, checks: { panels: true, phase: 'ended' } },
  ],
};

// ─── EXPORT ───────────────────────────────────────────────────

const ALL_SCENARIOS = {
  quiz: QUIZ,
  blindtest: BLINDTEST,
  laregle: LAREGLE,
  alibi: ALIBI,
  mime: MIME,
  lol: LOL,
  mindlink: MINDLINK,
  imposteur: IMPOSTEUR,
};

// Stats
const totalScenarios = Object.values(ALL_SCENARIOS).reduce((sum, g) => sum + g.scenarios.length, 0);
const totalPhases = Object.values(ALL_SCENARIOS).reduce((sum, g) => sum + g.phases.length, 0);

/**
 * Résumé:
 * - 8 jeux
 * - ${totalPhases} phases uniques
 * - ${totalScenarios} scénarios de test
 * - 3 jeux avec Party Mode (quiz, blindtest, alibi)
 * - 2 jeux avec Team Mode (quiz, blindtest)
 */

export default ALL_SCENARIOS;
export { QUIZ, BLINDTEST, LAREGLE, ALIBI, MIME, LOL, MINDLINK, IMPOSTEUR };
