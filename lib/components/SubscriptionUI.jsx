'use client';

import { useSubscription } from '../hooks/useSubscription';
import { getRemainingGames } from '../subscription';

/**
 * Pro Badge Component
 * Displays a badge if user has Pro access
 */
export const ProBadge = ({ user, showAdmin = true }) => {
  const { isPro, isAdmin, adminStatus } = useSubscription(user);

  if (!isPro) return null;

  return (
    <div className="inline-flex items-center gap-2">
      <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
        ⭐ PRO
      </span>
      {showAdmin && isAdmin && (
        <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-lg">
          {adminStatus}
        </span>
      )}
    </div>
  );
};

/**
 * Locked Feature Component
 * Shows a lock icon and message for Pro-only features
 */
export const LockedFeature = ({ message = 'Pro Only', onUpgrade }) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
        <div className="text-center p-6">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-white font-bold text-lg mb-3">{message}</p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Game Limit Warning Component
 * Shows remaining games for free users
 */
export const GameLimitWarning = ({ user, gameType, gamesPlayedToday }) => {
  const { isPro } = useSubscription(user);

  if (isPro) return null;

  const remaining = getRemainingGames(user, gameType, gamesPlayedToday);

  if (remaining === null) return null;

  if (remaining === 0) {
    return (
      <div className="p-4 bg-red-50 border-3 border-red-500 rounded-xl mb-4">
        <p className="text-red-700 font-bold text-center">
          ⚠️ Daily limit reached! Upgrade to Pro for unlimited games.
        </p>
      </div>
    );
  }

  if (remaining <= 2) {
    return (
      <div className="p-4 bg-yellow-50 border-3 border-yellow-500 rounded-xl mb-4">
        <p className="text-yellow-700 font-bold text-center">
          ⏰ {remaining} game{remaining > 1 ? 's' : ''} remaining today
        </p>
      </div>
    );
  }

  return null;
};

/**
 * Pack Lock Component
 * Shows lock icon on locked packs
 */
export const PackLock = ({ isLocked, packNumber }) => {
  if (!isLocked) return null;

  return (
    <div className="absolute top-2 right-2 z-10">
      <div className="bg-gray-900 text-white px-3 py-1 rounded-lg flex items-center gap-2 shadow-lg">
        <span>🔒</span>
        <span className="text-sm font-bold">Pro</span>
      </div>
    </div>
  );
};

/**
 * Subscription Tier Display
 * Shows user's current subscription tier
 */
export const TierDisplay = ({ user, showBenefits = false }) => {
  const { tier, isLoading } = useSubscription(user);

  if (isLoading) return <div>Loading...</div>;

  if (!tier) return null;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-primary">Your Plan</h3>
        <span className={`px-4 py-2 rounded-full font-bold ${
          tier.tier === 'pro'
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : 'bg-gray-200 text-gray-700'
        }`}>
          {tier.displayName}
        </span>
      </div>

      {showBenefits && (
        <div className="mt-4">
          <h4 className="font-bold text-gray-700 mb-2">Benefits:</h4>
          <ul className="space-y-2">
            {tier.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-600">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default {
  ProBadge,
  LockedFeature,
  GameLimitWarning,
  PackLock,
  TierDisplay
};
