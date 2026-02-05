'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, signOutUser, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile, updateUserPseudo, validatePseudo } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { storage } from '@/lib/utils/storage';
import { ChevronRight, Wifi, WifiOff, BarChart3, Sparkles, Crown, Infinity, Ban, Package, UserPlus, Zap, ExternalLink, Save, Trophy, Pencil, Check, X, Bell, Volume2, Lightbulb, Globe, Settings, Link2 } from 'lucide-react';
import { openManageSubscriptions } from '@/lib/revenuecat';
import hueService from '@/lib/hue-module/services/hueService';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSkeleton from '@/components/ui/ProfileSkeleton';
import { HueLogo, DeezerLogo, GoogleIcon, AppleIcon } from '@/components/icons';
import { version } from '../../../package.json';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [hueEffectsEnabled, setHueEffectsEnabled] = useState(true);
  const [hueConnected, setHueConnected] = useState(false);
  const { isPro, isAdmin } = useSubscription(user);
  const { profile, cachedPseudo } = useUserProfile();
  const { isAndroid } = usePlatform();
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingApple, setConnectingApple] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // Pseudo editing state
  const [isEditingPseudo, setIsEditingPseudo] = useState(false);
  const [newPseudo, setNewPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState('');
  const [savingPseudo, setSavingPseudo] = useState(false);

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

        // Load Hue settings
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

  // Handle Google connection for guests
  const handleGoogleConnect = async () => {
    try {
      setConnectingGoogle(true);
      setConnectError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
      }
    } catch (err) {
      console.error('Google connection error:', err);
      setConnectError('Erreur de connexion Google');
      setConnectingGoogle(false);
    }
  };

  // Handle Apple connection for guests
  const handleAppleConnect = async () => {
    try {
      setConnectingApple(true);
      setConnectError(null);
      const result = await signInWithApple();
      if (result?.user) {
        await initializeUserProfile(result.user);
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
      }
    } catch (err) {
      console.error('Apple connection error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setConnectError('Connexion Apple bientôt disponible !');
      } else {
        setConnectError('Erreur de connexion Apple');
      }
      setConnectingApple(false);
    }
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

  // Pseudo editing handlers
  const handleStartEditPseudo = () => {
    setNewPseudo(profile?.pseudo || cachedPseudo || user?.displayName?.split(' ')[0] || '');
    setPseudoError('');
    setIsEditingPseudo(true);
  };

  const handleCancelEditPseudo = () => {
    setIsEditingPseudo(false);
    setNewPseudo('');
    setPseudoError('');
  };

  const handleSavePseudo = async () => {
    const validation = validatePseudo(newPseudo.trim());
    if (!validation.valid) {
      setPseudoError(validation.error);
      return;
    }

    try {
      setSavingPseudo(true);
      await updateUserPseudo(user.uid, newPseudo.trim());
      setIsEditingPseudo(false);
      setNewPseudo('');
      setPseudoError('');
    } catch (err) {
      console.error('Error saving pseudo:', err);
      setPseudoError('Erreur lors de la sauvegarde');
    } finally {
      setSavingPseudo(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="profile-container">
      <main className="profile-content">
        {/* Profile Header */}
        <section className="profile-header">
          <div className="profile-avatar-container">
            <div className="profile-avatar-placeholder">
              {getInitials(user?.displayName)}
            </div>
            {isPro && (
              <div className="pro-badge-pill">
                <Sparkles size={12} />
                <span>PRO</span>
              </div>
            )}
          </div>

          <div className="user-info">
            <AnimatePresence mode="wait">
              {isEditingPseudo ? (
                <motion.div
                  className="pseudo-edit-card"
                  key="editing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    type="text"
                    className="pseudo-input-large"
                    value={newPseudo}
                    onChange={(e) => {
                      setNewPseudo(e.target.value);
                      setPseudoError('');
                    }}
                    placeholder="Ton pseudo"
                    maxLength={16}
                    autoFocus
                  />
                  {pseudoError && (
                    <p className="pseudo-error-inline">{pseudoError}</p>
                  )}
                  <div className="pseudo-edit-actions">
                    <motion.button
                      className="pseudo-save-btn"
                      onClick={handleSavePseudo}
                      disabled={savingPseudo}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Check size={18} />
                      <span>Enregistrer</span>
                    </motion.button>
                    <motion.button
                      className="pseudo-cancel-btn"
                      onClick={handleCancelEditPseudo}
                      disabled={savingPseudo}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Annuler
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.h1
                  className="user-name-editable"
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {profile?.pseudo || cachedPseudo || user?.displayName?.split(' ')[0] || 'Joueur'}
                  <button
                    className="edit-name-btn"
                    onClick={handleStartEditPseudo}
                    title="Modifier ton pseudo"
                  >
                    <Pencil size={14} />
                  </button>
                </motion.h1>
              )}
            </AnimatePresence>

            {user?.email && (
              <p className="user-email">{user.email}</p>
            )}
          </div>
        </section>

        {/* Subscription Section */}
        <section className="subscription-section">
          {isPro ? (
            <>
              <div className="pro-status-card">
                <div className="pro-status-header">
                  <div className="pro-crown-icon">
                    <Crown size={24} />
                  </div>
                  <div className="pro-status-info">
                    <h2 className="pro-status-title">Gigglz Pro</h2>
                    <p className="pro-status-desc">Tous les avantages débloqués</p>
                  </div>
                </div>

                <div className="pro-benefits-row">
                  <div className="pro-benefit-item">
                    <Infinity size={18} />
                    <span>Illimité</span>
                  </div>
                  <div className="pro-benefit-item">
                    <Ban size={18} />
                    <span>Sans pub</span>
                  </div>
                  <div className="pro-benefit-item">
                    <Package size={18} />
                    <span>Tous packs</span>
                  </div>
                </div>
              </div>

              <button className="btn-manage-sub" onClick={openManageSubscriptions}>
                <span>Gérer l'abonnement</span>
                <ExternalLink size={16} />
              </button>
            </>
          ) : user?.isAnonymous ? (
            <div className="guest-connect-card">
              <div className="guest-connect-glow" />

              <div className="guest-connect-content">
                <div className="guest-connect-icon">
                  <UserPlus size={26} />
                </div>

                <h2 className="guest-connect-title">Connecte-toi</h2>
                <p className="guest-connect-desc">Première étape pour profiter de tout</p>

                <div className="guest-connect-benefits">
                  <div className="guest-benefit">
                    <Save size={15} />
                    <span>Sauvegarde ta progression</span>
                  </div>
                  <div className="guest-benefit">
                    <Trophy size={15} />
                    <span>Accède à tes statistiques</span>
                  </div>
                  <div className="guest-benefit">
                    <Sparkles size={15} />
                    <span>Débloque Pro et plus</span>
                  </div>
                </div>

                {connectError && (
                  <div className="connect-error">{connectError}</div>
                )}

                <div className="guest-connect-buttons">
                  <button
                    className="btn-auth btn-google"
                    onClick={handleGoogleConnect}
                    disabled={connectingGoogle || connectingApple}
                  >
                    <GoogleIcon size={18} />
                    {connectingGoogle ? 'Connexion...' : 'Continuer avec Google'}
                  </button>

                  {!isAndroid && (
                    <button
                      className="btn-auth btn-apple"
                      onClick={handleAppleConnect}
                      disabled={connectingGoogle || connectingApple}
                    >
                      <AppleIcon size={18} />
                      {connectingApple ? 'Connexion...' : 'Continuer avec Apple'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="upgrade-cta-card">
              <div className="upgrade-cta-glow" />

              <div className="upgrade-cta-content">
                <div className="upgrade-cta-header">
                  <div className="upgrade-crown-icon">
                    <Crown size={28} />
                  </div>
                  <div className="upgrade-cta-text">
                    <h2 className="upgrade-cta-title">Passe à Pro</h2>
                    <p className="upgrade-cta-desc">Débloque tout le potentiel</p>
                  </div>
                </div>

                <div className="upgrade-benefits-list">
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Infinity size={16} />
                    </div>
                    <span>Parties illimitées</span>
                  </div>
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Ban size={16} />
                    </div>
                    <span>Aucune publicité</span>
                  </div>
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Package size={16} />
                    </div>
                    <span>Tous les packs de jeux</span>
                  </div>
                </div>

                <button className="upgrade-cta-btn" onClick={() => router.push('/subscribe')}>
                  <Zap size={18} />
                  <span>Débloquer Pro</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="profile-card">
          <h2 className="profile-card-title">
            <Settings size={20} />
            Paramètres
          </h2>
          <div className="settings-list">
            <button
              className="setting-item clickable"
              onClick={() => user?.isAnonymous ? null : router.push('/profile/stats')}
              disabled={user?.isAnonymous}
            >
              <div className="setting-info">
                <span className="setting-icon-wrap stats">
                  <BarChart3 size={18} />
                </span>
                <span className="setting-label">Mes statistiques</span>
              </div>
              {user?.isAnonymous ? (
                <span className="setting-badge">Connecte-toi</span>
              ) : (
                <ChevronRight size={18} className="setting-chevron" />
              )}
            </button>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon-wrap notifications">
                  <Bell size={18} />
                </span>
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
                <span className="setting-icon-wrap sound">
                  <Volume2 size={18} />
                </span>
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
                  <span className="setting-icon-wrap hue">
                    <Lightbulb size={18} />
                  </span>
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
                <span className="setting-icon-wrap language">
                  <Globe size={18} />
                </span>
                <span className="setting-label">Langue</span>
              </div>
              <span className="setting-value">Français</span>
            </div>
          </div>
        </section>

        {/* Connexions Section */}
        {!user?.isAnonymous && (
          <section className="profile-card">
            <h2 className="profile-card-title">
              <Link2 size={20} />
              Connexions
            </h2>

            <div className="connections-list">
              <button
                onClick={() => router.push('/profile/hue')}
                className="connection-item"
              >
                <div className="connection-icon hue">
                  <HueLogo />
                </div>
                <div className="connection-info">
                  <span className="connection-name">Philips Hue</span>
                  <span className="connection-desc">Effets lumineux immersifs</span>
                </div>
                <div className="connection-status-wrap">
                  {hueConnected ? (
                    <Wifi size={18} className="connection-wifi connected" />
                  ) : (
                    <WifiOff size={18} className="connection-wifi" />
                  )}
                  <ChevronRight size={18} className="connection-chevron" />
                </div>
              </button>

              {isAdmin && (
                <div className="connection-item disabled">
                  <div className="connection-icon deezer">
                    <DeezerLogo />
                  </div>
                  <div className="connection-info">
                    <span className="connection-name">Deezer</span>
                    <span className="connection-desc">Musique d'ambiance</span>
                  </div>
                  <span className="connection-badge">Bientôt</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sign Out Button */}
        <button className="btn-signout" onClick={handleSignOut}>
          Déconnexion
        </button>

        {/* Footer */}
        <div className="profile-footer">
          <p className="footer-text">Version {version}</p>
          <div className="footer-links">
            <a href="/terms" className="footer-link">CGU</a>
            <span className="footer-separator">•</span>
            <a href="/privacy" className="footer-link">Confidentialité</a>
            <span className="footer-separator">•</span>
            <a href="/legal" className="footer-link">Mentions légales</a>
          </div>
        </div>

        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>
    </div>
  );
}
