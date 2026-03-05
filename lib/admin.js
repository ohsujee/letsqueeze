/**
 * Admin/Founder Configuration
 *
 * Founders get permanent Pro access without paying.
 * Status stored in Firebase: users/{uid}/isFounder: true
 */

/**
 * Check if a user is a founder (admin with free Pro)
 * Relies on isFounder field set in Firebase (users/{uid}/isFounder)
 * @param {Object} user - User object with isFounder field
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  if (!user) return false;
  return user.isFounder === true;
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
