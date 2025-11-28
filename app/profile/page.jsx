'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, signOutUser } from '@/lib/firebase';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { storage } from '@/lib/utils/storage';
import BottomNav from '@/lib/components/BottomNav';
import { ChevronRight, Lightbulb } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notifications, setNotifications] = useState(true);
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
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-primary);
            border-top-color: var(--brand-blue);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
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
      <main className="profile-content">
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
          <div className="subscription-info">
            <div className="plan-info">
              <span className="plan-label">Plan actuel</span>
              <span className="plan-value">{tier?.displayName || 'Free'}</span>
            </div>
            {isPro && (
              <div className="benefits-list">
                <div className="benefit-item">✓ Accès illimité</div>
                <div className="benefit-item">✓ Sans publicité</div>
                <div className="benefit-item">✓ Tous les packs</div>
              </div>
            )}
          </div>
          {!isPro ? (
            <button className="btn-upgrade" onClick={() => router.push('/subscribe')}>
              Passer à Pro
            </button>
          ) : isAdmin ? (
            <button className="btn-manage" disabled>
              Compte Admin
            </button>
          ) : (
            <button className="btn-manage" onClick={() => router.push('/subscribe')}>
              Gérer l'abonnement
            </button>
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
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      <style jsx>{`
        .profile-container {
          min-height: 100vh;
          background: #000000;
          position: relative;
        }

        /* Background orbs like home page */
        .profile-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 80% 20%, rgba(66, 153, 225, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .profile-content {
          padding: var(--space-6);
          padding-bottom: 0;
          max-width: 640px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Profile Header */
        .profile-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .avatar-container {
          margin-bottom: 1rem;
        }

        .avatar-image,
        .avatar-placeholder {
          width: 96px;
          height: 96px;
          border-radius: var(--radius-full);
          margin: 0 auto;
        }

        .avatar-image {
          object-fit: cover;
          border: 4px solid var(--border-primary);
          box-shadow: var(--shadow-md);
        }

        .avatar-placeholder {
          background: linear-gradient(135deg, var(--brand-blue), var(--brand-green));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: var(--font-weight-bold);
          color: white;
          border: 4px solid var(--border-primary);
          box-shadow: var(--shadow-md);
        }

        .user-name {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-extrabold);
          color: var(--text-primary);
          margin-bottom: var(--space-1);
        }

        .user-email {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-4);
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
          font-size: 0.75rem;
          font-weight: 700;
        }

        .badge.admin {
          background: linear-gradient(135deg, #A855F7, #EC4899);
          color: white;
        }

        .badge.pro {
          background: linear-gradient(135deg, #FFD700, #FF6D00);
          color: white;
        }

        /* Card */
        .card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          margin-bottom: var(--space-4);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border-primary);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          margin-bottom: var(--space-4);
        }

        .card-icon {
          font-size: var(--font-size-xl);
        }

        /* Subscription Card */
        .subscription-info {
          margin-bottom: 1rem;
        }

        .plan-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .plan-label {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        .plan-value {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .benefit-item {
          font-size: var(--font-size-sm);
          color: var(--brand-green);
          font-weight: var(--font-weight-medium);
        }

        .btn-upgrade {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #4285F4, #34A853);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-upgrade:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
        }

        .btn-upgrade:active {
          transform: translateY(0);
        }

        .btn-manage {
          width: 100%;
          padding: var(--space-4);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-bold);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-manage:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .btn-manage:not(:disabled):hover {
          background: var(--bg-tertiary);
        }

        /* Stats Card */
        .stats-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .stat-icon {
          font-size: var(--font-size-3xl);
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          display: block;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          margin-bottom: var(--space-1);
        }

        .stat-value {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
        }

        /* Settings Card */
        .settings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .setting-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .setting-icon {
          font-size: var(--font-size-xl);
        }

        .setting-label {
          font-size: var(--font-size-base);
          color: var(--text-primary);
          font-weight: var(--font-weight-medium);
        }

        .setting-value {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        /* Toggle Switch */
        .toggle {
          position: relative;
          width: 48px;
          height: 28px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          border: none;
          cursor: pointer;
          transition: background var(--transition-base);
        }

        .toggle.active {
          background: var(--brand-green);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle.active .toggle-thumb {
          transform: translateX(20px);
        }

        /* Sign Out Button */
        .btn-signout {
          width: 100%;
          padding: var(--space-4);
          background: transparent;
          color: var(--brand-red);
          border: 2px solid var(--brand-red);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-bold);
          cursor: pointer;
          transition: all var(--transition-base);
          margin-bottom: var(--space-4);
        }

        .btn-signout:hover {
          background: rgba(234, 67, 53, 0.1);
        }

        .btn-signout:active {
          transform: scale(0.98);
        }

        /* Footer */
        .profile-footer {
          text-align: center;
          padding: 1rem 0;
        }

        .footer-text {
          font-size: var(--font-size-xs);
          color: var(--text-tertiary);
          margin-bottom: var(--space-2);
        }

        .footer-links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-2);
        }

        .footer-link {
          font-size: var(--font-size-xs);
          color: var(--brand-blue);
          text-decoration: none;
        }

        .footer-link:hover {
          text-decoration: underline;
        }

        .footer-separator {
          color: var(--text-tertiary);
          font-size: var(--font-size-xs);
        }

        /* Bottom padding for nav */
        .bottom-padding {
          height: 96px;
        }

        /* Hue Card */
        .hue-card {
          width: 100%;
          padding: 0;
          margin-bottom: var(--space-4);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-base);
          overflow: hidden;
        }

        .hue-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.2);
        }

        .hue-card-content {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .hue-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #8B5CF6, #3B82F6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .hue-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .hue-title {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
        }

        .hue-subtitle {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        .hue-chevron {
          color: var(--text-tertiary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
