import { getRemoteConfig, fetchAndActivate, getValue, isSupported } from 'firebase/remote-config';
import { getApps } from 'firebase/app';

// Valeurs par défaut (utilisées si Remote Config inaccessible)
const defaults = {
  games_config: JSON.stringify({}),
  min_app_version: '1.0.0',
  maintenance_mode: false,
};

let remoteConfig = null;

/**
 * Initialize Firebase Remote Config
 * Only works client-side
 */
export async function initRemoteConfig() {
  // Remote Config n'est supporté que côté client
  if (typeof window === 'undefined') return null;

  // Vérifier si Remote Config est supporté (pas en SSR, pas en incognito parfois)
  const supported = await isSupported();
  if (!supported) {
    console.warn('[RemoteConfig] Not supported in this environment');
    return null;
  }

  if (remoteConfig) return remoteConfig;

  const app = getApps()[0];
  if (!app) {
    console.warn('[RemoteConfig] Firebase app not initialized');
    return null;
  }

  remoteConfig = getRemoteConfig(app);

  // Cache : 0 en dev (pour tester), 1h en prod
  remoteConfig.settings.minimumFetchIntervalMillis =
    process.env.NODE_ENV === 'development' ? 0 : 60 * 60 * 1000;

  // Valeurs par défaut
  remoteConfig.defaultConfig = defaults;

  return remoteConfig;
}

/**
 * Fetch and activate remote config values
 * @returns {Promise<boolean>} true if fetch succeeded
 */
export async function fetchRemoteConfig() {
  const rc = await initRemoteConfig();
  if (!rc) return false;

  try {
    const activated = await fetchAndActivate(rc);
    console.log('[RemoteConfig] Fetched and activated:', activated ? 'new values' : 'cached values');
    return true;
  } catch (err) {
    console.warn('[RemoteConfig] Fetch failed, using defaults:', err.message);
    return false;
  }
}

/**
 * Get a remote config value as string
 * @param {string} key - Config key
 * @returns {string} Config value
 */
export function getRemoteValue(key) {
  if (!remoteConfig) return defaults[key];
  return getValue(remoteConfig, key).asString();
}

/**
 * Get games config overrides from Remote Config
 * @returns {Object} Games config object { gameId: { available, comingSoon, releaseDate } }
 */
export function getGamesConfig() {
  const raw = getRemoteValue('games_config');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Check if app is in maintenance mode
 * @returns {boolean}
 */
export function isMaintenanceMode() {
  const val = getRemoteValue('maintenance_mode');
  return val === 'true' || val === true;
}

/**
 * Get minimum required app version
 * @returns {string}
 */
export function getMinAppVersion() {
  return getRemoteValue('min_app_version');
}
