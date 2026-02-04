/**
 * Centralized Color Configuration
 *
 * All game colors and UI colors in one place.
 * Import and use instead of hardcoding hex values.
 *
 * Usage:
 *   import { GAME_COLORS } from '@/lib/config/colors';
 *   const primaryColor = GAME_COLORS.quiz.primary;
 */

export const GAME_COLORS = {
  quiz: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    dark: '#6d28d9',
    glow: '#a78bfa',
    rgba: {
      light: 'rgba(139, 92, 246, 0.25)',
      medium: 'rgba(139, 92, 246, 0.4)',
      dark: 'rgba(139, 92, 246, 0.6)',
    }
  },
  alibi: {
    primary: '#f59e0b',
    secondary: '#d97706',
    dark: '#b45309',
    glow: '#fbbf24',
    rgba: {
      light: 'rgba(245, 158, 11, 0.1)',
      medium: 'rgba(245, 158, 11, 0.25)',
      dark: 'rgba(245, 158, 11, 0.5)',
    }
  },
  deeztest: {
    primary: '#A238FF',
    secondary: '#FF0092',
    tertiary: '#C574FF',
    glow: 'rgba(162, 56, 255, 0.5)',
    rgba: {
      light: 'rgba(162, 56, 255, 0.15)',
      medium: 'rgba(162, 56, 255, 0.3)',
      dark: 'rgba(162, 56, 255, 0.5)',
    }
  },
  laregle: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    dark: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.5)',
    rgba: {
      light: 'rgba(6, 182, 212, 0.15)',
      medium: 'rgba(6, 182, 212, 0.3)',
      dark: 'rgba(6, 182, 212, 0.5)',
    }
  },
  mime: {
    primary: '#00ff66',
    secondary: '#00cc52',
    glow: 'rgba(0, 255, 102, 0.6)',
    rgba: {
      light: 'rgba(0, 255, 102, 0.15)',
      medium: 'rgba(0, 255, 102, 0.3)',
      dark: 'rgba(0, 255, 102, 0.5)',
    }
  },
};

export const SEMANTIC_COLORS = {
  success: '#22c55e',
  error: '#ef4444',
  warning: '#fbbf24',
  info: '#3b82f6',
  successRgba: {
    light: 'rgba(34, 197, 94, 0.15)',
    medium: 'rgba(34, 197, 94, 0.3)',
    dark: 'rgba(34, 197, 94, 0.5)',
  },
  errorRgba: {
    light: 'rgba(239, 68, 68, 0.15)',
    medium: 'rgba(239, 68, 68, 0.3)',
    dark: 'rgba(239, 68, 68, 0.5)',
  },
  warningRgba: {
    light: 'rgba(251, 191, 36, 0.15)',
    medium: 'rgba(251, 191, 36, 0.3)',
    dark: 'rgba(251, 191, 36, 0.5)',
  },
};

export const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

export const UI_COLORS = {
  background: '#0a0a0f',
  backgroundLight: '#14141e',
  card: 'rgba(20, 20, 30, 0.8)',
  cardSolid: '#14141e',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },
};

/**
 * Get color for a specific game type
 * @param {string} gameType - quiz | alibi | deeztest | laregle | mime
 * @param {string} variant - primary | secondary | dark | glow
 * @returns {string} Color hex or rgba
 */
export function getGameColor(gameType, variant = 'primary') {
  return GAME_COLORS[gameType]?.[variant] || GAME_COLORS.quiz[variant];
}

/**
 * Get rgba color for a specific game type
 * @param {string} gameType - quiz | alibi | deeztest | laregle | mime
 * @param {string} opacity - light | medium | dark
 * @returns {string} rgba color
 */
export function getGameRgba(gameType, opacity = 'medium') {
  return GAME_COLORS[gameType]?.rgba?.[opacity] || GAME_COLORS.quiz.rgba[opacity];
}

/**
 * Color mapping for components that need game-specific colors
 * Useful for LobbySettings, GameLoader, etc.
 */
export const GAME_COLOR_MAP = {
  quiz: GAME_COLORS.quiz.primary,
  alibi: GAME_COLORS.alibi.primary,
  deeztest: GAME_COLORS.deeztest.primary,
  blindtest: GAME_COLORS.deeztest.primary, // Alias for blindtest game ID
  laregle: GAME_COLORS.laregle.primary,
  mime: GAME_COLORS.mime.primary,
};

export default GAME_COLORS;
