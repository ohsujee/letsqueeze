/**
 * La Loi - Rules Database
 * 110+ rules organized by category
 */

export type RuleCategory =
  | 'physical'      // Gestes, postures (nécessite présence physique ou vidéo)
  | 'visual'        // Regard, position (nécessite présence physique ou vidéo)
  | 'conversational'// Mots, phrases, timing (fonctionne en ligne)
  | 'relational'    // Interactions entre joueurs
  | 'troll';        // Règles décalées / chaos

export type RuleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Rule {
  id: string;
  text: string;
  description?: string;      // Description plus détaillée si nécessaire
  category: RuleCategory;
  difficulty: RuleDifficulty;
  onlineCompatible: boolean; // true = fonctionne sans vidéo (audio/texte)
  videoRequired: boolean;    // true = nécessite caméra
}

// Theme colors for the game
export const TROUVE_COLORS = {
  primary: '#06b6d4',    // Cyan
  light: '#22d3ee',      // Cyan light
  dark: '#0891b2',       // Cyan dark
  glow: 'rgba(6, 182, 212, 0.5)',
};

export const rules: Rule[] = [
  // ============================================
  // PHYSICAL RULES (P) - Gestes sur soi-même
  // ============================================
  { id: 'P1', text: 'Se toucher le nez avant de répondre', category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P2', text: "Se gratter l'oreille en répondant", category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P3', text: 'Garder les bras croisés pendant toute la conversation', category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P4', text: 'Les mains doivent rester visibles sur la table', category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P5', text: "Garder les mains collées l'une à l'autre", category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P6', text: 'Passer la main dans ses cheveux avant de répondre', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P7', text: 'Cligner exagérément des yeux pendant la réponse', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P8', text: 'Hausser les épaules à chaque réponse', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P9', text: 'Incliner la tête sur le côté en répondant', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P10', text: 'Changer de jambe croisée entre chaque réponse', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'P11', text: 'Montrer discrètement le nombre de mots de la réponse sur ses doigts', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'P12', text: 'Copier la posture de celui qui vient de répondre', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },

  // Gestes avec objets
  { id: 'P13', text: 'Tenir quelque chose en main pour répondre', category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P14', text: 'Prendre une gorgée (d\'eau) avant chaque réponse', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P15', text: 'Pointer vers un objet de la pièce en répondant', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P16', text: 'Tapoter la table avant de parler', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },

  // Gestes conditionnels
  { id: 'P17', text: 'Se toucher le menton seulement si la réponse est positive', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'P18', text: 'Cligner des yeux quand on ment', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'P19', text: 'Alterner: un coup bras croisés, un coup mains sur table', category: 'physical', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'P20', text: 'Faire un geste de magicien (vague de la main) après avoir répondu', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },

  // Gestes post-réponse (inspirés Joyca)
  { id: 'P21', text: 'Taper dans ses mains une fois après la réponse', category: 'physical', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'P22', text: 'Claquer des doigts après avoir parlé', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P23', text: 'Souffler comme si on était soulagé après chaque réponse', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P24', text: 'Lever le poing ou faire un "yes" après la réponse', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P25', text: 'Faire une petite révérence/inclinaison de tête après', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'P26', text: 'Joindre les mains (position prière) après avoir répondu', category: 'physical', difficulty: 'medium', onlineCompatible: false, videoRequired: true },

  // ============================================
  // VISUAL RULES (V) - Regard / Position
  // ============================================
  { id: 'V1', text: 'Après avoir répondu, regarder un autre joueur au hasard', category: 'visual', difficulty: 'easy', onlineCompatible: false, videoRequired: true },
  { id: 'V2', text: 'Éviter le contact visuel avec celui qui pose la question', category: 'visual', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'V3', text: 'Lever les yeux au ciel en réfléchissant', category: 'visual', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'V4', text: "Fixer ses mains pendant qu'on répond", category: 'visual', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'V5', text: 'Fixer celui qui répondra après soi', category: 'visual', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'V6', text: "Fixer l'enquêteur dans les yeux sans détourner le regard", category: 'visual', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'V7', text: "Se pencher vers l'enquêteur pour répondre", category: 'visual', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'V8', text: 'Bouger sur sa chaise après chaque réponse', category: 'visual', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'V9', text: 'Corps tourné vers le joueur à sa gauche', category: 'visual', difficulty: 'hard', onlineCompatible: false, videoRequired: true },

  // ============================================
  // CONVERSATIONAL RULES (C) - Lettres
  // ============================================
  { id: 'C1', text: 'Ne jamais utiliser la lettre R', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C2', text: 'Éviter la lettre E (très dur en français !)', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C3', text: 'Ne pas utiliser la lettre A', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C3b', text: 'Ne jamais prononcer la lettre T', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C4', text: 'Tous les mots de la réponse commencent par la même lettre', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C5', text: 'Enchaîner: la dernière lettre d\'un mot = première du suivant', category: 'conversational', difficulty: 'expert', onlineCompatible: true, videoRequired: false },

  // Mots
  { id: 'C6', text: 'Répondre en un seul mot', category: 'conversational', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'C7', text: 'Répondre en exactement 3 mots', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C8', text: 'Répondre en exactement 5 mots', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C9', text: 'Nombre de mots croissant: 1er joueur 1 mot, 2e joueur 2 mots, etc.', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C10', text: 'Glisser le mot "vraiment" dans chaque réponse', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C11', text: 'Ne jamais dire "oui" ou "non" directement', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C12', text: 'Toujours finir sa réponse par une question', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // Structure des phrases
  { id: 'C13', text: 'Commencer chaque réponse par "Eh bien"', category: 'conversational', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'C14', text: 'Terminer chaque phrase par "en fait"', category: 'conversational', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'C15', text: 'Répéter les premiers mots de la question avant de répondre', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C16', text: "Inclure le prénom de l'enquêteur dans la réponse", category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C17', text: 'Structure sujet-verbe-complément stricte, phrases très formelles', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C18', text: 'Parler de soi à la 3e personne ("Il pense que...")', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Timing
  { id: 'C19', text: 'Attendre 3 secondes avant de répondre', category: 'conversational', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'C20', text: 'Répondre immédiatement, sans temps de réflexion', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C21', text: 'Dire "Euh..." ou "Hmm..." avant chaque réponse', category: 'conversational', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'C22', text: 'Parler très lentement, articuler chaque mot', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C23', text: 'Parler très vite', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C24', text: 'Tempo alterné: un joueur lent, le suivant rapide', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Permission (inspirées Joyca)
  { id: 'C25', text: "Ne répondre QUE si l'enquêteur pointe vers toi avec sa main", category: 'conversational', difficulty: 'medium', onlineCompatible: false, videoRequired: true },
  { id: 'C26', text: "Interrompre l'enquêteur dès qu'il s'adresse à toi", category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C27', text: "Réponses dans l'ordre alphabétique (1ère commence par A, puis B...)", category: 'conversational', difficulty: 'expert', onlineCompatible: true, videoRequired: false },

  // Contenu
  { id: 'C28', text: 'Toujours mentir (répondre le contraire de la vérité)', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C29', text: 'Mentir sur ce qui est visible, vérité sur le reste', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C30', text: 'Vérité si la question fait +5 mots, mensonge sinon', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C31', text: 'Mentionner une couleur dans chaque réponse', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C32', text: 'Inclure un chiffre dans chaque réponse', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C33', text: 'Glisser un nom d\'animal dans la réponse', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Permission (plus)
  { id: 'C34', text: "Ne répondre que si l'enquêteur dit ton prénom dans sa question", category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C35', text: 'Ne parler que si l\'enquêteur dit "s\'il te plaît" ou "merci"', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C36', text: "Ne pas parler tant que l'enquêteur ne te touche pas", category: 'conversational', difficulty: 'hard', onlineCompatible: false, videoRequired: true },
  { id: 'C37', text: 'Répondre uniquement dans l\'ordre du cercle, jamais hors tour', category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // Interruption
  { id: 'C38', text: "Finir la phrase de l'enquêteur avant qu'il termine", category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C39', text: "Répéter/reformuler la question de l'enquêteur avant de répondre", category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'C40', text: "Commencer à répondre pendant que l'enquêteur parle encore", category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C41', text: "Attendre 5 secondes de silence total après la question", category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // Alphabétique (plus)
  { id: 'C42', text: 'Réponses commencent par Z, puis Y, X... (alphabet inversé)', category: 'conversational', difficulty: 'expert', onlineCompatible: true, videoRequired: false },
  { id: 'C43', text: 'Commencer par la même lettre que la dernière réponse', category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C44', text: "Commencer par la lettre après celle du joueur précédent", category: 'conversational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'C45', text: "Commencer par l'initiale de son propre prénom", category: 'conversational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // ============================================
  // RELATIONAL RULES (R) - Entre joueurs
  // ============================================
  { id: 'R1', text: 'Répondre comme si tu étais ton voisin de droite', description: 'Complexe - pour groupes expérimentés', category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R2', text: 'Répondre comme si tu étais ton voisin de gauche', description: 'Complexe - pour groupes expérimentés', category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R3', text: "Répondre comme si tu étais le joueur d'en face", description: 'Complexe - pour groupes expérimentés', category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R4', text: 'Répondre comme si tu étais le dernier qui a parlé', description: 'Complexe - pour groupes expérimentés', category: 'relational', difficulty: 'expert', onlineCompatible: true, videoRequired: false },

  // Coordination
  { id: 'R5', text: 'Tout le monde doit donner la même réponse', category: 'relational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'R6', text: 'Si le précédent a dit oui, je dis non (alterner)', category: 'relational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'R7', text: "Continuer/compléter la phrase de celui qui vient de parler", category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R8', text: "Toujours contredire le joueur précédent", category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R9', text: "Copier le ton/émotion du voisin (joyeux, triste, énervé)", category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Ordre de parole
  { id: 'R10', text: 'Seul celui dont c\'est le "tour" alphabétique peut répondre', category: 'relational', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'R11', text: "Le plus jeune répond en premier, puis par âge croissant", category: 'relational', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'R12', text: 'Seuls ceux qui portent du bleu peuvent parler', category: 'relational', difficulty: 'hard', onlineCompatible: false, videoRequired: true },

  // ============================================
  // TROLL RULES (T) - Décalées / Chaos
  // ============================================
  // Pas de règle
  { id: 'T1', text: 'Il n\'y a pas de règle (les joueurs répondent normalement)', description: 'Les enquêteurs cherchent un pattern inexistant', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T2', text: 'La règle c\'est qu\'il n\'y a pas de règle', description: 'Formulé différemment pour le mind-fuck', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T3', text: 'Faire semblant de suivre une règle (gestes aléatoires)', description: 'Les enquêteurs pensent avoir trouvé quelque chose', category: 'troll', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Meta
  { id: 'T4', text: 'Répéter exactement la question posée comme réponse', category: 'troll', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'T5', text: 'Dire "la règle c\'est..." suivi d\'une fausse règle', category: 'troll', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'T6', text: 'Dire le contraire de la règle ("je dois pas commencer par oui")', description: 'Indice évident mais confusant', category: 'troll', difficulty: 'hard', onlineCompatible: true, videoRequired: false },

  // Piège
  { id: 'T7', text: 'Ne répondre que si la question contient "s\'il te plaît"', description: 'Les joueurs restent muets longtemps', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T8', text: 'Ne jamais répondre à un enquêteur spécifique (l\'ignorer)', category: 'troll', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'T9', text: 'Toujours répondre à la question PRÉCÉDENTE, pas l\'actuelle', category: 'troll', difficulty: 'hard', onlineCompatible: true, videoRequired: false },
  { id: 'T10', text: '"Oui" veut dire non, "Non" veut dire oui', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // Absurdes
  { id: 'T11', text: 'Inclure un bruit d\'animal dans chaque réponse', category: 'troll', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'T12', text: 'Répondre en chantant', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T13', text: 'Prendre un accent étranger (italien, allemand, etc.)', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T14', text: 'Parler comme un robot (voix monotone, phrases hachées)', category: 'troll', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'T15', text: 'Répondre de façon ULTRA dramatique', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },
  { id: 'T16', text: 'Toujours répondre en chuchotant', category: 'troll', difficulty: 'easy', onlineCompatible: true, videoRequired: false },
  { id: 'T17', text: 'TOUJOURS RÉPONDRE EN CRIANT', category: 'troll', difficulty: 'medium', onlineCompatible: true, videoRequired: false },

  // Surprise
  { id: 'T18', text: 'Un seul joueur a la vraie règle, les autres non', description: 'Double confusion', category: 'troll', difficulty: 'expert', onlineCompatible: true, videoRequired: false },
  { id: 'T19', text: 'La règle change toutes les 2 minutes', description: 'Impossible à trouver', category: 'troll', difficulty: 'expert', onlineCompatible: true, videoRequired: false },
  { id: 'T20', text: 'Les joueurs inventent la règle au fur et à mesure', description: 'Pur chaos créatif', category: 'troll', difficulty: 'expert', onlineCompatible: true, videoRequired: false },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get rules filtered by category
 */
export function getRulesByCategory(category: RuleCategory): Rule[] {
  return rules.filter(r => r.category === category);
}

/**
 * Get rules filtered by difficulty
 */
export function getRulesByDifficulty(difficulty: RuleDifficulty): Rule[] {
  return rules.filter(r => r.difficulty === difficulty);
}

/**
 * Get rules compatible with online play (no video required)
 */
export function getOnlineCompatibleRules(): Rule[] {
  return rules.filter(r => r.onlineCompatible);
}

/**
 * Get rules that require video
 */
export function getVideoRequiredRules(): Rule[] {
  return rules.filter(r => r.videoRequired);
}

/**
 * Get random rules for voting (3 options)
 * @param options - Filter options
 */
export function getRandomRulesForVoting(options?: {
  onlineOnly?: boolean;
  categories?: RuleCategory[];
  maxDifficulty?: RuleDifficulty;
  excludeIds?: string[];
}): Rule[] {
  let pool = [...rules];

  // Filter by online compatibility
  if (options?.onlineOnly) {
    pool = pool.filter(r => r.onlineCompatible);
  }

  // Filter by categories
  if (options?.categories && options.categories.length > 0) {
    pool = pool.filter(r => options.categories!.includes(r.category));
  }

  // Filter by max difficulty
  if (options?.maxDifficulty) {
    const difficultyOrder: RuleDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    const maxIndex = difficultyOrder.indexOf(options.maxDifficulty);
    pool = pool.filter(r => difficultyOrder.indexOf(r.difficulty) <= maxIndex);
  }

  // Exclude specific IDs (already played)
  if (options?.excludeIds && options.excludeIds.length > 0) {
    pool = pool.filter(r => !options.excludeIds!.includes(r.id));
  }

  // Shuffle and return 3
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): Rule | undefined {
  return rules.find(r => r.id === id);
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: RuleCategory): string {
  const names: Record<RuleCategory, string> = {
    physical: 'Physique',
    visual: 'Visuel',
    conversational: 'Conversationnel',
    relational: 'Relationnel',
    troll: 'Décalé',
  };
  return names[category];
}

/**
 * Get difficulty display info
 */
export function getDifficultyInfo(difficulty: RuleDifficulty): { label: string; stars: number; color: string } {
  const info: Record<RuleDifficulty, { label: string; stars: number; color: string }> = {
    easy: { label: 'Facile', stars: 1, color: '#22c55e' },
    medium: { label: 'Moyen', stars: 2, color: '#eab308' },
    hard: { label: 'Difficile', stars: 3, color: '#f97316' },
    expert: { label: 'Expert', stars: 4, color: '#ef4444' },
  };
  return info[difficulty];
}

export default rules;
