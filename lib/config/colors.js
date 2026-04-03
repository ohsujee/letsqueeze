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
    // Flat cartoon palette
    flat: {
      bg: '#2d1f5e',        // Card/panel background
      bgDark: '#1e1445',    // border-bottom (3D depth)
      bgLight: '#3d2d70',   // Inner elements, inputs
      accent: '#4a3a8a',    // Secondary buttons
      accentDark: '#3a2a70', // Secondary button border-bottom
      text: '#c4b5fd',      // Text on flat bg
      muted: '#a090d0',     // Muted text on flat bg
    },
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
    flat: {
      bg: '#4a3010',
      bgDark: '#352008',
      bgLight: '#5a3d18',
      accent: '#6b4d1a',
      accentDark: '#4a3510',
      text: '#fde68a',
      muted: '#c8a050',
    },
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
    flat: {
      bg: '#301560',
      bgDark: '#200e45',
      bgLight: '#402075',
      accent: '#5530a0',
      accentDark: '#402080',
      text: '#d4a5ff',
      muted: '#a070d0',
    },
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
    flat: {
      bg: '#0a3040',
      bgDark: '#06202d',
      bgLight: '#104050',
      accent: '#185868',
      accentDark: '#0e4050',
      text: '#a0e0f0',
      muted: '#60a8c0',
    },
    rgba: {
      light: 'rgba(6, 182, 212, 0.15)',
      medium: 'rgba(6, 182, 212, 0.3)',
      dark: 'rgba(6, 182, 212, 0.5)',
    }
  },
  mindlink: {
    primary: '#ec4899',
    secondary: '#db2777',
    dark: '#be185d',
    glow: '#f472b6',
    flat: {
      bg: '#4e1535',
      bgDark: '#380e25',
      bgLight: '#602045',
      accent: '#752850',
      accentDark: '#5a1a3a',
      text: '#fca5d0',
      muted: '#c870a0',
    },
    rgba: {
      light: 'rgba(236, 72, 153, 0.15)',
      medium: 'rgba(236, 72, 153, 0.3)',
      dark: 'rgba(236, 72, 153, 0.5)',
    }
  },
  lol: {
    primary: '#EF4444',
    secondary: '#DC2626',
    dark: '#B91C1C',
    glow: 'rgba(239, 68, 68, 0.4)',
    flat: {
      bg: '#4e1515',
      bgDark: '#380e0e',
      bgLight: '#602020',
      accent: '#752828',
      accentDark: '#5a1a1a',
      text: '#fca5a5',
      muted: '#c87070',
    },
    rgba: {
      light: 'rgba(239, 68, 68, 0.15)',
      medium: 'rgba(239, 68, 68, 0.3)',
      dark: 'rgba(239, 68, 68, 0.5)',
    }
  },
  mime: {
    primary: '#00ff66',
    secondary: '#00cc52',
    glow: 'rgba(0, 255, 102, 0.6)',
    flat: {
      bg: '#0a3520',
      bgDark: '#062515',
      bgLight: '#104530',
      accent: '#1a5a38',
      accentDark: '#0e4028',
      text: '#a0ffc8',
      muted: '#60c090',
    },
    rgba: {
      light: 'rgba(0, 255, 102, 0.15)',
      medium: 'rgba(0, 255, 102, 0.3)',
      dark: 'rgba(0, 255, 102, 0.5)',
    }
  },
};

/**
 * Génère un objet de CSS variables flat pour un jeu donné.
 * À appliquer via style={{ ...getFlatCSSVars('quiz') }} sur le container de la page.
 */
export function getFlatCSSVars(gameType) {
  const colors = GAME_COLORS[gameType] || GAME_COLORS.quiz;
  return {
    '--game-color': colors.primary,
    '--game-secondary': colors.secondary,
    '--game-dark': colors.dark,
    '--flat-bg': colors.flat.bg,
    '--flat-bg-dark': colors.flat.bgDark,
    '--flat-bg-light': colors.flat.bgLight,
    '--flat-accent': colors.flat.accent,
    '--flat-accent-dark': colors.flat.accentDark,
    '--flat-text': colors.flat.text,
    '--flat-muted': colors.flat.muted,
  };
}

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
  gold: '#FFD233',
  goldDark: '#CC9600',
  goldText: '#5C3D00',
  silver: '#C8D6E5',
  silverDark: '#8E9BAD',
  silverText: '#2C3E50',
  bronze: '#E8945A',
  bronzeDark: '#A05A2E',
  bronzeText: '#4A2000',
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
  lol: GAME_COLORS.lol.primary,
  mindlink: GAME_COLORS.mindlink.primary,
  mime: GAME_COLORS.mime.primary,
};

export default GAME_COLORS;
