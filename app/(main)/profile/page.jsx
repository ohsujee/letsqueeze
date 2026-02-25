'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth, signOutUser, signInWithGoogle, signInWithApple, db } from '@/lib/firebase';
import { deleteUser } from 'firebase/auth';
import { ref as dbRef, remove } from 'firebase/database';
import { initializeUserProfile, updateUserPseudo, validatePseudo } from '@/lib/userProfile';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { storage } from '@/lib/utils/storage';
import { CaretRight, WifiHigh, WifiSlash, ChartBar, Sparkle, Crown, Infinity, Prohibit, Package, UserPlus, Lightning, ArrowSquareOut, FloppyDisk, Trophy, PencilSimple, Check, X, Bell, SpeakerHigh, Lightbulb, Globe, Gear, Link, Trash } from '@phosphor-icons/react';
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
  const { profile, cachedPseudo, subscription } = useUserProfile();
  const userWithSubscription = useMemo(() => user ? { ...user, subscription } : null, [user, subscription]);
  const { isPro, isAdmin } = useSubscription(userWithSubscription);
  const { isAndroid } = usePlatform();
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingApple, setConnectingApple] = useState(false);
  const [connectError, setConnectError] = useState(null);

  // Pseudo editing state
  const [isEditingPseudo, setIsEditingPseudo] = useState(false);
  const [newPseudo, setNewPseudo] = useState('');
  const [pseudoError, setPseudoError] = useState('');
  const [savingPseudo, setSavingPseudo] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      setDeleteError('');
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Supprimer les données utilisateur dans Realtime DB
      try {
        await remove(dbRef(db, `users/${currentUser.uid}`));
      } catch (e) {
        console.warn('[deleteAccount] DB cleanup error:', e);
      }

      // Vider le localStorage
      localStorage.clear();

      // Supprimer le compte Firebase Auth
      await deleteUser(currentUser);

      router.push('/onboarding');
    } catch (err) {
      console.error('[deleteAccount] Error:', err);
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('Pour ta sécurité, déconnecte-toi et reconnecte-toi avant de supprimer ton compte.');
      } else {
        setDeleteError('Une erreur est survenue. Réessaie.');
      }
      setIsDeletingAccount(false);
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
      console.error('[Auth] Google connection error:', err.code, err.message);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss') || err.code === 'USER_CANCELLED') {
        // Utilisateur a annulé → pas d'erreur affichée
      } else if (err.code === 'auth/network-request-failed') {
        setConnectError('Problème réseau, réessaie.');
      } else {
        setConnectError('Erreur de connexion Google');
      }
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

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ProfileSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          className="profile-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
      <main className="profile-content">
        {/* Profile Header */}
        <section className="profile-header">
          <div className="profile-avatar-container">
            <div className="profile-avatar-placeholder">
              {getInitials(user?.displayName)}
            </div>
          </div>

          <div className="user-info">
            <AnimatePresence mode="wait">
              {isEditingPseudo ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <div className="pseudo-inline-edit">
                    <input
                      type="text"
                      className="pseudo-inline-input"
                      value={newPseudo}
                      onChange={(e) => { setNewPseudo(e.target.value); setPseudoError(''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePseudo();
                        if (e.key === 'Escape') handleCancelEditPseudo();
                      }}
                      placeholder="Ton pseudo"
                      maxLength={16}
                      autoFocus
                    />
                    <button className="pseudo-action-btn save" onClick={handleSavePseudo} disabled={savingPseudo}>
                      <Check size={16} weight="fill" />
                    </button>
                    <button className="pseudo-action-btn cancel" onClick={handleCancelEditPseudo} disabled={savingPseudo}>
                      <X size={16} weight="fill" />
                    </button>
                  </div>
                  {pseudoError && <p className="pseudo-error-inline">{pseudoError}</p>}
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
                    <PencilSimple size={14} weight="fill" />
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
                <div className="pro-card-shimmer" />
                <div className="pro-status-header">
                  <div className="pro-crown-icon">
                    <Crown size={24} weight="fill" />
                  </div>
                  <div className="pro-status-info">
                    <h2 className="pro-status-title">Gigglz Pro</h2>
                    <p className="pro-status-desc">Tous les avantages débloqués</p>
                    {isAdmin
                      ? <p className="pro-status-expiry">Accès à vie ✦</p>
                      : subscription?.expiresAt
                        ? <p className="pro-status-expiry">Valide jusqu'au {new Date(subscription.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        : null
                    }
                  </div>
                </div>

                <div className="pro-benefits-row">
                  <div className="pro-benefit-item">
                    <Infinity size={18} weight="bold" />
                    <span>Illimité</span>
                  </div>
                  <div className="pro-benefit-item">
                    <Prohibit size={18} weight="bold" />
                    <span>Sans pub</span>
                  </div>
                  <div className="pro-benefit-item">
                    <Package size={18} weight="fill" />
                    <span>Tous packs</span>
                  </div>
                </div>
              </div>

              <button className="btn-manage-sub" onClick={openManageSubscriptions}>
                <span>Gérer l'abonnement</span>
                <ArrowSquareOut size={16} weight="fill" />
              </button>
            </>
          ) : user?.isAnonymous ? (
            <div className="guest-connect-card">
              <div className="guest-connect-content">
                <div className="guest-connect-icon">
                  <UserPlus size={26} weight="fill" />
                </div>

                <h2 className="guest-connect-title">Connecte-toi</h2>
                <p className="guest-connect-desc">Première étape pour profiter de tout</p>

                <div className="guest-connect-benefits">
                  <div className="guest-benefit">
                    <FloppyDisk size={15} weight="fill" />
                    <span>Sauvegarde ta progression</span>
                  </div>
                  <div className="guest-benefit">
                    <Trophy size={15} weight="fill" />
                    <span>Accède à tes statistiques</span>
                  </div>
                  <div className="guest-benefit">
                    <Sparkle size={15} weight="fill" />
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
              <div className="upgrade-cta-content">
                <div className="upgrade-cta-header">
                  <div className="upgrade-crown-icon">
                    <Crown size={28} weight="fill" />
                  </div>
                  <div className="upgrade-cta-text">
                    <h2 className="upgrade-cta-title">Passe à Pro</h2>
                    <p className="upgrade-cta-desc">Débloque tout le potentiel</p>
                  </div>
                </div>

                <div className="upgrade-benefits-list">
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Infinity size={16} weight="fill" />
                    </div>
                    <span>Parties illimitées</span>
                  </div>
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Prohibit size={16} weight="fill" />
                    </div>
                    <span>Aucune publicité</span>
                  </div>
                  <div className="upgrade-benefit">
                    <div className="upgrade-benefit-icon">
                      <Package size={16} weight="fill" />
                    </div>
                    <span>Tous les packs de jeux</span>
                  </div>
                </div>

                <button className="upgrade-cta-btn" onClick={() => router.push('/subscribe')}>
                  <Lightning size={18} weight="fill" />
                  <span>Débloquer Pro</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Settings Section */}
        <section className="profile-card">
          <h2 className="profile-card-title">
            <Gear size={20} weight="fill" />
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
                  <ChartBar size={18} weight="fill" />
                </span>
                <span className="setting-label">Mes statistiques</span>
              </div>
              {user?.isAnonymous ? (
                <span className="setting-badge">Connecte-toi</span>
              ) : (
                <CaretRight size={18} weight="fill" className="setting-chevron" />
              )}
            </button>

            <div className="setting-item">
              <div className="setting-info">
                <span className="setting-icon-wrap notifications">
                  <Bell size={18} weight="fill" />
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
                  <SpeakerHigh size={18} weight="fill" />
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
                    <Lightbulb size={18} weight="fill" />
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
                  <Globe size={18} weight="fill" />
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
              <Link size={20} weight="fill" />
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
                    <WifiHigh size={18} weight="fill" className="connection-wifi connected" />
                  ) : (
                    <WifiSlash size={18} weight="fill" className="connection-wifi" />
                  )}
                  <CaretRight size={18} weight="fill" className="connection-chevron" />
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

        {/* Danger Zone */}
        {!user?.isAnonymous && (
          <div className="danger-zone">
            <button className="btn-delete-account" onClick={() => setShowDeleteModal(true)}>
              <Trash size={14} weight="fill" />
              Supprimer mon compte
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="profile-footer">
          <p className="footer-text">Version {version}</p>
          <div className="footer-links">
            <a href="/support" className="footer-link">Aide</a>
            <span className="footer-separator">•</span>
            <a href="/terms" className="footer-link">CGU</a>
            <span className="footer-separator">•</span>
            <a href="/privacy" className="footer-link">Confidentialité</a>
            <span className="footer-separator">•</span>
            <a href="/legal" className="footer-link">Mentions légales</a>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="delete-modal-overlay" onClick={() => !isDeletingAccount && setShowDeleteModal(false)}>
            <motion.div
              className="delete-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="delete-modal-icon">
                <Trash size={26} weight="fill" />
              </div>
              <h3 className="delete-modal-title">Supprimer mon compte</h3>
              <p className="delete-modal-text">
                Cette action est <strong>irréversible</strong>. Ton profil, ton historique de parties, tes scores et ton abonnement Pro seront supprimés définitivement.
              </p>
              {deleteError && <p className="delete-modal-error">{deleteError}</p>}
              <div className="delete-modal-actions">
                <button
                  className="btn-delete-cancel"
                  onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                  disabled={isDeletingAccount}
                >
                  Annuler
                </button>
                <button
                  className="btn-delete-confirm"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom padding for nav */}
        <div className="bottom-padding"></div>
      </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
