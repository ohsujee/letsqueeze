/**
 * Logger conditionnel
 *
 * En production: log uniquement errors et warnings importants
 * En dev: log tout
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Debug log - seulement en dev
 */
export const debug = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Info log - toujours visible mais sans data sensible
 */
export const info = (...args) => {
  console.log(...args);
};

/**
 * Warning - toujours visible
 */
export const warn = (...args) => {
  console.warn(...args);
};

/**
 * Error - toujours visible
 */
export const error = (...args) => {
  console.error(...args);
};

/**
 * Log conditionnel avec tag
 * @param {string} tag - Ex: '[Auth]', '[Spotify]'
 * @param {string} message - Message
 * @param {any} data - Data optionnelle (masquée en prod si sensible)
 */
export const log = (tag, message, data = null) => {
  if (isDev) {
    if (data !== null) {
      console.log(tag, message, data);
    } else {
      console.log(tag, message);
    }
  }
};

export default { debug, info, warn, error, log };
