/**
 * Admin Configuration
 *
 * Add your Firebase UID or email here to get permanent Pro access.
 *
 * You can use either:
 * - Firebase UID (generated after first login)
 * - Email address (easier for Google/Apple Sign-In)
 */

const ADMIN_UIDS = [
  // Add your Firebase UIDs here
  'Xjzwibrz2mRDLCNUCwWkjrkK8LS2', // Sujeevan (Anonymous UID)
];

const ADMIN_EMAILS = [
  // Add your admin emails here
  'yogarajah.sujeevan@gmail.com', // Sujeevan (Owner)
];

/**
 * Check if a user is an admin by UID
 * @param {string} uid - Firebase user ID
 * @returns {boolean} - True if user is admin
 */
const isAdminByUID = (uid) => {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
};

/**
 * Check if a user is an admin by email
 * @param {string} email - User email
 * @returns {boolean} - True if user is admin
 */
const isAdminByEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Check if a user is an admin
 * @param {Object|string} user - Firebase user object or UID string
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = (user) => {
  if (!user) return false;

  // If user is a string, treat it as UID (backwards compatible)
  if (typeof user === 'string') {
    return isAdminByUID(user);
  }

  // If user is an object, check both UID and email
  const uid = user.uid;
  const email = user.email;

  return isAdminByUID(uid) || isAdminByEmail(email);
};

/**
 * Get admin status message
 * @param {Object|string} user - Firebase user object or UID string
 * @returns {string} - Admin status message
 */
export const getAdminStatus = (user) => {
  return isAdmin(user) ? '👑 Admin Account - Full Pro Access' : null;
};

export default {
  isAdmin,
  getAdminStatus,
  ADMIN_UIDS
};
