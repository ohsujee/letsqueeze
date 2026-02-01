'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Crown, Sparkles, Zap, Gift, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackPaywallShown, trackPaywallConversion } from '@/lib/analytics';
import { auth, signInWithGoogle, signInWithApple } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/userProfile';
import { usePlatform } from '@/lib/hooks/usePlatform';
import { GoogleIcon, AppleIcon } from '@/components/icons';
import { PRO_PRICING, PRO_CONTENT } from '@/lib/subscription';
import { purchaseSubscription } from '@/lib/revenuecat';
import { Capacitor } from '@capacitor/core';

// Sample content previews (5 items + "+" = 6 = 2 rows of 3)
const ALIBI_PREVIEWS = [
  { emoji: '🎤', name: 'Karaoké' },
  { emoji: '🎰', name: 'Casino' },
  { emoji: '🎳', name: 'Bowling' },
  { emoji: '🍸', name: 'Cocktails' },
  { emoji: '🔐', name: 'Escape Game' },
];

const QUIZ_PREVIEWS = [
  { emoji: '🍥', name: 'Naruto' },
  { emoji: '🏴‍☠️', name: 'One Piece' },
  { emoji: '🏰', name: 'Disney' },
  { emoji: '☕', name: 'Friends' },
  { emoji: '🎬', name: 'Cinéma' },
];

export default function PaywallModal({ isOpen, onClose, contentType = 'quiz', contentName = '' }) {
  const { isAndroid } = usePlatform();
  const [pricingTier, setPricingTier] = useState('annual');
  const [isGuest, setIsGuest] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContainerRef = useRef(null);

  const isNative = Capacitor.isNativePlatform();

  const previews = contentType === 'alibi' ? ALIBI_PREVIEWS : QUIZ_PREVIEWS;
  const content = contentType === 'alibi' ? PRO_CONTENT.alibi : PRO_CONTENT.quiz;

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      setIsGuest(auth.currentUser.isAnonymous);
      trackPaywallShown(contentType, contentName, auth.currentUser.uid);
    }
  }, [isOpen, contentType, contentName]);

  // Scroll detection for indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isOpen) return;

    const checkScroll = () => {
      setCanScrollUp(container.scrollTop > 10);
      setCanScrollDown(
        container.scrollHeight - container.scrollTop - container.clientHeight > 10
      );
    };

    // Initial check after a small delay to let content render
    const timer = setTimeout(checkScroll, 100);
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [isOpen, isGuest]);

  const handleGoogleConnect = async () => {
    try {
      setLoadingGoogle(true);
      setConnectionError(null);
      const result = await signInWithGoogle();
      if (result?.user) {
        await initializeUserProfile(result.user);
        setIsGuest(false);
      }
    } catch (err) {
      console.error('Google connection error:', err);
      setConnectionError('Erreur de connexion Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleAppleConnect = async () => {
    try {
      setLoadingApple(true);
      setConnectionError(null);
      const result = await signInWithApple();
      if (result?.user) {
        await initializeUserProfile(result.user);
        setIsGuest(false);
      }
    } catch (err) {
      console.error('Apple connection error:', err);
      setConnectionError(err.code === 'auth/operation-not-allowed'
        ? 'Connexion Apple bientôt disponible !'
        : 'Erreur de connexion Apple');
    } finally {
      setLoadingApple(false);
    }
  };

  const handleUpgrade = async () => {
    if (auth.currentUser) {
      trackPaywallConversion(contentType, auth.currentUser.uid, pricingTier);
    }

    // Sur le web, afficher un message
    if (!isNative) {
      setPurchaseError('Les achats sont disponibles dans l\'application mobile Gigglz.');
      return;
    }

    setLoadingPurchase(true);
    setPurchaseError(null);

    try {
      const result = await purchaseSubscription(pricingTier);

      if (result.success) {
        // Achat réussi - fermer la modal
        onClose();
        // Le statut Pro sera mis à jour via le webhook ou le prochain check
      } else if (result.error === 'cancelled') {
        // L'utilisateur a annulé - pas d'erreur à afficher
        setLoadingPurchase(false);
      } else {
        setPurchaseError(result.error || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseError('Une erreur est survenue lors de l\'achat');
    } finally {
      setLoadingPurchase(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
        {/* Decorative elements */}
        <div className="paywall-glow" />
        <div className="paywall-pattern" />

        {/* Close button */}
        <button onClick={onClose} className="paywall-close" aria-label="Fermer">
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Scroll indicator - Up */}
        <div className={`paywall-scroll-indicator up ${canScrollUp ? 'visible' : ''}`}>
          <ChevronUp size={18} />
        </div>

        {isGuest ? (
          /* ===== GUEST VIEW ===== */
          <div className="paywall-content" ref={scrollContainerRef}>
            <div className="paywall-header">
              <div className="paywall-icon guest">
                <Sparkles size={24} />
              </div>
              <h2 className="paywall-title">Crée ton compte</h2>
              <p className="paywall-subtitle">
                Connecte-toi pour débloquer tout le contenu
              </p>
            </div>

            {connectionError && (
              <div className="paywall-error">{connectionError}</div>
            )}

            <div className="paywall-auth-buttons">
              <button
                onClick={handleGoogleConnect}
                disabled={loadingGoogle || loadingApple}
                className="paywall-auth-btn google"
              >
                <GoogleIcon />
                <span>{loadingGoogle ? 'Connexion...' : 'Continuer avec Google'}</span>
              </button>

              {!isAndroid && (
                <button
                  onClick={handleAppleConnect}
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
        ) : (
          /* ===== CONNECTED USER VIEW ===== */
          <div className="paywall-content" ref={scrollContainerRef}>
            {/* Header with crown */}
            <div className="paywall-header">
              <div className="paywall-icon pro">
                <Crown size={24} />
              </div>
              <h2 className="paywall-title">
                {contentType === 'alibi' ? 'Plus d\'alibis' : 'Plus de quiz'}
              </h2>
              <p className="paywall-subtitle">
                Débloque <strong>{content.proOnly}</strong> {contentType === 'alibi' ? 'scénarios' : 'thèmes'} supplémentaires
              </p>
            </div>

            {/* Content preview grid */}
            <div className="paywall-preview">
              <div className="preview-grid">
                {previews.map((item, i) => (
                  <motion.div
                    key={item.name}
                    className="preview-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="preview-emoji">{item.emoji}</span>
                    <span className="preview-name">{item.name}</span>
                  </motion.div>
                ))}
                <div className="preview-item more">
                  <span className="preview-more">+{content.proOnly - previews.length}</span>
                </div>
              </div>
            </div>

            {/* Benefits - clean, no emojis */}
            <div className="paywall-benefits">
              <div className="benefit-item">
                <Zap size={18} className="benefit-icon" />
                <span>Parties illimitées</span>
              </div>
              <div className="benefit-item">
                <Gift size={18} className="benefit-icon" />
                <span>Sans publicités</span>
              </div>
            </div>

            {/* Pricing toggle */}
            <div className="paywall-pricing">
              <button
                className={`pricing-option ${pricingTier === 'monthly' ? 'selected' : ''}`}
                onClick={() => setPricingTier('monthly')}
              >
                <span className="pricing-label">{PRO_PRICING.monthly.label}</span>
                <span className="pricing-price">{PRO_PRICING.monthly.formatted}</span>
                <span className="pricing-period">/mois</span>
              </button>

              <button
                className={`pricing-option best ${pricingTier === 'annual' ? 'selected' : ''}`}
                onClick={() => setPricingTier('annual')}
              >
                <span className="pricing-badge">-{PRO_PRICING.annual.savingsPercent}%</span>
                <span className="pricing-label">{PRO_PRICING.annual.label}</span>
                <span className="pricing-price">{PRO_PRICING.annual.formatted}</span>
                <span className="pricing-period">/an</span>
                <span className="pricing-equivalent">{PRO_PRICING.annual.monthlyEquivalentFormatted}/mois</span>
              </button>
            </div>

            {/* Purchase error */}
            {purchaseError && (
              <div className="paywall-error">{purchaseError}</div>
            )}

            {/* CTA */}
            <motion.button
              className={`paywall-cta ${loadingPurchase ? 'loading' : ''}`}
              onClick={handleUpgrade}
              disabled={loadingPurchase}
              whileHover={loadingPurchase ? {} : { scale: 1.02 }}
              whileTap={loadingPurchase ? {} : { scale: 0.98 }}
            >
              {loadingPurchase ? (
                <span>Chargement...</span>
              ) : (
                <>
                  <Crown size={20} />
                  <span>{isNative ? 'Débloquer Pro' : 'Disponible sur mobile'}</span>
                  <ChevronRight size={20} />
                </>
              )}
            </motion.button>

            <button onClick={onClose} className="paywall-skip">
              Peut-être plus tard
            </button>

            <p className="paywall-legal">
              {isNative ? 'Annulation possible à tout moment' : 'Téléchargez l\'app Gigglz sur iOS ou Android'}
            </p>
          </div>
        )}

        {/* Scroll indicator - Down */}
        <div className={`paywall-scroll-indicator down ${canScrollDown ? 'visible' : ''}`}>
          <ChevronDown size={18} />
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
