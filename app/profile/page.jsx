'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, signOutUser } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { storage } from '@/lib/utils/storage';
import BottomNav from '@/lib/components/BottomNav';
import { ChevronRight, Lightbulb } from 'lucide-react';
import hueService from '@/lib/hue-module/services/hueService';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [hueEffectsEnabled, setHueEffectsEnabled] = useState(true);
  const [hueConnected, setHueConnected] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isPro, isAdmin, tier, adminStatus } = useSubscription(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setLoading(false);

        // Load settings from storage
        const savedSound = storage.get('soundEffects');
        const savedNotifications = storage.get('notifications');

        if (savedSound !== null) setSoundEffects(savedSound);
        if (savedNotifications !== null) setNotifications(savedNotifications);

        // Load Hue settings (reload config car SSR ne charge pas localStorage)
        hueService.loadConfig();
        setHueConnected(hueService.isConnected);
        setHueEffectsEnabled(hueService.effectsEnabled);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  const handleToggleSound = () => {
    const newValue = !soundEffects;
    setSoundEffects(newValue);
    storage.set('soundEffects', newValue);
  };

  const handleToggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    storage.set('notifications', newValue);
  };

  const handleToggleHueEffects = () => {
    const newValue = !hueEffectsEnabled;
    setHueEffectsEnabled(newValue);
    hueService.setEffectsEnabled(newValue);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <style jsx>{`
          .loading-screen {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary, #0a0a0f);
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--quiz-primary, #8b5cf6);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <motion.main
        className="profile-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Profile Header */}
        <section className="profile-header">
          {/* Avatar */}
          <div className="avatar-container">
            <div className="avatar-placeholder">
              {getInitials(user?.displayName)}
            </div>
          </div>

          {/* User Info */}
          <div className="user-info">
            <h1 className="user-name">
              {user?.displayName || 'Joueur'}
            </h1>
            {user?.email && (
              <p className="user-email">{user.email}</p>
            )}
          </div>

          {/* Badges */}
          <div className="badges">
            {isAdmin && (
              <span className="badge admin">{adminStatus}</span>
            )}
            {isPro && (
              <span className="badge pro">⭐ PRO</span>
            )}
          </div>
        </section>

        {/* Subscription Section */}
        <section className="card subscription-card">
          <h2 className="card-title">
            <span className="card-icon">💳</span>
            Abonnement
          </h2>

          {isPro ? (
            <>
              {/* Pro users see their benefits */}
              <div className="benefits-grid">
                <div className="benefit-card unlocked">
                  <div className="benefit-icon">♾️</div>
                  <div className="benefit-text">Illimité</div>
                </div>
                <div className="benefit-card unlocked">
                  <div className="benefit-icon">🚫</div>
                  <div className="benefit-text">Sans pub</div>
                </div>
                <div className="benefit-card unlocked">
                  <div className="benefit-icon">📦</div>
                  <div className="benefit-text">Tous packs</div>
                </div>
              </div>
              {!isAdmin && (
                <button className="btn-manage" onClick={() => router.push('/subscribe')}>
                  Gérer l'abonnement
                </button>
              )}
            </>
          ) : (
            <>
              {/* Free users see what they're missing */}
              <div className="benefits-grid">
                <div className="benefit-card locked">
                  <div className="benefit-icon">🔒</div>
                  <div className="benefit-text">Illimité</div>
                </div>
                <div className="benefit-card locked">
                  <div className="benefit-icon">🔒</div>
                  <div className="benefit-text">Sans pub</div>
                </div>
                <div className="benefit-card locked">
                  <div className="benefit-icon">🔒</div>
                  <div className="benefit-text">Tous packs</div>
                </div>
              </div>
              <button className="btn-upgrade" onClick={() => router.push('/subscribe')}>
                <span className="btn-icon">⭐</span>
                Débloquer Pro
              </button>
            </>
          )}
        </section>

        {/* Stats Section */}
        <section className="card stats-card">
          <h2 className="card-title">
            <span className="card-icon">📊</span>
            Statistiques
          </h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-label">Quiz Buzzer</div>
                <div className="stat-value">12 victoires</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">🕵️</div>
              <div className="stat-info">
                <div className="stat-label">Alibi</div>
                <div className="stat-value">8 victoires</div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">⚡</div>
              <div className="stat-info">
                <div className="stat-label">Total parties</div>
                <div className="stat-value">45 jouées</div>
              </div>
            </div>
          </div>
        </section>

        {/* Settings Section */}
        <section className="card settings-card">
          <h2 className="card-title">
            <span className="card-icon">⚙️</span>
            Paramètres
          </h2>
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon">🔔</span>
                <span className="setting-label">Notifications</span>
              </div>
              <button
                className={`toggle ${notifications ? 'active' : ''}`}
                onClick={handleToggleNotifications}
              >
                <div className="toggle-thumb"></div>
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon">🌙</span>
                <span className="setting-label">Mode Sombre</span>
              </div>
              <button
                className={`toggle ${theme === 'dark' ? 'active' : ''}`}
                onClick={handleToggleDarkMode}
              >
                <div className="toggle-thumb"></div>
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon">🔊</span>
                <span className="setting-label">Effets Sonores</span>
              </div>
              <button
                className={`toggle ${soundEffects ? 'active' : ''}`}
                onClick={handleToggleSound}
              >
                <div className="toggle-thumb"></div>
              </button>
            </div>

            {(hueConnected || user?.email === 'yogarajah.sujeevan@gmail.com') && (
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-icon">💡</span>
                  <span className="setting-label">Effets Philips Hue</span>
                </div>
                <button
                  className={`toggle ${hueEffectsEnabled ? 'active' : ''}`}
                  onClick={handleToggleHueEffects}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon">🗣️</span>
                <span className="setting-label">Langue</span>
              </div>
              <span className="setting-value">Français</span>
            </div>
          </div>
        </section>

        {/* Philips Hue Link - Admin only */}
        {user?.email === 'yogarajah.sujeevan@gmail.com' && (
          <button
            onClick={() => router.push('/profile/hue')}
            className="hue-card"
          >
            <div className="hue-card-content">
              <div className="hue-icon">
                <Lightbulb size={24} />
              </div>
              <div className="hue-info">
                <span className="hue-title">Philips Hue</span>
                <span className="hue-subtitle">Effets lumineux immersifs</span>
              </div>
              <ChevronRight size={20} className="hue-chevron" />
            </div>
          </button>
        )}

        {/* Sign Out Button */}
        <button className="btn-signout" onClick={handleSignOut}>
          Déconnexion
        </button>

        {/* Footer */}
        <div className="profile-footer">
          <p className="footer-text">Version 1.0.0</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Conditions</a>
            <span className="footer-separator">•</span>
            <a href="#" className="footer-link">Confidentialité</a>
          </div>
        </div>

        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </motion.main>

      {/* Bottom Navigation */}
      <BottomNav />

      <style jsx>{`
        .profile-container {
          min-height: 100dvh;
          background: var(--bg-primary, #0a0a0f);
          position: relative;
          padding: 0 16px;
          box-sizing: border-box;
        }

        /* Guide: Animated Background with Radial Gradients */
        .profile-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(34, 197, 94, 0.05) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
          animation: bg-pulse 8s ease-in-out infinite;
        }

        @keyframes bg-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .profile-content {
          padding-top: 20px;
          padding-bottom: 0;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          box-sizing: border-box;
          width: 100%;
        }

        /* Profile Header */
        .profile-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-top: 1rem;
        }

        .avatar-container {
          margin-bottom: 1.25rem;
          position: relative;
          display: inline-block;
        }

        .avatar-image,
        .avatar-placeholder {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin: 0 auto;
        }

        .avatar-image {
          object-fit: cover;
          border: 3px solid rgba(139, 92, 246, 0.5);
          box-shadow:
            0 0 30px rgba(139, 92, 246, 0.3),
            0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .avatar-placeholder {
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), var(--quiz-secondary, #7c3aed));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 2rem;
          font-weight: 400;
          color: white;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            0 0 30px rgba(139, 92, 246, 0.4),
            0 8px 24px rgba(0, 0, 0, 0.4),
            inset 0 2px 10px rgba(255, 255, 255, 0.1);
        }

        .user-name {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 400;
          color: var(--text-primary, #ffffff);
          margin-bottom: 0.25rem;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }

        .user-email {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          margin-bottom: 1rem;
        }

        .badges {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .badge.admin {
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), #ec4899);
          color: white;
          box-shadow:
            0 4px 12px rgba(139, 92, 246, 0.4),
            0 0 20px rgba(139, 92, 246, 0.2);
        }

        .badge.pro {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1a2e;
          box-shadow:
            0 4px 12px rgba(245, 158, 11, 0.4),
            0 0 20px rgba(245, 158, 11, 0.2);
        }

        /* Guide: Glassmorphism Card */
        .card {
          background: rgba(20, 20, 30, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-icon {
          font-size: 1.25rem;
        }

        /* Subscription Card - Game Style */
        .subscription-card .benefits-grid {
          margin-bottom: 1rem;
        }

        /* Benefits Grid - Achievement Style */
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .benefit-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem 0.5rem;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        /* Unlocked state - Green glow */
        .benefit-card.unlocked {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05));
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .benefit-card.unlocked:hover {
          transform: translateY(-2px);
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 8px 20px rgba(34, 197, 94, 0.2);
        }

        .benefit-card.unlocked .benefit-icon {
          filter: drop-shadow(0 0 8px rgba(34, 197, 94, 0.5));
        }

        .benefit-card.unlocked .benefit-text {
          color: var(--success, #22c55e);
        }

        /* Locked state - Grayed out */
        .benefit-card.locked {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .benefit-card.locked .benefit-icon {
          opacity: 0.5;
          filter: grayscale(100%);
        }

        .benefit-card.locked .benefit-text {
          color: var(--text-muted, rgba(255, 255, 255, 0.4));
        }

        .benefit-icon {
          font-size: 1.5rem;
          margin-bottom: 0.375rem;
          transition: all 0.3s ease;
        }

        .benefit-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          transition: color 0.3s ease;
        }

        .btn-icon {
          margin-right: 0.5rem;
        }

        /* Guide: 3D Button - Upgrade */
        .btn-upgrade {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), var(--quiz-secondary, #7c3aed));
          color: white;
          border: none;
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:
            0 4px 0 #6d28d9,
            0 6px 20px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-upgrade:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #6d28d9,
            0 10px 30px rgba(139, 92, 246, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-upgrade:active {
          transform: translateY(2px);
          box-shadow:
            0 2px 0 #6d28d9,
            0 4px 10px rgba(139, 92, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .btn-manage {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-manage:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .btn-manage:not(:disabled):hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        /* Stats Card */
        .stats-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .stat-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(139, 92, 246, 0.2);
        }

        .stat-icon {
          font-size: 1.75rem;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          display: block;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          margin-bottom: 0.125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
        }

        /* Settings Card */
        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .setting-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .setting-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .setting-icon {
          font-size: 1.25rem;
        }

        .setting-label {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9375rem;
          color: var(--text-primary, #ffffff);
          font-weight: 500;
        }

        .setting-value {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
        }

        /* Guide: Toggle Switch */
        .toggle {
          position: relative;
          width: 52px;
          height: 28px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .toggle.active {
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), var(--quiz-secondary, #7c3aed));
          border-color: transparent;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .toggle.active .toggle-thumb {
          transform: translateX(24px);
        }

        /* Guide: Sign Out Button - Danger Style */
        .btn-signout {
          width: 100%;
          padding: 1rem;
          background: transparent;
          color: var(--error, #ef4444);
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }

        .btn-signout:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.5);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }

        .btn-signout:active {
          transform: scale(0.98);
        }

        /* Footer */
        .profile-footer {
          text-align: center;
          padding: 1.5rem 0;
        }

        .footer-text {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
          margin-bottom: 0.5rem;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
        }

        .footer-link {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--quiz-primary, #8b5cf6);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-link:hover {
          color: var(--quiz-secondary, #7c3aed);
        }

        .footer-separator {
          color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
          font-size: 0.75rem;
        }

        /* Bottom padding for nav */
        .bottom-padding {
          height: 96px;
        }

        /* Guide: Hue Card - Special Gradient */
        .hue-card {
          width: 100%;
          padding: 0;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        .hue-card:hover {
          transform: translateY(-3px);
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow:
            0 12px 32px rgba(139, 92, 246, 0.3),
            0 0 40px rgba(139, 92, 246, 0.15);
        }

        .hue-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
        }

        .hue-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .hue-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .hue-title {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #ffffff);
        }

        .hue-subtitle {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8125rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
        }

        .hue-chevron {
          color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
          flex-shrink: 0;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .profile-container {
            padding: 0 16px;
          }

          .profile-content {
            padding-top: 16px;
          }

          .avatar-image,
          .avatar-placeholder {
            width: 88px;
            height: 88px;
          }

          .avatar-placeholder {
            font-size: 1.75rem;
          }

          .card {
            padding: 1rem;
            border-radius: 14px;
          }

          .benefits-grid {
            gap: 0.375rem;
          }

          .benefit-card {
            padding: 0.75rem 0.25rem;
          }

          .benefit-icon {
            font-size: 1.25rem;
          }

          .benefit-text {
            font-size: 0.625rem;
          }
        }

        /* Extra small screens */
        @media (max-width: 380px) {
          .profile-container {
            padding: 0 12px;
          }

          .card {
            padding: 0.875rem;
            border-radius: 12px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .profile-container::before {
            animation: none;
          }

          .toggle-thumb,
          .btn-upgrade,
          .hue-card {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
