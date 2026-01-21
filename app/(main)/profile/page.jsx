'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, signOutUser, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile, updateUserPseudo, validatePseudo } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { storage } from '@/lib/utils/storage';
import { ChevronRight, Wifi, WifiOff, BarChart3, Sparkles, Crown, Infinity, Ban, Package, UserPlus, Zap, ExternalLink, Save, Trophy, Pencil, Check, X } from 'lucide-react';
import { openManageSubscriptions } from '@/lib/revenuecat';
import hueService from '@/lib/hue-module/services/hueService';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileSkeleton from '@/components/ui/ProfileSkeleton';

// Brand Logos
const HueLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M20.672 9.6c-2.043 0-3.505 1.386-3.682 3.416h-.664c-.247 0-.395.144-.395.384 0 .24.148.384.395.384h.661c.152 2.09 1.652 3.423 3.915 3.423.944 0 1.685-.144 2.332-.453.158-.075.337-.217.292-.471a.334.334 0 0 0-.15-.242c-.104-.065-.25-.072-.422-.02a7.93 7.93 0 0 0-.352.12c-.414.146-.771.273-1.599.273-1.75 0-2.908-1.023-2.952-2.605v-.025h5.444c.313 0 .492-.164.505-.463v-.058C23.994 9.865 21.452 9.6 20.672 9.6zm2.376 3.416h-5l.004-.035c.121-1.58 1.161-2.601 2.649-2.601 1.134 0 2.347.685 2.347 2.606zM9.542 10.221c0-.335-.195-.534-.52-.534s-.52.2-.52.534v2.795h1.04zm4.29 3.817c0 1.324-.948 2.361-2.16 2.361-1.433 0-2.13-.763-2.13-2.333v-.282h-1.04v.34c0 2.046.965 3.083 2.868 3.083 1.12 0 1.943-.486 2.443-1.445l.02-.036v.861c0 .334.193.534.519.534.325 0 .52-.2.52-.534v-2.803h-1.04zm.52-4.351c-.326 0-.52.2-.52.534v2.795h1.04v-2.795c0-.335-.195-.534-.52-.534zM3.645 9.6c-1.66 0-2.31 1.072-2.471 1.4l-.135.278V7.355c0-.347-.199-.562-.52-.562-.32 0-.519.215-.519.562v5.661h1.039v-.015c0-1.249.72-2.592 2.304-2.592 1.29 0 2.001.828 2.001 2.332v.275h1.04v-.246c0-2.044-.973-3.17-2.739-3.17zM0 16.558c0 .347.199.563.52.563.32 0 .519-.216.519-.563v-2.774H0zm5.344 0c0 .347.2.563.52.563s.52-.216.52-.563v-2.774h-1.04z"/>
  </svg>
);

const SpotifyLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const DeezerLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027h-5.19zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [hueEffectsEnabled, setHueEffectsEnabled] = useState(true);
  const [hueConnected, setHueConnected] = useState(false);
  const { isPro, isAdmin } = useSubscription(user);
  const { profile } = useUserProfile();
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
        // Clear guest tracking
        storage.remove('guestGamesPlayed');
        storage.remove('guestPromptDismissedAt');
        // User state will update via onAuthStateChanged
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

  // Start editing pseudo
  const handleStartEditPseudo = () => {
    setNewPseudo(profile?.pseudo || user?.displayName?.split(' ')[0] || '');
    setPseudoError('');
    setIsEditingPseudo(true);
  };

  // Cancel editing pseudo
  const handleCancelEditPseudo = () => {
    setIsEditingPseudo(false);
    setNewPseudo('');
    setPseudoError('');
  };

  // Save new pseudo
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
            {/* Badge Pro sous l'avatar */}
            {isPro && (
              <div className="pro-badge-pill">
                <Sparkles size={12} />
                <span>PRO</span>
              </div>
            )}
          </div>

          {/* User Info - Pseudo as main name, editable for everyone */}
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
                  {profile?.pseudo || user?.displayName?.split(' ')[0] || 'Joueur'}
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
              {/* Pro Status Card */}
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
            <>
              {/* Guest Connect Card - Style Guide Compliant */}
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
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {connectingGoogle ? 'Connexion...' : 'Continuer avec Google'}
                    </button>

                    <button
                      className="btn-auth btn-apple"
                      onClick={handleAppleConnect}
                      disabled={connectingGoogle || connectingApple}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      {connectingApple ? 'Connexion...' : 'Continuer avec Apple'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Upgrade CTA Card */}
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
            </>
          )}
        </section>

        {/* Settings Section */}
        <section className="card settings-card">
          <h2 className="card-title">
            <span className="card-icon">⚙️</span>
            Paramètres
          </h2>
          <div className="settings-list">
            {/* Stats Button */}
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

        {/* Connexions Section - Only show for connected users */}
        {!user?.isAnonymous && (
          <section className="card connections-card">
            <h2 className="card-title">
              <span className="card-icon">🔗</span>
              Connexions
            </h2>

            <div className="connections-list">
              {/* Philips Hue */}
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
                    <span className="connection-status connected">
                      <Wifi size={14} />
                      Connecté
                    </span>
                  ) : (
                    <span className="connection-status">
                      <WifiOff size={14} />
                      Non connecté
                    </span>
                  )}
                  <ChevronRight size={18} className="connection-chevron" />
                </div>
              </button>

              {/* Spotify */}
              <button
                onClick={() => router.push('/profile/spotify')}
                className="connection-item"
              >
                <div className="connection-icon spotify">
                  <SpotifyLogo />
                </div>
                <div className="connection-info">
                  <span className="connection-name">Spotify</span>
                  <span className="connection-desc">Blind Test musical</span>
                </div>
                <div className="connection-status-wrap">
                  <ChevronRight size={18} className="connection-chevron" />
                </div>
              </button>

              {/* Deezer - Coming Soon */}
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
            </div>
          </section>
        )}

        {/* Sign Out Button */}
        <button className="btn-signout" onClick={handleSignOut}>
          Déconnexion
        </button>

        {/* Footer */}
        <div className="profile-footer">
          <p className="footer-text">Version 1.0.0</p>
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
      </motion.main>

      <style jsx>{`
        .profile-container {
          flex: 1; min-height: 0;
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
          margin-bottom: 1.5rem;
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

        .pro-badge-pill {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          border-radius: 999px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
          color: #1a1a2e;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow:
            0 2px 0 #b45309,
            0 4px 12px rgba(251, 191, 36, 0.5),
            0 0 20px rgba(251, 191, 36, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
          z-index: 10;
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

        /* ===== SUBSCRIPTION SECTION ===== */
        .subscription-section {
          margin-bottom: 1rem;
        }

        /* Pro Status Card - For subscribed users */
        .pro-status-card {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 16px;
          padding: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .pro-status-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .pro-crown-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a2e;
          box-shadow:
            0 4px 12px rgba(251, 191, 36, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .pro-status-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.125rem;
          font-weight: 400;
          color: #fbbf24;
          margin: 0;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
        }

        .pro-status-desc {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0.25rem 0 0 0;
        }

        .pro-benefits-row {
          display: flex;
          justify-content: space-around;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(251, 191, 36, 0.15);
        }

        .pro-benefit-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          color: rgba(251, 191, 36, 0.9);
        }

        .pro-benefit-item span {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: rgba(255, 255, 255, 0.7);
        }

        .btn-manage-sub {
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-manage-sub:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Guest Connect Card - Style Guide: Glassmorphism + Glow */
        .guest-connect-card {
          position: relative;
          background: rgba(20, 20, 30, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 20px;
          overflow: hidden;
        }

        .guest-connect-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(34, 197, 94, 0.15) 0%, transparent 50%);
          pointer-events: none;
          animation: connect-glow 3s ease-in-out infinite;
        }

        @keyframes connect-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .guest-connect-content {
          position: relative;
          z-index: 1;
          padding: 1.25rem;
          text-align: center;
        }

        .guest-connect-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 0.75rem;
          border-radius: 14px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow:
            0 4px 0 #15803d,
            0 6px 20px rgba(34, 197, 94, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .guest-connect-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.25rem;
          font-weight: 400;
          color: #4ade80;
          margin: 0 0 0.25rem 0;
          text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }

        .guest-connect-desc {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 1rem 0;
        }

        .guest-connect-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .guest-benefit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #4ade80;
        }

        .guest-benefit span {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .guest-connect-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        /* Auth Buttons - Style Guide: 3D with shadows */
        .btn-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-auth:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .btn-auth.btn-google {
          background: #ffffff;
          color: #1f1f1f;
          border: none;
          box-shadow:
            0 3px 0 #e5e5e5,
            0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-auth.btn-google:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 5px 0 #e5e5e5,
            0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .btn-auth.btn-google:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 #e5e5e5,
            0 2px 6px rgba(0, 0, 0, 0.1);
        }

        .btn-auth.btn-apple {
          background: #000000;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow:
            0 3px 0 #1a1a1a,
            0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .btn-auth.btn-apple:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 5px 0 #1a1a1a,
            0 6px 16px rgba(0, 0, 0, 0.4);
        }

        .btn-auth.btn-apple:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 #1a1a1a,
            0 2px 6px rgba(0, 0, 0, 0.2);
        }

        /* Upgrade CTA Card - For free users */
        .upgrade-cta-card {
          position: relative;
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          overflow: hidden;
        }

        .upgrade-cta-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
          pointer-events: none;
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .upgrade-cta-content {
          position: relative;
          z-index: 1;
          padding: 1.5rem;
        }

        .upgrade-cta-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .upgrade-crown-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow:
            0 4px 0 #6d28d9,
            0 8px 20px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .upgrade-cta-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: 1.25rem;
          font-weight: 400;
          color: white;
          margin: 0;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }

        .upgrade-cta-desc {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0.25rem 0 0 0;
        }

        .upgrade-benefits-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .upgrade-benefit {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .upgrade-benefit-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(139, 92, 246, 0.2);
          border: 1px solid rgba(139, 92, 246, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a78bfa;
        }

        .upgrade-benefit span {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .upgrade-cta-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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
            0 8px 24px rgba(139, 92, 246, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .upgrade-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 0 #6d28d9,
            0 12px 32px rgba(139, 92, 246, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .upgrade-cta-btn:active {
          transform: translateY(2px);
          box-shadow:
            0 2px 0 #6d28d9,
            0 4px 12px rgba(139, 92, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
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

        .stat-sublabel {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
          margin-top: 0.125rem;
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

        /* Clickable Setting Item (Stats button) */
        .setting-item.clickable {
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .setting-item.clickable:not(:disabled):hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.2);
        }

        .setting-item.clickable:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .setting-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .setting-icon-wrap.stats {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
        }

        .setting-chevron {
          color: var(--text-tertiary, rgba(255, 255, 255, 0.4));
          transition: transform 0.2s ease;
        }

        .setting-item.clickable:hover .setting-chevron {
          transform: translateX(2px);
          color: rgba(139, 92, 246, 0.8);
        }

        .setting-badge {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 6px;
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

        /* Connections Card */
        .guest-notice {
          text-align: center;
          padding: 1.5rem 1rem;
        }

        .guest-notice p {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.875rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.6));
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .connect-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 1rem;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.8125rem;
          color: #ef4444;
          text-align: center;
        }

        .connect-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-connect {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          width: 100%;
        }

        .btn-connect:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .btn-connect.btn-google {
          background: #ffffff;
          color: #1f1f1f;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-connect.btn-google:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .btn-connect.btn-google:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .btn-connect.btn-apple {
          background: #000000;
          color: #ffffff;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .btn-connect.btn-apple:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .btn-connect.btn-apple:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .connections-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .connection-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }

        .connection-item:hover:not(.disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-1px);
        }

        .connection-item.disabled {
          cursor: default;
          opacity: 0.6;
        }

        .connection-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .connection-icon.hue {
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .connection-icon.spotify {
          background: linear-gradient(135deg, #1DB954, #1ed760);
          box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
        }

        .connection-icon.deezer {
          background: linear-gradient(135deg, #ff0092, #a238ff);
          box-shadow: 0 4px 12px rgba(255, 0, 146, 0.3);
        }

        .connection-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }

        .connection-name {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary, #ffffff);
        }

        .connection-desc {
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.75rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.5));
        }

        .connection-status-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.6875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .connection-status.connected {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.15);
        }

        .connection-chevron {
          color: var(--text-tertiary, rgba(255, 255, 255, 0.3));
        }

        .connection-badge {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.4);
          padding: 0.25rem 0.625rem;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 6px;
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
