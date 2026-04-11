'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { PRO_PRICING } from '@/lib/subscription';
import {
  initRevenueCat,
  purchaseSubscription,
  restorePurchases,
  openManageSubscriptions
} from '@/lib/revenuecat';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  Crown,
  Check,
  X,
  Zap,
  Infinity,
  Ban,
  Package,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useAuthProtect } from '@/lib/hooks/useAuthProtect';
import { useAppShellBg } from '@/lib/hooks/useAppShellBg';
import LoadingScreen from '@/components/ui/LoadingScreen';
import './subscribe.css';

export default function SubscribePage() {
  useAppShellBg('#0e0e1a');
  const router = useRouter();
  const { user, loading } = useAuthProtect({ allowGuests: true });
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNative, setIsNative] = useState(false);
  const { isPro } = useSubscription(user);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (user?.uid) {
      initRevenueCat(user.uid);
    }
  }, [user]);

  const handleSubscribe = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    if (!isNative) {
      setIsProcessing(false);
      setErrorMessage('Les achats sont disponibles uniquement dans l\'application mobile.');
      return;
    }

    const packageType = selectedPlan;
    const result = await purchaseSubscription(packageType);

    setIsProcessing(false);

    if (result.success) {
      const returnUrl = sessionStorage.getItem('returnAfterSubscribe');
      if (returnUrl) {
        sessionStorage.removeItem('returnAfterSubscribe');
        router.push(returnUrl);
      } else {
        router.refresh();
      }
    } else if (result.error === 'cancelled') {
      // User cancelled - do nothing
    } else {
      setErrorMessage(result.error || 'Une erreur est survenue');
    }
  };

  const handleRestore = async () => {
    setErrorMessage('');
    setIsRestoring(true);

    const result = await restorePurchases();

    setIsRestoring(false);

    if (result.success && result.isPro) {
      const returnUrl = sessionStorage.getItem('returnAfterSubscribe');
      if (returnUrl) {
        sessionStorage.removeItem('returnAfterSubscribe');
        router.push(returnUrl);
      } else {
        router.refresh();
      }
    } else if (result.success && !result.isPro) {
      setErrorMessage('Aucun abonnement actif trouvé');
    } else {
      setErrorMessage(result.error || 'Erreur lors de la restauration');
    }
  };

  const handleManageSubscription = () => {
    openManageSubscriptions();
  };

  if (loading) {
    return <LoadingScreen game="quiz" />;
  }

  // Already Pro - show management
  if (isPro) {
    return (
      <div className="subscribe-page">
        <div className="subscribe-bg" />

        <header className="subscribe-header">
          <button className="back-btn" onClick={() => router.back()}>
            <ArrowLeft size={22} />
          </button>
          <h1 className="header-title">Abonnement</h1>
        </header>

        <main className="subscribe-content">
          <motion.div
            className="pro-active-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="pro-active-icon">
              <Crown size={32} />
            </div>
            <h2 className="pro-active-title">Tu es Pro !</h2>
            <p className="pro-active-desc">
              Tu profites de tous les avantages Gigglz Pro.
            </p>

            <div className="pro-benefits-list">
              <div className="pro-benefit-row">
                <Infinity size={18} />
                <span>Parties illimitées</span>
              </div>
              <div className="pro-benefit-row">
                <Package size={18} />
                <span>Tous les contenus</span>
              </div>
              <div className="pro-benefit-row">
                <Ban size={18} />
                <span>Aucune publicité</span>
              </div>
            </div>

            <button
              className="btn-manage"
              onClick={handleManageSubscription}
            >
              Gérer mon abonnement
            </button>
          </motion.div>
        </main>

      </div>
    );
  }

  return (
    <div className="subscribe-page">
      <div className="subscribe-bg" />

      {/* Header */}
      <header className="subscribe-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">Passer Pro</h1>
      </header>

      <main className="subscribe-content">
        {/* Hero Section - Emotional */}
        <motion.section
          className="hero-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="hero-crown">
            <Crown size={40} />
          </div>
          <h2 className="hero-title">Libère tout le fun</h2>
          <p className="hero-subtitle">
            Plus de limites. Plus de pubs.
            <br />
            <span className="hero-emphasis">Juste du jeu.</span>
          </p>
        </motion.section>

        {/* Loss Aversion - Limitations */}
        <motion.section
          className="limitations-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="limitations-title">
            <AlertTriangle size={16} />
            Tes limitations en Free
          </h3>
          <div className="limitations-list">
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Contenu supplémentaire bloqué</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Publicités entre chaque partie</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>5 cœurs offerts par jour, remis à zéro chaque matin</span>
            </div>
            <div className="limitation-item">
              <X size={16} className="limitation-icon" />
              <span>Pubs non-skippables pour jouer plus</span>
            </div>
          </div>
        </motion.section>

        {/* Pricing Cards */}
        <motion.section
          className="pricing-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Annual Plan - Recommended */}
          <button
            className={`plan-card plan-card-annual ${selectedPlan === 'annual' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('annual')}
          >
            <div className="plan-recommended">Recommandé</div>
            <div className="plan-main">
              <div className="plan-name-row">
                <span className="plan-name">{PRO_PRICING.annual.label}</span>
                <div className="plan-badge">6 mois offerts</div>
              </div>
              <div className="plan-price-row">
                <span className="plan-price-amount">{PRO_PRICING.annual.price.toFixed(2).replace('.', ',')}€</span>
                <span className="plan-price-period">/an</span>
              </div>
              <span className="plan-price-detail">
                Soit {PRO_PRICING.annual.monthlyEquivalent.toFixed(2).replace('.', ',')}€/mois
              </span>
            </div>

            <div className="plan-value">
              <span>Le prix d'un café ☕</span>
            </div>

            <div className="plan-check">
              {selectedPlan === 'annual' ? <Check size={20} /> : null}
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            className={`plan-card ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="plan-main">
              <span className="plan-name">{PRO_PRICING.monthly.label}</span>
              <div className="plan-price-row">
                <span className="plan-price-amount">{PRO_PRICING.monthly.price.toFixed(2).replace('.', ',')}€</span>
                <span className="plan-price-period">/mois</span>
              </div>
              <span className="plan-price-detail">Sans engagement</span>
            </div>

            <div className="plan-check">
              {selectedPlan === 'monthly' ? <Check size={20} /> : null}
            </div>
          </button>
        </motion.section>

        {/* Trust Signals */}
        <motion.section
          className="trust-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="trust-item">
            <Shield size={14} />
            <span>Paiement sécurisé</span>
          </div>
          <div className="trust-divider" />
          <div className="trust-item">
            <Check size={14} />
            <span>Annule quand tu veux</span>
          </div>
        </motion.section>

        {/* CTA Button */}
        <motion.section
          className="cta-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button
            className="cta-button"
            onClick={handleSubscribe}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="cta-spinner" />
            ) : (
              <>
                <Zap size={20} />
                <span>Jouer sans limites</span>
              </>
            )}
          </button>

          {errorMessage && (
            <p className="error-message">{errorMessage}</p>
          )}

          {isNative && (
            <button
              className="restore-btn"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <div className="restore-spinner" />
              ) : (
                <>
                  <RotateCcw size={16} />
                  <span>Restaurer mes achats</span>
                </>
              )}
            </button>
          )}
        </motion.section>

        {/* What you get - Benefits */}
        <motion.section
          className="benefits-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h3 className="benefits-title">Tout ce que tu débloques</h3>
          <div className="benefits-list">
            <div className="benefit-row">
              <div className="benefit-icon"><Package size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Tout le contenu de tous les jeux</span>
                <span className="benefit-desc">Accès complet actuel et à venir</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><Infinity size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Parties illimitées</span>
                <span className="benefit-desc">Joue autant que tu veux, chaque jour</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><Ban size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Zéro publicité</span>
                <span className="benefit-desc">Expérience fluide et sans interruption</span>
              </div>
            </div>
            <div className="benefit-row">
              <div className="benefit-icon"><BarChart3 size={18} /></div>
              <div className="benefit-text">
                <span className="benefit-label">Stats avancées</span>
                <span className="benefit-desc">Analyse tes performances en détail</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Legal Links (Required by Apple for subscriptions) */}
        <motion.section
          className="legal-links-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="legal-links">
            <a href="/terms" className="legal-link">
              Conditions d'utilisation (CGU)
            </a>
            <span className="legal-divider">•</span>
            <a href="/privacy" className="legal-link">
              Politique de confidentialité
            </a>
          </div>
        </motion.section>

        {/* Solo Dev Note */}
        <motion.section
          className="solo-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <p>
            Gigglz est développé avec passion par un seul dev en France.
            <br />
            Ton soutien compte vraiment. Merci !
          </p>
        </motion.section>

        <div className="bottom-padding" />
      </main>

    </div>
  );
}

