import { getAnalytics, logEvent as firebaseLogEvent, isSupported, setUserProperties as firebaseSetUserProperties, setUserId as firebaseSetUserId } from 'firebase/analytics';

let analytics = null;
let analyticsInitialized = false;

/**
 * Initialize Firebase Analytics
 * Call this once on app load (client-side only)
 */
export async function initAnalytics() {
  if (typeof window === 'undefined') return null;

  if (!analyticsInitialized) {
    const supported = await isSupported();
    if (supported) {
      try {
        const { getApps } = await import('firebase/app');
        const app = getApps()[0];
        if (app) {
          analytics = getAnalytics(app);
          analyticsInitialized = true;
        }
      } catch (error) {
        console.error('Analytics initialization failed:', error);
      }
    }
  }

  return analytics;
}

/**
 * Log an analytics event
 * @param {string} eventName - Name of the event
 * @param {Object} eventParams - Parameters for the event
 */
export async function logEvent(eventName, eventParams = {}) {
  if (typeof window === 'undefined') return;

  if (!analytics) {
    await initAnalytics();
  }

  if (analytics) {
    try {
      firebaseLogEvent(analytics, eventName, eventParams);
    } catch (error) {
      console.error('Failed to log event:', eventName, error);
    }
  }
}

/**
 * Track user signup
 * @param {string} method - 'google' | 'email' | 'anonymous'
 * @param {string} uid - User ID
 */
export function trackSignup(method, uid) {
  logEvent('sign_up', {
    method,
    user_id: uid,
  });
}

/**
 * Track user login
 * @param {string} method - 'google' | 'email' | 'anonymous'
 * @param {string} uid - User ID
 */
export function trackLogin(method, uid) {
  logEvent('login', {
    method,
    user_id: uid,
  });
}

/**
 * Track room creation
 * @param {string} mode - 'quiz' | 'alibi'
 * @param {string} code - Room code
 * @param {string} uid - Host user ID
 */
export function trackRoomCreated(mode, code, uid) {
  logEvent('room_created', {
    game_mode: mode,
    room_code: code,
    host_uid: uid,
  });
}

/**
 * Track room joined
 * @param {string} mode - 'quiz' | 'alibi'
 * @param {string} code - Room code
 * @param {string} uid - Player user ID
 * @param {string} role - 'host' | 'player' | 'spectator'
 */
export function trackRoomJoined(mode, code, uid, role = 'player') {
  logEvent('room_joined', {
    game_mode: mode,
    room_code: code,
    user_id: uid,
    role,
  });
}

/**
 * Track game started
 * @param {string} mode - 'quiz' | 'alibi'
 * @param {string} code - Room code
 * @param {number} playerCount - Number of players
 * @param {string} contentId - Quiz ID or Alibi ID
 */
export function trackGameStarted(mode, code, playerCount, contentId) {
  logEvent('game_started', {
    game_mode: mode,
    room_code: code,
    player_count: playerCount,
    content_id: contentId,
  });
}

/**
 * Track game completed
 * @param {string} mode - 'quiz' | 'alibi'
 * @param {string} code - Room code
 * @param {number} duration - Duration in seconds
 * @param {number} score - Final score
 * @param {string} winnerId - Winner's UID
 * @param {boolean} completed - Whether game was fully completed or abandoned
 */
export function trackGameCompleted(mode, code, duration, score, winnerId, completed = true) {
  logEvent('game_completed', {
    game_mode: mode,
    room_code: code,
    duration_seconds: duration,
    final_score: score,
    winner_uid: winnerId,
    completed,
  });
}

/**
 * Track paywall shown
 * @param {string} contentType - 'quiz' | 'alibi' | 'feature'
 * @param {string} contentName - Name of locked content
 * @param {string} uid - User ID
 */
export function trackPaywallShown(contentType, contentName, uid) {
  logEvent('paywall_shown', {
    content_type: contentType,
    content_name: contentName,
    user_id: uid,
  });
}

/**
 * Track paywall conversion (user clicked upgrade)
 * @param {string} contentType - 'quiz' | 'alibi' | 'feature'
 * @param {string} uid - User ID
 * @param {string} pricingTier - 'monthly' | 'annual'
 */
export function trackPaywallConversion(contentType, uid, pricingTier) {
  logEvent('paywall_conversion_attempt', {
    content_type: contentType,
    user_id: uid,
    pricing_tier: pricingTier,
  });
}

/**
 * Track successful subscription purchase
 * @param {string} uid - User ID
 * @param {string} tier - 'monthly' | 'annual'
 * @param {number} price - Price paid
 * @param {string} currency - Currency code (EUR, USD, etc.)
 */
export function trackSubscriptionPurchase(uid, tier, price, currency = 'EUR') {
  logEvent('purchase', {
    user_id: uid,
    subscription_tier: tier,
    value: price,
    currency,
    transaction_id: `${uid}_${Date.now()}`,
  });
}

/**
 * Track user engagement with specific features
 * @param {string} featureName - Name of feature used
 * @param {Object} params - Additional parameters
 */
export function trackFeatureUsage(featureName, params = {}) {
  logEvent('feature_used', {
    feature_name: featureName,
    ...params,
  });
}

/**
 * Track errors for debugging
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {string} location - Where error occurred (page/component)
 */
export function trackError(errorType, errorMessage, location) {
  logEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage,
    location,
  });
}

/**
 * Track page views
 * @param {string} pagePath - Page path (e.g., '/home', '/game/ABC123/host')
 * @param {string} pageTitle - Page title
 */
export function trackPageView(pagePath, pageTitle) {
  logEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

/**
 * Set user properties for analytics
 * @param {Object} properties - User properties to set
 */
export async function setUserProperties(properties) {
  if (!analytics) {
    await initAnalytics();
  }

  if (analytics && typeof window !== 'undefined') {
    try {
      firebaseSetUserProperties(analytics, properties);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }
}

/**
 * Set user ID for analytics
 * @param {string} uid - User ID
 */
export async function setUserId(uid) {
  if (!analytics) {
    await initAnalytics();
  }

  if (analytics && typeof window !== 'undefined') {
    try {
      firebaseSetUserId(analytics, uid);
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }
}
