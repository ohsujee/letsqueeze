/**
 * Admin/Founder Configuration
 *
 * Founders get permanent Pro access without paying.
 * Configure via environment variables (not hardcoded).
 *
 * In .env.local:
 * FOUNDER_UIDS=uid1,uid2
 * FOUNDER_EMAILS=email1@example.com,email2@example.com
 */

// Parse comma-separated env vars
const FOUNDER_UIDS = (process.env.NEXT_PUBLIC_FOUNDER_UIDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const FOUNDER_EMAILS = (process.env.NEXT_PUBLIC_FOUNDER_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if a user is a founder by UID
 */
const isFounderByUID = (uid) => {
  if (!uid) return false;
  return FOUNDER_UIDS.includes(uid);
};

/**
 * Check if a user is a founder by email
 */
const isFounderByEmail = (email) => {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.toLowerCase());
};

/**
 * Check if a user is a founder (admin with free Pro)
 * @param {Object|string} user - Firebase user object or UID string
 * @returns {boolean} - True if user is founder
 */
export const isAdmin = (user) => {
  if (!user) return false;

  // If user is a string, treat it as UID
  if (typeof user === 'string') {
    return isFounderByUID(user);
  }

  // If user is an object, check both UID and email
  return isFounderByUID(user.uid) || isFounderByEmail(user.email);
};

/**
 * Check if a user is a founder (alias for isAdmin)
 * @param {Object|string} user - Firebase user object or UID string
 * @returns {boolean} - True if user is founder
 */
export function isFounder(user) {
  return isAdmin(user);
}

/**
 * Get founder status message
 */
export function getAdminStatus(user) {
  return isAdmin(user) ? 'Founder Account - Pro Access' : null;
}

const adminModule = {
  isAdmin,
  isFounder,
  getAdminStatus,
};

export default adminModule;
