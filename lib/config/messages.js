/**
 * Centralized Messages Configuration
 *
 * All user-facing messages in one place for consistency and easy updates.
 * Useful for future i18n support.
 *
 * Usage:
 *   import { MESSAGES } from '@/lib/config/messages';
 *   showToast(MESSAGES.auth.loginSuccess);
 */

export const MESSAGES = {
  // ============================================
  // AUTHENTICATION
  // ============================================
  auth: {
    loginSuccess: 'Connexion réussie !',
    loginError: 'Erreur de connexion',
    logoutSuccess: 'Déconnexion réussie',
    accountCreated: 'Compte créé avec succès !',
    accountLinked: 'Compte lié avec succès !',

    // Buttons
    continueWithGoogle: 'Continuer avec Google',
    continueWithApple: 'Continuer avec Apple',
    continueAsGuest: 'Jouer sans compte',
    signOut: 'Déconnexion',
    createAccount: 'Créer un compte',

    // Errors
    googleError: 'Erreur de connexion Google',
    appleError: 'Erreur de connexion Apple',
    sessionExpired: 'Session expirée, veuillez vous reconnecter',
  },

  // ============================================
  // GAME - GENERAL
  // ============================================
  game: {
    waitingPlayers: 'En attente de joueurs...',
    waitingHost: "En attente de l'hôte...",
    hostLeft: "L'hôte a quitté la partie",
    connectionLost: 'Connexion perdue',
    reconnecting: 'Reconnexion...',
    reconnected: 'Reconnecté !',
    gameStarting: 'La partie commence !',
    gameEnded: 'Partie terminée',
    nextQuestion: 'Question suivante...',
    preparingGame: 'Préparation de la partie...',

    // Actions
    startGame: 'Lancer la partie',
    nextRound: 'Manche suivante',
    showResults: 'Voir les résultats',
    playAgain: 'Rejouer',
    backToLobby: 'Retour au lobby',
    backToHome: "Retour à l'accueil",
  },

  // ============================================
  // ROOM
  // ============================================
  room: {
    invalidCode: 'Code invalide ! Aucune partie trouvée avec ce code.',
    gameAlreadyStarted: 'La partie a déjà commencé',
    roomClosed: 'La room a été fermée',
    roomFull: 'La room est pleine',
    joinSuccess: 'Vous avez rejoint la partie !',
    kicked: 'Vous avez été exclu de la partie',
    codeGenerated: 'Code de la room :',
    shareRoom: 'Partager la room',
    copyCode: 'Copier le code',
    codeCopied: 'Code copié !',

    // Player actions
    playerJoined: 'a rejoint la partie',
    playerLeft: 'a quitté la partie',
    playerDisconnected: 's\'est déconnecté',
    playerReconnected: 's\'est reconnecté',
  },

  // ============================================
  // VALIDATION
  // ============================================
  validation: {
    pseudoTooShort: 'Le pseudo doit faire au moins 2 caractères',
    pseudoTooLong: 'Le pseudo ne peut pas dépasser 16 caractères',
    pseudoInvalid: 'Le pseudo contient des caractères invalides',
    pseudoRequired: 'Veuillez entrer un pseudo',
    codeRequired: 'Veuillez entrer un code',
    codeInvalid: 'Le code doit contenir 6 caractères',
    teamNameRequired: 'Veuillez nommer votre équipe',
  },

  // ============================================
  // EXIT / LEAVE
  // ============================================
  exit: {
    confirmLeave: 'Voulez-vous vraiment quitter ?',
    confirmLeaveGame: 'Quitter la partie ?',
    confirmLeaveAsHost: 'En tant qu\'hôte, quitter fermera la partie pour tous les joueurs. Continuer ?',
    leaveWarning: 'Votre progression sera perdue',
    stay: 'Rester',
    leave: 'Quitter',
  },

  // ============================================
  // SUBSCRIPTION
  // ============================================
  subscription: {
    upgradeToPro: 'Passer Pro',
    alreadyPro: 'Vous êtes déjà Pro !',
    proFeature: 'Fonctionnalité Pro',
    unlockWithPro: 'Débloquez avec Pro',
    freeTrialEnded: 'Votre essai gratuit est terminé',
    limitReached: 'Limite atteinte',
    watchAdForGame: 'Regarder une pub pour une partie',
    adsRemaining: 'pubs restantes',
  },

  // ============================================
  // ERRORS
  // ============================================
  errors: {
    generic: 'Une erreur est survenue',
    network: 'Erreur de connexion réseau',
    serverError: 'Erreur serveur, veuillez réessayer',
    notFound: 'Page non trouvée',
    unauthorized: 'Accès non autorisé',
    timeout: 'La requête a expiré',
    tryAgain: 'Veuillez réessayer',
    contactSupport: 'Si le problème persiste, contactez le support',
  },

  // ============================================
  // LOADING
  // ============================================
  loading: {
    default: 'Chargement...',
    connecting: 'Connexion...',
    saving: 'Sauvegarde...',
    processing: 'Traitement...',
    preparing: 'Préparation...',
  },

  // ============================================
  // SUCCESS
  // ============================================
  success: {
    saved: 'Sauvegardé !',
    updated: 'Mis à jour !',
    deleted: 'Supprimé !',
    copied: 'Copié !',
    sent: 'Envoyé !',
  },

  // ============================================
  // GAME-SPECIFIC: QUIZ
  // ============================================
  quiz: {
    buzz: 'BUZZ !',
    correctAnswer: 'Bonne réponse !',
    wrongAnswer: 'Mauvaise réponse',
    tooSlow: 'Trop lent !',
    penaltyActive: 'Pénalité en cours...',
    waitingBuzz: 'Qui va buzzer ?',
    yourTurn: 'À vous de répondre !',
  },

  // ============================================
  // GAME-SPECIFIC: DEEZTEST
  // ============================================
  music: {
    nowPlaying: 'En cours...',
    selectPlaylist: 'Choisir une playlist',
    noPlaylistSelected: 'Aucune playlist sélectionnée',
    loadingTrack: 'Chargement du morceau...',
    playbackError: 'Erreur de lecture',
  },

  // ============================================
  // GAME-SPECIFIC: ALIBI
  // ============================================
  alibi: {
    prepareAlibi: 'Préparez votre alibi !',
    interrogationStarting: 'Interrogatoire en cours...',
    suspectsTurn: 'Au tour des suspects',
    inspectorsTurn: 'Au tour des inspecteurs',
    coherent: 'Cohérent',
    incoherent: 'Incohérent',
    suspectsWin: 'Les suspects gagnent !',
    inspectorsWin: 'Les inspecteurs gagnent !',
  },

  // ============================================
  // GAME-SPECIFIC: TROUVE LA RÈGLE
  // ============================================
  laregle: {
    chooseRule: 'Choisissez une règle',
    ruleChosen: 'Règle choisie !',
    investigatorsGuessing: 'Les enquêteurs devinent...',
    attemptsRemaining: 'tentatives restantes',
    ruleFound: 'Règle trouvée !',
    ruleFailed: 'Règle non trouvée',
    yourTurnToPlay: 'À vous de jouer !',
    followTheRule: 'Suivez la règle secrète',
  },

  // ============================================
  // GAME-SPECIFIC: MIME
  // ============================================
  mime: {
    yourTurn: 'À vous de mimer !',
    guessWord: 'Devinez le mot',
    timeUp: 'Temps écoulé !',
    wordFound: 'Mot trouvé !',
    skipWord: 'Passer',
    nextPlayer: 'Joueur suivant',
  },
};

export default MESSAGES;
