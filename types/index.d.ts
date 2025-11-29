// Types globaux pour LetsQueeze

// Firebase Room Types
export interface RoomMeta {
  code: string;
  createdAt: number;
  hostUid: string;
  expiresAt: number;
  mode: 'individuel' | 'equipe';
  teamCount: number;
  quizId: string;
  teams: Record<string, Team>;
}

export interface RoomState {
  phase: 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'end';
  currentIndex: number;
  revealed: boolean;
  lockUid: string | null;
  buzzBanner: string;
  lastRevealAt: number;
}

export interface Player {
  uid: string;
  name: string;
  score: number;
  team: string | null;
  joinedAt: number;
  blockedUntil: number;
}

export interface Team {
  name: string;
  color: string;
  members: string[];
  score: number;
}

// Quiz Types
export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: Question[];
  isPro: boolean;
}

export interface Question {
  id: string;
  text: string;
  image?: string;
  answers: Answer[];
  correctIndex: number;
  timeLimit: number;
  points: number;
}

export interface Answer {
  text: string;
  isCorrect: boolean;
}

// User Types
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isPro: boolean;
  isAdmin: boolean;
  createdAt: number;
}

// Storage Types
export interface StorageData {
  hasSeenOnboarding: boolean;
  theme: 'dark' | 'light';
  soundEffects: boolean;
  notifications: boolean;
  favorites: string[];
}

// Component Props Types
export interface BuzzerProps {
  roomCode: string;
  playerUid: string;
  playerName: string;
  blockedUntil?: number;
  serverNow?: number;
  revealed?: boolean;
}

export interface GameCardProps {
  game: {
    id: string;
    name: string;
    Icon: React.ComponentType;
    players: string;
    packLimit: number;
    image: string;
  };
  isLocked: boolean;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
  onClick: (game: unknown) => void;
  user: unknown;
}
