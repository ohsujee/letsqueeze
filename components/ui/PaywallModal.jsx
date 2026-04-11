'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkle, Lightning, Gift, Star, CaretRight } from '@phosphor-icons/react';
import { Capacitor } from '@capacitor/core';

import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { trackPaywallShown, trackPaywallConversion } from '@/lib/analytics';
import { auth, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { GoogleIcon, AppleIcon } from '@/components/icons';
import { PRO_PRICING } from '@/lib/subscription';
import { purchaseSubscription } from '@/lib/revenuecat';

import './PaywallModal.css';

const BENEFITS = [
  { icon: Star, label: 'Tout le contenu débloqué' },
  { icon: Lightning, label: 'Parties illimitées' },
  { icon: Gift, label: 'Sans publicités' },
];

/**
 * PaywallModal — réutilisable par tous les jeux
 *
 * Couleurs adaptables via les props `gameColor` / `gameColorDark`.
 * Par défaut : couleurs alibi (orange). Passer les couleurs du jeu depuis
 * le lobby via `GAME_COLORS[gameId].primary` / `.secondary`.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {'quiz'|'alibi'|'blindtest'|...} contentType - utilisé pour analytics
 * @param {string} contentName - nom spécifique (ex: alibi bloqué) pour analytics
 * @param {string} gameColor - couleur primaire du jeu (highlight + CTA + icône)
 * @param {string} gameColorDark - version sombre pour les border-bottom 3D
 */
export default function PaywallModal({
  isOpen,
  onClose,
  contentType = 'quiz',
  contentName = '',
  gameColor = '#f59e0b',
  gameColorDark = '#b45309',
}) {
  const { isAndroid } = usePlatform();
  useBackHandler(onClose, isOpen);

  const [pricingTier, setPricingTier] = useState('annual');
  const [isGuest, setIsGuest] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);

  const isNative = Capacitor.isNativePlatform();

  // Track paywall open + detect guest on open
  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;
    setIsGuest(auth.currentUser.isAnonymous);
    trackPaywallShown(contentType, contentName, auth.currentUser.uid);
  }, [isOpen, contentType, contentName]);

  const handleGoogleConnect = useCallback(async () => {
    try {
      setLoadingGoogle(true);
      setConnectionError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        setIsGuest(false);
      }
    } catch (err) {
      console.error('[Paywall] Google connection error:', err);
      setConnectionError('Erreur de connexion Google');
    } finally {
      setLoadingGoogle(false);
    }
  }, []);

  const handleAppleConnect = useCallback(async () => {
    try {
      setLoadingApple(true);
      setConnectionError(null);
      const result = await signInWithApple();
      if (result?.user) {
        await initializeUserProfile(result.user);
        setIsGuest(false);
      }
    } catch (err) {
      console.error('[Paywall] Apple connection error:', err);
      setConnectionError(
        err.code === 'auth/operation-not-allowed'
          ? 'Connexion Apple bientôt disponible !'
          : 'Erreur de connexion Apple'
      );
    } finally {
      setLoadingApple(false);
    }
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (auth.currentUser) {
      trackPaywallConversion(contentType, auth.currentUser.uid, pricingTier);
    }

    // Web: pas d'achat possible → juste fermer la modale
    if (!isNative) {
      onClose();
      return;
    }

    setLoadingPurchase(true);
    setPurchaseError(null);

    try {
      // pricingTier est bien passé à RevenueCat → le bon product est acheté
      const result = await purchaseSubscription(pricingTier);
      if (result.success) {
        onClose();
      } else if (result.error === 'cancelled') {
        // Annulation utilisateur = pas d'erreur à afficher
      } else {
        setPurchaseError(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('[Paywall] Purchase error:', error);
      setPurchaseError('Une erreur est survenue lors de l\'achat');
    } finally {
      setLoadingPurchase(false);
    }
  }, [isNative, onClose, pricingTier, contentType]);

  const modalStyle = { '--game-color': gameColor, '--game-color-dark': gameColorDark };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="paywall-backdrop"
            className="paywall-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div key="paywall-wrapper" className="paywall-modal-wrapper">
            <motion.div
              className="paywall-modal"
              style={modalStyle}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button onClick={onClose} className="paywall-close" aria-label="Fermer">
                <X size={18} weight="bold" />
              </button>

              {isGuest ? (
                <GuestView
                  isAndroid={isAndroid}
                  loadingGoogle={loadingGoogle}
                  loadingApple={loadingApple}
                  connectionError={connectionError}
                  onGoogleConnect={handleGoogleConnect}
                  onAppleConnect={handleAppleConnect}
                  onClose={onClose}
                />
              ) : (
                <ProView
                  pricingTier={pricingTier}
                  onSelectTier={setPricingTier}
                  loadingPurchase={loadingPurchase}
                  purchaseError={purchaseError}
                  onUpgrade={handleUpgrade}
                />
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Guest view ────────────────────────────────────────────── */

function GuestView({ isAndroid, loadingGoogle, loadingApple, connectionError, onGoogleConnect, onAppleConnect, onClose }) {
  return (
    <div className="paywall-content">
      <div className="paywall-header">
        <div className="paywall-icon guest">
          <Sparkle size={24} weight="fill" />
        </div>
        <h2 className="paywall-title">Crée ton compte</h2>
        <p className="paywall-subtitle">Connecte-toi pour débloquer tout le contenu</p>
      </div>

      {connectionError && <div className="paywall-error">{connectionError}</div>}

      <div className="paywall-auth-buttons">
        <button
          onClick={onGoogleConnect}
          disabled={loadingGoogle || loadingApple}
          className="paywall-auth-btn google"
        >
          <GoogleIcon />
          <span>{loadingGoogle ? 'Connexion...' : 'Continuer avec Google'}</span>
        </button>

        {!isAndroid && (
          <button
            onClick={onAppleConnect}
            disabled={loadingGoogle || loadingApple}
            className="paywall-auth-btn apple"
          >
            <AppleIcon />
            <span>{loadingApple ? 'Connexion...' : 'Continuer avec Apple'}</span>
          </button>
        )}
      </div>

      <button onClick={onClose} className="paywall-skip">
        Plus tard
      </button>
    </div>
  );
}

/* ── Pro view ──────────────────────────────────────────────── */

function ProView({ pricingTier, onSelectTier, loadingPurchase, purchaseError, onUpgrade }) {
  return (
    <div className="paywall-content">
      <div className="paywall-header">
        <div className="paywall-icon pro">
          <Crown size={28} weight="fill" />
        </div>
        <h2 className="paywall-title">Passe au niveau supérieur</h2>
      </div>

      {/* Benefits */}
      <div className="paywall-benefits">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <div key={label} className="benefit-item">
            <Icon size={20} weight="fill" className="benefit-icon" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Pricing — 2 options with sliding highlight */}
      <div className="paywall-pricing">
        <motion.div
          className="pricing-highlight"
          animate={{ x: pricingTier === 'annual' ? 'calc(100% + 0.75rem)' : '0%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />

        <PricingOption
          tier="monthly"
          label="Mensuel"
          price={PRO_PRICING.monthly.formatted}
          period="/mois"
          selected={pricingTier === 'monthly'}
          onClick={() => onSelectTier('monthly')}
        />

        <PricingOption
          tier="annual"
          label="Annuel"
          price={PRO_PRICING.annual.monthlyEquivalentFormatted}
          period="/mois"
          equivalent={`${PRO_PRICING.annual.formatted}/an`}
          badge={`-${PRO_PRICING.annual.savingsPercent}%`}
          best
          selected={pricingTier === 'annual'}
          onClick={() => onSelectTier('annual')}
        />
      </div>

      {purchaseError && <div className="paywall-error">{purchaseError}</div>}

      <button
        className={`paywall-cta ${loadingPurchase ? 'loading' : ''}`}
        onClick={onUpgrade}
        disabled={loadingPurchase}
      >
        {loadingPurchase ? (
          <span>Chargement...</span>
        ) : (
          <>
            <Crown size={20} weight="fill" />
            <span>Commencer maintenant</span>
            <CaretRight size={18} weight="bold" />
          </>
        )}
      </button>

      <p className="paywall-legal">Annulation possible à tout moment</p>
    </div>
  );
}

/* ── Pricing option card ───────────────────────────────────── */

function PricingOption({ tier, label, price, period, equivalent, badge, best, selected, onClick }) {
  return (
    <button
      className={`pricing-option${best ? ' best' : ''}${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      {badge && <span className="pricing-badge">{badge}</span>}
      <div className="pricing-main">
        <span className="pricing-label">{label}</span>
        <div className="pricing-amount">
          <span className="pricing-price">{price}</span>
          <span className="pricing-period">{period}</span>
        </div>
      </div>
      <span className="pricing-equivalent" aria-hidden={!equivalent}>
        {equivalent || '\u00A0'}
      </span>
    </button>
  );
}
